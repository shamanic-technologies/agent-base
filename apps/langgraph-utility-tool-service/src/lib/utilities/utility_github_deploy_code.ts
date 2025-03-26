/**
 * GitHub Deploy Code Utility
 * 
 * Deploys code from a GitHub repository by triggering GitHub Actions workflows.
 */

import { z } from "zod";
import { GitHubBaseUtility } from "../github/github-base-utility.js";
import { NodeId, NodeType, ParentNodeId, ParentNodeType, ThreadId } from "../../types/index.js";

/**
 * Utility for deploying code from a GitHub repository
 */
export class UtilityGitHubDeployCode extends GitHubBaseUtility {
  constructor({
    conversationId,
    parentNodeId,
    parentNodeType,
    userId
  }: {
    conversationId: ThreadId;
    parentNodeId: ParentNodeId;
    parentNodeType: ParentNodeType;
    userId?: string;
  }) {
    super({
      name: "utility_github_deploy_code",
      description: "Deploy code from a GitHub repository by triggering GitHub Actions workflows",
      conversationId,
      parentNodeId,
      parentNodeType,
      userId
    });
  }

  /**
   * Get the schema for the utility
   */
  getSchema(): z.ZodType<any, any> {
    return this.baseSchema.extend({
      owner: z.string().describe("Repository owner (username or organization)"),
      repo: z.string().describe("Repository name"),
      workflow_id: z.string().optional().describe("ID or filename of the workflow to trigger (if omitted, will try to find a deployment workflow)"),
      branch: z.string().optional().describe("Branch name to deploy (defaults to the default branch)"),
      environment: z.string().optional().describe("Environment to deploy to"),
      inputs: z.record(z.string(), z.string()).optional().describe("Additional inputs for the workflow"),
    });
  }

  /**
   * Deploy code from a GitHub repository
   */
  async _call(input: string | Record<string, unknown>): Promise<string> {
    try {
      const params = this.parseInput(input);

      // Validate input
      const { 
        owner, 
        repo, 
        workflow_id, 
        branch, 
        environment,
        inputs = {}
      } = this.getSchema().parse(params);

      // Add environment to inputs if provided
      const workflowInputs = { ...inputs };
      if (environment) {
        workflowInputs.environment = environment;
      }

      try {
        const octokit = this.githubClient.getOctokit();
        
        // If no workflow_id is specified, try to find a deployment workflow
        if (!workflow_id) {
          // Get all workflows in the repository
          const { data } = await octokit.actions.listRepoWorkflows({
            owner,
            repo,
          });
          
          // Look for a workflow that might be for deployment
          const deploymentWorkflows = data.workflows.filter(workflow => 
            workflow.name.toLowerCase().includes('deploy') || 
            workflow.name.toLowerCase().includes('release') ||
            workflow.path.toLowerCase().includes('deploy') ||
            workflow.path.toLowerCase().includes('release')
          );
          
          if (deploymentWorkflows.length === 0) {
            return JSON.stringify({
              success: false,
              error: 'No deployment workflows found in the repository. Please specify a workflow_id.',
            });
          }
          
          // Use the first matching workflow
          const workflowToTrigger = deploymentWorkflows[0];
          
          // Trigger the workflow
          await octokit.actions.createWorkflowDispatch({
            owner,
            repo,
            workflow_id: workflowToTrigger.id.toString(),
            ref: branch || 'main',
            inputs: workflowInputs
          });
          
          return JSON.stringify({
            success: true,
            data: {
              message: `Deployment workflow "${workflowToTrigger.name}" has been triggered.`,
              workflowUrl: workflowToTrigger.html_url,
              workflowId: workflowToTrigger.id,
              branch: branch || 'main',
              environment: environment || 'default'
            }
          });
        }
        
        // If workflow_id is provided, use it directly
        await octokit.actions.createWorkflowDispatch({
          owner,
          repo,
          workflow_id,
          ref: branch || 'main',
          inputs: workflowInputs
        });
        
        return JSON.stringify({
          success: true,
          data: {
            message: `Workflow "${workflow_id}" has been triggered.`,
            workflowId: workflow_id,
            branch: branch || 'main',
            environment: environment || 'default'
          }
        });
      } catch (error: any) {
        return JSON.stringify({
          success: false,
          error: error.message || 'Failed to deploy code using GitHub API',
        });
      }
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        error: error.message || 'Failed to parse input',
      });
    }
  }
} 