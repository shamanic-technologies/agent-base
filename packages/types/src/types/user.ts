/**
 * Types related to Users.
 */
import { BaseResponse, ServiceResponse } from './common.js';
import { OAuthProvider } from './oauth.js';

export enum UserType {
  Platform = 'platform',
  Client = 'client'
}

export type PlatformUserId = {
  platformUserId: string;
}
/**
 * User record from the database
 */
export interface PlatformUserRecord {
  id: string;
  provider_user_id: string;
  email: string;
  display_name: string;
  profile_image?: string;
  oauth_provider: OAuthProvider;
  last_login: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ClientUserRecord {
  id: string;
  platform_user_id: string;
  platform_client_user_id: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Simplified application-level User interface with camelCase properties
 */
export interface PlatformUser {
  id: string;
  email: string;
  displayName: string;
  profileImage?: string;
  oauthProvider: OAuthProvider;
  providerUserId: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
} 

export interface ClientUser {
  id: string;
  platformUserId: string;
  platformClientUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for getting or creating a user
 */
export interface GetOrCreatePlatformUserInput {
  providerUserId: string;
  email?: string;
  displayName?: string;
  profileImage?: string;
}
/**
 * Input parameters for creating or updating a client user.
 */
export interface UpsertClientUserInput {
  platformUserId: string; // UUID of the parent platform user
  platformClientUserId: string; // Unique ID provided by the platform for this user
}

/**
 * Maps a snake_case user database record to camelCase user object
 * @param record The user record from the database
 * @returns A camelCase user object
 */
export function mapPlatformUserFromDatabase(record: PlatformUserRecord): PlatformUser {
    if (!record) {
      throw new Error('Invalid user record provided to mapUserFromDatabase');
    }

    return {
      id: record.id,
      providerUserId: record.provider_user_id,
      email: record.email,
      displayName: record.display_name,
      profileImage: record.profile_image,
      oauthProvider: record.oauth_provider,
      lastLogin: record.last_login,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }
  
  /**
   * Maps a camelCase user object to snake_case database fields
   */
  export function mapPlatformUserToDatabase(user: PlatformUser): Partial<PlatformUserRecord> {
    if (!user) {
      throw new Error('Invalid user provided to mapUserToDatabase');
    }
    const record: Partial<PlatformUserRecord> = {};
    if (user.id !== undefined) record.id = user.id;
    if (user.providerUserId !== undefined) record.provider_user_id = user.providerUserId;
    if (user.email !== undefined) record.email = user.email;
    if (user.displayName !== undefined) record.display_name = user.displayName;
    if (user.profileImage !== undefined) record.profile_image = user.profileImage;
    if (user.oauthProvider !== undefined) record.oauth_provider = user.oauthProvider;
    return record;
  }
  

  
/**
 * Maps a snake_case user database record to camelCase user object
 * @param record The user record from the database
 * @returns A camelCase user object
 */
export function mapClientUserFromDatabase(record: ClientUserRecord): ClientUser {
  if (!record) {
    throw new Error('Invalid user record provided to mapUserFromDatabase');
  }

  return {
    id: record.id,
    platformUserId: record.platform_user_id,
    platformClientUserId: record.platform_client_user_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

/**
 * Maps a camelCase user object to snake_case database fields
 */
export function mapClientUserToDatabase(user: ClientUser): Partial<ClientUserRecord> {
  if (!user) {
    throw new Error('Invalid user provided to mapUserToDatabase');
  }
  const record: Partial<ClientUserRecord> = {};
  if (user.id !== undefined) record.id = user.id;
  if (user.platformUserId !== undefined) record.platform_user_id = user.platformUserId;
  if (user.platformClientUserId !== undefined) record.platform_client_user_id = user.platformClientUserId;
  return record;
}


