/**
 * Configuration for the GoogleSecretManager client.
 */
export interface GoogleSecretManagerConfig {
  /**
   * Your Google Cloud Project ID.
   */
  projectId: string;

  /**
   * Optional. Service account credentials.
   * If not provided, Application Default Credentials (ADC) will be used.
   * The structure should match the Google service account key JSON format,
   * specifically requiring `client_email` and `private_key`.
   */
  credentials?: {
    client_email: string;
    private_key: string;
    // Other fields from the service account key are not strictly required by the client
    // but can be present.
    [key: string]: any; 
  };
} 