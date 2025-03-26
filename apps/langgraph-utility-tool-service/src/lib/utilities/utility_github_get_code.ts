/**
 * GitHub Get Code Utility
 * 
 * Retrieves file content from a GitHub repository.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for retrieving file content from a GitHub repository
 */
export class UtilityGitHubGetCode extends GitHubBaseUtility {
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
      name: "utility_github_get_code",
      description: "Get code from a GitHub repository",
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
      path: z.string().describe("Path to the file to retrieve"),
      branch: z.string().optional().describe("Branch name (defaults to the default branch)"),
    });
  }

  /**
   * Retrieve file content from a GitHub repository
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);

      // Validate input
      const { 
        owner, 
        repo, 
        path, 
        branch 
      } = this.getSchema().parse(params);

      try {
        // Fetch the file content using GitHub API
        const octokit = this.githubClient.getOctokit();
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });

        // Check if the response is a file
        if (Array.isArray(data)) {
          return JSON.stringify({
            success: false,
            error: 'The path specified is a directory, not a file',
          });
        }

        if (!('content' in data)) {
          return JSON.stringify({
            success: false,
            error: 'The content field is missing in the API response',
          });
        }

        // Decode the base64 content
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        
        return JSON.stringify({
          success: true,
          data: {
            content,
            path: data.path,
            sha: data.sha,
            size: data.size,
            url: data.html_url,
          }
        });
      } catch (error: any) {
        if (error.status === 404) {
          return JSON.stringify({
            success: false,
            error: 'File not found',
          });
        }
        
        return JSON.stringify({
          success: false,
          error: error.message || 'Failed to retrieve file using GitHub API',
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