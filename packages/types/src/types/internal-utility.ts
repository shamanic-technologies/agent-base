import { ServiceResponse } from "./common.js";
// @ts-ignore
import type { JSONSchema7 } from 'json-schema'; // Import JSONSchema7

/**
   * Standard interface for all utility tools in the system
   */
export interface InternalUtilityTool {
    id: string;   /** Unique identifier for the utility */
    description: string;  /** Human-readable description of what the utility does */
    schema: JSONSchema7; // Schema defining the input parameters for the utility
    /**
     * The execution function for the utility
     * @param clientUserId ID of the user making the request
     * @param conversationId ID of the conversation context
     * @param params Input parameters for the utility
     * @param agentId ID of the agent making the request
     * @returns Result of the utility execution
     */
    execute: (
        clientUserId: string,
        platformUserId: string,
        platformApiKey: string,
        conversationId: string,
        params: any,
        agentId?: string
    ) => Promise<any>;
}


  /**
   * UtilityInfo, UtilitiesListResponse, UtilityInfoResponse
   */
  export interface InternalUtilityInfo {
    id: string;
    description: string;
    schema: JSONSchema7;
  };

