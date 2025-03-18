# OAuth Routes Configuration

## Route Structure

The auth-service maintains a clear separation of concerns for authentication routes:

- Regular authentication routes: `/auth/*`
- OAuth-specific routes: `/oauth/*`

## Google OAuth Configuration

The Google OAuth redirect URI must match the route structure in the application. 
The correct configuration is:

```
GOOGLE_REDIRECT_URI=http://localhost:3005/oauth/google/callback
```

## Changes Made

- Updated the Google redirect URI in `.env.local` to use `/oauth/google/callback` instead of `/auth/google/callback`
- This maintains consistency with the route structure where OAuth routes are mounted at `/oauth`
- Ensures proper forwarding through the web-gateway-service

## Best Practices

1. Keep OAuth routes under `/oauth` for clear separation
2. Maintain consistency between environment variables and actual route paths
3. Follow the same pattern for additional OAuth providers 