/**
 * Type definitions for Utility Service
 */

// Request/response types for utility operations
export interface UtilityRequest {
  operation: string;
  input?: any;
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
  | 'utility_google_search';

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