/**
 * Utility Registry
 * 
 * Centralized registry for all utility tools
 */
import { InternalUtilityTool, 
  InternalUtilityInfo,
  UtilitiesList,
  UtilitiesListItem,
  ServiceResponse,
  ExecuteToolResult
} from '@agent-base/types';
import { logInternalToolExecution } from '@agent-base/neon-client';

/**
 * Registry class for managing utility tools
 */
class InternalUtilityRegistry {
  private utilities: Map<string, InternalUtilityTool> = new Map();
  
  /**
   * Register a utility tool
   * @param utility The utility tool to register
   */
  register(utility: InternalUtilityTool): void {
    this.utilities.set(utility.id, utility);
    console.log(`📦 Registered utility: ${utility.id}`);
  }
  
  /**
   * Get a specific INTERNAL utility by ID
   * @param id The ID of the utility to retrieve
   * @returns The utility if found, undefined otherwise
   */
  getInternalUtility(id: string): InternalUtilityTool | undefined {
    return this.utilities.get(id);
  }
  
  /**
   * Get all registered INTERNAL utilities
   * @returns Array of all registered utilities
   */
  getAllInternalUtilities(): InternalUtilityTool[] {
    return Array.from(this.utilities.values());
  }
  
  /**
   * Get IDs of all registered INTERNAL utilities
   * @returns Array of utility IDs
   */
  getInternalUtilityIds(): string[] {
    return Array.from(this.utilities.keys());
  }
  
  /**
   * List all available INTERNAL utilities with their metadata
   * @returns Array of utility information objects
   */
  listInternalUtilities(): UtilitiesList {
    return this.getAllInternalUtilities().map(utility => ({
      id: utility.id,
      description: utility.description,
    } as UtilitiesListItem));
  }
  
  /**
   * List all available CLIENT-SIDE utilities with their metadata
   * @returns Array of utility information objects
   */
  listClientSideUtilities(): InternalUtilityInfo[] {
    return this.getAllInternalUtilities()
      .filter(utility => !utility.execute)
      .map(utility => ({
        id: utility.id,
        description: utility.description,
        schema: utility.schema,
      }));
  }
  
  /**
   * Execute an INTERNAL utility with the given parameters
   * @param utilityId The ID of the utility to execute
   * @param userId The ID of the user making the request
   * @param conversationId The ID of the conversation context
   * @param params The parameters to pass to the utility
   * @param agentId The ID of the agent making the request
   * @returns The result of the utility execution or an error
   */
  async executeInternalUtility(
    utilityId: string,
    clientUserId: string,
    clientOrganizationId: string,
    platformUserId: string,
    platformApiKey: string,
    conversationId: string,
    params: any,
    agentId?: string
  ): Promise<ServiceResponse<ExecuteToolResult>> {
    const utility = this.getInternalUtility(utilityId);
    
    if (!utility) {
      console.error(`[Registry] Attempted to execute non-existent internal utility: ${utilityId}`);
      throw new Error(`Internal utility with ID '${utilityId}' not found in registry.`);
    }
    
    if (!utility.execute) {
      const errorMsg = `Utility '${utilityId}' is not executable on the server-side.`;
      console.error(`[Registry] ${errorMsg}`);
      return {
        success: false,
        error: 'Tool not executable on server.',
        details: errorMsg,
        hint: 'Call this tool directly with its id, bypassing utility_call_utility.'
      };
    }

    try {
      const executeToolResult: ServiceResponse<ExecuteToolResult> = await utility.execute(clientUserId, clientOrganizationId, platformUserId, platformApiKey, conversationId, params, agentId);
      console.debug(`⚙️ Internal utility execution result:`, executeToolResult);

      // Log the execution without blocking the response
      if (executeToolResult.success) {
        try {
          await logInternalToolExecution(utility, params, executeToolResult.data);
          console.debug(`[Registry] Successfully logged execution for ${utilityId}`);
        } catch (logError) {
          console.error(`[Registry] FAILED to log execution for ${utilityId}:`, logError);
          // Do not throw or return an error here, the primary execution was successful.
        }
      }

      return executeToolResult;
    } catch (error) {
      console.error(`❌ Error executing internal utility ${utilityId}:`, error);
      return {
        success: false,
        error: `Error executing internal utility ${utilityId}`,
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Singleton instance
export const registry = new InternalUtilityRegistry(); 