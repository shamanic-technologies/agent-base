/**
 * Utility Registry
 * 
 * Centralized registry for all utility tools
 */
import { InternalUtilityTool, 
  InternalUtilityInfo,
  UtilitiesList,
  UtilitiesListItem,
  ServiceResponse
} from '@agent-base/types';

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
  getInternalUtility(id: string): ServiceResponse<InternalUtilityTool> | undefined {
    const utility = this.utilities.get(id);
    if (!utility) {
      return { success: false, error: `Utility with ID '${id}' not found in registry.` };
    }
    return { success: true, data: utility };
  }
  
  /**
   * Get all registered INTERNAL utilities
   * @returns Array of all registered utilities
   */
  getAllInternalUtilities(): ServiceResponse<InternalUtilityTool[]> {
    return { success: true, data: Array.from(this.utilities.values()) };
  }
  
  /**
   * Get IDs of all registered INTERNAL utilities
   * @returns Array of utility IDs
   */
  getInternalUtilityIds(): ServiceResponse<string[]> {
    return { success: true, data: Array.from(this.utilities.keys()) };
  }
  
  /**
   * List all available INTERNAL utilities with their metadata
   * @returns Array of utility information objects
   */
  listInternalUtilities(): ServiceResponse<UtilitiesList> {
    const utilities = this.getAllInternalUtilities();
    if (!utilities.success) {
      return { success: false, error: utilities.error };
    }
    return { success: true, data: utilities.data.map(utility => ({
      id: utility.id,
      description: utility.description,
    } as UtilitiesListItem)) };
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
    userId: string,
    conversationId: string,
    params: any,
    agentId?: string
  ): Promise<ServiceResponse<any>> {
    const utilityResponse = this.getInternalUtility(utilityId);
    
    if (!utilityResponse.success) {
      console.error(`[Registry] Attempted to execute non-existent internal utility: ${utilityId}`);
      throw new Error(`Internal utility with ID '${utilityId}' not found in registry.`);
    }
    
    try {
      console.log(`⚙️ Executing internal utility: ${utilityId}`);
      return await utilityResponse.data.execute(userId, conversationId, params, agentId);
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