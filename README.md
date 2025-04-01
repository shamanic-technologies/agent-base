# HelloWorld Microservices

A modern microservices architecture built with Node.js, Express, and Turborepo, optimized for deployment on Railway.

## Project Structure

This project is organized as a monorepo using Turborepo:

```
/
├── apps/               # All microservices
│   ├── auth-service/   # Authentication service
│   ├── database-service/ # Database service
│   ├── key-service/    # API key management
│   ├── model-service/  # AI model serving
│   ├── payment-service/ # Payment processing
│   ├── proxy-service/  # API gateway
│   └── utility-service/ # Utility functions
├── packages/           # Shared code
│   └── shared/         # Common utilities
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build all packages and applications
npm run build
```

### Development

```bash
# Start all services in development mode
npm run dev

# Start a specific service
npm run dev --filter="@helloworld/auth-service"
```

### Testing

```bash
# Run all tests
npm test

# Test a specific service
npm test --filter="@helloworld/auth-service"
```

## Service Descriptions and Ports

| Service | Description | Port |
|---------|-------------|------|
| **auth-service** | User authentication and authorization | 3005 |
| **database-service** | Data persistence layer | 3006 |
| **key-service** | API key management and validation | 3003 |
| **langgraph-agent-service** | AI model inference service with LangGraph | 3001 |
| **agent-service** | AI model inference service wit Vercel AI SDK | 3040 |
| **payment-service** | Subscription and payment processing | 3007 |
| **api-gateway-service** | API gateway that routes requests to appropriate services | 3002 |
| **web-gateway-service** | Web gateway that routes requests to appropriate services | 3030 |
| **utility-tool-service** | Utility functions for application features | 3050 |
| **tool-auth-service** | OAuth authentication for tools used by AI agents | 3060 |
| **logging-service** | API call logging, token usage tracking and billing integration | 3900 |
| **dev-tool** | Development tools and debugging | 3010 |
| **web** | Main web application (Next.js) | 3020 |
| **client** | React client application (Vite) | 3000 |

## Deployment

This project is designed to be deployed on Railway. See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed deployment instructions.

# Agent Base - Next.js App

This is a Next.js application configured to deploy on Vercel.

## Deployment

This application is set up for deployment on Vercel with the following configuration:
- Framework: Next.js
- Root Directory: apps/web
- Environment Variables: Set in Vercel project settings

Last updated: March 13, 2025

# Google Cloud SQL Database Service

This service provides a client for working with Google Cloud SQL databases. It manages one instance and one database per user, making it ideal for multi-tenant applications where data isolation is important.

## Features

- Automatic instance and database creation
- User-specific database isolation
- Simple SQL query execution
- Database schema information
- Table management

## Setup Instructions

### 1. Set up Google Cloud Project

1. Create a Google Cloud Project if you don't have one already
2. Enable the Cloud SQL Admin API in your project
3. Create a service account with the following roles:
   - Cloud SQL Admin
   - Cloud SQL Client

### 2. Authentication Options

You have two ways to authenticate with Google Cloud:

#### Option 1: Using Service Account Key (Recommended)

1. Create a service account key file:
   - Navigate to IAM & Admin > Service Accounts
   - Select or create a service account
   - Go to the Keys tab and create a new JSON key
   - Save the key file

2. Place the service account key file in one of these locations:
   - In `gcloud-credentials/service-account.json` (default location)
   - Or any location, and set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to it

```bash
# Set the environment variable to point to your key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"
```

#### Option 2: Using Access Token (Simpler but less secure)

```bash
# Generate and set an access token (expires after 1 hour)
export GOOGLE_CLOUD_ACCESS_TOKEN=$(gcloud auth print-access-token)
```

### 3. Other Required Environment Variables

```bash
# Required
GOOGLE_CLOUD_PROJECT=your-project-id    # Or will be read from service account file
GOOGLE_CLOUD_REGION=us-central1         # Or your preferred region

# Database credentials
DB_USER=postgres                        # Database username
DB_PASSWORD=your-db-password            # Database password

# Optional
INSTANCE_PREFIX=user-instance           # Prefix for instances (default: user-instance)
```

### 4. Install Dependencies

```bash
# If using npm
npm install axios pg

# For better authentication with service account (recommended):
npm install google-auth-library

# If using pnpm
pnpm add -w axios pg google-auth-library
```

## Usage Examples

### Create User Database Environment

```typescript
import { googleCloudSqlClient } from './google-cloud-sql-client';

// Create a database for a user
const environment = await googleCloudSqlClient.getOrCreateUserEnvironment('user123', 'John Doe');
console.log(`Instance: ${environment.instanceName}, Database: ${environment.databaseName}`);
```

### Execute SQL Queries

```typescript
// Create a table
await googleCloudSqlClient.createTable('user123', 'products', `(
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Insert data
const result = await googleCloudSqlClient.executeQuery(
  'user123',
  'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
  ['Product 1', 99.99]
);

// Query data
const products = await googleCloudSqlClient.executeQuery(
  'user123',
  'SELECT * FROM products WHERE price > $1',
  [50]
);
```

### Get Database Information

```typescript
// Get schema information
const dbInfo = await googleCloudSqlClient.getDatabaseInfo('user123');
console.log('Tables:', dbInfo.map(table => table.table_name));
```

### Cleanup Resources

```typescript
// Delete a database
await googleCloudSqlClient.deleteDatabase('user123');

// Delete an instance
await googleCloudSqlClient.deleteInstance('user123');
```

## API Reference

### GoogleCloudSqlClient

- `getOrCreateUserInstance(userId, userName)`: Creates a Cloud SQL instance for a user if it doesn't exist
- `getOrCreateUserDatabase(instanceName, userId)`: Creates a database on the specified instance
- `getOrCreateUserEnvironment(userId, userName)`: Creates both an instance and database for a user
- `executeQuery(userId, query, params)`: Executes a SQL query on the user's database
- `getDatabaseInfo(userId)`: Retrieves schema information for the user's database
- `createTable(userId, tableName, tableDefinition)`: Creates a table in the user's database
- `deleteDatabase(userId)`: Deletes a user's database
- `deleteInstance(userId)`: Deletes a user's instance

## Limitations and Considerations

- Creating and deleting instances takes time (several minutes)
- Each instance costs money, even when idle
- Consider using database pools for production workloads with high traffic
- Instance and database names have restrictions (lowercase letters, numbers, and hyphens)

## Security

- Access tokens should be kept secure and rotated regularly
- Consider using IP allowlisting for your database instances
- Enable SSL for database connections
- Review IAM permissions regularly

## Troubleshooting

If you encounter issues:

1. Check the Google Cloud Console for operation status
2. Verify environment variables are set correctly
3. Ensure service account has proper permissions
4. Check API quota limits
5. Review database connection settings
