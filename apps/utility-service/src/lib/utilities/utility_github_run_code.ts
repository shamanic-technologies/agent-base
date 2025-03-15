/**
 * GitHub Run Code Utility
 * 
 * Executes code from a GitHub repository.
 * 
 * Note: This utility functions differently due to the removal of local file operations.
 * It now returns a message indicating that running code requires local file operations,
 * which have been removed for security reasons.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for executing code in a GitHub repository
 * 
 * Note: Local file operations have been disabled for security reasons
 */
export class UtilityGitHubRunCode extends GitHubBaseUtility {
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
      name: "utility_github_run_code",
      description: "Run code in a GitHub repository (Note: Direct code execution has been disabled for security reasons)",
      conversationId,
      parentNodeId,
      parentNodeType,
    });
  }

  /**
   * Get the schema for the utility
   */
  getSchema(): z.ZodType<any, any> {
    return this.baseSchema.extend({
      owner: z.string().describe("Repository owner (username or organization)"),
      repo: z.string().describe("Repository name"),
      path: z.string().describe("Path to the file to execute"),
      args: z.array(z.string()).optional().describe("Arguments to pass to the script"),
      branch: z.string().optional().describe("Branch name (defaults to the default branch)"),
    });
  }

  /**
   * Execute code in a GitHub repository
   * 
   * Note: This method no longer performs actual code execution due to security concerns
   * with local file operations. Instead, it returns a message explaining the limitation.
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);

      // Parse input to validate the parameters
      this.getSchema().parse(params);

      // Return message explaining why code execution is not available
      return JSON.stringify({
        success: false,
        error: "Direct code execution has been disabled for security reasons. Running code requires local file operations which pose security risks. Please use GitHub Actions or similar CI tools for executing code in your repository."
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to parse input',
      });
    }
  }
} 