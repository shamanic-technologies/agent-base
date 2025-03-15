/**
 * GitHub Get Code Utility
 * 
 * A utility that retrieves code and repository information from a GitHub repository.
 */

import { z } from "zod";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

/**
 * A utility that retrieves code from a GitHub repository
 */
export class UtilityGitHubGetCode extends GitHubBaseUtility {
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
      name: "utility_github_get_code",
      description: `
        Use this tool to retrieve code from a GitHub repository.
        This tool will clone the repository locally or use an existing clone.
        
        You can specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
        - 'path': Path to retrieve (defaults to the repository root)
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
    console.log(`Getting code from GitHub:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, path, branch } = params;
      
      // Get repository information
      const octokit = this.githubClient.getOctokit();
      const repoOwner = owner || this.githubClient.getOwner();
      const repoName = repo || this.githubClient.getRepo();
      
      let result = '';
      
      // If a specific path is provided, get that content
      if (path) {
        const response = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path,
          ref: branch || undefined,
        });
        
        if (Array.isArray(response.data)) {
          // This is a directory, return the directory contents
          const files = response.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            url: item.html_url
          }));
          
          result = JSON.stringify({
            type: 'directory',
            owner: repoOwner,
            repo: repoName,
            path,
            branch: branch || 'default',
            files
          }, null, 2);
        } else if ('content' in response.data) {
          // This is a file, return the file content
          const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          
          result = JSON.stringify({
            type: 'file',
            owner: repoOwner,
            repo: repoName,
            path,
            branch: branch || 'default',
            content,
            sha: response.data.sha,
            size: response.data.size,
            url: response.data.html_url
          }, null, 2);
        }
      } else {
        // If no path is provided, get the repository information
        const repoResponse = await octokit.repos.get({
          owner: repoOwner,
          repo: repoName
        });
        
        // Get the repository branches
        const branchesResponse = await octokit.repos.listBranches({
          owner: repoOwner,
          repo: repoName,
          per_page: 10  // Limit to 10 branches
        });
        
        // Get the repository root directory
        const contentsResponse = await octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: '',
          ref: branch || undefined,
        });
        
        if (Array.isArray(contentsResponse.data)) {
          const rootFiles = contentsResponse.data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type,
            size: item.size,
            url: item.html_url
          }));
          
          result = JSON.stringify({
            type: 'repository',
            owner: repoOwner,
            repo: repoName,
            description: repoResponse.data.description,
            default_branch: repoResponse.data.default_branch,
            branches: branchesResponse.data.map(branch => branch.name),
            rootFiles,
            url: repoResponse.data.html_url
          }, null, 2);
        }
      }
      
      return result;
    } catch (error) {
      console.error("GitHub Get Code utility error:", error);
      return `I encountered an error while retrieving code: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 