# Utility Service

This service provides a simple API endpoint to access utility functions.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/utility` | POST | Access utility functions |

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
| `PORT` | Port for the server (default: 3001) |
| `NODE_ENV` | Environment (development/production) | 