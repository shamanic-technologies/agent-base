/**
 * GitHub Update File Utility
 * 
 * Updates an existing file in a GitHub repository.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for updating files in a GitHub repository
 */
export class UtilityGitHubUpdateFile extends GitHubBaseUtility {
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
      name: "utility_github_update_file",
      description: "Update a file in a GitHub repository",
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
    return this.baseSchema.extend({
      owner: z.string().describe("Repository owner (username or organization)"),
      repo: z.string().describe("Repository name"),
      path: z.string().describe("Path to the file to update"),
      content: z.string().describe("New content of the file"),
      branch: z.string().optional().describe("Branch name (defaults to the default branch)"),
      commitMessage: z.string().optional().describe("Commit message for the update"),
    });
  }

  /**
   * Update a file in a GitHub repository
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
        commitMessage = `Update ${path}` 
      } = this.getSchema().parse(params);

      try {
        // Get the current file to get its SHA
        const octokit = this.githubClient.getOctokit();
        const { data: fileData } = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });

        // Check if the file exists and get its SHA
        if (!('sha' in fileData)) {
          return JSON.stringify({
            success: false,
            error: 'File not found or is a directory',
          });
        }

        // Update the file using GitHub API
        const { data } = await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message: commitMessage,
          content: Buffer.from(content).toString('base64'),
          sha: fileData.sha,
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
          error: error.message || 'Failed to update file using GitHub API',
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