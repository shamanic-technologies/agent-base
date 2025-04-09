/**
 * Types related to Users.
 */
import { BaseResponse } from './common.js';

/**
 * User record from the database
 */
export interface UserRecord {
  user_id: string;
  provider_user_id: string;
  email: string;
  display_name: string;
  profile_image?: string;
  last_login: string;
  created_at: string;
  updated_at: string;
}

/**
 * User response interface for API endpoints
 */
export interface UserResponse extends BaseResponse {
  data?: UserRecord;
}

/**
 * Input for getting or creating a user
 */
export interface GetOrCreateUserInput {
  provider_user_id: string;
  email?: string;
  display_name?: string;
  profile_image?: string;
}

/**
 * Response for get or create user endpoint
 */
export interface GetOrCreateUserResponse extends UserResponse {
  created?: boolean;
  updated?: boolean;
}

/**
 * Simplified application-level User interface with camelCase properties
 */
export interface User {
  userId: string;
  providerUserId: string;
  email: string;
  displayName: string;
  profileImage?: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
} 


/**
 * Maps a snake_case user database record to camelCase user object
 */
export function mapUserFromDatabase(record: UserRecord): User {
    if (!record) {
      throw new Error('Invalid user record provided to mapUserFromDatabase');
    }
    return {
      userId: record.user_id,
      providerUserId: record.provider_user_id,
      email: record.email,
      displayName: record.display_name,
      profileImage: record.profile_image,
      lastLogin: new Date(record.last_login),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }
  
  /**
   * Maps a camelCase user object to snake_case database fields
   */
  export function mapUserToDatabase(user: Partial<User>): Partial<UserRecord> {
    if (!user) {
      throw new Error('Invalid user provided to mapUserToDatabase');
    }
    const record: Partial<UserRecord> = {};
    if (user.userId !== undefined) record.user_id = user.userId;
    if (user.providerUserId !== undefined) record.provider_user_id = user.providerUserId;
    if (user.email !== undefined) record.email = user.email;
    if (user.displayName !== undefined) record.display_name = user.displayName;
    if (user.profileImage !== undefined) record.profile_image = user.profileImage;
    // lastLogin, createdAt and updatedAt are usually handled by the database
    return record;
  }
  
