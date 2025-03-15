/**
 * GitHub Read File Utility
 * 
 * A utility that reads the contents of a file from a GitHub repository.
 */

import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

/**
 * A utility that reads the contents of a file from a GitHub repository
 */
export class UtilityGitHubReadFile extends GitHubBaseUtility {
  // Define the schema for the utility
  private utilitySchema = this.baseSchema.extend({
    path: z.string().describe("Path to the file to read (required)")
  });
  
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
      name: "utility_github_read_file",
      description: `
        Use this tool to read the contents of a file from a GitHub repository.
        This tool will clone the repository locally if needed and read the file.
        
        You must specify:
        - 'path': Path to the file to read
        
        You can optionally specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
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
    console.log(`Reading file from GitHub repo:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, path: filePath, branch } = params;
      
      if (!filePath) {
        return "Error: You must specify a 'path' to the file to read.";
      }
      
      // Get repository information
      const octokit = this.githubClient.getOctokit();
      const repoOwner = owner || this.githubClient.getOwner();
      const repoName = repo || this.githubClient.getRepo();
      
      // Try to use the GitHub API first for better performance
      try {
        const response = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: filePath,
          ref: branch || undefined,
        });
        
        if (Array.isArray(response.data)) {
          return `The provided path is a directory, not a file: ${filePath}`;
        }
        
        if ('content' in response.data) {
          // Decode the base64 content
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          
          return JSON.stringify({
            owner: repoOwner,
            repo: repoName,
            path: filePath,
            branch: branch || 'default',
            content,
            sha: response.data.sha,
            size: response.data.size,
            url: response.data.html_url
          }, null, 2);
        } else {
          return `The file at ${filePath} does not have readable content.`;
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
      
      // Get the path to the file
      const fullPath = path.join(repoPath, filePath);
      
      // Check if the path exists
      const stats = await fs.stat(fullPath);
      
      if (!stats.isFile()) {
        return `The provided path is not a file: ${filePath}`;
      }
      
      // Read the file
      const content = await fs.readFile(fullPath, 'utf-8');
      
      return JSON.stringify({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
        branch: branch || 'default',
        content,
        size: stats.size
      }, null, 2);
    } catch (error) {
      console.error("GitHub Read File utility error:", error);
      return `I encountered an error while reading the file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 