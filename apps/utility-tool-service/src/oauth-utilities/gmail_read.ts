/**
 * Gmail Read Utility
 * 
 * Provides access to the Gmail API to read emails
 * Requires OAuth authentication with gmail.modify scope
 */
import axios from 'axios';
import { 
  UtilityTool, 
  GmailReadRequest, 
  GmailReadResponse, 
  SetupNeededResponse,
  GmailSuccessResponse, 
  UtilityErrorResponse,
  GmailMessageDetails,
  GmailErrorMessageDetails,
  GmailMessageHeader,
} from '../types/index.js';
import { registry } from '../registry/registry.js';
import { CredentialProvider } from '@agent-base/credentials';

/**
 * Implementation of the Gmail Read utility
 */
const gmailReadUtility: UtilityTool = {
  id: 'utility_gmail_read',
  description: 'Read emails from Gmail using the Gmail API with proper OAuth authentication',
  schema: {
    query: {
      type: 'string',
      optional: true,
      description: 'Search query to filter emails (same format as Gmail search)'
    },
    maxResults: {
      type: 'number',
      optional: true,
      description: 'Maximum number of emails to return (default: 10)'
    },
    labelIds: {
      type: 'array',
      optional: true,
      description: 'Array of label IDs to filter emails by (e.g., "INBOX", "UNREAD")'
    }
  },
  
  execute: async (userId: string, conversationId: string, params: GmailReadRequest): Promise<GmailReadResponse> => {
    try {
      // Extract parameters with defaults
      const { 
        query = '',
        maxResults = 10,
        labelIds = ['INBOX'],
      } = params || {};
      
      console.log(`📧 [GMAIL_READ] Reading emails for user with query: ${query}`);
      
      // Get tool auth service URL with fallback
      const toolAuthServiceUrl = process.env.TOOL_AUTH_SERVICE_URL;
      console.log(`📧 [GMAIL_READ] Using Tool Auth Service URL: ${toolAuthServiceUrl}`);
      
      if (!toolAuthServiceUrl) {
        // Return UtilityErrorResponse for configuration issues
        const errorResponse: UtilityErrorResponse = {
          status: 'error',
          error: 'TOOL_AUTH_SERVICE_URL environment variable is not set'
        };
        return errorResponse;
      }
      
      // Check if user has the required scopes
      const checkAuthResponse = await axios.post(
        `${toolAuthServiceUrl}/api/check-auth`,
        {
          userId,
          provider: CredentialProvider.GOOGLE,
          requiredScopes: ['https://www.googleapis.com/auth/gmail.modify']
        }
      );
      
      // If we don't have auth, return the auth URL for the frontend to handle
      if (!checkAuthResponse.data.hasAuth) {
        // Return the standardized SetupNeededResponse
        const setupNeededResponse: SetupNeededResponse = {
          status: 'needs_setup',
          needs_setup: true,
          setup_url: checkAuthResponse.data.authUrl,
          provider: 'gmail',
          message: 'Gmail access requires authentication.',
          title: "Connect Gmail Account",
          description: "Secure access is required to read your emails",
          button_text: "Continue with Gmail"
        };
        return setupNeededResponse;
      }
      
      // If we have auth, use the credentials to make Gmail API calls
      const credentialsArray = checkAuthResponse.data.credentials;
      
      // Find the credential with the gmail.modify scope
      const gmailCredential = credentialsArray.find(
        (cred: any) => cred.scope === 'https://www.googleapis.com/auth/gmail.modify'
      );
      
      if (!gmailCredential) {
        // Return UtilityErrorResponse if credentials are not found
        const errorResponse: UtilityErrorResponse = {
          status: 'error',
          error: 'No valid Gmail credentials found with required scope'
        };
        return errorResponse;
      }
      
      // Call the Gmail API with our access token
      const gmailResponse = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages`,
        {
          params: {
            q: query,
            maxResults,
            labelIds: labelIds.join(',')
          },
          headers: {
            Authorization: `Bearer ${gmailCredential.accessToken}`
          }
        }
      );
      
      const messages = gmailResponse.data.messages || [];
      
      // If no messages found, return a simple response
      if (messages.length === 0) {
        const emptyResponse: GmailSuccessResponse = {
          status: 'success',
          count: 0,
          messages: [],
          message: 'No emails found matching the criteria'
        };
        return emptyResponse;
      }
      
      // Fetch details for each message
      const detailedMessages = await Promise.all(
        messages.slice(0, maxResults).map(async (message: any) => {
          try {
            const messageDetails = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
              {
                headers: {
                  Authorization: `Bearer ${gmailCredential.accessToken}`
                }
              }
            );
            
            // Extract relevant message data
            const data = messageDetails.data;
            const headers = data.payload.headers as GmailMessageHeader[];
            
            // Find important headers
            const subject = headers.find((h: GmailMessageHeader) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
            const from = headers.find((h: GmailMessageHeader) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
            const to = headers.find((h: GmailMessageHeader) => h.name.toLowerCase() === 'to')?.value || 'Unknown Recipient';
            const date = headers.find((h: GmailMessageHeader) => h.name.toLowerCase() === 'date')?.value || 'Unknown Date';
            
            // Get snippet of message body
            const snippet = data.snippet || '';
            
            const messageDetail: GmailMessageDetails = {
              id: data.id,
              threadId: data.threadId,
              labelIds: data.labelIds,
              subject,
              from,
              to,
              date,
              snippet,
              unread: data.labelIds.includes('UNREAD')
            };
            return messageDetail;
          } catch (error) {
            console.error(`❌ [GMAIL_READ] Error fetching message details:`, error);
            const errorMessageDetail: GmailErrorMessageDetails = {
              id: message.id,
              error: 'Failed to fetch message details'
            };
            return errorMessageDetail;
          }
        })
      );
      
      const successResponse: GmailSuccessResponse = {
        status: 'success',
        count: messages.length,
        messages: detailedMessages,
        total_messages: gmailResponse.data.resultSizeEstimate || messages.length
      };
      return successResponse;
      
    } catch (error) {
      console.error("❌ [GMAIL_READ] Error:", error);
      
      // Prepare UtilityErrorResponse for caught errors
      let errorResponse: UtilityErrorResponse;
      if (axios.isAxiosError(error) && error.response && error.response.status === 401) {
        errorResponse = {
          status: 'error',
          error: "Authentication failed. You may need to re-authenticate.",
          details: "Your session may have expired or permissions changed."
        };
      } else {
        errorResponse = {
          status: 'error',
          error: "Failed to read emails from Gmail",
          details: error instanceof Error ? error.message : String(error)
        };
      }
      return errorResponse;
    }
  }
};

// Register the utility
registry.register(gmailReadUtility);

// Export the utility
export default gmailReadUtility; 