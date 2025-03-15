/**
 * GitHub Deploy Code Utility
 * 
 * A utility that deploys code from a GitHub repository.
 */

import { z } from "zod";
import { NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types";
import { GitHubBaseUtility } from "../github/github-base-utility";

/**
 * A utility that deploys code from a GitHub repository
 */
export class UtilityGitHubDeployCode extends GitHubBaseUtility {
  // Define the schema for the utility
  private utilitySchema = this.baseSchema.extend({
    environment: z.string().optional().describe("Target environment (e.g., 'production', 'staging')"),
    message: z.string().optional().describe("Deployment message")
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
      name: "utility_github_deploy_code",
      description: `
        Use this tool to deploy code from a GitHub repository.
        This tool will use GitHub Actions or repository deployment APIs to deploy the code.
        
        You can specify:
        - 'owner': Repository owner (username or organization)
        - 'repo': Repository name
        - 'branch': Branch name to deploy (defaults to the default branch)
        - 'environment': Target environment (e.g., 'production', 'staging')
        - 'message': Deployment message
        
        If owner and repo are not specified, the tool will use the environment variables GITHUB_OWNER and GITHUB_REPO.
        
        The repository must have deployment workflows configured through GitHub Actions or a supported deployment platform.
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
    console.log(`Deploying code from GitHub repo:`, input);
    
    try {
      // Parse input
      const params = this.parseInput(input);
      const { owner, repo, branch, environment = 'production', message = 'Deployed via utility service' } = params;
      
      // Get repository information
      const octokit = this.githubClient.getOctokit();
      const repoOwner = owner || this.githubClient.getOwner();
      const repoName = repo || this.githubClient.getRepo();
      
      // Get the reference to deploy (branch, tag, or commit SHA)
      let ref: string;
      
      if (branch) {
        // If branch is specified, get the latest commit SHA for that branch
        const branchData = await octokit.repos.getBranch({
          owner: repoOwner,
          repo: repoName,
          branch,
        });
        
        ref = branchData.data.commit.sha;
      } else {
        // Get the default branch
        const repoData = await octokit.repos.get({
          owner: repoOwner,
          repo: repoName,
        });
        
        const defaultBranch = repoData.data.default_branch;
        
        // Get the latest commit SHA for the default branch
        const branchData = await octokit.repos.getBranch({
          owner: repoOwner,
          repo: repoName,
          branch: defaultBranch,
        });
        
        ref = branchData.data.commit.sha;
      }
      
      // Check for GitHub Actions workflows
      const workflows = await octokit.actions.listWorkflowsForRepo({
        owner: repoOwner,
        repo: repoName,
      });
      
      // Find deployment workflows
      const deploymentWorkflows = workflows.data.workflows.filter(workflow => 
        workflow.name.toLowerCase().includes('deploy') || 
        workflow.path.toLowerCase().includes('deploy')
      );
      
      // If deployment workflows exist, trigger one
      if (deploymentWorkflows.length > 0) {
        // Use the first deployment workflow found
        const workflow = deploymentWorkflows[0];
        
        // Trigger the workflow
        await octokit.actions.createWorkflowDispatch({
          owner: repoOwner,
          repo: repoName,
          workflow_id: workflow.id,
          ref: branch || workflow.default_branch,
          inputs: {
            // Include common inputs that workflows might accept
            environment,
            message,
          },
        });
        
        return JSON.stringify({
          owner: repoOwner,
          repo: repoName,
          ref,
          workflow: workflow.name,
          workflow_id: workflow.id,
          environment,
          message,
          status: 'Deployment workflow triggered successfully',
          url: `https://github.com/${repoOwner}/${repoName}/actions/workflows/${workflow.path.split('/').pop()}`
        }, null, 2);
      }
      
      // If no workflows found, try creating a deployment using GitHub Deployments API
      const deployment = await octokit.repos.createDeployment({
        owner: repoOwner,
        repo: repoName,
        ref,
        environment,
        description: message,
        required_contexts: [], // Skip status checks for this example
        auto_merge: false,
      });
      
      // Create a deployment status
      await octokit.repos.createDeploymentStatus({
        owner: repoOwner,
        repo: repoName,
        deployment_id: deployment.data.id,
        state: 'success',
        description: 'Deployment succeeded',
      });
      
      return JSON.stringify({
        owner: repoOwner,
        repo: repoName,
        ref,
        deployment_id: deployment.data.id,
        environment,
        message,
        status: 'Deployment created successfully',
        url: `https://github.com/${repoOwner}/${repoName}/deployments`
      }, null, 2);
    } catch (error: any) {
      console.error("GitHub Deploy Code utility error:", error);
      
      // Detailed error response
      let errorDetails = error.message;
      
      if (error.status === 404) {
        errorDetails = 'Repository not found or insufficient permissions.';
      } else if (error.status === 422) {
        errorDetails = 'Deployment request was invalid. The repository may not have deployment configured.';
      } else if (error.status === 403) {
        errorDetails = 'Forbidden. You may not have permission to create deployments for this repository.';
      }
      
      return JSON.stringify({
        error: true,
        message: `Deployment failed: ${errorDetails}`,
        details: error instanceof Error ? error.message : String(error)
      }, null, 2);
    }
  }
} 