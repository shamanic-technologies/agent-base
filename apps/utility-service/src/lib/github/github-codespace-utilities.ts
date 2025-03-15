/**
 * GitHub Codespace Utilities
 * 
 * Utilities for creating and managing GitHub Codespaces.
 */

import { z } from "zod";
import { getCodespacesClient } from "./codespaces-client";
import { GitHubBaseUtility } from "./github-base-utility";
import { 
  GitHubCreateCodespaceRequest, 
  GitHubDestroyCodespaceRequest,
  GitHubCodespaceResponse,
  NodeType,
  ParentNodeType,
  ThreadId,
  NodeId,
  ParentNodeId
} from "../../types";

/**
 * Utility to create a new GitHub Codespace
 * Creates a cloud development environment for a GitHub repository
 * Uses environment variables for security (no user input)
 */
export class GitHubCreateCodespaceUtility extends GitHubBaseUtility {
  constructor({
    conversationId,
    parentNodeId,
    parentNodeType
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
  }) {
    super({
      name: "utility_github_create_codespace",
      description: "Creates a new GitHub Codespace using environment variables (no input required)",
      conversationId,
      parentNodeId,
      parentNodeType
    });
  }

  /**
   * Get the schema for this utility
   * @returns An empty schema as no input is accepted
   */
  getSchema(): z.ZodType<any, any> {
    // Empty schema - no input is accepted for security reasons
    return z.object({}).strict();
  }

  /**
   * Create a new GitHub Codespace using environment variables
   * @returns Codespace information as a JSON string
   */
  async _call(_input: string | Record<string, any>): Promise<string> {
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
      
      const codespaceClient = getCodespacesClient();
      const codespaceId = await codespaceClient.createCodespace(owner, repo, branch, workDir);
      
      const response: GitHubCodespaceResponse = {
        codespaceId,
        status: "available",
        workDir
      };
      
      return JSON.stringify(response, null, 2);
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }
}

/**
 * Utility to destroy a GitHub Codespace
 * Cleans up cloud resources when they're no longer needed
 */
export class GitHubDestroyCodespaceUtility extends GitHubBaseUtility {
  constructor({
    conversationId,
    parentNodeId,
    parentNodeType
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
  }) {
    super({
      name: "utility_github_destroy_codespace",
      description: "Destroys a GitHub Codespace",
      conversationId,
      parentNodeId,
      parentNodeType
    });
  }

  /**
   * Get the schema for this utility
   * @returns The zod schema for the input
   */
  getSchema(): z.ZodType<any, any> {
    return z.object({
      codespaceId: z.string().describe("ID of the codespace to destroy")
    });
  }

  /**
   * Destroy a GitHub Codespace
   * @param input Input containing codespace ID
   * @returns Success message as a JSON string
   */
  async _call(input: string | Record<string, any>): Promise<string> {
    try {
      const params = this.parseInput(input) as GitHubDestroyCodespaceRequest;
      const { codespaceId } = params;
      
      if (!codespaceId) {
        throw new Error("Codespace ID is required");
      }

      const codespaceClient = getCodespacesClient();
      await codespaceClient.destroyCodespace(codespaceId);
      
      return JSON.stringify({
        message: `Codespace ${codespaceId} has been destroyed successfully`
      }, null, 2);
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }
} 