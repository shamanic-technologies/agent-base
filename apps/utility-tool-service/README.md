# Utility Tool Service

A modular utility service that provides a collection of tools for various operations including database management, web searches, content extraction, and more.

## Features

- **Database Operations**: Create, query, update, and delete database tables
- **Google Search**: Perform web searches with the Google Search API
- **Google Maps**: Search for locations, businesses, and places using Google Maps
- **Google Flights**: Search for flight information, prices, and routes
- **Web page reading**: Extract content from web pages in markdown format
- **DateTime Utilities**: Get current date and time in various formats

## Architecture

This service follows a modular architecture with a central registry system:

- Each utility is self-contained and implements the `BasicUtilityTool` interface
- Utilities register themselves with the registry service
- The API server provides RESTful endpoints to list and execute utilities
- Utilities are grouped by category (Database, Google, Web, etc.)

## Project Structure

```
src/
├── api-utilities/       # API-based utilities
│   ├── database/        # Database operations (Xata)
│   ├── google/          # Google API utilities
│   └── web/             # Web content utilities
├── basic-utilities/     # Simple utility functions
├── registry/            # Utility registry system
├── types/               # Type definitions
├── xata-client.ts       # Xata database client
├── index.ts             # Main entry point
└── server.ts            # Express API server
```

## API Usage

### List Available Utilities

```
GET /utilities
```

### Get Utility Information

```
GET /utility-tool/:id
```

### Execute a Utility

```
POST /utility-tool/:id
```
Request body:
```json
{
  "input": {
    // Utility-specific parameters
  },
  "conversation_id": "required-conversation-id",
  "user_id": "required-user-id"
}
```

## Utility Examples

### Google Search

```json
{
  "input": {
    "query": "climate change facts",
    "limit": 5
  },
  "conversation_id": "conv-123",
  "user_id": "user-456"
}
```

### Create Database Table

```json
{
  "input": {
    "name": "tasks",
    "description": "Task management table",
    "schema": {
      "id": "string",
      "title": "string",
      "description": "string",
      "completed": "boolean",
      "due_date": "datetime"
    }
  },
  "conversation_id": "conv-123",
  "user_id": "user-456"
}
```

### Get Current DateTime

```json
{
  "input": {
    "format": "ISO"
  },
  "conversation_id": "conv-123",
  "user_id": "user-456"
}
```

## Development

### Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env.local` file with required API keys:
```
SERPAPI_API_KEY=your_serp_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
XATA_API_KEY=your_xata_api_key
XATA_DATABASE_URL=your_xata_database_url
XATA_BRANCH=main
XATA_WORKSPACE_SLUG=your_workspace_slug
```

### Running the Service

```
npm run dev
```

### Building for Production

```
npm run build
```

### Running in Production

```
npm start
```

## Adding New Utilities

To add a new utility:

1. Create a new file in the appropriate category directory under `src/api-utilities/` or `src/basic-utilities/`
2. Implement the `BasicUtilityTool` interface
3. Register the utility with the registry
4. Export the utility as default
5. Import the utility in `src/server.ts` and `src/index.ts`

Example:

```typescript
import { BasicUtilityTool } from '../../types/index.js';
import { registry } from '../../registry/registry.js';

const myUtility: BasicUtilityTool = {
  id: 'utility_my_custom_tool',
  description: 'Description of what my utility does',
  schema: {
    // Parameter definitions
  },
  execute: async (userId, conversationId, params) => {
    // Implementation
  }
};

registry.register(myUtility);
export default myUtility;
```

## Available Utilities

### Database Utilities
- `utility_get_database` - Get database information
- `utility_create_table` - Create a new table
- `utility_get_table` - Get table schema and data
- `utility_query_table` - Execute SQL-like queries
- `utility_alter_table` - Modify table structure
- `utility_delete_table` - Delete a table

### Google Utilities
- `utility_google_search` - Perform Google web searches
- `utility_google_maps` - Search for locations and places
- `utility_google_flights` - Search for flight information

### Web Utilities
- `utility_read_webpage` - Extract content from web pages

### Basic Utilities
- `utility_get_current_datetime` - Get current date and time
