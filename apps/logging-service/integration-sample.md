# Logging Service Integration with API Gateway

This document provides instructions for integrating the logging service with the API Gateway service to track API usage.

## Integration Steps

1. Add the logging middleware to the API Gateway service
2. Update the API Gateway service configuration

## Step 1: Add Logging Middleware

Add the logging middleware to your API Gateway service by importing it directly from the logging service:

```typescript
// In API Gateway service index.ts
import { apiLoggerMiddleware } from '../logging-service/src/api-gateway-middleware.js';

// Or if using as a package
// import { apiLoggerMiddleware } from 'logging-service';

// Set environment variable
process.env.LOGGING_SERVICE_URL = 'http://localhost:3900'; // Update with actual URL

// Apply middleware to routes that need API key tracking
app.use('/api/v1', apiLoggerMiddleware);
```

## Step 2: Update Environment Configuration

Add the following environment variables to your API Gateway service:

```env
# .env.local for API Gateway service
LOGGING_SERVICE_URL=http://localhost:3900 # For local development
# LOGGING_SERVICE_URL=https://logging-service.railway.app # For production
```

## Step 3: Testing the Integration

To test the integration, make API calls through the API Gateway with valid API keys and check the logs:

```bash
# Make an API call through the gateway
curl -X GET "http://localhost:3000/api/v1/some-endpoint" \
  -H "x-api-key: your_api_key"

# Check the logs in the logging service
curl -X GET "http://localhost:3900/logs/your_api_key"
```

## Customizing the Logger

You can customize what information gets logged by modifying the API Gateway middleware. The default implementation:

1. Logs API key usage
2. Records request and response bodies (with sensitive data redacted)
3. Tracks response times
4. Captures HTTP status codes

If you need to add custom fields or change logging behavior, you can modify the API Gateway middleware in the logging service or create a custom middleware that calls the logging service API.

## Accessing API Usage Data

To access aggregated API usage data, you can use the following endpoints:

- `GET /logs/:apiKey` - Get logs for a specific API key
- `GET /metrics` - Get service metrics 