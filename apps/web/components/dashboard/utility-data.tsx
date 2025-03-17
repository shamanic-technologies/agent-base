/**
 * Utility Categories Data
 * 
 * Contains data structures for available utilities organized by category
 */

import React, { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { PostgresIcon, GitHubIcon, ChromeIcon } from './icons';

// Interface for a utility
export interface Utility {
  name: string;
  description: string;
  utility: string;
}

// Interface for a utility category
export interface UtilityCategory {
  name: string;
  icon: ReactNode;
  utilities: Utility[];
}

// All available utility categories
export const utilityCategories: UtilityCategory[] = [
  {
    name: 'Database',
    icon: <PostgresIcon />,
    utilities: [
      { name: 'Create Table', description: 'Create a new database table', utility: 'utility_create_table' },
      { name: 'Query Table', description: 'Execute SQL queries on tables', utility: 'utility_query_table' },
      { name: 'Get Table', description: 'Retrieve table schema and data', utility: 'utility_get_table' },
      { name: 'Alter Table', description: 'Modify existing table structure', utility: 'utility_alter_table' },
      { name: 'Delete Table', description: 'Remove tables from database', utility: 'utility_delete_table' },
      { name: 'Get Database', description: 'Get database information', utility: 'utility_get_database' }
    ]
  },
  {
    name: 'GitHub',
    icon: <GitHubIcon />,
    utilities: [
      { name: 'Get Code', description: 'Retrieve code from repositories', utility: 'utility_github_get_code' },
      { name: 'Create File', description: 'Create new files in repositories', utility: 'utility_github_create_file' },
      { name: 'Update File', description: 'Update existing files', utility: 'utility_github_update_file' },
      { name: 'Read File', description: 'Read file contents', utility: 'utility_github_read_file' },
      { name: 'List Directory', description: 'List directory contents', utility: 'utility_github_list_directory' },
      { name: 'Run Code', description: 'Execute code in GitHub repositories', utility: 'utility_github_run_code' },
      { name: 'Lint Code', description: 'Lint code for errors', utility: 'utility_github_lint_code' },
      { name: 'Deploy Code', description: 'Deploy code to environments', utility: 'utility_github_deploy_code' },
      { name: 'Create Codespace', description: 'Create development environments', utility: 'utility_github_create_codespace' },
      { name: 'List Codespaces', description: 'List available codespaces', utility: 'utility_github_list_codespaces' },
      { name: 'Destroy Codespace', description: 'Remove codespace environments', utility: 'utility_github_destroy_codespace' }
    ]
  },
  {
    name: 'Web Browsing',
    icon: <ChromeIcon />,
    utilities: [
      { name: 'Google Search', description: 'Perform Google searches', utility: 'utility_google_search' },
      { name: 'Extract Content', description: 'Extract content from web pages', utility: 'utility_firecrawl_extract_content' }
    ]
  },
  {
    name: 'Utilities',
    icon: <Clock className="h-5 w-5 text-purple-600" />,
    utilities: [
      { name: 'Current DateTime', description: 'Get current date and time', utility: 'utility_get_current_datetime' }
    ]
  }
]; 