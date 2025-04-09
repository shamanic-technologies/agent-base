/**
 * Utility Registry
 * 
 * Centralized registry for all utility tools
 */
import { UtilityTool, UtilityInfo } from '../types/index.js';

/**
 * Registry class for managing utility tools
 */
class UtilityRegistry {
  private utilities: Map<string, UtilityTool> = new Map();
  
  /**
   * Register a utility tool
   * @param utility The utility tool to register
   */
  register(utility: UtilityTool): void {
    this.utilities.set(utility.id, utility);
    console.log(`📦 Registered utility: ${utility.id}`);
  }
  
  /**
   * Get a specific utility by ID
   * @param id The ID of the utility to retrieve
   * @returns The utility if found, undefined otherwise
   */
  getUtility(id: string): UtilityTool | undefined {
    return this.utilities.get(id);
  }
  
  /**
   * Get all registered utilities
   * @returns Array of all registered utilities
   */
  getAllUtilities(): UtilityTool[] {
    return Array.from(this.utilities.values());
  }
  
  /**
   * Get IDs of all registered utilities
   * @returns Array of utility IDs
   */
  getUtilityIds(): string[] {
    return Array.from(this.utilities.keys());
  }
  
  /**
   * List all available utilities with their metadata
   * @returns Array of utility information objects
   */
  listUtilities(): UtilityInfo[] {
    return this.getAllUtilities().map(utility => ({
      id: utility.id,
      description: utility.description,
      schema: utility.schema
    }));
  }
  
  /**
   * Execute a utility with the given parameters
   * @param utilityId The ID of the utility to execute
   * @param userId The ID of the user making the request
   * @param conversationId The ID of the conversation context
   * @param params The parameters to pass to the utility
   * @param agentId The ID of the agent making the request
   * @returns The result of the utility execution or an error
   */
  async execute(
    utilityId: string,
    userId: string,
    conversationId: string,
    params: any,
    agentId?: string
  ): Promise<any> {
    const utility = this.getUtility(utilityId);
    
    if (!utility) {
      return {
        error: `Utility with ID '${utilityId}' not found`,
        available_utilities: this.getUtilityIds()
      };
    }
    
    try {
      console.log(`⚙️ Executing utility: ${utilityId}`);
      return await utility.execute(userId, conversationId, params, agentId);
    } catch (error) {
      console.error(`❌ Error executing utility ${utilityId}:`, error);
      return {
        error: `Error executing utility ${utilityId}`,
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Singleton instance
export const registry = new UtilityRegistry(); 