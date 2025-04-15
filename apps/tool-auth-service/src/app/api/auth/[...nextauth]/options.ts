import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { createOrUpdateCredentials } from "@/lib/database";
import { CreateOrUpdateCredentialsInput, OAuthProvider, JWTPayload } from "@agent-base/types";

// Extend the Session type for the client
declare module "next-auth" {
  interface Session {
    userId: string; // Expose internal ID as userId to the client
    error?: string; // Keep: Useful for client-side error handling (e.g., force re-auth)
    // Remove accessToken and scopes for minimalism and security
  }
}

// Extend the JWT type for server-side token management
declare module "next-auth/jwt" {
  interface JWT {
    // Core user info (from initial login via auth-service)
    id: string; // This is the internal DB UUID
    // name?: string; // Removed for minimalism
    // email?: string; // Removed for minimalism
    // picture?: string; // Removed for minimalism

    // OAuth Provider details (added/updated during tool linking in tool-auth-service)
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // Expiration timestamp (e.g., Date.now() + expires_in * 1000)
    scopes?: string[];          // Scopes granted for this specific provider link
    oauthProvider?: OAuthProvider; // The provider linked (e.g., 'google')

    // Error state during token refresh or other issues
    error?: string; // e.g., "RefreshAccessTokenError", "InternalUserIdMissingInJWT", "CredentialStorageFailed"
  }
}

/**
 * Store user credentials in the database
 * (Assumes this function exists and works correctly)
 */
async function storeCredentials(input: CreateOrUpdateCredentialsInput): Promise<any> { 
  console.log("[Tool Auth Service] Storing credentials:", input);
  const result = await createOrUpdateCredentials(input);
  if (!result.success) {
    throw new Error(result.error || 'Failed to store credentials in DB');
  }
  return result;
}

/**
 * Refresh an expired access token using the stored refresh token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log("[Tool Auth Service] Attempting refresh for provider:", token.oauthProvider);
    const tokenEndpoint = "https://oauth2.googleapis.com/token"; // Assuming Google for now
    if (!token.refreshToken) {
      throw new Error("No refresh token");
    }

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;

    console.log("[Tool Auth Service] Refresh successful.");

    // Update stored credentials using token.id
    try {
      if (token.id && token.oauthProvider && token.scopes) {
         await storeCredentials({
           userId: token.id, // Use the correct internal ID from token.id
           oauthProvider: token.oauthProvider,
           scopes: token.scopes, 
           accessToken: refreshedTokens.access_token,
           refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, 
           expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
         });
         console.log("[Tool Auth Service] Updated stored credentials post-refresh.");
      }
    } catch (dbError) {
        console.error("[Tool Auth Service] Failed to update stored credentials post-refresh:", dbError);
    }

    return {
      ...token, // Preserve original token fields like id
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined, // Clear error on success
    };

  } catch (error) {
    console.error("[Tool Auth Service] Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Auth options configuration
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline", // Important to get refresh token
          response_type: "code",
          // scope is handled dynamically in signin page if needed
        },
      },
    }),
    // Add other providers here if needed
  ],
  session: {
    strategy: "jwt",
    // maxAge: 30 * 24 * 60 * 60, // Optional: default is 30 days
  },
  callbacks: {
    async jwt({ token, account, user, trigger, session }) {
      // The 'token' arg is the JWT object from the cookie (if exists)
      // The 'account' & 'user' args are only present after a successful OAuth flow
      
      // 1. Handle OAuth sign-in/linking
      if (account && user) {
        const scopes = account.scope?.split(' ') || [];
        const internalUserId = token.id; // *** Read internal ID from token.id ***

        if (!internalUserId) {
          console.error("[Tool Auth Service] JWT Error: No internal user id found in token during OAuth callback. Cannot link credentials.");
          token.error = "InternalUserIdMissingInJWT";
          // Still populate other fields for potential session use
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
          token.oauthProvider = account.provider as OAuthProvider;
          return token;
        }
        
        console.log(`[Tool Auth Service] JWT: Linking provider '${account.provider}' for user '${internalUserId}'.`);

        const credentialData: CreateOrUpdateCredentialsInput = {
          userId: internalUserId, // *** Use internalUserId (from token.id) ***
          oauthProvider: account.provider as OAuthProvider,
          scopes: scopes,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
        };

        try {
          if (credentialData.accessToken && credentialData.refreshToken) {
            await storeCredentials(credentialData);
            console.log(`[Tool Auth Service] JWT: Stored credentials successfully for user ${internalUserId}.`);
            // Update token with latest details
            token.accessToken = credentialData.accessToken;
            token.refreshToken = credentialData.refreshToken;
            token.accessTokenExpires = credentialData.expiresAt;
            token.scopes = scopes;
            token.oauthProvider = credentialData.oauthProvider;
            delete token.error; 
          } else {
             console.warn("[Tool Auth Service] JWT: Missing tokens from provider. Credentials not stored.");
          }
        } catch (error) {
          console.error(`[Tool Auth Service] JWT: Failed store credentials for user ${internalUserId}:`, error);
          token.error = "CredentialStorageFailed";
          // Keep potentially stale OAuth info but mark error
          token.accessToken = credentialData.accessToken;
          token.refreshToken = credentialData.refreshToken;
          token.accessTokenExpires = credentialData.expiresAt;
          token.scopes = scopes;
          token.oauthProvider = credentialData.oauthProvider;
        }
        return token;
      }

      // 2. Handle token refresh if needed (on session access)
      if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        if (token.refreshToken && token.oauthProvider) { // Need provider info for refresh endpoint logic
          console.log("[Tool Auth Service] JWT: Access token expired, attempting refresh.");
          return refreshAccessToken(token); // Use token.id internally
        } else {
          console.warn("[Tool Auth Service] JWT: Access token expired, but no refresh token or provider info available.");
          token.error = "RefreshTokenMissing"; 
          delete token.accessToken;
          return token;
        }
      }

      // 3. Return current token (initial load or valid existing token)
      return token;
    },
    async session({ session, token }) {
      // Map internal token structure to client session structure
      session.userId = token.id; // Map internal token.id to session.userId
      session.error = token.error;
      // Removed session.accessToken and session.scopes for minimalism
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error", // Error code passed in query string as ?error=
    signOut: "/auth/signout",
  },
  debug: process.env.NODE_ENV === "development",
}; 