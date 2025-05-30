// Import NodeJS type for headers
import { IncomingHttpHeaders } from 'http';
import {
  ErrorResponse,
  ServiceResponse,
  AgentBaseCredentials,
  AgentInternalCredentials,
  InternalCredentials
} from "@agent-base/types";

// Define a minimal interface for the request object
interface RequestWithHeaders {
  headers: IncomingHttpHeaders;
}

// Helper to extract auth headers
export const getAuthHeadersFromAgent = (req: RequestWithHeaders): ServiceResponse<AgentInternalCredentials> => {
    
    // Access headers using bracket notation, allowed by IncomingHttpHeaders
    const platformUserId = req.headers['x-platform-user-id'] as string | undefined;
    const clientUserId = req.headers['x-client-user-id'] as string | undefined;
    const clientOrganizationId = req.headers['x-client-organization-id'] as string | undefined;    
    const platformApiKey = req.headers['x-platform-api-key'] as string | undefined;
    const agentId = req.headers['x-agent-id'] as string | undefined; // Agent ID if provided
  
    const missingHeaders: string[] = [];
    if (!platformUserId) missingHeaders.push('x-platform-user-id');
    if (!clientUserId) missingHeaders.push('x-client-user-id');
    if (!clientOrganizationId) missingHeaders.push('x-client-organization-id');
    if (!platformApiKey) missingHeaders.push('x-platform-api-key');
    if (!agentId) missingHeaders.push('x-agent-id');

    if (missingHeaders.length > 0) {
      return {
        success: false,
        error: `Missing required authentication headers: ${missingHeaders.join(', ')}. Expected x-platform-user-id, x-client-user-id, x-platform-api-key, and x-agent-id.`
      } as ErrorResponse;
    }
    
    return { 
      success: true,
      data: {
          platformUserId: platformUserId as string,
          clientUserId: clientUserId as string,
          clientOrganizationId: clientOrganizationId as string,
          platformApiKey: platformApiKey as string,
          agentId: agentId as string
      }
    };
};
// Helper to extract auth headers
export const getAuthHeaders = (req: RequestWithHeaders): ServiceResponse<InternalCredentials> => {
    
    // Access headers using bracket notation, allowed by IncomingHttpHeaders
    const platformUserId = req.headers['x-platform-user-id'] as string | undefined;
    const clientUserId = req.headers['x-client-user-id'] as string;
    const clientOrganizationId = req.headers['x-client-organization-id'] as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;
    const agentId = req.headers['x-agent-id'] as string | undefined; // Agent ID if provided
  
    return { 
      success: true,
      data: {
          platformUserId,
          clientUserId,
          clientOrganizationId,
          platformApiKey,
          agentId
      }
    };
  };  