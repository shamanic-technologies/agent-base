/**
 * Type definitions for Utility Tool Service
 */

/**
 * Standard interface for all utility tools in the system
 */
export interface UtilityTool {
  /**
   * Unique identifier for the utility
   */
  id: string;
  
  /**
   * Human-readable description of what the utility does
   */
  description: string;
  
  /**
   * Schema defining the input parameters for the utility
   */
  schema: Record<string, {
    type: string;
    optional?: boolean;
    description?: string;
  }>;
  
  /**
   * The execution function for the utility
   * @param userId ID of the user making the request
   * @param conversationId ID of the conversation context
   * @param params Input parameters for the utility
   * @returns Result of the utility execution
   */
  execute: (userId: string, conversationId: string, params: any) => Promise<any>;
}

/**
 * Common response structure
 */
export interface UtilityResponse {
  data?: any;
  error?: string;
  details?: string;
}

/**
 * Core request structure
 */
export interface UtilityRequest {
  operation?: string;
  input?: any;
  conversation_id: string;
  redirect_url?: string;
}

/**
 * DateTime utility types
 */
export interface DateTimeRequest {
  format?: string;
}

/**
 * FireCrawl utility types
 */
export interface FireCrawlExtractContentRequest {
  url: string;
  onlyMainContent?: boolean;
}

/**
 * Google Search utility types
 */
export interface GoogleSearchRequest {
  query: string;
  limit?: number;
}

/**
 * Google Maps utility types
 */
export interface GoogleMapsRequest {
  query: string;
  location?: string;
  limit?: number;
}

/**
 * Google Flights utility types
 */
export interface GoogleFlightsRequest {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin_class?: string;
}

/**
 * Gmail read utility types
 */
export interface GmailReadRequest {
  query?: string;
  maxResults?: number;
  labelIds?: string[];
}

export interface GmailAuthNeededResponse {
  needs_auth: true;
  auth_url: string;
  message: string;
}

export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageDetails {
  id: string;
  threadId: string;
  labelIds: string[];
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface GmailErrorMessageDetails {
  id: string;
  error: string;
}

export interface GmailSuccessResponse {
  count: number;
  messages: (GmailMessageDetails | GmailErrorMessageDetails)[];
  total_messages?: number;
  message?: string;
}

export interface GmailErrorResponse {
  error: string;
  details?: string;
}

export type GmailReadResponse = GmailAuthNeededResponse | GmailSuccessResponse | GmailErrorResponse;

/**
 * Database utility types
 */
export interface DatabaseTableSchema {
  [field: string]: string;
}

export interface CreateTableRequest {
  name: string;
  description: string;
  schema: Record<string, string>;
}

export interface AlterTableRequest {
  table: string;
  addColumn?: {
    name: string;
    type: string;
  };
  removeColumn?: string;
  renameColumn?: {
    oldName: string;
    newName: string;
  };
}

export interface DeleteTableRequest {
  table: string;
  confirm?: boolean;
}

export interface GetTableRequest {
  table: string;
  includeData?: boolean;
  limit?: number;
}

export interface QueryTableRequest {
  table: string;
  query: string;
  params?: Record<string, any>;
}

export type UtilityInfo = {
  id: string;
  description: string;
  schema: Record<string, {
    type: string;
    optional?: boolean;
    description?: string;
  }>;
};

export type UtilitiesListResponse = {
  utilities: string[];
};

export type UtilityInfoResponse = UtilityInfo | {
  error: string;
};

/**
 * Stripe API keys request types
 */
export interface StripeKeysRequest {
  key_type?: 'publishable_key' | 'secret_key' | 'both';
  description?: string;
}

export interface StripeKeysIframeResponse {
  iframe_url: string;
  message: string;
}

export interface StripeKeysErrorResponse {
  error: string;
  details?: string;
}

export type StripeKeysResponse = StripeKeysIframeResponse | StripeKeysErrorResponse;

/**
 * Stripe API keys read types
 */
export interface StripeKeysReadRequest {
  key_type?: 'publishable_key' | 'secret_key' | 'both';
}

export interface StripeKeysReadSuccessResponse {
  success: true;
  publishable_key?: string;
  secret_key_last_four?: string;
  has_keys: boolean;
}

export interface StripeKeysReadErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type StripeKeysReadResponse = StripeKeysReadSuccessResponse | StripeKeysReadErrorResponse;

/**
 * Stripe Transactions utility types
 */
export interface StripeListTransactionsRequest {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

export interface StripeAuthNeededResponse {
  needs_auth: true;
  form_submit_url: string;
  userId?: string;
  conversationId?: string;
  message: string;
}

export interface StripeTransaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  created: number;
  customer: string | null;
  metadata: Record<string, any>;
}

export interface StripeTransactionsSuccessResponse {
  success: true;
  count: number;
  transactions: StripeTransaction[];
  has_more: boolean;
}

export interface StripeTransactionsErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type StripeListTransactionsResponse = StripeAuthNeededResponse | StripeTransactionsSuccessResponse | StripeTransactionsErrorResponse;
