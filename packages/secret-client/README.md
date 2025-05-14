# @agent-base/google-secret-manager-client

A simple and modern TypeScript client for interacting with Google Cloud Secret Manager.

This package provides a convenient wrapper around the official `@google-cloud/secret-manager` library, offering a streamlined interface for common secret management operations.

## Features

-   Easy-to-use API for creating, retrieving, and checking existence of secrets.
-   Strongly-typed for enhanced developer experience with TypeScript.
-   Configurable for Google Cloud Project ID and credentials.
-   Designed for ES Module environments.

## Installation

```bash
pnpm install @agent-base/google-secret-manager-client
# or
yarn add @agent-base/google-secret-manager-client
# or
npm install @agent-base/google-secret-manager-client
```

## Prerequisites

Before using this client, ensure you have:

1.  A Google Cloud Platform project.
2.  The Secret Manager API enabled for your project.
3.  Authentication configured. This can be through:
    *   Application Default Credentials (ADC) by running `gcloud auth application-default login`.
    *   A service account key JSON file.

## Usage

```typescript
import { GoogleSecretManager } from '@agent-base/google-secret-manager-client';

async function main() {
  // Initialize the client
  // Option 1: Using Application Default Credentials (ADC)
  const gsmClient = new GoogleSecretManager({
    projectId: 'your-gcp-project-id',
  });

  // Option 2: Using a service account key
  /*
  const credentials = {
    client_email: 'your-service-account-email@your-project-id.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n',
  };
  const gsmClientWithCreds = new GoogleSecretManager({
    projectId: 'your-gcp-project-id',
    credentials,
  });
  */

  const secretId = 'my-api-key';
  const secretValue = 's3cr3tV@lu3';

  try {
    // Store a secret (creates if not exists, then adds a new version)
    await gsmClient.storeSecret(secretId, secretValue);
    console.log(`Secret '${secretId}' stored successfully.`);

    // Retrieve the latest version of the secret
    const retrievedValue = await gsmClient.getSecret(secretId);
    if (retrievedValue !== null) {
      console.log(`Retrieved secret '${secretId}': ${retrievedValue}`);
    } else {
      console.log(`Secret '${secretId}' not found or has no value.`);
    }

    // Check if a secret exists
    const exists = await gsmClient.secretExists(secretId);
    console.log(`Secret '${secretId}' exists: ${exists}`);

    // Example: Storing another version
    await gsmClient.storeSecret(secretId, 'newS3cr3tV@lu3_v2');
    console.log(`Stored new version for secret '${secretId}'.`);
    const updatedValue = await gsmClient.getSecret(secretId);
    console.log(`Retrieved updated secret '${secretId}': ${updatedValue}`);


    // Attempt to retrieve a non-existent secret
    const nonExistentSecret = await gsmClient.getSecret('non-existent-secret');
    console.log(`Value of 'non-existent-secret': ${nonExistentSecret}`); // Expected: null

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
```

## API

### `new GoogleSecretManager(config: GoogleSecretManagerConfig)`

Creates a new instance of the `GoogleSecretManager` client.

**Config:**

*   `projectId: string`: Your Google Cloud Project ID.
*   `credentials?: { client_email: string; private_key: string; }`: Optional. Service account credentials. If not provided, ADC will be used.

### `async storeSecret(secretId: string, value: string): Promise<void>`

Stores a secret value. 
- If the secret does not exist, it creates the secret and adds the value as the first version.
- If the secret exists, it adds a new version with the provided value.

### `async getSecret(secretId: string): Promise<string | null>`

Retrieves the latest version of a secret's value. Returns `null` if the secret or version is not found, or if the version has no data.

### `async secretExists(secretId: string): Promise<boolean>`

Checks if a secret with the given `secretId` exists.

## Error Handling

The client methods may throw errors originating from the `@google-cloud/secret-manager` library or custom errors like `GoogleSecretManagerError` for configuration issues.

## Contributing

Contributions are welcome! Please see the main repository's contributing guidelines.

## License

[MIT](./LICENSE) 