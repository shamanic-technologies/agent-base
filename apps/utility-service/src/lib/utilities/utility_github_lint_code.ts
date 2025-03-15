/**
 * GitHub Lint Code Utility
 * 
 * Lints code from a GitHub repository.
 * 
 * Note: This utility functions differently due to the removal of local file operations.
 * It now returns a message indicating that linting requires local file operations,
 * which have been removed for security reasons.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for linting code in a GitHub repository
 * 
 * Note: Local file operations have been disabled for security reasons
 */
export class UtilityGitHubLintCode extends GitHubBaseUtility {
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
      name: "utility_github_lint_code",
      description: "Lint code in a GitHub repository (Note: Direct linting has been disabled for security reasons)",
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
      path: z.string().optional().describe("Path to the file or directory to lint"),
      branch: z.string().optional().describe("Branch name (defaults to the default branch)"),
    });
  }

  /**
   * Lint code in a GitHub repository
   * 
   * Note: This method no longer performs actual linting due to security concerns
   * with local file operations. Instead, it returns a message explaining the limitation.
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);

      // Parse input to validate the parameters
      this.getSchema().parse(params);

      // Return message explaining why linting is not available
      return JSON.stringify({
        success: false,
        error: "Direct code linting has been disabled for security reasons. Linting requires local file operations which pose security risks. Please use GitHub Actions or similar CI tools for linting code in your repository."
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to parse input',
      });
    }
  }
}