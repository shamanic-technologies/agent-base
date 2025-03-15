/**
 * GitHub List Codespaces Utility
 * 
 * Lists GitHub Codespaces for the authenticated user.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";
import { getCodespacesClient } from "../github/codespaces-client.js";

/**
 * Utility for listing GitHub Codespaces
 */
export class UtilityGitHubListCodespaces extends GitHubBaseUtility {
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
      name: "utility_github_list_codespaces",
      description: "List GitHub Codespaces for the authenticated user",
      conversationId,
      parentNodeId,
      parentNodeType,
    });
  }

  /**
   * Get the schema for the utility
   */
  getSchema(): z.ZodType<any, any> {
    return z.object({}).strict();
  }

  /**
   * List GitHub Codespaces
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      // Use the existing codespaces client
      const codespaceClient = getCodespacesClient();
      
      // List codespaces
      const codespaces = await codespaceClient.listCodespaces();
      
      return JSON.stringify({
        success: true,
        data: {
          total_count: codespaces.length,
          codespaces: codespaces.map(space => ({
            id: space.id,
            name: space.name,
            display_name: space.display_name,
            state: space.state,
            url: space.web_url,
            repository: space.repository ? {
              id: space.repository.id,
              name: space.repository.name,
              full_name: space.repository.full_name
            } : null,
            created_at: space.created_at,
            last_used_at: space.last_used_at,
          }))
        }
      }, null, 2);
    } catch (error: any) {
      console.error(`Error in ${this.name}:`, error);
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to list codespaces',
      }, null, 2);
    }
  }
} 