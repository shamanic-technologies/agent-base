/**
 * Utility Functions
 * 
 * Core functionality for the utility service
 */
import { 
  AlterTableRequest,
  CreateTableRequest, 
  DateTimeRequest, 
  DeleteTableRequest,
  FireCrawlExtractContentRequest, 
  GetTableRequest,
  GoogleSearchRequest, 
  QueryTableRequest,
  UtilityOperation, 
  UtilityResponse 
} from '../types/index.js';
import { UtilityGetCurrentDateTime } from './utilities/utility_get_current_datetime.js';
import { UtilityGitHubReadFile } from './utilities/utility_github_read_file.js';
import { UtilityGitHubUpdateFile } from './utilities/utility_github_update_file.js';
import { UtilityGitHubListDirectory } from './utilities/utility_github_list_directory.js';
import { UtilityGitHubLintCode } from './utilities/utility_github_lint_code.js';
import { UtilityGitHubCreateFile } from './utilities/utility_github_create_file.js';
import { UtilityGitHubGetCode } from './utilities/utility_github_get_code.js';
import { UtilityGitHubDeployCode } from './utilities/utility_github_deploy_code.js';
import { UtilityGitHubRunCode } from './utilities/utility_github_run_code.js';
import { UtilityGitHubListCodespaces } from './utilities/utility_github_list_codespaces.js';
import { UtilityGitHubCreateCodespace } from './utilities/utility_github_create_codespace.js';
import { UtilityGitHubDestroyCodespace } from './utilities/utility_github_destroy_codespace.js';
import { UtilityFireCrawlExtractContent } from './utilities/utility_firecrawl_extract_content.js';
import { UtilityGoogleSearch } from './utilities/utility_google_search.js';
import { UtilityGetDatabase } from './utilities/utility_get_database.js';
import { UtilityCreateTable } from './utilities/utility_create_table.js';
import { UtilityAlterTable } from './utilities/utility_alter_table.js';
import { UtilityDeleteTable } from './utilities/utility_delete_table.js';
import { UtilityGetTable } from './utilities/utility_get_table.js';
import { UtilityQueryTable } from './utilities/utility_query_table.js';

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
    const codespaceUtility = new UtilityGitHubCreateCodespace({
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
    const codespaceUtility = new UtilityGitHubDestroyCodespace({
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
 * List GitHub Codespaces for the authenticated user
 * @returns Promise with the list of codespaces
 */
export async function listGitHubCodespaces(): Promise<UtilityResponse> {
  try {
    const utility = new UtilityGitHubListCodespaces({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    const result = await utility._call({});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("GitHub List Codespaces utility error:", error);
    return {
      error: "Failed to list GitHub Codespaces",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Extract content from a web page using FireCrawl
 * @param data Request with URL and options
 * @returns Promise with the extracted markdown content
 */
export async function extractFireCrawlContent(data: FireCrawlExtractContentRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values since we're using it directly
    const fireCrawlUtility = new UtilityFireCrawlExtractContent({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function with the provided URL
    const result = await fireCrawlUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("FireCrawl extraction error:", error);
    return {
      error: "Failed to extract web content",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Perform a Google Search
 * @param data Request with search query and options
 * @returns Promise with the search results
 */
export async function performGoogleSearch(data: GoogleSearchRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values since we're using it directly
    const googleSearchUtility = new UtilityGoogleSearch({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function with the provided search query
    const result = await googleSearchUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Google Search error:", error);
    return {
      error: "Failed to perform Google Search",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get database information including tables and schemas
 * @returns Promise with the database information response
 */
export async function getDatabase(): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values
    const databaseUtility = new UtilityGetDatabase({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function to get database information
    const result = await databaseUtility._call({});
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Get database utility error:", error);
    return {
      error: "Failed to get database information",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a new table in the database
 * @param data Request with table name, description, and schema
 * @returns Promise with the table creation response
 */
export async function createTable(data: CreateTableRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values
    const createTableUtility = new UtilityCreateTable({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function to create a table
    const result = await createTableUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Create table utility error:", error);
    return {
      error: "Failed to create table",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Alter an existing table in the database
 * @param data Request with table ID and optional new name, description, and schema
 * @returns Promise with the table alteration response
 */
export async function alterTable(data: AlterTableRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values
    const alterTableUtility = new UtilityAlterTable({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function to alter a table
    const result = await alterTableUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Alter table utility error:", error);
    return {
      error: "Failed to alter table",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete an existing table from the database
 * @param data Request with table ID
 * @returns Promise with the table deletion response
 */
export async function deleteTable(data: DeleteTableRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values
    const deleteTableUtility = new UtilityDeleteTable({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function to delete a table
    const result = await deleteTableUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Delete table utility error:", error);
    return {
      error: "Failed to delete table",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get information about a specific table in the database
 * @param data Request with table ID
 * @returns Promise with the table information response
 */
export async function getTable(data: GetTableRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values
    const getTableUtility = new UtilityGetTable({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function to get table information
    const result = await getTableUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Get table utility error:", error);
    return {
      error: "Failed to get table information",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Query a specific table in the database
 * @param data Request with table ID and query
 * @returns Promise with the query results
 */
export async function queryTable(data: QueryTableRequest): Promise<UtilityResponse> {
  try {
    // Create a utility instance with placeholder values
    const queryTableUtility = new UtilityQueryTable({
      conversationId: 'direct-api-call',
      parentNodeId: null,
      parentNodeType: null
    });
    
    // Call the utility function to query a table
    const result = await queryTableUtility._call(data);
    
    return {
      data: result
    };
  } catch (error) {
    console.error("Query table utility error:", error);
    return {
      error: "Failed to query table",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Process utility operation request
 * @param operation The utility operation to perform
 * @param data Optional data for the operation
 * @returns Promise with the operation response
 */
export async function processUtilityOperation(
  operation: UtilityOperation, 
  data?: any
): Promise<UtilityResponse> {
  try {
    // Process based on operation type
    switch (operation) {
      case 'utility_get_current_datetime':
        return await getCurrentDateTime(data);
      
      // GitHub Operations
      case 'utility_github_read_file':
        return await readGitHubFile(data);
      case 'utility_github_update_file':
        return await updateGitHubFile(data);
      case 'utility_github_list_directory':
        return await listGitHubDirectory(data);
      case 'utility_github_lint_code':
        return await lintGitHubCode(data);
      case 'utility_github_create_file':
        return await createGitHubFile(data);
      case 'utility_github_get_code':
        return await getGitHubCode(data);
      case 'utility_github_deploy_code':
        return await deployGitHubCode(data);
      case 'utility_github_run_code':
        return await runGitHubCode(data);
      case 'utility_github_create_codespace':
        return await createGitHubCodespace();
      case 'utility_github_destroy_codespace':
        return await destroyGitHubCodespace(data);
      case 'utility_github_list_codespaces':
        return await listGitHubCodespaces();
        
      // Content and Search Operations
      case 'utility_firecrawl_extract_content':
        return await extractFireCrawlContent(data);
      case 'utility_google_search':
        return await performGoogleSearch(data);
        
      // Database Operations
      case 'utility_get_database':
        return await getDatabase();
      case 'utility_create_table':
        return await createTable(data);
      case 'utility_alter_table':
        return await alterTable(data);
      case 'utility_delete_table':
        return await deleteTable(data);
      case 'utility_get_table':
        return await getTable(data);
      case 'utility_query_table':
        return await queryTable(data);
        
      default:
        return {
          error: `Unknown utility operation: ${operation}`
        };
    }
  } catch (error) {
    console.error(`Error processing utility operation ${operation}:`, error);
    return {
      error: `Failed to process utility operation: ${operation}`,
      details: error instanceof Error ? error.message : String(error)
    };
  }
} 