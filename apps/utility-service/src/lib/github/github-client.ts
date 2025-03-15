import { Octokit } from '@octokit/rest';

/**
 * GitHub client manager that handles authentication and provides 
 * base functionality for GitHub operations.
 */
export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  
  /**
   * Create a new GitHub client
   * 
   * @param auth - GitHub personal access token
   * @param owner - Repository owner (username or organization)
   * @param repo - Repository name
   */
  constructor({
    auth,
    owner,
    repo
  }: {
    auth: string;
    owner: string;
    repo: string;
  }) {
    this.octokit = new Octokit({ auth });
    this.owner = owner;
    this.repo = repo;
  }
  
  /**
   * Get the Octokit instance for direct API calls
   */
  getOctokit(): Octokit {
    return this.octokit;
  }
  
  /**
   * Get repository owner
   */
  getOwner(): string {
    return this.owner;
  }
  
  /**
   * Get repository name
   */
  getRepo(): string {
    return this.repo;
  }
}

/**
 * Create a GitHub client from environment variables
 */
export function createGitHubClientFromEnv(): GitHubClient {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  if (!owner) {
    throw new Error('GITHUB_OWNER environment variable is required');
  }
  
  if (!repo) {
    throw new Error('GITHUB_REPO environment variable is required');
  }
  
  return new GitHubClient({
    auth: token,
    owner,
    repo
  });
} 