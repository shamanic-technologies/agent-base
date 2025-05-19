// Import NodeJS type for headers
import { IncomingHttpHeaders } from 'http';
import { AgentServiceCredentials, ErrorResponse, InternalServiceCredentials, ServiceCredentials, ServiceResponse } from "@agent-base/types";

// Define a minimal interface for the request object
interface RequestWithHeaders {
  headers: IncomingHttpHeaders;
}

// Helper to extract auth headers
export const getAuthHeadersFromAgent = (req: RequestWithHeaders): ServiceResponse<AgentServiceCredentials> => {
    
    // Access headers using bracket notation, allowed by IncomingHttpHeaders
    const platformUserId = req.headers['x-platform-user-id'] as string | undefined;
    const clientUserId = req.headers['x-client-user-id'] as string | undefined;
    const platformApiKey = req.headers['x-platform-api-key'] as string | undefined;
    const agentId = req.headers['x-agent-id'] as string | undefined; // Agent ID if provided
  
    const missingHeaders: string[] = [];
    if (!platformUserId) missingHeaders.push('x-platform-user-id');
    if (!clientUserId) missingHeaders.push('x-client-user-id');
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
          platformApiKey: platformApiKey as string,
          agentId: agentId as string
      }
    };
};
// Helper to extract auth headers
export const getAuthHeaders = (req: RequestWithHeaders): ServiceResponse<ServiceCredentials> => {
    
    // Access headers using bracket notation, allowed by IncomingHttpHeaders
    const platformUserId = req.headers['x-platform-user-id'] as string | undefined;
    const clientUserId = req.headers['x-client-user-id'] as string;
    const platformApiKey = req.headers['x-platform-api-key'] as string;
    const agentId = req.headers['x-agent-id'] as string | undefined; // Agent ID if provided
  
    return { 
      success: true,
      data: {
          platformUserId,
          clientUserId,
          platformApiKey,
          agentId
      }
    };
  };  