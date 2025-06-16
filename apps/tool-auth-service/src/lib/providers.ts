import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

export const getProviders = (scopes?: string) => {
  const providers = [];

  const baseScopes = 'openid email profile';
  const finalScope = scopes ? `${baseScopes} ${scopes}` : baseScopes;

  console.debug('getProviders', process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
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
            scope: finalScope,
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
        authorization: {
            params: {
                scope: scopes,
            }
        }
      })
    );
  }

  // Add other providers here in the same way

  return providers;
}; 