import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import axios from "axios";

// Extend the Session type to include our custom properties
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    userId?: string;
    scopes?: string[];
  }
}

// Extend the JWT type with our custom properties
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
    userId?: string;
    provider?: string;
    scopes?: string[];
  }
}

/**
 * Store user credentials in the database
 */
async function storeCredentials({
  userId,
  provider,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
}: {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}) {
  try {
    // In a real implementation, this would call the database service
    // For now, we'll just log it
    console.log("Storing credentials:", {
      userId,
      provider,
      accessToken: accessToken.substring(0, 10) + "...",
      refreshToken: refreshToken.substring(0, 10) + "...",
      expiresAt,
      scopes,
    });

    // Example of how to call the database service
    /* 
    await axios.post(`${process.env.DATABASE_SERVICE_URL}/credentials`, {
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scopes,
    });
    */
  } catch (error) {
    console.error("Failed to store credentials:", error);
    throw error;
  }
}

/**
 * Refresh an expired access token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    // Get a fresh token using the refresh token
    const response = await axios.post(
      `https://oauth2.googleapis.com/token`,
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const refreshedTokens = response.data;

    // Update database with new tokens
    await storeCredentials({
      userId: token.userId as string,
      provider: token.provider as string,
      accessToken: refreshedTokens.access_token,
      refreshToken: token.refreshToken as string, // Use the existing refresh token
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      scopes: token.scopes || [],
    });

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    
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
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        // Extract required scopes from search params if available
        const scopes = token.scopes || [];

        // Store auth information
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
        token.scopes = scopes;
        token.userId = token.userId || user.id;
        token.provider = account.provider;

        // Store credentials in database
        try {
          if (account.access_token && account.refresh_token) {
            await storeCredentials({
              userId: token.userId as string,
              provider: account.provider,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
              scopes: scopes,
            });
          }
        } catch (error) {
          console.error("Failed to store credentials:", error);
        }

        return token;
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken;
        session.error = token.error;
        session.userId = token.userId;
        session.scopes = token.scopes;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    signOut: "/auth/signout",
  },
  debug: process.env.NODE_ENV === "development",
}; 