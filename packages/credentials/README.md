# Credentials Package

Shared credentials types and utilities for Agent Base services.

## Overview

This package provides a single source of truth for credential-related data types and utilities to ensure consistency across all services.

## Features

- Type definitions for credentials data
- Mapping functions between database and application formats
- Handles snake_case to camelCase conversions

## Usage

```typescript
import { 
  Credentials, 
  CreateCredentialsInput, 
  UpdateCredentialsInput, 
  mapToDatabase, 
  mapFromDatabase 
} from '@agent-base/credentials';

// Create credentials input
const input: CreateCredentialsInput = {
  userId: 'user123',
  provider: 'google',
  accessToken: 'token123',
  refreshToken: 'refresh123',
  expiresAt: Date.now() + 3600000,
  scopes: ['email', 'profile']
};

// Map to database format (snake_case)
const dbRecord = mapToDatabase(input);
// Result: { user_id: 'user123', provider: 'google', ... }

// Map from database record to application format (camelCase)
const credentials = mapFromDatabase(dbRecord);
// Result: { userId: 'user123', provider: 'google', ... }
```

## Why This Package Exists

Managing credentials across multiple services requires a consistent data format. This package solves:

1. **Type Consistency**: One source of truth for credential types
2. **Field Naming**: Handles conversion between snake_case (database) and camelCase (TypeScript) 
3. **Format Conversion**: Ensures proper data typing (strings vs numbers, handling dates) 