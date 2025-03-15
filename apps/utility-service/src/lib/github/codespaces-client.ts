import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

// Enhanced Octokit with plugins
const EnhancedOctokit = Octokit.plugin(throttling, retry);

/**
 * GitHub Codespaces client for managing cloud development environments
 * Handles creating, managing, and interacting with GitHub Codespaces
 */
export class CodespacesClient {
  private octokit: Octokit;
  private activeCodespaces: Map<string, any> = new Map();

  /**
   * Create a new GitHub Codespaces client
   * @param githubToken GitHub personal access token with codespaces permissions
   */
  constructor(githubToken: string) {
    this.octokit = new EnhancedOctokit({
      auth: githubToken,
      throttle: {
        onRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(`Rate limit exceeded, retrying after ${retryAfter} seconds`);
          return true;
        },
        onSecondaryRateLimit: (retryAfter, options, octokit) => {
          octokit.log.warn(`Secondary rate limit hit, retrying after ${retryAfter} seconds`);
          return true;
        },
      },
    });
  }

  /**
   * Create a new codespace for a GitHub repository
   * @param owner Repository owner (username or organization)
   * @param repo Repository name
   * @param branch Branch to use (defaults to main)
   * @param workDir Working directory within the repository (defaults to apps/utility-service)
   * @returns Codespace ID and other details
   */
  async createCodespace(
    owner: string, 
    repo: string, 
    branch = "main", 
    workDir = "apps/utility-service"
  ): Promise<string> {
    try {
      console.log(`Creating codespace for ${owner}/${repo}#${branch} (working dir: ${workDir})`);
      console.log(`Using GitHub token: ${process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.substring(0, 5) + '...' : 'undefined'}`);
      
      // Get repository ID
      console.log(`Getting repository info for ${owner}/${repo}`);
      const repository = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      
      console.log(`Repository ID: ${repository.data.id}`);
      
      // Create the codespace with the repository ID
      console.log(`Creating codespace for repository ID: ${repository.data.id}`);
      
      // Use the correct API method for creating a codespace
      const response = await this.octokit.rest.codespaces.createWithRepoForAuthenticatedUser({
        owner,
        repo,
        ref: branch,
        location: "WestUs2",
        machine: "basicLinux32gb",
        working_directory: workDir,
      });
      
      const codespace = response.data;
      this.activeCodespaces.set(codespace.name, {
        ...codespace,
        workDir
      });
      
      console.log(`Codespace created with name: ${codespace.name}`);
      
      // Wait for the codespace to be ready
      await this.waitForCodespaceReady(codespace.name);
      
      return codespace.name;
    } catch (error) {
      console.error("Error creating codespace:", error);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${JSON.stringify(error.response.data)}`);
        console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
      }
      if (error.request) {
        console.error(`Request: ${JSON.stringify(error.request)}`);
      }
      throw new Error(`Failed to create codespace: ${error.message}`);
    }
  }

  /**
   * Wait for a codespace to be in "Available" state
   * @param codespaceId ID of the codespace
   * @param timeoutMs Maximum time to wait in milliseconds
   */
  private async waitForCodespaceReady(codespaceId: string, timeoutMs = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const response = await this.octokit.rest.codespaces.getForAuthenticatedUser({
        codespace_name: codespaceId,
      });
      
      const codespace = response.data;
      
      if (codespace.state === "Available") {
        console.log(`Codespace ${codespaceId} is now ready`);
        return;
      }
      
      console.log(`Waiting for codespace ${codespaceId}, current state: ${codespace.state}`);
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error(`Timed out waiting for codespace ${codespaceId} to be ready`);
  }

  /**
   * Execute a command in a codespace
   * @param codespaceId ID of the codespace
   * @param command Command to execute
   * @param workDir Optional working directory (defaults to apps/utility-service)
   * @returns Command output
   */
  async executeCommand(codespaceId: string, command: string, workDir: string = 'apps/utility-service'): Promise<string> {
    try {
      // Ensure codespace is available
      const response = await this.octokit.rest.codespaces.getForAuthenticatedUser({
        codespace_name: codespaceId,
      });
      
      const codespace = response.data;
      
      if (codespace.state !== "Available") {
        throw new Error(`Codespace ${codespaceId} is not available (state: ${codespace.state})`);
      }
      
      // Add working directory to the command
      const fullCommand = `cd ${workDir} && ${command}`;
      
      // GitHub Codespaces API doesn't directly expose command execution
      // We'll use the VSCode Server API through a custom endpoint
      // This is a simplified approach - in production, you'd need to handle authentication and session tokens
      
      // Note: This is a conceptual implementation as GitHub doesn't expose a public API for direct command execution
      // In a real implementation, you might need to use GitHub Actions or a custom service running in the codespace
      
      // For demo purposes, we'll just log what we would do
      console.log(`Would execute command in codespace ${codespaceId}: ${fullCommand}`);
      
      // In reality, you'd need to implement:
      // 1. SSH or VSCode terminal API connection to the codespace
      // 2. Command execution through that channel
      // 3. Capture and return the output
      
      // For a real implementation, consider using:
      // - GitHub CLI in GitHub Actions
      // - A custom API service running in the codespace
      // - A webhook-based approach with a service in the codespace

      // Placeholder for actual implementation
      return `Command execution for '${fullCommand}' (placeholder response)`;
    } catch (error) {
      console.error(`Error executing command in codespace ${codespaceId}:`, error);
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }

  /**
   * List files and directories in a codespace
   * @param codespaceId ID of the codespace
   * @param path Directory path to list
   * @returns Array of file/directory names
   */
  async listFiles(codespaceId: string, path = "."): Promise<string[]> {
    const command = `ls -la ${path}`;
    const output = await this.executeCommand(codespaceId, command);
    
    // Parse the output to extract file names
    // This is a simplified implementation
    return output.split("\n")
      .filter(line => line.trim().length > 0)
      .map(line => {
        // Basic parsing of ls output
        const parts = line.trim().split(/\s+/);
        return parts[parts.length - 1];
      })
      .filter(name => name !== "." && name !== "..");
  }

  /**
   * Read a file from the codespace
   * @param codespaceId ID of the codespace
   * @param filePath Path to the file
   * @returns File content
   */
  async readFile(codespaceId: string, filePath: string): Promise<string> {
    const command = `cat ${filePath}`;
    return this.executeCommand(codespaceId, command);
  }

  /**
   * Write content to a file in the codespace
   * @param codespaceId ID of the codespace
   * @param filePath Path to the file
   * @param content Content to write
   */
  async writeFile(codespaceId: string, filePath: string, content: string): Promise<void> {
    // Escape the content for shell safety
    const escapedContent = content.replace(/"/g, '\\"');
    const command = `echo "${escapedContent}" > ${filePath}`;
    await this.executeCommand(codespaceId, command);
  }

  /**
   * Run a script or command in the codespace
   * @param codespaceId ID of the codespace
   * @param command Command to run
   * @returns Command output
   */
  async runCode(codespaceId: string, command: string): Promise<string> {
    return this.executeCommand(codespaceId, command);
  }

  /**
   * Stops and removes a codespace
   * @param codespaceId ID of the codespace to destroy
   */
  async destroyCodespace(codespaceId: string): Promise<void> {
    try {
      await this.octokit.rest.codespaces.deleteForAuthenticatedUser({
        codespace_name: codespaceId,
      });
      
      this.activeCodespaces.delete(codespaceId);
      console.log(`Codespace ${codespaceId} has been destroyed`);
    } catch (error) {
      console.error(`Error destroying codespace ${codespaceId}:`, error);
      throw new Error(`Failed to destroy codespace: ${error.message}`);
    }
  }

  /**
   * Get a list of all codespaces for the authenticated user
   * @returns Array of codespace objects
   */
  async listCodespaces(): Promise<any[]> {
    const response = await this.octokit.rest.codespaces.listForAuthenticatedUser();
    return response.data.codespaces;
  }
}

// Singleton instance
let codespaceClientInstance: CodespacesClient | null = null;

/**
 * Get the codespaces client instance
 * @returns Codespaces client instance
 */
export function getCodespacesClient(): CodespacesClient {
  if (!codespaceClientInstance) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required');
    }
    
    codespaceClientInstance = new CodespacesClient(githubToken);
  }
  
  return codespaceClientInstance;
} 