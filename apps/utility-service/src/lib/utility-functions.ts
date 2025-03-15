/**
 * Utility Functions
 * 
 * Core functionality for the utility service
 */
import { DateTimeRequest, UtilityOperation, UtilityResponse } from '../types';
import { UtilityGetCurrentDateTime } from './utilities/utility_get_current_datetime';
import { 
  GitHubCreateCodespaceUtility,
  GitHubDestroyCodespaceUtility
} from './github/github-codespace-utilities';
import { UtilityGitHubReadFile } from './utilities/utility_github_read_file';
import { UtilityGitHubUpdateFile } from './utilities/utility_github_update_file';
import { UtilityGitHubListDirectory } from './utilities/utility_github_list_directory';
import { UtilityGitHubLintCode } from './utilities/utility_github_lint_code';
import { UtilityGitHubCreateFile } from './utilities/utility_github_create_file';
import { UtilityGitHubGetCode } from './utilities/utility_github_get_code';
import { UtilityGitHubDeployCode } from './utilities/utility_github_deploy_code';
import { UtilityGitHubRunCode } from './utilities/utility_github_run_code';

/**
 * Get current date and time in different formats
 * @param data Request with optional format
 * @returns Promise with the formatted date and time response
 */
export async function getCurrentDateTime(data?: DateTimeRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values since we're using it directly
    const dateTimeUtility = new UtilityGetCurrentDateTime({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function with the provided format
    const result = await dateTimeUtility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("DateTime utility error:", error);
    return {
      error: "Failed to get current date and time",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a GitHub Codespace
 * Uses environment variables for security (no input required)
 * @returns Promise with the created codespace information
 */
export async function createGitHubCodespace(): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values since we're using it directly
    const codespaceUtility = new GitHubCreateCodespaceUtility({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function with empty input (will use environment variables)
    const result = await codespaceUtility._call({});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Codespace utility error:", error);
    return {
      error: "Failed to create GitHub Codespace",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Destroy a GitHub Codespace
 * @param data Request with the codespaceId
 * @returns Promise with the destruction result
 */
export async function destroyGitHubCodespace(data: any): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values since we're using it directly
    const codespaceUtility = new GitHubDestroyCodespaceUtility({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function with the provided data
    const result = await codespaceUtility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Codespace utility error:", error);
    return {
      error: "Failed to destroy GitHub Codespace",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Read a file from a GitHub repository
 * @param data Request with repository and file details
 * @returns Promise with the file content
 */
export async function readGitHubFile(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubReadFile({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Read File utility error:", error);
    return {
      error: "Failed to read file from GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Update a file in a GitHub repository
 * @param data Request with repository, file details and content
 * @returns Promise with the update result
 */
export async function updateGitHubFile(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubUpdateFile({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Update File utility error:", error);
    return {
      error: "Failed to update file in GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * List directory contents in a GitHub repository
 * @param data Request with repository and directory details
 * @returns Promise with the directory contents
 */
export async function listGitHubDirectory(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubListDirectory({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub List Directory utility error:", error);
    return {
      error: "Failed to list directory in GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Lint code in a GitHub repository
 * @param data Request with repository and code details
 * @returns Promise with the lint results
 */
export async function lintGitHubCode(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubLintCode({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Lint Code utility error:", error);
    return {
      error: "Failed to lint code in GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a file in a GitHub repository
 * @param data Request with repository, file details and content
 * @returns Promise with the creation result
 */
export async function createGitHubFile(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubCreateFile({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Create File utility error:", error);
    return {
      error: "Failed to create file in GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get code from a GitHub repository
 * @param data Request with repository details
 * @returns Promise with the repository code
 */
export async function getGitHubCode(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubGetCode({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Get Code utility error:", error);
    return {
      error: "Failed to get code from GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Deploy code to a GitHub repository
 * @param data Request with repository and deployment details
 * @returns Promise with the deployment result
 */
export async function deployGitHubCode(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubDeployCode({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Deploy Code utility error:", error);
    return {
      error: "Failed to deploy code to GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run code in a GitHub repository
 * @param data Request with repository and code details
 * @returns Promise with the execution result
 */
export async function runGitHubCode(data: any): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubRunCode({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call(data || {});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub Run Code utility error:", error);
    return {
      error: "Failed to run code in GitHub",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process utility operation
 * @param operation Operation to perform
 * @param data Optional data for the operation
 * @returns Promise with the response from the operation
 */
export async function processUtilityOperation(
  operation: UtilityOperation, 
  data?: any
): Promise<UtilityResponse> {
  switch (operation) {
    case 'utility_get_current_datetime':
      return getCurrentDateTime(data);
    case 'utility_github_create_codespace':
      // Ignore any input data for security reasons
      return createGitHubCodespace();
    case 'utility_github_destroy_codespace':
      return destroyGitHubCodespace(data);
    case 'utility_github_read_file':
      return readGitHubFile(data);
    case 'utility_github_update_file':
      return updateGitHubFile(data);
    case 'utility_github_list_directory':
      return listGitHubDirectory(data);
    case 'utility_github_lint_code':
      return lintGitHubCode(data);
    case 'utility_github_create_file':
      return createGitHubFile(data);
    case 'utility_github_get_code':
      return getGitHubCode(data);
    case 'utility_github_deploy_code':
      return deployGitHubCode(data);
    case 'utility_github_run_code':
      return runGitHubCode(data);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
} 