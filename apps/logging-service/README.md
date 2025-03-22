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

## Payment Service Integration

The logging service now integrates with the payment service to automatically debit usage costs from user accounts. Here's how it works:

1. When an API call is logged, the service calculates the cost based on the endpoint and token usage:
   - `/utility` endpoints: $0.01 fixed price
   - `/generate` endpoints: token-based pricing ($0.000006 per input token, $0.00003 per output token)

2. After successfully logging the API call, the service makes an asynchronous call to the payment service's `/payment/deduct-credit` endpoint with:
   - `userId`: The ID of the user making the request
   - `amount`: The calculated price
   - `description`: A description of the API usage

3. The payment service then debits this amount from the user's Stripe account balance.

### Configuration

To enable this integration, set the environment variable:

```
# Direct payment service connection
PAYMENT_SERVICE_URL=http://localhost:3007
```

### Testing

You can test the integration using the `test-integration.js` script:

```bash
node test-integration.js <userId>
```

This will:
1. Create a mock API call log
2. Send it to the logging service
3. Wait for the payment service to be called
4. Show the results of the process

### Error Handling

The logging service implements several safeguards:

- Small amounts (<$0.001) are not debited to avoid unnecessary transactions
- Payment service calls are asynchronous, so logging operations are not blocked if the payment service is down
- Detailed logging of all payment operations for debugging

If a payment fails, it is logged but does not affect the logging operation. This ensures API calls are always logged, even if payment processing fails. 