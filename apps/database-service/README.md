# Database Service

A simple persistence service providing a RESTful API for storing and retrieving data from a PostgreSQL database (using Railway).

## Features

- RESTful API for CRUD operations on any collection
- Seamless integration with Railway PostgreSQL
- Simple, flexible data model
- JSON-based querying
- Pagination support

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