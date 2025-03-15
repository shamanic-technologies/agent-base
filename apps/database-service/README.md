# Database Service

A Supabase-based database service for storing and retrieving data. Acts as a data persistence layer for the other services.

## Features

- RESTful API for database operations
- Seamless integration with Supabase storage
- JSON query support
- Pagination

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase credentials
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the service:
   ```bash
   pnpm dev
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /db` - List all tables
- `GET /db/:collection` - List items in a collection (with optional filtering and pagination)
- `GET /db/:collection/:id` - Get a single item
- `POST /db/:collection` - Create a new item
- `PUT /db/:collection/:id` - Update an item
- `DELETE /db/:collection/:id` - Delete an item

## Migration Notes

This service has been migrated from an in-memory database to Supabase storage. The API interface remains mostly compatible with the previous version, with the following changes:

- Table creation through the API is no longer supported (use Supabase migrations instead)
- Timestamps now use `created_at` and `updated_at` (snake_case) instead of camelCase
- The response structure and error codes are preserved for compatibility

## Security Considerations

- This service uses a Supabase service role key for database access
- Ensure proper environment variable management for production deployments
- Consider implementing authentication middleware for sensitive operations 