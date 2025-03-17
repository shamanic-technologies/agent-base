/**
 * GitHub Create Codespace Utility
 * 
 * Creates a GitHub Codespace for a repository.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";
import { getCodespacesClient } from "../github/codespaces-client.js";

/**
 * Utility for creating GitHub Codespaces
 * 
 * Creates a cloud development environment for a GitHub repository
 * Uses environment variables for security (no user input)
 */
export class UtilityGitHubCreateCodespace extends GitHubBaseUtility {
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
    super({
      name: "utility_github_create_codespace",
      description: "Create a GitHub Codespace in the default repository",
      conversationId,
      parentNodeId,
      parentNodeType,
      userId
    });
  }

  /**
   * Get the schema for the utility
   */
  getSchema(): z.ZodType<any, any> {
    // Empty schema - no input is accepted for security reasons
    return z.object({}).strict();
  }

  /**
   * Create a GitHub Codespace
   */
  async _call(_input: string | Record<string, unknown>): Promise<string> {
    try {
      // Read values from environment variables only
      const owner = process.env.GITHUB_OWNER;
      const repo = process.env.GITHUB_REPO;
      const branch = "main"; // Fixed default
      const workDir = "apps/utility-service"; // Fixed default
      
      if (!owner || !repo) {
        throw new Error("Environment variables GITHUB_OWNER and GITHUB_REPO must be set");
      }

      console.log(`Creating codespace for ${owner}/${repo} (branch: ${branch}, workDir: ${workDir})`);
      
      // Use the existing codespaces client
      const codespaceClient = getCodespacesClient();
      const codespaceId = await codespaceClient.createCodespace(owner, repo, branch, workDir);
      
      return JSON.stringify({
        codespaceId,
        status: "available",
        workDir
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