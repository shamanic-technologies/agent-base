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
  "utilities": [
    "utility_get_current_datetime",
    "utility_github_get_code",
    "utility_github_list_directory",
    "utility_github_read_file",
    "utility_github_create_file",
    "utility_github_update_file",
    "utility_github_lint_code",
    "utility_github_run_code",
    "utility_github_deploy_code",
    "utility_github_create_codespace",
    "utility_github_destroy_codespace"
  ]
}
```

### 3. GET /utility/:id
Get information about a specific utility.

**Parameters:**
- `id`: The ID of the utility (e.g., `utility_get_current_datetime`)

**Response:**
```json
{
  "id": "utility_get_current_datetime",
  "description": "Use this tool to get the current date and time...",
  "schema": {
    "format": {
      "type": "string",
      "optional": true,
      "description": "Optional format for the datetime: 'iso' (default), 'locale', 'date', 'time', or 'unix'"
    }
  }
}
```

### 4. POST /utility
Call a utility function.

**Request Body:**
```json
{
  "operation": "utility_get_current_datetime",
  "data": {
    "format": "iso"
  }
}
```

**Response:**
```json
{
  "data": "2023-12-31T08:00:00.000Z"
}
```

### Utility Endpoint

To use the utility endpoint, send a POST request to `/utility` with the following JSON body:

```json
{
  "operation": "utility_get_current_datetime",
  "data": {
    "format": "iso" // Optional: "iso" (default), "locale", "date", "time", or "unix"
  }
}
```

#### Available Operations

Currently supported operations:

- `utility_get_current_datetime`: Get the current date and time in various formats
- `utility_github_get_code`: Retrieve code from a GitHub repository
- `utility_github_list_directory`: List the contents of a directory in a GitHub repository
- `utility_github_read_file`: Read a file from a GitHub repository
- `utility_github_create_file`: Create a new file in a GitHub repository
- `utility_github_update_file`: Update an existing file in a GitHub repository
- `utility_github_lint_code`: Lint code in a GitHub repository
- `utility_github_run_code`: Run code from a GitHub repository
- `utility_github_deploy_code`: Deploy code from a GitHub repository
- `utility_github_create_codespace`: Create a new GitHub Codespace for a repository
- `utility_github_destroy_codespace`: Destroy a GitHub Codespace when it's no longer needed

##### utility_get_current_datetime

This utility returns the current date and time in the requested format.

**Parameters:**
- `format` (optional): The format to return the date and time in
  - `iso` (default): ISO 8601 format (e.g., '2023-12-31T08:00:00.000Z')
  - `locale`: Human-readable format (e.g., 'December 31, 2023, 08:00:00 AM')
  - `date`: Date only (e.g., 'December 31, 2023')
  - `time`: Time only (e.g., '08:00:00 AM')
  - `unix`: Unix timestamp (seconds since epoch)

**Example response:**
```json
{
  "data": "2023-12-31T08:00:00.000Z"
}
```

##### utility_github_get_code

This utility retrieves code and repository information from a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `path` (optional): Path to retrieve (defaults to the repository root)
- `branch` (optional): Branch name (defaults to the default branch)

**Example response for repository info:**
```json
{
  "data": {
    "type": "repository",
    "owner": "username",
    "repo": "repository",
    "description": "Repository description",
    "default_branch": "main",
    "branches": ["main", "develop"],
    "rootFiles": [
      {
        "name": "README.md",
        "path": "README.md",
        "type": "file",
        "size": 1024,
        "url": "https://github.com/username/repository/blob/main/README.md"
      }
    ],
    "url": "https://github.com/username/repository"
  }
}
```

##### utility_github_list_directory

This utility lists the contents of a directory in a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `path` (optional): Directory path to list (defaults to the repository root)
- `branch` (optional): Branch name (defaults to the default branch)

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "path": "src",
    "branch": "main",
    "contents": [
      {
        "name": "index.js",
        "path": "src/index.js",
        "type": "file",
        "size": 1024
      },
      {
        "name": "components",
        "path": "src/components",
        "type": "dir",
        "size": null
      }
    ]
  }
}
```

##### utility_github_read_file

This utility reads the contents of a file from a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `path` (required): Path to the file to read
- `branch` (optional): Branch name (defaults to the default branch)

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "path": "src/index.js",
    "branch": "main",
    "content": "console.log('Hello, world!');\n",
    "sha": "abc123...",
    "size": 28,
    "url": "https://github.com/username/repository/blob/main/src/index.js"
  }
}
```

##### utility_github_create_file

This utility creates a new file in a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `path` (required): Path to the file to create
- `content` (required): Content of the file
- `message` (optional): Commit message (defaults to "Create <file>")
- `branch` (optional): Branch name (defaults to the default branch)

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "path": "src/newfile.js",
    "branch": "main",
    "commit": "abc123...",
    "url": "https://github.com/username/repository/blob/main/src/newfile.js",
    "message": "File created successfully."
  }
}
```

##### utility_github_update_file

This utility updates an existing file in a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `path` (required): Path to the file to update
- `content` (required): New content of the file
- `message` (optional): Commit message (defaults to "Update <file>")
- `sha` (optional): The blob SHA of the file being replaced
- `branch` (optional): Branch name (defaults to the default branch)

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "path": "src/index.js",
    "branch": "main",
    "commit": "def456...",
    "url": "https://github.com/username/repository/blob/main/src/index.js",
    "message": "File updated successfully."
  }
}
```

##### utility_github_lint_code

This utility lints code in a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `branch` (optional): Branch name (defaults to the default branch)
- `files` (optional): List of specific files to lint (defaults to all files)

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "branch": "main",
    "type": "javascript/typescript",
    "tools": ["eslint"],
    "results": {
      "success": false,
      "output": "src/index.js:1:1: Expected indentation of 2 spaces but found 4 (indent)"
    }
  }
}
```

##### utility_github_run_code

This utility runs code from a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `path` (required): Path to the file to run
- `branch` (optional): Branch name (defaults to the default branch)
- `command` (optional): Command to run (defaults to auto-detection based on file type)
- `args` (optional): Arguments to pass to the command
- `input` (optional): Input to provide to the command
- `timeout` (optional): Timeout in milliseconds (defaults to 30000)

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "path": "src/hello.js",
    "branch": "main",
    "command": "node",
    "args": [],
    "output": "Hello, world!",
    "timeoutMs": 30000
  }
}
```

##### utility_github_deploy_code

This utility deploys code from a GitHub repository.

**Parameters:**
- `owner` (optional): Repository owner (username or organization)
- `repo` (optional): Repository name
- `branch` (optional): Branch name to deploy (defaults to the default branch)
- `environment` (optional): Target environment (e.g., 'production', 'staging')
- `message` (optional): Deployment message

**Example response:**
```json
{
  "data": {
    "owner": "username",
    "repo": "repository",
    "ref": "abc123...",
    "workflow": "Deploy to Production",
    "workflow_id": 12345,
    "environment": "production",
    "message": "Deployed via utility service",
    "status": "Deployment workflow triggered successfully",
    "url": "https://github.com/username/repository/actions/workflows/deploy.yml"
  }
}
```

##### utility_github_create_codespace

This utility creates a new GitHub Codespace for a repository, which provides a cloud-based development environment.

**Parameters:**
- `owner` (required): Repository owner (username or organization)
- `repo` (required): Repository name
- `branch` (optional): Branch name (defaults to "main")

**Example request:**
```json
{
  "operation": "utility_github_create_codespace",
  "input": {
    "owner": "username",
    "repo": "repository",
    "branch": "main"
  }
}
```

**Example response:**
```json
{
  "data": {
    "codespaceId": "cs-abcdef123456",
    "status": "available"
  }
}
```

##### utility_github_destroy_codespace

This utility destroys a GitHub Codespace when it's no longer needed.

**Parameters:**
- `codespaceId` (required): The ID of the codespace to destroy (obtained from a previous call to `utility_github_create_codespace`)

**Example request:**
```json
{
  "operation": "utility_github_destroy_codespace",
  "input": {
    "codespaceId": "cs-abcdef123456"
  }
}
```

**Example response:**
```json
{
  "data": {
    "message": "Codespace cs-abcdef123456 has been destroyed successfully"
  }
}
```

## GitHub Codespaces Workflow

For using GitHub operations in a secure containerized environment with a monorepo structure:

1. **Create a Codespace for the repository**:
   ```json
   {
     "operation": "utility_github_create_codespace",
     "input": {
       "owner": "blooming-generation",
       "repo": "agent-base",
       "workDir": "apps/utility-service"
     }
   }
   ```

2. **Use the codespaceId for operations**:
   ```json
   {
     "operation": "utility_github_read_file",
     "input": {
       "codespaceId": "cs-abcdef123456",
       "path": "src/index.ts"
     }
   }
   ```

3. **Run code in the Codespace**:
   ```json
   {
     "operation": "utility_github_run_code",
     "input": {
       "codespaceId": "cs-abcdef123456",
       "command": "npm run dev"
     }
   }
   ```

4. **Clean up when done**:
   ```json
   {
     "operation": "utility_github_destroy_codespace",
     "input": {
       "codespaceId": "cs-abcdef123456"
     }
   }
   ```

### Monorepo Considerations

When working with a monorepo structure like `blooming-generation/agent-base`:

1. **Working Directory**: By default, all operations will be performed in the `apps/utility-service` directory within the repository.

2. **Path Resolution**: When specifying paths in operations like `read_file` or `list_directory`, the paths are relative to the working directory.

3. **Dependencies**: The Codespace will have access to all dependencies in the monorepo, including shared packages.

4. **Commands**: When running commands, they will be executed in the context of the working directory.

## Environment Variables

The utility service requires the following environment variables:

- `PORT`: The port to run the service on (default: 3008)
- `GITHUB_TOKEN`: GitHub personal access token with the following scopes:
  - repo (all)
  - workflow
  - codespaces (all)
- `GITHUB_OWNER`: Default GitHub owner (username or organization)
- `GITHUB_REPO`: Default GitHub repository name

## Notes on GitHub Codespaces Security

GitHub Codespaces provides several security benefits:

1. **Isolation**: Each codespace runs in its own container in GitHub's cloud infrastructure
2. **Managed Authentication**: GitHub handles authentication and authorization
3. **Resource Limits**: Codespaces have configurable CPU, memory, and storage limits
4. **Network Security**: Codespaces run in a controlled network environment
5. **Automatic Cleanup**: Inactive codespaces are automatically deleted after a configurable period

## Tests

Tests are organized in the `tests/` directory:

```
tests/
├── integration/               # Tests requiring the server to be running
│   └── utility-service.test.js # Tests the API endpoints
├── unit/                      # Unit tests (if any)
└── run-all.js                 # Script to run all tests
```

### Running Tests

We have several test commands:

```bash
# Run all tests
npm run test

# Run specific tests
npm run test:integration  # Run integration tests
npm run test:simple       # Run simple API test
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Deployment

This service is configured for deployment on Railway. To deploy:

1. Push your changes to the repository
2. Configure the required environment variables in Railway
3. Deploy using the Railway CLI or dashboard

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Port for the server (default: 3008) |
| `NODE_ENV` | Environment (development/production) |
| `GITHUB_TOKEN` | GitHub personal access token for GitHub utilities |
| `GITHUB_OWNER` | Default GitHub repository owner (username or organization) |
| `GITHUB_REPO` | Default GitHub repository name |
