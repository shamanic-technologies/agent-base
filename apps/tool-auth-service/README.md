# Tool Authentication Service

A centralized service to handle OAuth authentication for AI agent tools.

## Overview

The Tool Authentication Service manages OAuth authentication for various tools used by AI agents. It allows tools to check if a user has already authenticated with the required scopes, and if not, redirects them to an authentication page.

## Features

- OAuth authentication with Google (expandable to other providers)
- Scope-based permission management
- Centralized authentication flow for all tools
- Secure credential storage in database
- Token refresh handling

## Usage

### From a Tool

When a tool requires authentication, it should:

1. Check if the user has authenticated with the required scopes:
   ```typescript
   const authCheck = await fetch("http://localhost:3060/api/check-auth", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       userId: "user123",
       requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
       toolName: "Gmail Reader" // Optional, displayed on the auth page
     })
   }).then(r => r.json());
   ```

2. If authentication is required, open a popup with the auth URL:
   ```typescript
   if (!authCheck.hasAuth) {
     const popup = window.open(
       authCheck.authUrl,
       "auth",
       "width=500,height=600"
     );
     
     // Listen for authentication completion
     window.addEventListener("message", (event) => {
       if (event.origin === "http://localhost:3060" && 
           event.data.type === "AUTH_COMPLETE") {
         popup.close();
         // Retry the operation
       }
     });
   } else {
     // Use the credentials for the API call
     const credentials = authCheck.credentials;
   }
   ```

## API Endpoints

- `POST /api/check-auth`: Check if user has authenticated with required scopes
- `GET/POST /api/auth/[...nextauth]`: NextAuth.js authentication routes
- `GET /auth/signin`: Authentication page
- `GET /auth/callback`: Authentication callback page

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Configuration

Set the following environment variables:

```
NEXTAUTH_URL=http://localhost:3060
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
DATABASE_SERVICE_URL=http://localhost:3006
```

## Integration with Other Services

- **Database Service**: Stores OAuth credentials at `http://localhost:3006`
- **Utility Tool Service**: Consumes this service for tool authentication at `http://localhost:3050` 