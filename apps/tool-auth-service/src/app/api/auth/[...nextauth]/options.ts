import { getProviders } from "@/lib/providers";
import {
  CreateOrUpdateOAuthInput,
  OAuthProvider,
  HumanInternalCredentials,
  InternalCredentials,
  MinimalInternalCredentials,
  ServiceResponse,
  OAuth,
} from "@agent-base/types";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { NextApiRequest, NextApiResponse } from "next";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore api-client will be recognized soon
import { createOrUpdateCredentials, getCredentials } from "@agent-base/api-client";

// Extend the Session type for the client
declare module "next-auth" {
  interface Session {
    userId: string; // Expose internal ID as userId to the client
    organizationId: string; // Expose organizationId to the client
    error?: string; // Keep: Useful for client-side error handling (e.g., force re-auth)
    // Remove accessToken and scopes for minimalism and security
  }
}

// Extend the JWT type for server-side token management
declare module "next-auth/jwt" {
  interface JWT {
    // Custom internal credentials
    clientUserId: string;
    clientOrganizationId: string;
    platformApiKey: string;

    // OAuth Provider details
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    scopes?: string[];
    oauthProvider?: OAuthProvider;
    error?: string;
  }
}

/**
 * Store user credentials in the database
 * (Assumes this function exists and works correctly)
 */
async function storeCredentials(input: CreateOrUpdateOAuthInput, token: JWT): Promise<any> { 
  console.log("[Tool Auth Service] Storing credentials:", input);
  
  const minimalInternalCredentials: MinimalInternalCredentials = {
    clientUserId: token.clientUserId,
    clientOrganizationId: token.clientOrganizationId,
    platformApiKey: token.platformApiKey,
  };

  const createOrUpdateCredentialsResponse: ServiceResponse<void> = await createOrUpdateCredentials(input, minimalInternalCredentials);
  if (!createOrUpdateCredentialsResponse.success) {
    throw new Error(createOrUpdateCredentialsResponse.error || 'Failed to store credentials in DB');
  }
  return createOrUpdateCredentialsResponse;
}

/**
 * Refresh an expired access token using the stored refresh token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.oauthProvider || !token.refreshToken) {
      throw new Error("Missing provider or refresh token");
    }

    let tokenUrl = "";
    let clientId = "";
    let clientSecret = "";

    if (token.oauthProvider === "google") {
      tokenUrl = "https://oauth2.googleapis.com/token";
      clientId = process.env.GOOGLE_CLIENT_ID!;
      clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    } else if (token.oauthProvider === "github") {
      tokenUrl = "https://github.com/login/oauth/access_token";
      clientId = process.env.GITHUB_CLIENT_ID!;
      clientSecret = process.env.GITHUB_CLIENT_SECRET!;
    } else {
      throw new Error(`Unsupported provider for token refresh: ${token.oauthProvider}`);
    }

    console.log(
      `[Tool Auth Service] Attempting refresh for provider:`,
      token.oauthProvider
    );

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;

    console.log("[Tool Auth Service] Refresh successful.");

    // Update stored credentials using the new token information.
    // First, we update the token object itself with the new values.
    const updatedToken: JWT = {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined, // Clear any previous error
    };

    // Now, we call storeCredentials with the updated token object.
    try {
      const createOrUpdateOAuthInput: CreateOrUpdateOAuthInput = {
        oauthProvider: updatedToken.oauthProvider!,
        accessToken: updatedToken.accessToken!,
        refreshToken: updatedToken.refreshToken || '',
        expiresAt: updatedToken.accessTokenExpires!,
        scopes: updatedToken.scopes!, 
      };
      
      await storeCredentials(createOrUpdateOAuthInput, updatedToken); // Pass the entire updated token
      console.log("[Tool Auth Service] Updated stored credentials post-refresh.");
    } catch (dbError) {
        console.error("[Tool Auth Service] Failed to update stored credentials post-refresh:", dbError);
        // We still return the updated token, but with an error flag
        updatedToken.error = "CredentialStorageFailed";
    }

    return updatedToken;

  } catch (error) {
    console.error("[Tool Auth Service] Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

  // Auth options configuration is now a function that returns NextAuthOptions
export const authOptions = (req: NextRequest): NextAuthOptions => {
  // Read params from the cookie, if available
  const cookie = req.cookies.get('next-auth.dynamic-params')?.value;
  let scopes: string | undefined;
  
  if (cookie) {
    try {
      const params = JSON.parse(cookie);
      scopes = params.scopes;
    } catch {
      console.error("Failed to parse auth params cookie");
    }
  }

  return {
    providers: getProviders(scopes),
    session: {
      strategy: "jwt",
    },
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          // Use the 'cookie' variable captured from the outer scope.
          const dynamicParamsCookie = cookie;
          
          if (dynamicParamsCookie) {
            try {
              const params = JSON.parse(dynamicParamsCookie);
              const decodedState : MinimalInternalCredentials = JSON.parse(Buffer.from(params.state, 'base64').toString('utf-8')) as MinimalInternalCredentials;
              
              // Populate the token with all required credentials
              token.clientUserId = decodedState.clientUserId;
              token.clientOrganizationId = decodedState.clientOrganizationId;
              token.platformApiKey = decodedState.platformApiKey;
              
              // Note: We cannot easily delete the cookie here, but it has a short max-age.
            } catch (e) {
              console.error("Failed to process dynamic params cookie", e);
              token.error = "StateParseFailed";
              return token;
            }
          }

          if (!token.clientUserId) {
            console.error("[Tool Auth Service] JWT Error: No client user id found. Cannot link credentials.");
            token.error = "InternalUserIdMissingInJWT";
            return token;
          }

          const createOrUpdateOAuthInput: CreateOrUpdateOAuthInput = {
            oauthProvider: account.provider as OAuthProvider,
            scopes: account.scope?.split(' ') || [],
            accessToken: account.access_token!,
            refreshToken: account.refresh_token || '',
            expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
          };

          try {
            await storeCredentials(createOrUpdateOAuthInput, token);
            token.accessToken = createOrUpdateOAuthInput.accessToken;
            token.refreshToken = createOrUpdateOAuthInput.refreshToken;
            token.accessTokenExpires = createOrUpdateOAuthInput.expiresAt;
            token.scopes = createOrUpdateOAuthInput.scopes;
            token.oauthProvider = createOrUpdateOAuthInput.oauthProvider;
            delete token.error;
          } catch (error) {
            console.error(`[Tool Auth Service] JWT: Failed store credentials for user ${token.clientUserId}:`, error);
            token.error = "CredentialStorageFailed";
          }
        }
        
        // Handle token refresh
        if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
          return refreshAccessToken(token);
        }

        return token;
      },
      async session({ session, token }) {
        session.userId = token.clientUserId;
        session.organizationId = token.clientOrganizationId;
        session.error = token.error as string | undefined;
        return session;
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
    debug: process.env.NODE_ENV === "development",
  };
}; 