/**
 * GitHub List Directory Utility
 * 
 * A utility that lists the contents of a directory in a GitHub repository.
 */

import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

/**
 * A utility that lists the contents of a directory in a GitHub repository
 */
export class UtilityGitHubListDirectory extends GitHubBaseUtility {
  // Define the schema for the utility
  private utilitySchema = this.baseSchema;
  
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
      name: "utility_github_list_directory",
      description: `
        Use this tool to list the contents of a directory in a GitHub repository.
        This tool will clone the repository locally if needed and list the directory contents.
        
        You can specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
        - 'path': Directory path to list (defaults to the repository root)
        - 'branch': Branch name (defaults to the default branch)
        
        If owner and repo are not specified, the tool will use the environment variables GITHUB_OWNER and GITHUB_REPO.
      `,
      conversationId,
      parentNodeId,
      parentNodeType
    });
  }
  
  getSchema() {
    return this.utilitySchema;
  }
  
  async _call(input: string | Record<string, any>): Promise<string> {
    console.log(`Listing directory in GitHub repo:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, path: dirPath = '', branch } = params;
      
      // Get repository information
      const octokit = this.githubClient.getOctokit();
      const repoOwner = owner || this.githubClient.getOwner();
      const repoName = repo || this.githubClient.getRepo();
      
      // Try to use the GitHub API first for better performance
      try {
        const response = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: dirPath,
          ref: branch || undefined,
        });
        
        if (Array.isArray(response.data)) {
          // This is a directory, return the contents
          const contents = response.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            url: item.html_url
          }));
          
          return JSON.stringify({
            owner: repoOwner,
            repo: repoName,
            path: dirPath,
            branch: branch || 'default',
            contents
          }, null, 2);
        } else {
          return `The provided path is not a directory: ${dirPath}`;
        }
      } catch (apiError) {
        // If the API call fails, fall back to local file system
        console.log(`API lookup failed, using local filesystem: ${apiError}`);
      }
      
      // Clone or update the repository locally
      const repoPath = await this.ensureRepository(repoOwner, repoName);
      
      // If a branch is specified, check it out
      if (branch) {
        const git = this.githubClient.getGit();
        await git.checkout(branch);
      }
      
      // Get the path to the directory
      const fullPath = path.join(repoPath, dirPath);
      
      // Check if the path exists
      const stats = await fs.stat(fullPath);
      
      if (!stats.isDirectory()) {
        return `The provided path is not a directory: ${dirPath}`;
      }
      
      // List the directory contents
      const contents = await fs.readdir(fullPath, { withFileTypes: true });
      
      // Map the contents to the response format
      const mappedContents = await Promise.all(
        contents.map(async (item) => {
          const itemPath = path.join(dirPath, item.name);
          let size = 0;
          
          if (item.isFile()) {
            const stats = await fs.stat(path.join(fullPath, item.name));
            size = stats.size;
          }
          
          return {
            name: item.name,
            path: itemPath,
            type: item.isDirectory() ? 'dir' : 'file',
            size: item.isDirectory() ? null : size
          };
        })
      );
      
      // Sort by type then name
      mappedContents.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'dir' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      return JSON.stringify({
        owner: repoOwner,
        repo: repoName,
        path: dirPath,
        branch: branch || 'default',
        contents: mappedContents
      }, null, 2);
    } catch (error) {
      console.error("GitHub List Directory utility error:", error);
      return `I encountered an error while listing the directory: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 