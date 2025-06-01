/**
 * Shared types for API Key data
 */
import { AgentRecord } from './agent.js';
import { Agent } from './agent.js';
import { BaseResponse } from './common.js';

/**
 * Represents the metadata for an API key stored in the database
 */
export interface ApiKeyRecord {
  key_id: string;
  platform_user_id: string;
  platform_organization_id: string;
  name: string;
  key_prefix: string;
  hashed_key: string;
  created_at: string;
  last_used: string | null;
}

/**
 * Represents the metadata for an API key stored in the database
 */
export interface ApiKey {
  keyId: string;
  platformUserId: string;
  platformOrganizationId: string;
  name: string;
  keyPrefix: string;
  hashedKey: string;
  createdAt: string;
  lastUsed: string | null;
}


export interface GetApiKeyByNameRequest {
  platformUserId: string;
  platformOrganizationId: string;
  keyName: string;
}

export interface GetApiKeyByIdRequest {
  platformUserId: string;
  platformOrganizationId: string;
  keyId: string;
}
/**
 * Request to create a new API key
 */
export interface CreateApiKeyRequest {
  keyId: string;
  name: string;
  keyPrefix: string;
  hashedKey: string;
}

/**
 * Request to update an existing API key
 */
export interface ValidateApiKeyRequest {
  hashedKey: string;
  keyPrefix: string;
}

/**
 * Request to get an API key
 */
export interface GetApiKeyRequest {
  userId: string;
  keyId: string;
}

export interface ValidateApiKeyResponse extends BaseResponse {
  userId: string;
  keyId: string;
}

/**
 * Maps a snake_case database record to camelCase agent object
 */
export function mapAPIKeyFromDatabase(record: ApiKeyRecord): ApiKey {
  if (!record) {
    throw new Error('Invalid record provided to mapFromDatabase');
  }
  return {
    keyId: record.key_id,
    platformUserId: record.platform_user_id,
    platformOrganizationId: record.platform_organization_id,
    name: record.name,
    keyPrefix: record.key_prefix,
    hashedKey: record.hashed_key,
    createdAt: record.created_at,
    lastUsed: record.last_used
  };
}

/**
 * Maps a camelCase agent object to snake_case database fields
 */
export function mapAPIKeyToDatabase(apiKey: ApiKey): Partial<ApiKeyRecord> {
  if (!apiKey) {
    throw new Error('Invalid apiKey provided to mapToDatabase');
  }
  const record: Partial<ApiKeyRecord> = {};
  if (apiKey.keyId !== undefined) record.key_id = apiKey.keyId;
  if (apiKey.platformUserId !== undefined) record.platform_user_id = apiKey.platformUserId; 
  if (apiKey.platformOrganizationId !== undefined) record.platform_organization_id = apiKey.platformOrganizationId;
  if (apiKey.name !== undefined) record.name = apiKey.name;
  if (apiKey.keyPrefix !== undefined) record.key_prefix = apiKey.keyPrefix;
  if (apiKey.hashedKey !== undefined) record.hashed_key = apiKey.hashedKey;
  return record;
}
