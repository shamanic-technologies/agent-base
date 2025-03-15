import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * GitHub client manager that handles authentication and provides 
 * base functionality for GitHub operations.
 */
export class GitHubClient {
  private octokit: Octokit;
  private localPath: string;
  private git: ReturnType<typeof simpleGit>;
  private owner: string;
  private repo: string;
  
  /**
   * Create a new GitHub client
   * 
   * @param auth - GitHub personal access token
   * @param owner - Repository owner (username or organization)
   * @param repo - Repository name
   * @param localPath - Optional local path to clone the repository
   */
  constructor({
    auth,
    owner,
    repo,
    localPath
  }: {
    auth: string;
    owner: string;
    repo: string;
    localPath?: string;
  }) {
    this.octokit = new Octokit({ auth });
    this.owner = owner;
    this.repo = repo;
    this.localPath = localPath || path.join(os.tmpdir(), `github-${owner}-${repo}-${Date.now()}`);
    this.git = simpleGit();
  }
  
  /**
   * Clone the repository to the local path if not already cloned
   */
  async ensureRepository(): Promise<string> {
    try {
      // Check if directory exists and has git folder
      await fs.access(path.join(this.localPath, '.git'));
      // If exists, pull latest changes
      await this.git.cwd(this.localPath).pull();
    } catch (error) {
      // Directory doesn't exist or isn't a git repo, clone it
      await fs.mkdir(this.localPath, { recursive: true });
      const repoUrl = `https://github.com/${this.owner}/${this.repo}.git`;
      await this.git.clone(repoUrl, this.localPath);
    }
    
    return this.localPath;
  }
  
  /**
   * Get the Octokit instance for direct API calls
   */
  getOctokit(): Octokit {
    return this.octokit;
  }
  
  /**
   * Get the SimpleGit instance for git operations
   */
  getGit(): ReturnType<typeof simpleGit> {
    return this.git.cwd(this.localPath);
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
  
  /**
   * Get local repository path
   */
  getLocalPath(): string {
    return this.localPath;
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