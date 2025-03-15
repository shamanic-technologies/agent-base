/**
 * GitHub Lint Code Utility
 * 
 * A utility that lints code in a GitHub repository.
 */

import { z } from "zod";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

const execAsync = promisify(exec);

/**
 * A utility that lints code in a GitHub repository
 */
export class UtilityGitHubLintCode extends GitHubBaseUtility {
  // Define the schema for the utility
  private utilitySchema = this.baseSchema.extend({
    files: z.array(z.string()).optional().describe("List of files to lint (defaults to all files)")
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
      name: "utility_github_lint_code",
      description: `
        Use this tool to lint code in a GitHub repository.
        This tool will clone the repository locally if needed and run the linting commands.
        
        You can specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
        - 'branch': Branch name (defaults to the default branch)
        - 'files': List of specific files to lint (defaults to all files)
        
        If owner and repo are not specified, the tool will use the environment variables GITHUB_OWNER and GITHUB_REPO.
        
        The tool will automatically detect the repository type and use the appropriate linting tool:
        - For JavaScript/TypeScript: ESLint
        - For Python: Flake8
        - For Go: golint
        - For Ruby: RuboCop
        - For other languages: Basic syntax checks where possible
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
    console.log(`Linting code in GitHub repo:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, files, branch } = params;
      
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
      
      // Detect the repository type and available linting tools
      const detectionResult = await this.detectRepoType(repoPath);
      
      // Run the appropriate linting tool based on the repository type
      let lintResult;
      
      if (files && files.length > 0) {
        lintResult = await this.lintSpecificFiles(repoPath, detectionResult, files);
      } else {
        lintResult = await this.lintRepository(repoPath, detectionResult);
      }
      
      return JSON.stringify({
        owner: repoOwner,
        repo: repoName,
        branch: branch || 'default',
        type: detectionResult.type,
        tools: detectionResult.tools,
        results: lintResult
      }, null, 2);
    } catch (error) {
      console.error("GitHub Lint Code utility error:", error);
      return `I encountered an error while linting the code: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Detect the repository type and available linting tools
   */
  private async detectRepoType(repoPath: string): Promise<{ type: string, tools: string[] }> {
    const hasFile = async (fileName: string) => {
      try {
        await execAsync(`find "${repoPath}" -name "${fileName}" | head -1`);
        return true;
      } catch (error) {
        return false;
      }
    };
    
    // Check for common project files
    const hasPackageJson = await hasFile('package.json');
    const hasTsConfig = await hasFile('tsconfig.json');
    const hasPyProject = await hasFile('pyproject.toml');
    const hasSetupPy = await hasFile('setup.py');
    const hasRequirements = await hasFile('requirements.txt');
    const hasGemfile = await hasFile('Gemfile');
    const hasGoMod = await hasFile('go.mod');
    const hasCargo = await hasFile('Cargo.toml');
    
    // Check for linting tools
    const hasEslint = await hasFile('.eslintrc*');
    const hasFlake8 = await hasFile('.flake8');
    const hasPylint = await hasFile('.pylintrc');
    const hasGolint = await hasFile('golangci.yml');
    const hasRubocop = await hasFile('.rubocop.yml');
    
    // Determine the repository type and available tools
    if (hasPackageJson || hasTsConfig) {
      const tools = [];
      if (hasEslint) tools.push('eslint');
      if (hasTsConfig) tools.push('tsc');
      
      return { type: 'javascript/typescript', tools: tools.length ? tools : ['npm run lint'] };
    } else if (hasPyProject || hasSetupPy || hasRequirements) {
      const tools = [];
      if (hasFlake8) tools.push('flake8');
      if (hasPylint) tools.push('pylint');
      
      return { type: 'python', tools: tools.length ? tools : ['flake8'] };
    } else if (hasGoMod) {
      const tools = [];
      if (hasGolint) tools.push('golangci-lint');
      
      return { type: 'go', tools: tools.length ? tools : ['go vet'] };
    } else if (hasGemfile) {
      const tools = [];
      if (hasRubocop) tools.push('rubocop');
      
      return { type: 'ruby', tools: tools.length ? tools : ['rubocop'] };
    } else if (hasCargo) {
      return { type: 'rust', tools: ['cargo check'] };
    } else {
      // Try to detect by file extensions
      const fileTypes = await this.detectFileTypes(repoPath);
      
      if (fileTypes.js > 0 || fileTypes.ts > 0) {
        return { type: 'javascript/typescript', tools: ['eslint'] };
      } else if (fileTypes.py > 0) {
        return { type: 'python', tools: ['flake8'] };
      } else if (fileTypes.go > 0) {
        return { type: 'go', tools: ['go vet'] };
      } else if (fileTypes.rb > 0) {
        return { type: 'ruby', tools: ['rubocop'] };
      } else if (fileTypes.rs > 0) {
        return { type: 'rust', tools: ['cargo check'] };
      } else {
        return { type: 'unknown', tools: [] };
      }
    }
  }
  
  /**
   * Detect file types in the repository
   */
  private async detectFileTypes(repoPath: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {
      js: 0,
      ts: 0,
      py: 0,
      go: 0,
      rb: 0,
      rs: 0,
      other: 0
    };
    
    try {
      const { stdout } = await execAsync(`find "${repoPath}" -type f -name "*.js" | wc -l`);
      counts.js = parseInt(stdout.trim(), 10);
    } catch (error) {
      // Ignore errors
    }
    
    try {
      const { stdout } = await execAsync(`find "${repoPath}" -type f -name "*.ts" | wc -l`);
      counts.ts = parseInt(stdout.trim(), 10);
    } catch (error) {
      // Ignore errors
    }
    
    try {
      const { stdout } = await execAsync(`find "${repoPath}" -type f -name "*.py" | wc -l`);
      counts.py = parseInt(stdout.trim(), 10);
    } catch (error) {
      // Ignore errors
    }
    
    try {
      const { stdout } = await execAsync(`find "${repoPath}" -type f -name "*.go" | wc -l`);
      counts.go = parseInt(stdout.trim(), 10);
    } catch (error) {
      // Ignore errors
    }
    
    try {
      const { stdout } = await execAsync(`find "${repoPath}" -type f -name "*.rb" | wc -l`);
      counts.rb = parseInt(stdout.trim(), 10);
    } catch (error) {
      // Ignore errors
    }
    
    try {
      const { stdout } = await execAsync(`find "${repoPath}" -type f -name "*.rs" | wc -l`);
      counts.rs = parseInt(stdout.trim(), 10);
    } catch (error) {
      // Ignore errors
    }
    
    return counts;
  }
  
  /**
   * Lint the entire repository
   */
  private async lintRepository(
    repoPath: string, 
    detectionResult: { type: string, tools: string[] }
  ): Promise<{ success: boolean, output: string }> {
    if (detectionResult.tools.length === 0) {
      return {
        success: false,
        output: "No linting tools detected for this repository type."
      };
    }
    
    const tool = detectionResult.tools[0];
    let cmd = '';
    
    switch (tool) {
      case 'eslint':
        cmd = `cd "${repoPath}" && npx eslint . --ext .js,.jsx,.ts,.tsx`;
        break;
      case 'tsc':
        cmd = `cd "${repoPath}" && npx tsc --noEmit`;
        break;
      case 'flake8':
        cmd = `cd "${repoPath}" && flake8 .`;
        break;
      case 'pylint':
        cmd = `cd "${repoPath}" && pylint $(find . -name "*.py")`;
        break;
      case 'go vet':
        cmd = `cd "${repoPath}" && go vet ./...`;
        break;
      case 'golangci-lint':
        cmd = `cd "${repoPath}" && golangci-lint run ./...`;
        break;
      case 'rubocop':
        cmd = `cd "${repoPath}" && rubocop`;
        break;
      case 'cargo check':
        cmd = `cd "${repoPath}" && cargo check`;
        break;
      case 'npm run lint':
        cmd = `cd "${repoPath}" && npm run lint`;
        break;
      default:
        return {
          success: false,
          output: `Unknown linting tool: ${tool}`
        };
    }
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      return {
        success: !stderr,
        output: stdout || (stderr ? `Errors found:\n${stderr}` : 'No issues found.')
      };
    } catch (error: any) {
      // Most linting tools exit with non-zero when they find issues
      return {
        success: false,
        output: error.stdout || error.stderr || String(error)
      };
    }
  }
  
  /**
   * Lint specific files in the repository
   */
  private async lintSpecificFiles(
    repoPath: string, 
    detectionResult: { type: string, tools: string[] }, 
    files: string[]
  ): Promise<{ success: boolean, output: string }> {
    if (detectionResult.tools.length === 0) {
      return {
        success: false,
        output: "No linting tools detected for this repository type."
      };
    }
    
    const tool = detectionResult.tools[0];
    const fileList = files.map(file => path.join(repoPath, file)).join(' ');
    let cmd = '';
    
    switch (tool) {
      case 'eslint':
        cmd = `cd "${repoPath}" && npx eslint ${fileList}`;
        break;
      case 'tsc':
        // TypeScript can't easily type-check individual files, so we use eslint
        cmd = `cd "${repoPath}" && npx eslint ${fileList}`;
        break;
      case 'flake8':
        cmd = `cd "${repoPath}" && flake8 ${fileList}`;
        break;
      case 'pylint':
        cmd = `cd "${repoPath}" && pylint ${fileList}`;
        break;
      case 'go vet':
        cmd = `cd "${repoPath}" && go vet ${fileList}`;
        break;
      case 'golangci-lint':
        cmd = `cd "${repoPath}" && golangci-lint run ${fileList}`;
        break;
      case 'rubocop':
        cmd = `cd "${repoPath}" && rubocop ${fileList}`;
        break;
      case 'cargo check':
        // Cargo can't easily check individual files, so we run check
        cmd = `cd "${repoPath}" && cargo check`;
        break;
      case 'npm run lint':
        // Try to use eslint directly if npm run lint is the option
        cmd = `cd "${repoPath}" && npx eslint ${fileList}`;
        break;
      default:
        return {
          success: false,
          output: `Unknown linting tool: ${tool}`
        };
    }
    
    try {
      const { stdout, stderr } = await execAsync(cmd);
      return {
        success: !stderr,
        output: stdout || (stderr ? `Errors found:\n${stderr}` : 'No issues found.')
      };
    } catch (error: any) {
      // Most linting tools exit with non-zero when they find issues
      return {
        success: false,
        output: error.stdout || error.stderr || String(error)
      };
    }
  }
} 