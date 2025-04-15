/**
 * Shared credentials types and utilities
 *
 * Provides a single source of truth for credential types and
 * utilities for mapping between database and application formats.
 */
import { BaseResponse } from './common.js';

/**
 * OAuth provider enum
 */
export enum OAuthProvider {
    GOOGLE = 'google',
    FACEBOOK = 'facebook',
    TWITTER = 'twitter',
    LINKEDIN = 'linkedin',
    GITHUB = 'github'
  }
  
export interface OAuth {
    userId: string;
    oauthProvider: OAuthProvider;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
    createdAt: Date;
    updatedAt: Date;
  }

// User profile type
export interface ProviderUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: OAuthProvider;
}

export interface JWTPayload {
  userId: string;
}
  /**
  * Input for creating new credentials
  */
  export interface CreateOrUpdateCredentialsInput {
    userId: string;
    oauthProvider: OAuthProvider;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
  }

  export interface CreateOrUpdateCredentialsInputItem {
    userId: string;
    oauthProvider: OAuthProvider;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scope: string;
}
  /**
  * Input for getting user credentials
  */
  export interface GetUserCredentialsInput {
    userId: string;
    oauthProvider: OAuthProvider;
    requiredScopes: string[];
  }
  
export interface CheckAuthInput {
    userId: string;
    oauthProvider: OAuthProvider;
    requiredScopes: string[];
}

export interface CheckUserAuth {
    valid: boolean;
    credentials?: OAuth[];
}

export interface CheckAuthSuccessData {
    hasAuth: true;
    credentials: OAuth[];
}

export interface CheckAuthNeededData {
    hasAuth: false;
    authUrl: string;
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
    oauth_provider: OAuthProvider;
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
  export function mapCredentialsToDatabase(credentials: Partial<CreateOrUpdateCredentialsInputItem>): Partial<DatabaseRecord> {
    const mapped: Partial<DatabaseRecord> = {};
    
    if ('userId' in credentials && credentials.userId !== undefined) {
      mapped.user_id = credentials.userId;
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
  
  /**
   * Maps a snake_case database record to camelCase credentials object
   */
  export function mapCredentialsFromDatabase(record: DatabaseRecord): OAuth {
    return {
      userId: record.user_id,
      oauthProvider: record.oauth_provider,
      scope: record.scope,
      accessToken: record.access_token,
      refreshToken: record.refresh_token,
      expiresAt: typeof record.expires_at === 'string' ? Number(record.expires_at) : record.expires_at,
      createdAt: typeof record.created_at === 'string' ? new Date(record.created_at) : record.created_at,
      updatedAt: typeof record.updated_at === 'string' ? new Date(record.updated_at) : record.updated_at,
    };
  } 