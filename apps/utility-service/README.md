# Utility Service

This service provides a simple API endpoint to access utility functions.

## GitHub Utilities

This service now includes GitHub Codespace utilities for creating, managing and interacting with codespaces.

## API Endpoints

The utility service provides the following endpoints:

### 1. GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "1.0.0"
}
```

### 2. GET /utilities
List all available utilities.

**Response:**
```json
{
  "utilities": ["utility_get_current_datetime", "utility_github_create_codespace", "utility_github_destroy_codespace", "utility_github_list_directory", "utility_github_read_file", "utility_github_create_file", "utility_github_update_file", "utility_github_lint_code", "utility_github_run_code", "utility_github_deploy_code", "utility_github_get_code"]
}
```

The rest of the documentation remains the same...