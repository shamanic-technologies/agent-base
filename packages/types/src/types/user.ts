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
  auth_user_id: string;
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
  auth_user_id: string;
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
  authUserId: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
} 

export interface ClientUser {
  id: string;
  platformUserId: string;
  authUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
/**
 * Maps a snake_case user database record to camelCase user object
 * @param record The user record from the database
 * @returns A camelCase user object
 */
export function mapClientUserFromDatabase(record: ClientUserRecord): ClientUser {
  if (!record) {
    throw new Error('Invalid client user record provided to mapClientUserFromDatabase');
  }

  return {
    id: record.id,
    platformUserId: record.platform_user_id,
    authUserId: record.auth_user_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

/**
 * Maps a camelCase user object to snake_case database fields
 */
export function mapClientUserToDatabase(user: ClientUser): Partial<ClientUserRecord> {
  if (!user) {
    throw new Error('Invalid client user provided to mapClientUserToDatabase');
  }
  const record: Partial<ClientUserRecord> = {};
  if (user.id !== undefined) record.id = user.id;
  if (user.platformUserId !== undefined) record.platform_user_id = user.platformUserId;
  if (user.authUserId !== undefined) record.auth_user_id = user.authUserId;
  return record;
}



/**
 * Input for getting or creating a user
 */
export interface GetOrCreatePlatformUserInput {
  authUserId: string;
  email?: string;
  displayName?: string;
  profileImage?: string;
}
/**
 * Input parameters for creating or updating a client user.
 */
export interface UpsertClientUserInput {
  platformUserId: string; // UUID of the parent platform user
  authUserId: string; // Unique ID provided by the client's auth provider for this user
}

/**
 * Input parameters for creating or updating a client user.
 */
export interface UpsertClientOrganizationInput {
  platformUserId: string; // UUID of the parent platform user
  authOrganizationId: string; // Unique ID provided by the client's auth provider for this organization
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
      authUserId: record.auth_user_id,
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
    if (user.authUserId !== undefined) record.auth_user_id = user.authUserId;
    if (user.email !== undefined) record.email = user.email;
    if (user.displayName !== undefined) record.display_name = user.displayName;
    if (user.profileImage !== undefined) record.profile_image = user.profileImage;
    if (user.oauthProvider !== undefined) record.oauth_provider = user.oauthProvider;
    return record;
  }
  


// Organisations

export interface ClientOrganizationData {
  name: string;
  creatorClientUserId: string;
  clientAuthOrganisationId: string;
  profileImage?: string;
}

export interface ClientOrganization extends ClientOrganizationData {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientOrganizationRecord {
  id: string;
  name: string;
  creator_client_user_id: string;
  client_auth_organisation_id: string;
  profile_image?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a snake_case organization database record to camelCase organization object
 * @param record The organization record from the database
 * @returns A camelCase organization object
 */
export function mapClientOrganizationFromDatabase(record: ClientOrganizationRecord): ClientOrganization {
  if (!record) {
    throw new Error('Invalid organization record provided to mapClientOrganizationFromDatabase');
  }

  return {
    id: record.id,
    name: record.name,
    creatorClientUserId: record.creator_client_user_id,
    clientAuthOrganisationId: record.client_auth_organisation_id,
    profileImage: record.profile_image,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

/**
 * Maps a camelCase user object to snake_case database fields
 */
export function mapClientOrganizationToDatabase(clientOrganization: ClientOrganization): Partial<ClientOrganizationRecord> {
  if (!clientOrganization) {
    throw new Error('Invalid user provided to mapUserToDatabase');
  }
  const record: Partial<ClientOrganizationRecord> = {};
  if (clientOrganization.id !== undefined) record.id = clientOrganization.id;
  if (clientOrganization.name !== undefined) record.name = clientOrganization.name;
  if (clientOrganization.creatorClientUserId !== undefined) record.creator_client_user_id = clientOrganization.creatorClientUserId;
  if (clientOrganization.clientAuthOrganisationId !== undefined) record.client_auth_organisation_id = clientOrganization.clientAuthOrganisationId;
  if (clientOrganization.profileImage !== undefined) record.profile_image = clientOrganization.profileImage;
  return record;
}

// Client User Client Organization

export interface ClientUserClientOrganizationData {
  clientUserId: string;
  clientOrganizationId: string;
}
export interface ClientUserClientOrganization extends  ClientUserClientOrganizationData{
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClientUserClientOrganizationRecord {
  client_user_id: string;
  client_organization_id: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Maps a snake_case organization database record to camelCase organization object
 * @param record The organization record from the database
 * @returns A camelCase organization object
 */
export function mapClientUserClientOrganizationFromDatabase(record: ClientUserClientOrganizationRecord): ClientUserClientOrganization {
  if (!record) {
    throw new Error('Invalid client user client organization record provided to mapClientUserClientOrganizationFromDatabase');
  }

  return {
    clientUserId: record.client_user_id,
    clientOrganizationId: record.client_organization_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

/**
 * Maps a camelCase user object to snake_case database fields
 */
export function mapClientUserClientOrganizationToDatabase(clientUserClientOrganization: ClientUserClientOrganization): Partial<ClientUserClientOrganizationRecord> {
  if (!clientUserClientOrganization) {
    throw new Error('Invalid client user client organization provided to mapClientUserClientOrganizationToDatabase');
  }
  const record: Partial<ClientUserClientOrganizationRecord> = {};
  if (clientUserClientOrganization.clientUserId !== undefined) record.client_user_id = clientUserClientOrganization.clientUserId;
  if (clientUserClientOrganization.clientOrganizationId !== undefined) record.client_organization_id = clientUserClientOrganization.clientOrganizationId;
  return record;
}


