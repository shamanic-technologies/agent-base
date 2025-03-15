/**
 * GitHub Destroy Codespace Utility
 * 
 * Deletes a GitHub Codespace.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";
import { getCodespacesClient } from "../github/codespaces-client.js";

/**
 * Utility for destroying GitHub Codespaces
 * 
 * Cleans up cloud resources when they're no longer needed
 */
export class UtilityGitHubDestroyCodespace extends GitHubBaseUtility {
  constructor({
    conversationId,
    parentNodeId,
    parentNodeType,
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
  }) {
    super({
      name: "utility_github_destroy_codespace",
      description: "Delete a GitHub Codespace",
      conversationId,
      parentNodeId,
      parentNodeType,
    });
  }

  /**
   * Get the schema for the utility
   */
  getSchema(): z.ZodType<any, any> {
    return z.object({
      codespaceId: z.string().describe("ID of the codespace to destroy")
    });
  }

  /**
   * Destroy a GitHub Codespace
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);
      const { codespaceId } = this.getSchema().parse(params);
      
      if (!codespaceId) {
        throw new Error("Codespace ID is required");
      }

      // Use the existing codespaces client
      const codespaceClient = getCodespacesClient();
      await codespaceClient.destroyCodespace(codespaceId);
      
      return JSON.stringify({
        success: true,
        message: `Codespace ${codespaceId} has been destroyed successfully`
      }, null, 2);
    } catch (error: any) {
      console.error(`Error in ${this.name}:`, error);
      return JSON.stringify({ 
        success: false,
        error: error.message 
      }, null, 2);
    }
  }
} 