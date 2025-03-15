/**
 * GitHub Create File Utility
 * 
 * A utility that creates a new file in a GitHub repository.
 */

import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

/**
 * A utility that creates a new file in a GitHub repository
 */
export class UtilityGitHubCreateFile extends GitHubBaseUtility {
  // Define the schema for the utility
  private utilitySchema = this.baseSchema.extend({
    path: z.string().describe("Path to the file to create (required)"),
    content: z.string().describe("Content of the file (required)"),
    message: z.string().optional().describe("Commit message")
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
      name: "utility_github_create_file",
      description: `
        Use this tool to create a new file in a GitHub repository.
        This tool will clone the repository locally if needed, create the file, and push the changes.
        
        You must specify:
        - 'path': Path to the file to create
        - 'content': Content of the file
        
        You can optionally specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
        - 'branch': Branch name (defaults to the default branch)
        - 'message': Commit message (defaults to "Create <file>")
        
        If owner and repo are not specified, the tool will use the environment variables GITHUB_OWNER and GITHUB_REPO.
        
        Note: Due to GitHub API propagation delays, newly created files may not be immediately available for reading.
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
    console.log(`Creating file in GitHub repo:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, path: filePath, content, message, branch } = params;
      
      if (!filePath) {
        return "Error: You must specify a 'path' to the file to create.";
      }
      
      if (content === undefined || content === null) {
        return "Error: You must specify 'content' for the file.";
      }
      
      // Get repository information
      const octokit = this.githubClient.getOctokit();
      const repoOwner = owner || this.githubClient.getOwner();
      const repoName = repo || this.githubClient.getRepo();
      
      // Create the file via the GitHub API
      const commitMessage = message || `Create ${path.basename(filePath)}`;
      
      try {
        const response = await octokit.repos.createOrUpdateFileContents({
          owner: repoOwner,
          repo: repoName,
          path: filePath,
          message: commitMessage,
          content: Buffer.from(content).toString('base64'),
          branch: branch || undefined,
        });
        
        return JSON.stringify({
          owner: repoOwner,
          repo: repoName,
          path: filePath,
          branch: branch || 'default',
          commit: response.data.commit.sha,
          url: response.data.content?.html_url || `https://github.com/${repoOwner}/${repoName}/blob/${branch || 'main'}/${filePath}`,
          message: `File created successfully.`
        }, null, 2);
      } catch (apiError) {
        // If the API call fails, fall back to local file system
        console.log(`API creation failed, using local filesystem: ${apiError}`);
      }
      
      // Clone or update the repository locally
      const repoPath = await this.ensureRepository(repoOwner, repoName);
      const git = this.githubClient.getGit();
      
      // If a branch is specified, check it out
      if (branch) {
        await git.checkout(branch);
      }
      
      // Get the path to the file
      const fullPath = path.join(repoPath, filePath);
      
      // Create the directory if it doesn't exist
      const directory = path.dirname(fullPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Write the file
      await fs.writeFile(fullPath, content);
      
      // Add, commit, and push the changes
      await git.add(filePath);
      await git.commit(commitMessage);
      await git.push('origin', branch || 'main');
      
      // Get the commit hash
      const log = await git.log({ maxCount: 1 });
      const commitHash = log.latest?.hash || 'unknown';
      
      return JSON.stringify({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
        branch: branch || 'default',
        commit: commitHash,
        url: `https://github.com/${repoOwner}/${repoName}/blob/${branch || 'main'}/${filePath}`,
        message: `File created successfully.`
      }, null, 2);
    } catch (error) {
      console.error("GitHub Create File utility error:", error);
      return `I encountered an error while creating the file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 