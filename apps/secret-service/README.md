# Secret Service

A secure credential management microservice for Agent Base, designed to handle sensitive API keys and credentials without exposing them to AI agents.

## Features

- **Secure Credential Storage**: Uses Google Secret Manager to securely store user API keys
- **Iframe-based UI**: Provides a secure UI for users to input credentials, isolated from the main application
- **Cross-Origin Messaging**: Uses postMessage API for secure communication between the iframe and parent window
- **Key Validation**: Validates Stripe API keys format before storing

## Architecture

The Secret Service follows a secure by design architecture:

1. **AI Agent Interaction**:
   - AI agent requests credentials via utility tool service
   - Utility tool service returns an iframe URL to the frontend
   - Frontend displays the iframe for user input
   - User enters credentials directly in the iframe
   - Credentials are stored securely and never exposed to the AI

2. **Security Design**:
   - Credentials are stored in Google Secret Manager (GSM)
   - Only reference IDs are passed to the AI agent, never the actual credentials
   - All operations requiring credentials are performed server-side

## Setup

### Prerequisites

- Google Cloud account with Secret Manager API enabled
- Service account with Secret Manager Admin permissions
- Service account key file

### Environment Variables

```
# Google Secret Manager Configuration
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# Next.js configuration
PORT=3070

# Security
JWT_SECRET=your-jwt-secret-for-secure-token-verification

# Cross-Origin (update in production)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3050
```

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev
```

### Production

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns the service health status.

### Check Secret

```
POST /api/check-secret
{
  "userId": "user-123",
  "secretType": "stripe_api_keys"
}
```

Checks if a secret exists for a user.

### Store Secret

```
POST /api/store-secret
{
  "userId": "user-123",
  "secretType": "stripe_api_keys",
  "secretValue": {
    "publishable_key": "pk_test_...",
    "secret_key": "sk_test_..."
  }
}
```

Stores a secret for a user.

### Get Secret

```
POST /api/get-secret
{
  "userId": "user-123",
  "secretType": "stripe_api_keys"
}
```

Retrieves a secret for a user.

## UI Pages

### Stripe API Key Form

```
/stripe/form?userId=user-123&conversationId=conv-456&keyType=both&description=Your+custom+description
```

Displays a form for users to input their Stripe API keys.

## Integration with Utility Tool Service

To integrate with the Secret Service, the Utility Tool Service should:

1. Create a utility tool that returns an iframe URL when credentials are needed
2. Listen for postMessage events from the iframe to know when credentials are saved
3. Use the Secret Service API to retrieve credentials when needed for operations

## Security Considerations

- Always validate user permissions before retrieving secrets
- Use HTTPS in production
- Restrict allowed origins for cross-origin requests
- Implement rate limiting to prevent brute force attacks
- Regularly rotate service account keys
- Monitor GSM access logs for suspicious activity 