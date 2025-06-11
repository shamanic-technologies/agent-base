/**
 * Common base types for the agent system.
 */


/**
 * Generic service response with typed data payload
 * Used for internal service-to-service communication
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  hint?: string; // Concrete next steps for the agent to take
}

export interface ErrorResult {
  error: string;
  details?: string;
  statusCode?: number;
  hint?: string; // Concrete next steps for the agent to take
}

export interface ErrorResponse extends ErrorResult {
  success: false;
}

export type ServiceResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Type definition for the health check endpoint response.
 */
export interface HealthStatusResponse {
  status: string;
  provider: string;
}


// export interface ServiceCredentialsForPlatformUserTokenValidation {
//   platformUserToken: string;
// }

export interface AgentBaseCredentials {
  platformApiKey: string;
  clientAuthUserId: string; // Ex platformClientUserId
  clientAuthOrganizationId: string;
}

export interface MinimalInternalCredentials {
  platformApiKey: string;
  clientUserId: string;
  clientOrganizationId: string;
}

export type ExternalApiServiceCredentials = AgentBaseCredentials | MinimalInternalCredentials;

export interface ClientProviderUserValidationInternalCredentials {
  platformApiKey: string;
  platformUserId: string;
  clientAuthUserId: string; // Ex platformClientUserId
}


export interface InternalCredentials {
  platformApiKey: string;
  clientUserId: string;
  clientOrganizationId: string;
  platformUserId?: string;
  platformOrganizationId?: string;
  agentId?: string;
}

export interface HumanInternalCredentials extends InternalCredentials {
  platformUserId: string;
}

export interface ExternalCredentials extends InternalCredentials {
  platformUserId: string;
}

export interface AgentInternalCredentials extends InternalCredentials {
  platformUserId: string;
  agentId: string;
}
  
  