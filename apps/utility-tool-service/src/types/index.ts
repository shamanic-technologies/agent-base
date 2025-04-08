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
 * Standardized error response structure for all utility tools
 */
export interface UtilityErrorResponse {
  status: 'error'; // Added status field for clarity
  error: string;
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

// Define the structure for a single search result
export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

// Define the success response structure
export interface GoogleSearchSuccessResponse {
  status: 'success'; // Added status field for consistency
  query: string;
  results_count: number;
  results: GoogleSearchResult[];
  message?: string; // Optional message, e.g., for no results
}

// Update the union type for the Google Search response
export type GoogleSearchResponse = GoogleSearchSuccessResponse | UtilityErrorResponse;

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

/**
 * Standardized auth needed response for all providers
 */
export interface SetupNeededResponse {
  status: 'needs_setup'; // Added status field for clarity
  needs_setup: true;
  setup_url: string;
  provider: string;
  message: string;
  title: string;
  description: string;
  button_text: string;
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
  status: 'success'; // Added status field for consistency
  count: number;
  messages: (GmailMessageDetails | GmailErrorMessageDetails)[];
  total_messages?: number;
  message?: string;
}

// Update the GmailReadResponse type definition
export type GmailReadResponse = SetupNeededResponse | GmailSuccessResponse | UtilityErrorResponse;

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

export interface StripeKeysSuccessResponse {
  status: 'success'; 
  message: string;
  keys?: { 
    publishable_key?: string;
    secret_key?: string; 
  }
}

// Update the StripeKeysResponse type definition to use SetupNeededResponse
export type StripeKeysResponse = SetupNeededResponse | StripeKeysSuccessResponse | UtilityErrorResponse;

/**
 * Stripe API keys read types
 */
export interface StripeKeysReadRequest {
  key_type?: 'publishable_key' | 'secret_key' | 'both';
}

export interface StripeKeysReadSuccessResponse {
  status: 'success'; 
  success?: true; // Consider removing redundant success field
  keys: {
    publishable_key?: string;
    secret_key?: string;
  };
}

// Update Stripe Keys Read response type to use SetupNeededResponse
export type StripeKeysReadResponse = SetupNeededResponse | StripeKeysReadSuccessResponse | UtilityErrorResponse;

/**
 * Stripe Transactions utility types
 */
export interface StripeTransactionsRequest {
  limit?: number;
  starting_after?: string; // For pagination
  ending_before?: string; // For pagination
  type?: string; // e.g., 'charge', 'payment_intent'
  customer_id?: string;
}

export interface StripeTransaction {
  // Define the structure of a single transaction object based on Stripe API
  id: string;
  object: string;
  amount: number;
  currency: string;
  created: number;
  status: string;
  description?: string | null;
  customer?: string | null;
  // Add other relevant fields as needed
}

export interface StripeTransactionsSuccessResponse {
  status: 'success';
  count: number;
  has_more: boolean;
  data: StripeTransaction[];
}

// Update Stripe Transactions response type to use SetupNeededResponse
export type StripeTransactionsResponse = SetupNeededResponse | StripeTransactionsSuccessResponse | UtilityErrorResponse;
