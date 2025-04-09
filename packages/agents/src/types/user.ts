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