import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
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
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                },
            },
        })
    );
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })
    );
}

export const config = {
  providers,
  session: {
      strategy: "jwt",
  },
  callbacks: {
        async jwt({ token, account }) {
            if (account) {
              const state = JSON.parse(Buffer.from(account.state as string, 'base64').toString('utf-8'));
              token.clientUserId = state.userId;
              token.clientOrganizationId = state.organizationId;
              token.platformApiKey = process.env.PLATFORM_API_KEY!;

              const createOrUpdateOAuthInput: CreateOrUpdateOAuthInput = {
                oauthProvider: account.provider as OAuthProvider,
                scopes: account.scope?.split(' ') || [],
                accessToken: account.access_token!,
                refreshToken: account.refresh_token || '',
                expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
              };
    
              try {
                await storeCredentials(createOrUpdateOAuthInput, token as JWT);
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
            
            if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
              return refreshAccessToken(token as JWT);
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
} satisfies NextAuthOptions;

export const { handlers, signIn, signOut, auth } = NextAuth(config); 