// Import NodeJS type for headers
import { IncomingHttpHeaders } from 'http';
import {
  ErrorResponse,
  ServiceResponse,
  AgentBaseCredentials,
  AgentInternalCredentials,
  InternalCredentials
} from "@agent-base/types";

// Define a minimal interface for the request object that works for both Express and Next.js
interface RequestWithHeaders {
  headers: IncomingHttpHeaders | Headers;
}

// Helper to normalize getting a header from either Express or Next.js
const getHeader = (headers: IncomingHttpHeaders | Headers, key: string): string | undefined => {
    if (headers instanceof Headers) {
        return headers.get(key) || undefined;
    }
    // For IncomingHttpHeaders, which is what Express uses.
    const value = headers[key];
    if (Array.isArray(value)) {
      return value[0]; // Return the first header value if it's an array
    }
    return value || undefined; // Return the value or undefined
}

// Helper to extract auth headers
export const getAgentInternalAuthHeaders = (req: RequestWithHeaders): ServiceResponse<AgentInternalCredentials> => {
  
  // Access headers using the new helper
  const platformUserId = getHeader(req.headers, 'x-platform-user-id');
  const platformOrganizationId = getHeader(req.headers, 'x-platform-organization-id');
  const clientUserId = getHeader(req.headers, 'x-client-user-id');
  const clientOrganizationId = getHeader(req.headers, 'x-client-organization-id');
  const platformApiKey = getHeader(req.headers, 'x-platform-api-key');
  const agentId = getHeader(req.headers, 'x-agent-id');

  const missingHeaders: string[] = [];
  if (!platformUserId) missingHeaders.push('x-platform-user-id');
  if (!clientUserId) missingHeaders.push('x-client-user-id');
  if (!clientOrganizationId) missingHeaders.push('x-client-organization-id');
  if (!platformApiKey) missingHeaders.push('x-platform-api-key');
  if (!agentId) missingHeaders.push('x-agent-id');

  if (missingHeaders.length > 0) {
    return {
      success: false,
      error: `Missing required authentication headers: ${missingHeaders.join(', ')}.
      Expected x-platform-user-id, x-client-user-id, x-platform-api-key, and x-agent-id.`
    } as ErrorResponse;
  }
  
  return { 
    success: true,
    data: {
        platformUserId: platformUserId as string,
        platformOrganizationId: platformOrganizationId as string,
        clientUserId: clientUserId as string,
        clientOrganizationId: clientOrganizationId as string,
        platformApiKey: platformApiKey as string,
        agentId: agentId as string
    }
  };
};
// Helper to extract auth headers
export const getInternalAuthHeaders = (req: RequestWithHeaders): ServiceResponse<InternalCredentials> => {
    
    // Access headers using the new helper
    const platformUserId = getHeader(req.headers, 'x-platform-user-id');
    const platformOrganizationId = getHeader(req.headers, 'x-platform-organization-id');
    const clientUserId = getHeader(req.headers, 'x-client-user-id');
    const clientOrganizationId = getHeader(req.headers, 'x-client-organization-id');
    const platformApiKey = getHeader(req.headers, 'x-platform-api-key');
    const agentId = getHeader(req.headers, 'x-agent-id');
  
    const missingHeaders: string[] = [];
    if (!clientUserId) missingHeaders.push('x-client-user-id');
    if (!clientOrganizationId) missingHeaders.push('x-client-organization-id');
    if (!platformApiKey) missingHeaders.push('x-platform-api-key');

    if (missingHeaders.length > 0) {
      return {
        success: false,
        error: `[getInternalAuthHeaders] Missing required authentication headers: ${missingHeaders.join(', ')}. Expected x-platform-user-id, x-client-user-id, x-platform-api-key, and x-agent-id.`
      } as ErrorResponse;
    }
    
    return { 
      success: true,
      data: {
          platformUserId: platformUserId as string,
          platformOrganizationId: platformOrganizationId as string,
          clientUserId: clientUserId as string,
          clientOrganizationId: clientOrganizationId as string,
          platformApiKey: platformApiKey as string,
          agentId: agentId as string
      }
    };
  };  