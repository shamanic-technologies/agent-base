/**
 * Type definitions for Utility Service
 */

// Request/response types for utility operations
export interface UtilityRequest {
  operation: string;
  input?: any;
  user_id: string;
  conversation_id: string;
  redirect_url?: string; // Optional redirect URL for OAuth flows
}

export interface UtilityResponse {
  message?: string;
  data?: any;
  timestamp?: string;
  error?: string;
  details?: string;
}

// Supported utility operations
export type UtilityOperation = 
  | 'utility_get_current_datetime'
  | 'utility_github_get_code'
  | 'utility_github_list_directory'
  | 'utility_github_read_file'
  | 'utility_github_create_file'
  | 'utility_github_update_file'
  | 'utility_github_lint_code'
  | 'utility_github_run_code'
  | 'utility_github_deploy_code'
  | 'utility_github_create_codespace'
  | 'utility_github_destroy_codespace'
  | 'utility_github_list_codespaces'
  | 'utility_firecrawl_extract_content'
  | 'utility_google_search'
<<<<<<< HEAD
  | 'utility_google_maps'
  | 'utility_google_flights'
=======
  | 'utility_google_oauth'
>>>>>>> 7d25343f8e5fcd0057019733fbf5c30c514407a8
  | 'utility_get_database'
  | 'utility_create_table'
  | 'utility_alter_table'
  | 'utility_delete_table'
  | 'utility_get_table'
  | 'utility_query_table';

// Required types for the utility_get_current_datetime function
export type ThreadId = string;
export type NodeId = string;
export type ParentNodeId = string | null;

export enum NodeType {
  AGENT = "agent",
  TOOL = "tool",
  UTILITY = "utility"
}

export type ParentNodeType = NodeType | null;

export interface DateTimeRequest {
  format?: string;
}

// FireCrawl utility types
export interface FireCrawlExtractContentRequest {
  url: string;
  onlyMainContent?: boolean;
}

// Google Search utility types
export interface GoogleSearchRequest {
  query: string;
  limit?: number;
}

// Google Maps utility types
export interface GoogleMapsRequest {
  query: string;
  location?: string;
  limit?: number;
}

// Google Flights utility types
export interface GoogleFlightsRequest {
  origin: string;
  destination: string;
  departure_date?: string;
  return_date?: string;
  adults?: number;
  children?: number;
  infants?: number;
  cabin_class?: string;
}

// GitHub utility types
export interface GitHubCodeRequest {
  owner?: string;
  repo?: string;
  path?: string;
  branch?: string;
  codespaceId?: string;
}

export interface GitHubListDirectoryRequest extends GitHubCodeRequest {}

export interface GitHubReadFileRequest extends GitHubCodeRequest {}

export interface GitHubCreateFileRequest extends GitHubCodeRequest {
  content: string;
  message?: string;
}

export interface GitHubUpdateFileRequest extends GitHubCreateFileRequest {
  sha?: string;
}

export interface GitHubLintCodeRequest extends GitHubCodeRequest {
  files?: string[];
}

export interface GitHubRunCodeRequest extends GitHubCodeRequest {
  command?: string;
  args?: string[];
  input?: string;
  timeout?: number;
}

export interface GitHubDeployCodeRequest extends GitHubCodeRequest {
  environment?: string;
  message?: string;
}

// Codespace types
export interface GitHubCreateCodespaceRequest {
  owner: string;
  repo: string;
  branch?: string;
  workDir?: string;
}

export interface GitHubCodespaceResponse {
  codespaceId: string;
  status: string;
  url?: string;
  workDir?: string;
}

export interface GitHubDestroyCodespaceRequest {
  codespaceId: string;
}

export interface GitHubListCodespacesRequest {
  // List codespaces typically doesn't require parameters
  // but could include filters in the future
  repositoryId?: number;
}

// Database utility types
export interface DatabaseTableSchema {
  [field: string]: string;
}

export interface CreateTableRequest {
  name: string;
  description: string;
  schema: DatabaseTableSchema;
}

export interface AlterTableRequest {
  table_id: string;
  new_name?: string;
  new_description?: string;
  new_schema?: DatabaseTableSchema;
}

export interface DeleteTableRequest {
  table_id: string;
}

export interface GetTableRequest {
  table_id: string;
}

export interface QueryTableRequest {
  table_id: string;
  query: string;
}

// Utility info types
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
 * Base constructor params for all utility tools
 */
export interface UtilityToolParams {
  conversationId: ThreadId;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  userId: string;
}

// Google OAuth utility types
export interface GoogleOAuthRequest {
  redirect_url: string;     // Required frontend URL to redirect back to after auth
}

export interface GoogleOAuthResponse {
  button_data: {
    type: 'oauth_button';
    provider: 'google';
    text: string;
    icon: string;
    url: string;
    scopes: string[];
  };
} 