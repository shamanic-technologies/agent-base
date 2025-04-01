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
  userId?: string;
}

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
