// Import NodeJS type for headers
import { IncomingHttpHeaders } from 'http';
import { AgentServiceCredentials, ErrorResponse, ServiceResponse } from "@agent-base/types";

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
  
    // Validate required headers for external call
    if (!platformUserId || !clientUserId || !platformApiKey || !agentId) {
      // Proceed with only internal tools, or return error depending on requirements
      return { success: false, error: 'Missing authentication headers for external tools' } as ErrorResponse;
    }  
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
  