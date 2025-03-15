/**
 * GitHub List Directory Utility
 * 
 * Lists files and directories in a GitHub repository.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for listing files and directories in a GitHub repository
 */
export class UtilityGitHubListDirectory extends GitHubBaseUtility {
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
      name: "utility_github_list_directory",
      description: "List files and directories in a GitHub repository",
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
      path: z.string().optional().describe("Directory path to list (defaults to repository root)"),
      branch: z.string().optional().describe("Branch name (defaults to the default branch)"),
      recursive: z.boolean().optional().describe("Whether to list files recursively"),
    });
  }

  /**
   * List files and directories in a GitHub repository
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);

      // Validate input
      const { 
        owner, 
        repo, 
        path = '', 
        branch,
        recursive = false
      } = this.getSchema().parse(params);

      try {
        // Fetch directory content using GitHub API
        const octokit = this.githubClient.getOctokit();
        const { data } = await octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });

        // Handle directory response
        if (Array.isArray(data)) {
          const files = data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            url: item.html_url
          }));
          
          // If recursive listing is requested and there are directories, fetch their contents
          if (recursive) {
            const directories = files.filter(file => file.type === 'dir');
            for (const dir of directories) {
              try {
                const subItems = await this._listDirectory(owner, repo, dir.path, branch);
                files.push(...subItems);
              } catch (error) {
                console.error(`Error listing subdirectory ${dir.path}:`, error);
              }
            }
          }
          
          return JSON.stringify({
            success: true,
            data: {
              files,
              path,
              repository: `${owner}/${repo}`,
              branch: branch || 'default'
            }
          });
        } else {
          return JSON.stringify({
            success: false,
            error: 'The path specified is a file, not a directory',
          });
        }
      } catch (error: any) {
        if (error.status === 404) {
          return JSON.stringify({
            success: false,
            error: 'Directory not found',
          });
        }
        
        return JSON.stringify({
          success: false,
          error: error.message || 'Failed to list directory using GitHub API',
        });
      }
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to parse input',
      });
    }
  }

  /**
   * Helper method to recursively list directory contents
   */
  private async _listDirectory(owner: string, repo: string, path: string, branch?: string): Promise<any[]> {
    try {
      const octokit = this.githubClient.getOctokit();
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(data)) {
        const files = data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
          url: item.html_url
        }));
        
        // Recursively get contents of subdirectories
        const directories = files.filter(file => file.type === 'dir');
        for (const dir of directories) {
          try {
            const subItems = await this._listDirectory(owner, repo, dir.path, branch);
            files.push(...subItems);
          } catch (error) {
            console.error(`Error listing subdirectory ${dir.path}:`, error);
          }
        }
        
        return files;
      }
      
      return [];
    } catch (error) {
      console.error(`Error in _listDirectory for ${path}:`, error);
      return [];
    }
  }
} 