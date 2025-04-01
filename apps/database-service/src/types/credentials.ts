/**
 * Re-export all credentials types from the shared package
 */
export * from '@agent-base/credentials';

/**
 * Types for user credentials management
 */

export interface UserCredentials {
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

export interface CreateCredentialsInput {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
}

export interface UpdateCredentialsInput {
  accessToken: string;
  expiresAt: number;
  scopes?: string[];
}

export interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 