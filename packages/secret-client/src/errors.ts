/**
 * Base error class for GoogleSecretManagerClient specific errors.
 */
export class GoogleSecretManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when configuration for the GoogleSecretManagerClient is invalid.
 */
export class GoogleSecretManagerConfigError extends GoogleSecretManagerError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Error thrown when a secret is not found in Google Secret Manager.
 */
export class SecretNotFoundError extends GoogleSecretManagerError {
  public readonly secretId: string;
  constructor(secretId: string, message?: string) {
    super(message || `Secret with ID '${secretId}' not found.`);
    this.secretId = secretId;
  }
}

/**
 * Error thrown for general issues when interacting with the Google Cloud Secret Manager API.
 */
export class GoogleCloudSecretManagerApiError extends GoogleSecretManagerError {
  public readonly originalError?: any;
  constructor(message: string, originalError?: any) {
    super(message);
    this.originalError = originalError;
  }
} 