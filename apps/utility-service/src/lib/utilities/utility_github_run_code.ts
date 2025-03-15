/**
 * GitHub Run Code Utility
 * 
 * A utility that runs code in a GitHub repository.
 */

import { z } from "zod";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

const execAsync = promisify(exec);

/**
 * A utility that runs code in a GitHub repository
 */
export class UtilityGitHubRunCode extends GitHubBaseUtility {
  // Define the schema for the utility
  private utilitySchema = this.baseSchema.extend({
    path: z.string().describe("Path to the file to run (required)"),
    command: z.string().optional().describe("Command to run (defaults to auto-detection based on file type)"),
    args: z.array(z.string()).optional().describe("Arguments to pass to the command"),
    input: z.string().optional().describe("Input to provide to the command"),
    timeout: z.number().optional().describe("Timeout in milliseconds (defaults to 30000)")
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
      name: "utility_github_run_code",
      description: `
        Use this tool to run code in a GitHub repository.
        This tool will clone the repository locally if needed and run the code.
        
        You must specify:
        - 'path': Path to the file to run
        
        You can optionally specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
        - 'branch': Branch name (defaults to the default branch)
        - 'command': Command to run (defaults to auto-detection based on file type)
        - 'args': Arguments to pass to the command
        - 'input': Input to provide to the command
        - 'timeout': Timeout in milliseconds (defaults to 30000)
        
        If owner and repo are not specified, the tool will use the environment variables GITHUB_OWNER and GITHUB_REPO.
        
        The tool will automatically detect the file type and use the appropriate command:
        - For JavaScript: node
        - For TypeScript: ts-node
        - For Python: python
        - For Go: go run
        - For Ruby: ruby
        - For Rust: cargo run
        - For shell scripts: bash
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
    console.log(`Running code in GitHub repo:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, path: filePath, command, args = [], input: inputData, timeout = 30000, branch } = params;
      
      if (!filePath) {
        return "Error: You must specify a 'path' to the file to run.";
      }
      
      // Get repository information
      const repoOwner = owner || this.githubClient.getOwner();
      const repoName = repo || this.githubClient.getRepo();
      
      // Clone or update the repository locally
      const repoPath = await this.ensureRepository(repoOwner, repoName);
      const git = this.githubClient.getGit();
      
      // If a branch is specified, check it out
      if (branch) {
        await git.checkout(branch);
      }
      
      // Get the path to the file
      const fullPath = path.join(repoPath, filePath);
      
      // Check if the file exists
      try {
        await fs.access(fullPath);
      } catch (error) {
        return `Error: File not found at ${filePath}.`;
      }
      
      // Detect the command to run
      const runCommand = await this.detectRunCommand(fullPath, command);
      
      if (!runCommand) {
        return `Error: Could not determine how to run file ${filePath}. Please specify a command.`;
      }
      
      // Build the command with arguments
      const cmdWithArgs = `${runCommand} ${fullPath} ${args.join(' ')}`;
      
      // Execute with timeout
      const output = await this.executeWithTimeout(repoPath, cmdWithArgs, inputData, timeout);
      
      return JSON.stringify({
        owner: repoOwner,
        repo: repoName,
        path: filePath,
        branch: branch || 'default',
        command: runCommand,
        args,
        output,
        timeoutMs: timeout
      }, null, 2);
    } catch (error) {
      console.error("GitHub Run Code utility error:", error);
      return `I encountered an error while running the code: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Detect the appropriate command to run the file
   */
  private async detectRunCommand(filePath: string, specifiedCommand?: string): Promise<string | null> {
    if (specifiedCommand) {
      return specifiedCommand;
    }
    
    const extension = path.extname(filePath);
    
    switch (extension) {
      case '.js':
        return 'node';
      case '.ts':
        return 'npx ts-node';
      case '.py':
        return 'python';
      case '.go':
        return 'go run';
      case '.rb':
        return 'ruby';
      case '.rs':
        // For Rust, we need to check if it's a standalone file or part of a Cargo project
        try {
          // Check if there's a Cargo.toml in parent directories
          const dir = path.dirname(filePath);
          const cargoPath = path.join(dir, 'Cargo.toml');
          await fs.access(cargoPath);
          // If Cargo.toml exists, use cargo run
          return 'cd ' + dir + ' && cargo run --quiet';
        } catch (error) {
          // If no Cargo.toml, try rustc
          return 'rustc -o /tmp/rust-exec ' + filePath + ' && /tmp/rust-exec';
        }
      case '.sh':
        return 'bash';
      case '.pl':
        return 'perl';
      case '.php':
        return 'php';
      case '.swift':
        return 'swift';
      case '.java':
        return 'javac ' + filePath + ' && java ' + path.basename(filePath, '.java');
      case '.c':
        return 'gcc -o /tmp/c-exec ' + filePath + ' && /tmp/c-exec';
      case '.cpp':
      case '.cc':
        return 'g++ -o /tmp/cpp-exec ' + filePath + ' && /tmp/cpp-exec';
      default:
        // Try to make it executable and run it directly
        try {
          await fs.chmod(filePath, 0o755);
          return filePath;
        } catch (error) {
          return null;
        }
    }
  }
  
  /**
   * Execute a command with timeout
   */
  private async executeWithTimeout(
    cwd: string, 
    command: string, 
    input?: string, 
    timeoutMs: number = 30000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Execute command
      const proc = exec(command, { cwd }, (error, stdout, stderr) => {
        clearTimeout(timeout);
        
        if (error && error.signal === 'SIGTERM') {
          reject(new Error(`Command timed out after ${timeoutMs}ms`));
        } else {
          resolve(stdout || stderr || 'Command executed successfully with no output');
        }
      });
      
      // Provide input if needed
      if (input && proc.stdin) {
        proc.stdin.write(input);
        proc.stdin.end();
      }
    });
  }
} 