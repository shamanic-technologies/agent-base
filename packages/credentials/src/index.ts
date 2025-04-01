/**
 * Shared credentials types and utilities
 * 
 * Provides a single source of truth for credential types and
 * utilities for mapping between database and application formats.
 */

/**
 * Credentials data model
 */
export interface Credentials {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating new credentials
 */
export interface CreateCredentialsInput {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

/**
 * Input for updating existing credentials
 */
export interface UpdateCredentialsInput {
  accessToken: string;
  expiresAt: number;
  scopes?: string[];
}

/**
 * Standard API response format
 */
export interface CredentialsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Raw database record with snake_case fields
 */
export interface DatabaseRecord {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  expires_at: string | number;
  scopes: string[];
  created_at: string | Date;
  updated_at: string | Date;
  [key: string]: any;
}

/**
 * Maps a camelCase credentials object to snake_case database fields
 */
export function mapToDatabase(credentials: Partial<CreateCredentialsInput | UpdateCredentialsInput>): Record<string, any> {
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
export function mapFromDatabase(record: DatabaseRecord): Credentials {
  return {
    id: record.id,
    userId: record.user_id,
    provider: record.provider,
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresAt: typeof record.expires_at === 'string' ? Number(record.expires_at) : record.expires_at,
    scopes: Array.isArray(record.scopes) ? record.scopes : [],
    createdAt: typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at,
    updatedAt: typeof record.updated_at === 'string' ? new Date(record.updated_at) : record.updated_at,
  };
} 