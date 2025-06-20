# @agent-base/neon-client

A powerful client for interacting with [Neon](https://neon.tech) databases, designed for serverless environments. This package provides utility functions for programmatic project and table management, as well as a robust logging service for tool executions.

## Features

- **Dynamic Project Management**: Programmatically create Neon projects.
- **Table Utilities**: Create, get, and query database tables with simple function calls.
- **Raw SQL Execution**: A utility to run raw SQL queries for maximum flexibility.
- **Automated Execution Logging**: Automatically log tool executions to a dedicated table, creating the table if it doesn't exist.
- **WebSocket-Powered**: Uses a WebSocket-based connection pool for robust, session-based database interactions, ideal for DDL statements.
- **Built with TypeScript**: Fully typed for a better developer experience.

## Installation

```bash
npm install @agent-base/neon-client
```

## Setup

Ensure you have a `.env` file with your Neon database connection string:

```
NEON_DATABASE_URL="your-neon-connection-string"
```

The client also uses the `NEON_API_KEY` for project creation if you are using the `getOrCreateDbConnection` function (though the recommended usage is direct connection via `NEON_DATABASE_URL`).

## Usage

Here's a quick overview of how to use the key functions provided by the client.

### Creating a Table

```typescript
import { createTable } from '@agent-base/neon-client';

const tableName = 'users';
const schema = {
  id: 'int',
  name: 'string',
  email: 'email'
};

await createTable(tableName, schema);
console.log(`Table '${tableName}' created successfully.`);
```

### Querying the Database

```typescript
import { executeQuery } from '@agent-base/neon-client';

const result = await executeQuery('SELECT * FROM users LIMIT 5');
console.log(result);
```

### Logging Tool Executions

The client can automatically log the execution of your tools.

```typescript
import { logExecution } from '@agent-base/neon-client';
import { InternalUtilityTool } from '@agent-base/types';

// Example tool definition
const myTool: InternalUtilityTool = {
  id: 'my_custom_tool',
  description: 'A custom tool.',
  schema: {
    type: 'object',
    properties: {
      customParam: { type: 'string' }
    }
  },
  // ... execute function
};

// Inside your execution logic...
const params = { customParam: 'some_value' };
const result = { success: true, data: 'Tool executed' };

// This will create a 'tool_my_custom_tool' table if it doesn't exist
// and insert a row with the execution details.
await logExecution(myTool, params, result);
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## License

This project is licensed under the MIT License. 