# Logging Service

A microservice for recording and managing API Gateway requests with API keys. All logs are permanently stored for payment monitoring purposes.

## Features

- Logs API calls with API key information
- Provides access to historical API usage data
- Exposes metrics for monitoring
- Built as a stateless service that uses the database-service for persistence

## API Endpoints

- **POST /log** - Log an API call
- **GET /logs/:apiKey** - Get logs for a specific API key (with pagination)
- **GET /logs/all** - Get all logs with pagination (sorted by newest first)
- **GET /health** - Health check endpoint
- **GET /metrics** - Service metrics

### Pagination Parameters
For endpoints that support pagination:
- `limit` - Maximum number of logs to return (default: 100)
- `offset` - Number of logs to skip (default: 0)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to run the service on | `3900` |
| `DATABASE_SERVICE_URL` | URL of the database service | `http://localhost:3006` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |

## Setup and Running

### Local Development

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm dev

# Build for production
pnpm build

# Start in production mode
pnpm start
```

### Using with API Gateway

To integrate with the API Gateway service, add the following middleware to record API requests:

```typescript
// In the API Gateway service
import fetch from 'node-fetch';

// Logger middleware
const apiLoggerMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const apiKey = req.headers['x-api-key'];
  const originalSend = res.send;
  let responseBody = null;

  // Only log requests with API keys
  if (!apiKey) {
    return next();
  }

  // Capture response body
  res.send = function (body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  // Process request when it completes
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      
      // Log the API call
      await fetch(`${process.env.LOGGING_SERVICE_URL}/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.headers['x-request-id'] || req.id,
          requestBody: req.body,
          responseBody: responseBody ? JSON.parse(responseBody) : null,
          durationMs: duration
        })
      });
    } catch (error) {
      console.error('Failed to log API call:', error);
      // Don't block the response if logging fails
    }
  });

  next();
};

// Apply the middleware to routes that need logging
app.use('/api/v1', apiLoggerMiddleware);
```

## Testing

```bash
# Run tests
pnpm test
``` 