/**
 * Types related to Users.
 */
import { BaseResponse, ServiceResponse } from './common.js';
import { OAuthProvider } from './oauth.js';

export enum UserType {
  Platform = 'platform',
  Client = 'client'
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
  last_login: string;
  created_at: string;
  updated_at: string;
}

export interface ClientUserRecord {
  id: string;
  created_at: string;
  updated_at: string;
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
      lastLogin: new Date(record.last_login),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
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
    // lastLogin, createdAt and updatedAt are usually handled by the database
    return record;
  }
  

  
