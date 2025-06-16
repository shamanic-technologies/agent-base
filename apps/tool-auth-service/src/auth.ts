import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Github from "next-auth/providers/github";
import {
  CreateOrUpdateOAuthInput,
  OAuthProvider,
  ServiceResponse,
} from "@agent-base/types";
import type { JWT } from "next-auth/jwt";
import { createOrUpdateCredentials } from "@agent-base/api-client";
import { NextRequest } from "next/server";

declare module "next-auth" {
  interface Session {
    userId: string;
    organizationId: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    clientUserId: string;
    clientOrganizationId: string;
    platformApiKey: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    scopes?: string[];
    oauthProvider?: OAuthProvider;
    error?: string;
  }
}

async function storeCredentials(input: CreateOrUpdateOAuthInput, token: JWT): Promise<any> {
  console.log("[Tool Auth Service] Storing credentials:", input);
  const createOrUpdateCredentialsResponse: ServiceResponse<void> = await createOrUpdateCredentials(input, token);
  if (!createOrUpdateCredentialsResponse.success) {
    throw new Error(createOrUpdateCredentialsResponse.error || 'Failed to store credentials in DB');
  }
  return createOrUpdateCredentialsResponse;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
    // ... [The existing refreshAccessToken function from options.ts]
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

        const updatedToken: JWT = {
          ...token,
          accessToken: refreshedTokens.access_token,
          accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
          error: undefined,
        };

        try {
          const createOrUpdateOAuthInput: CreateOrUpdateOAuthInput = {
            oauthProvider: updatedToken.oauthProvider!,
            accessToken: updatedToken.accessToken!,
            refreshToken: updatedToken.refreshToken || '',
            expiresAt: updatedToken.accessTokenExpires!,
            scopes: updatedToken.scopes!,
          };
          await storeCredentials(createOrUpdateOAuthInput, updatedToken);
        } catch (dbError) {
            console.error("[Tool Auth Service] Failed to update stored credentials post-refresh:", dbError);
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

const providers = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    );
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
        Github({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })
    );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        // NOTE: The state management needs to be refactored for v5
      }
      return token;
    },
    async session({ session, token }) {
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
}); 