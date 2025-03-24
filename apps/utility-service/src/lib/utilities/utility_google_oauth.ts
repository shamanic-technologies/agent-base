/**
 * Google OAuth Utility Tool
 * 
 * A tool that generates a Google OAuth button for the frontend that connects to auth-service.
 * When rendered in the UI, this creates a "Continue with Google" button that triggers OAuth flow.
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import { 
  NodeId, 
  NodeType, 
  ParentNodeId, 
  ParentNodeType, 
  ThreadId,
  GoogleOAuthRequest, 
  GoogleOAuthResponse 
} from "../../types/index.js";

/**
 * A Google OAuth utility tool that provides authentication integration with auth-service
 */
export class UtilityGoogleOAuth extends Tool {
  name = "utility_google_oauth";
  description = `
    Use this tool to generate a Google OAuth flow button.
    The user will be presented with a "Continue with Google" button in the UI.
    When clicked, they will be redirected to Google's OAuth consent screen.
    After authorization, their credentials will be saved in the auth-service.
  `;
  
  // Store conversation and node information
  conversationId: ThreadId;
  nodeId = this.name as NodeId;
  nodeType = NodeType.UTILITY;
  parentNodeId: ParentNodeId;
  parentNodeType: ParentNodeType;
  userId?: string;
  
  // Define the input schema for the utility
  utilitySchema = z.object({
    conversation_id: z.string().describe(
      "The conversation ID for tracking the OAuth request context"
    )
  });

  // Tool configuration options for LangGraph
  configurable: { thread_id: string };
  
  // Tool metadata properties
  toolMetadata: {
    node_id: NodeId;
    node_type: NodeType;
    parent_node_id: ParentNodeId;
    parent_node_type: ParentNodeType;
    user_id?: string;
  };
  
  constructor({ 
    conversationId,
    parentNodeId,
    parentNodeType,
    userId
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
    userId?: string;
  }) {
    super();
    
    // Initialize conversation info
    this.conversationId = conversationId;
    this.parentNodeId = parentNodeId;
    this.parentNodeType = parentNodeType;
    this.userId = userId;
    
    // Set the configurable options
    this.configurable = {
      thread_id: this.conversationId
    };
    
    // Set the tool metadata
    this.toolMetadata = {
      node_id: this.nodeId,
      node_type: this.nodeType,
      parent_node_id: this.parentNodeId,
      parent_node_type: this.parentNodeType,
      user_id: this.userId
    };
  }
  
  // Method to get metadata (instead of overriding the property)
  getMetadata() {
    return this.toolMetadata;
  }
  
  // Override the schema method to provide a valid Zod schema
  getSchema() {
    return this.utilitySchema;
  }
  
  async _call(input: GoogleOAuthRequest): Promise<string> {
    console.log(`Generating Google OAuth with input:`, input);
    
    try {
      // Parse input - handle both string and object formats
      


      

      
      // Define default scopes - hardcoded for simplicity
      const scopes = [
        'profile',
        'email'
      ];
      
      // Get auth-service URL from environment or use default
      const authServiceUrl = process.env.AUTH_SERVICE_URL;
      
      // Construct the OAuth URL that directs to auth-service
      // The auth-service will handle the rest of the OAuth flow
      const oauthUrl = new URL(`${authServiceUrl}/oauth/google`);
      
      // Add frontend URL as origin for auth-service to redirect back to
      oauthUrl.searchParams.append('origin', input.redirect_url);
      

      // Construct the response with button data
      const response: GoogleOAuthResponse = {
        button_data: {
          type: 'oauth_button',
          provider: 'google',
          text: 'Continue with Google',
          icon: 'google',
          url: oauthUrl.toString(),
          scopes: scopes
        }
      };
      
      // Return JSON string for the frontend to parse
      return JSON.stringify(response);
    } catch (error) {
      console.error("Google OAuth utility error:", error);
      return JSON.stringify({
        error: `Failed to generate Google OAuth: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
} 