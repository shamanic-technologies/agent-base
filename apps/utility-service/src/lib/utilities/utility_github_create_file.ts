/**
 * GitHub Create File Utility
 * 
 * Creates a new file in a GitHub repository.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for creating files in a GitHub repository
 */
export class UtilityGitHubCreateFile extends GitHubBaseUtility {
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
      name: "utility_github_create_file",
      description: "Create a new file in a GitHub repository",
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
      path: z.string().describe("Path to the file to create"),
      content: z.string().describe("Content of the file"),
      branch: z.string().optional().describe("Branch name (defaults to the default branch)"),
      commitMessage: z.string().optional().describe("Commit message for the creation"),
    });
  }

  /**
   * Create a new file in a GitHub repository
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);

      // Validate input
      const { 
        owner, 
        repo, 
        path, 
        content, 
        branch, 
        commitMessage = `Create ${path}` 
      } = this.getSchema().parse(params);

      try {
        // Create the file using GitHub API
        const octokit = this.githubClient.getOctokit();
        const { data } = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: commitMessage,
          content: Buffer.from(content).toString('base64'),
          branch: branch
        });

        return JSON.stringify({
          success: true,
          data: {
            commitSha: data.commit.sha,
            fileUrl: data.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch || 'main'}/${path}`,
          }
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message || 'Failed to create file using GitHub API',
        });
      }
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to parse input',
      });
    }
  }
} 