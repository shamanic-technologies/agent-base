/**
 * Shared credentials types and utilities
 *
 * Provides a single source of truth for credential types and
 * utilities for mapping between database and application formats.
 */

export interface Credential {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  createdAt: Date;
  updatedAt: Date;
}
/**
* Input for creating new credentials
*/
export interface CreateOrUpdateCredentialsInput {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}
/**
* Input for getting user credentials
*/
export interface GetUserCredentialsInput {
  userId: string;
  provider: string;
  requiredScopes: string[];
}


/**
* Standard API response format
*/
export interface DatabaseResponse {
  success: boolean;
  error?: string;
}

/**
* Standard Credentials API response format
*/
export interface CredentialsResponse<T> extends DatabaseResponse {
  data?: T;
}

/**
 * Raw database record with snake_case fields
 */
export interface DatabaseRecord {
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | number;
  scope: string;
  created_at: string | Date;
  updated_at: string | Date;
}

/**
 * Maps a camelCase credentials object to snake_case database fields
 */
export function mapToDatabase(credentials: Partial<CreateOrUpdateCredentialsInput>): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  if ('userId' in credentials && credentials.userId !== undefined) {
    mapped.user_id = credentials.userId;
  }
  
  if ('provider' in credentials && credentials.provider !== undefined) {
    mapped.provider = credentials.provider;
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
  
  if ('scopes' in credentials && credentials.scopes !== undefined) {
    mapped.scopes = credentials.scopes;
  }
  
  return mapped;
}

/**
 * Maps a snake_case database record to camelCase credentials object
 */
export function mapFromDatabase(record: DatabaseRecord): Credential {
  return {
    userId: record.user_id,
    provider: record.provider,
    scope: record.scope,
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: typeof record.expires_at === 'string' ? Number(record.expires_at) : record.expires_at,
    createdAt: typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at,
    updatedAt: typeof record.updated_at === 'string' ? new Date(record.updated_at) : record.updated_at,
  };
} 