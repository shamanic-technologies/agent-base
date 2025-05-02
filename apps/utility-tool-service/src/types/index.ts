/**
 * Type definitions for Utility Tool Service
 */

// export interface UtilityToolSchema {
//   zod: z.ZodType;
//   examples?: any[];
// }
// /**
//  * Standard interface for all utility tools in the system
//  */
// export interface UtilityTool {
//   id: string;   /** Unique identifier for the utility */
//   description: string;  /** Human-readable description of what the utility does */
//   schema: Record<string, UtilityToolSchema>; // Schema defining the input parameters for the utility
//   /**
//    * The execution function for the utility
//    * @param userId ID of the user making the request
//    * @param conversationId ID of the conversation context
//    * @param params Input parameters for the utility
//    * @param agentId ID of the agent making the request
//    * @returns Result of the utility execution
//    */
//   execute: (userId: string, conversationId: string, params: any, agentId?: string) => Promise<any>;
// }


// export interface ExternalUtilityTool extends UtilityTool {
//   provider: UtilityProvider;
//   requiredSecrets: UtilitySecret[];
//   requiredOauth: boolean;
// }


// /**
//  * Core request structure
//  */
// export interface UtilityRequest {
//   operation?: string;
//   input?: any;
//   conversation_id: string;
//   redirect_url?: string;
// }

// /**
//  * Standardized auth needed response for all providers
//  */
// export interface SetupNeededResponse {
//   status: 'success';
//   data: {
//     needs_setup: true;
//     setup_url: string;
//     provider: string;
//     message: string;
//     title: string;
//     description: string;
//     button_text: string;
//   }
// }

// /**
//  * UtilityInfo, UtilitiesListResponse, UtilityInfoResponse
//  */
// export type UtilityInfo = {
//   id: string;
//   description: string;
//   schema: Record<string, UtilityToolSchema>;
// };

// export type UtilitiesListResponse = {
//   utilities: string[];
// };
// export type UtilityInfoResponse = UtilityInfo | {
//   error: string;
// };
