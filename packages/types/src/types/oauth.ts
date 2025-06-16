/**
 * Shared credentials types and utilities
 *
 * Provides a single source of truth for credential types and
 * utilities for mapping between database and application formats.
 */

/**
 * OAuth provider enum
 */
export enum OAuthProvider {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
    TWITTER = 'twitter',
    LINKEDIN = 'linkedin',
    GITHUB = 'github',
    CLERK = 'clerk'
  }
  
  /**
 * Raw database record with snake_case fields
 */
export interface OAuthRecord {
  client_user_id: string;
  client_organization_id: string;
  oauth_provider: OAuthProvider;
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  scope: string;
  created_at: Date;
  updated_at: Date;
}

export interface OAuth {
  clientUserId: string;
  clientOrganizationId: string;
  oauthProvider: OAuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// User profile type
export interface ProviderUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: OAuthProvider;
}

// export interface JWTPayload {
//   clientUserId: string;
//   clientOrganizationId: string;
// }

/**
* Input for creating new credentials
*/
export interface CreateOrUpdateOAuthInput {
  oauthProvider: OAuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

export interface CreateOrUpdateOAuthInputItem {
  oauthProvider: OAuthProvider;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}
/**
* Input for getting user credentials
*/
export interface GetUserOAuthInput {
  clientUserId: string;
  clientOrganizationId: string;
  oauthProvider: OAuthProvider;
  requiredScopes: string[];
}


export interface CheckUserOAuthResult {
  valid: boolean;
  oauthCredentials?: OAuth[];
  authUrl?: string;
} 

export interface CheckUserOAuthValidResult extends CheckUserOAuthResult {
  valid: true;
  oauthCredentials: OAuth[];
}

export interface CheckUserOAuthInvalidResult extends CheckUserOAuthResult {
  valid: false;
  authUrl: string;
}

/**
 * Maps a snake_case database record to camelCase credentials object
 */
export function mapOAuthFromDatabase(record: OAuthRecord): OAuth {
  return {
    clientUserId: record.client_user_id,
    clientOrganizationId: record.client_organization_id,
    oauthProvider: record.oauth_provider,
    scope: record.scope,
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: record.expires_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
} 
/**
 * Maps a camelCase credentials object to snake_case database fields
 */
export function mapOAuthToDatabase(credentials: OAuth): Partial<OAuthRecord> {
  const mapped: Partial<OAuthRecord> = {};
  
  if ('userId' in credentials && credentials.clientUserId !== undefined) {
    mapped.client_user_id = credentials.clientUserId;
  }

  if ('organizationId' in credentials && credentials.clientOrganizationId !== undefined) {
    mapped.client_organization_id = credentials.clientOrganizationId;
  }
  
  if ('oauthProvider' in credentials && credentials.oauthProvider !== undefined) {
    mapped.oauth_provider = credentials.oauthProvider;
  }
  
  if ('accessToken' in credentials && credentials.accessToken !== undefined) {
    mapped.access_token = credentials.accessToken;
  }
  
  if ('refreshToken' in credentials && credentials.refreshToken !== undefined) {
    mapped.refresh_token = credentials.refreshToken;
  }
  
  if ('expiresAt' in credentials && credentials.expiresAt !== undefined) {
    mapped.expires_at = credentials.expiresAt;
  }
  
  if ('scope' in credentials && credentials.scope !== undefined) {
    mapped.scope = credentials.scope;
  }
  
  return mapped;
}

