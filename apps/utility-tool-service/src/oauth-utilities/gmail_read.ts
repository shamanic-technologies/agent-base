/**
 * Gmail Read Utility
 * 
 * Provides access to the Gmail API to read emails
 * Requires OAuth authentication with gmail.modify scope
 */
import axios from 'axios';
import { UtilityTool, GmailReadRequest } from '../types/index.js';
import { registry } from '../registry/registry.js';

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
  
  execute: async (userId: string, conversationId: string, params: GmailReadRequest): Promise<any> => {
    try {
      // Extract parameters with defaults
      const { 
        query = '',
        maxResults = 10,
        labelIds = ['INBOX'],
        userId: gmailUserId = 'me'
      } = params || {};
      
      console.log(`📧 [GMAIL_READ] Reading emails for user with query: ${query}`);
      
      // Check if user has the required scopes
      const checkAuthResponse = await axios.post(
        `${process.env.TOOL_AUTH_SERVICE_URL}/api/check-auth`,
        {
          userId,
          requiredScopes: ['https://www.googleapis.com/auth/gmail.modify'],
          toolName: 'Gmail Read'
        }
      );
      
      // If we don't have auth, return the auth URL for the frontend to handle
      if (!checkAuthResponse.data.hasAuth) {
        return {
          needs_auth: true,
          auth_url: checkAuthResponse.data.authUrl,
          message: 'Gmail access requires authentication. Please use the provided URL to authorize access.'
        };
      }
      
      // If we have auth, use the credentials to make Gmail API calls
      const credentials = checkAuthResponse.data.credentials;
      
      // Call the Gmail API with our access token
      const gmailResponse = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/${gmailUserId}/messages`,
        {
          params: {
            q: query,
            maxResults,
            labelIds: labelIds.join(',')
          },
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`
          }
        }
      );
      
      const messages = gmailResponse.data.messages || [];
      
      // If no messages found, return a simple response
      if (messages.length === 0) {
        return {
          count: 0,
          messages: [],
          message: 'No emails found matching the criteria'
        };
      }
      
      // Fetch details for each message
      const detailedMessages = await Promise.all(
        messages.slice(0, maxResults).map(async (message: any) => {
          try {
            const messageDetails = await axios.get(
              `https://gmail.googleapis.com/gmail/v1/users/${gmailUserId}/messages/${message.id}`,
              {
                headers: {
                  Authorization: `Bearer ${credentials.accessToken}`
                }
              }
            );
            
            // Extract relevant message data
            const data = messageDetails.data;
            const headers = data.payload.headers;
            
            // Find important headers
            const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
            const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
            const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || 'Unknown Recipient';
            const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || 'Unknown Date';
            
            // Get snippet of message body
            const snippet = data.snippet || '';
            
            return {
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
          } catch (error) {
            console.error(`❌ [GMAIL_READ] Error fetching message details:`, error);
            return {
              id: message.id,
              error: 'Failed to fetch message details'
            };
          }
        })
      );
      
      return {
        count: messages.length,
        messages: detailedMessages,
        total_messages: gmailResponse.data.resultSizeEstimate || messages.length
      };
      
    } catch (error) {
      console.error("❌ [GMAIL_READ] Error:", error);
      
      // Check if this is an auth error
      if (error.response && error.response.status === 401) {
        return {
          error: "Authentication failed. You may need to re-authenticate.",
          details: "Your session may have expired. Please try again."
        };
      }
      
      return {
        error: "Failed to read emails from Gmail",
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

// Register the utility
registry.register(gmailReadUtility);

// Export the utility
export default gmailReadUtility; 