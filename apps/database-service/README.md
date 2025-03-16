# Database Service

A simple persistence service providing a RESTful API for storing and retrieving data from a PostgreSQL database (using Railway).

## Features

- RESTful API for CRUD operations on any collection
- Seamless integration with Railway PostgreSQL
- Simple, flexible data model
- JSON-based querying
- Pagination support

## Database Schema Format

**IMPORTANT**: All tables in this service follow a standardized schema format:

```
id: UUID PRIMARY KEY
data: JSONB
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
```

This standardized structure is intentional during development:
- All entity-specific fields should be stored in the `data` JSONB field as key-value pairs
- We use this approach to avoid frequent schema migrations during early development
- This allows flexibility to evolve our data model without database schema changes
- All services accessing the database must accommodate this structure

When querying data:
- To filter based on nested properties in the `data` field, use: `?query={"data.fieldName":"value"}`
- When saving data, always include your properties inside the `data` object

Example user object:
```json
{
  "id": "a097c96d-cdf9-4545-b349-9d3d67d516ec",
  "data": {
    "providerId": "107245792881208469416",
    "email": "user@example.com",
    "name": "Example User",
    "provider": "google",
    "last_login": "2025-03-16T11:36:33.262Z",
    "created_at": "2025-03-16T11:30:00.000Z"
  },
  "created_at": "2025-03-16T11:30:00.000Z",
  "updated_at": "2025-03-16T11:36:33.262Z"
}
```

## Usage

### Environment Setup

Before running the service, set up the required environment variables in a `.env.local` file:

```
# Railway PostgreSQL Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
PGDATABASE=postgres
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=postgres
PGPORT=5432

# Server Configuration
PORT=3006
```

### Running Locally

```bash
# Install dependencies
npm install

# Start the service
npm run dev
```

The service will be available at http://localhost:3006.

## API Endpoints

### Health Check
```
GET /health
```

### List Collections
```
GET /db
```

### Create Item
```
POST /db/:collection
```

### Query Items
```
GET /db/:collection?query={"key":"value"}&limit=10&offset=0
```

Querying nested fields in the `data` JSONB object:
```
GET /db/:collection?query={"data.nestedField":"value"}
```

### Get Item
```
GET /db/:collection/:id
```

### Update Item
```
PUT /db/:collection/:id
```

### Delete Item
```
DELETE /db/:collection/:id
```

## Railway Integration

This service is designed to work seamlessly with Railway PostgreSQL. When deploying to Railway:

1. Create a new service for database-service
2. Add a PostgreSQL plugin to your project
3. Railway will automatically inject the required environment variables

## Testing

Use Postman or another API client to manually test the functionality of the database service. Example requests are provided in the API Endpoints section above. 