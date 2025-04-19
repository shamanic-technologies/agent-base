import { ServiceResponse } from "./common.js";
import { JsonSchema } from "./utility.js";

/**
   * Standard interface for all utility tools in the system
   */
export interface InternalUtilityTool {
    id: string;   /** Unique identifier for the utility */
    description: string;  /** Human-readable description of what the utility does */
    schema: Record<string, JsonSchema>; // Schema defining the input parameters for the utility
    /**
     * The execution function for the utility
     * @param userId ID of the user making the request
     * @param conversationId ID of the conversation context
     * @param params Input parameters for the utility
     * @param agentId ID of the agent making the request
     * @returns Result of the utility execution
     */
    execute: (userId: string, conversationId: string, params: any, agentId?: string) => Promise<any>;
}


  /**
   * UtilityInfo, UtilitiesListResponse, UtilityInfoResponse
   */
  export interface InternalUtilityInfo {
    id: string;
    description: string;
    schema: Record<string, JsonSchema>;
  };

