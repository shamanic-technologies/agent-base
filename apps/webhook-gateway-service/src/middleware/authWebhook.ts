// /**
//  * Middleware for authenticating and authorizing webhook requests.
//  */
// import { Request, Response, NextFunction } from 'express';
// import axios from 'axios';
// import { WebhookEventPayloadCrisp } from '@agent-base/types'; // Assuming this type exists and includes nested data structure

// // // Mock function - Replace with actual Key Service call later
// // /**
// //  * Mocks the retrieval or creation of an API key for a given user and provider.
// //  * In a real scenario, this would interact with a dedicated Key Management Service.
// //  * @param {string} userId - The ID of the user.
// //  * @param {string} providerId - The ID of the webhook provider (e.g., 'crisp').
// //  * @returns {Promise<string>} A dummy API key.
// //  */
// // async function getOrCreateWebhookApiKey(userId: string, providerId: string): Promise<string> {
// //     const keyName = `Webhook ${providerId}`;
// //     console.log(`[WebhookGatewayService] Getting or creating API key for user: ${userId} and provider: ${providerId}`);
// //     const keyResponse = await axios.get(`${process.env.KEY_SERVICE_URL}/keys/by-name?name=${encodeURIComponent(keyName)}`,
// //       {
// //         headers: {
// //           'x-user-id': userId,
// //         }
// //       }
// //     );
// //     console.log(`[WebhookGatewayService] Key response: ${JSON.stringify(keyResponse.data)}`);
// //     if (!keyResponse.data.success) {
// //       throw new Error(`Failed to get or create API key for user ${userId}: ${keyResponse.data.error || 'Unknown error'}`);
// //     }
    
// //     const api_key = keyResponse.data.apiKey;
// //     console.log(`[WebhookGatewayService] Successfully retrieved API key for user: ${userId}`);
// //     return api_key;
// // }

// /**
//  * Express middleware to handle authentication and authorization for webhook endpoints.
//  * - For /setup-webhook: Validates presence of x-user-id and x-api-key headers.
//  * - For /webhook/:provider_id: 
//  *   - Currently only supports 'crisp'.
//  *   - Extracts website_id from Crisp payload.
//  *   - Fetches user_id from the database service based on website_id.
//  *   - Mocks fetching/creating an API key named 'webhook_<provider_id>'.
//  *   - Injects x-user-id and x-api-key headers into the request for downstream use.
//  * 
//  * @param {Request} req - Express request object.
//  * @param {Response} res - Express response object.
//  * @param {NextFunction} next - Express next middleware function.
//  */
// export async function authWebhookMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
//   try {
//     // Handle /setup-webhook endpoint
//     if (req.path === '/setup-webhook') {
//       const userId = req.headers['x-user-id'];
//       const apiKey = req.headers['x-api-key']; // Standardize on x-api-key

//       // Ensure required headers are present
//       if (!userId || !apiKey) {
//         console.error('[AuthMiddleware] Missing x-user-id or x-api-key for /setup-webhook');
//         res.status(401).json({ success: false, error: 'Missing x-user-id or x-api-key header' });
//         return;
//       }
//       // Optional: Add further validation logic for the apiKey if needed
//       console.log(`[AuthMiddleware] /setup-webhook request validated for user: ${userId}`);

//     // Handle /webhook/:provider_id endpoint
//     } else if (req.path.startsWith('/webhook/')) {
//       // Extract provider ID from the URL path
//       const pathParts = req.path.split('/');
//       const providerId = pathParts.length > 2 ? pathParts[2] : undefined;
      
//       console.log(`[AuthMiddleware] request received for provider: ${providerId}`);
      
//       // Check if the provider is supported (only 'crisp' for now)
//       if (providerId !== 'crisp') {
//         console.error(`[AuthMiddleware] Unsupported webhook provider: ${providerId}`);
//         res.status(400).json({ success: false, error: `Webhook provider '${providerId}' not supported.` });
//         return;
//       }

//       // --- Crisp Specific Logic ---
//       const payload: WebhookEventPayloadCrisp = req.body; // Assume body is parsed JSON
//       const websiteId = payload?.data?.website_id;

//       // Ensure website_id is present in the payload
//       if (!websiteId) {
//         console.error('[AuthMiddleware] Missing website_id in Crisp payload');
//         res.status(400).json({ success: false, error: 'Missing website_id in Crisp webhook payload' });
//         return;
//       }

//       // Get user_id from the database service using website_id
//       console.log(`[AuthMiddleware] Fetching user ID for Crisp website ID: ${websiteId}`);
//       const userResponse = await axios.get(`${process.env.DATABASE_SERVICE_URL}/webhooks/crisp/users/${websiteId}`);

//       // Handle database service response errors
//       if (!userResponse.data.success || !userResponse.data.data?.user_ids?.length) {
//         console.error(`[AuthMiddleware] No users found for Crisp website ID: ${websiteId}`);
//         // Return 404 Not Found as the website ID doesn't map to a user
//         res.status(404).json({ success: false, error: `No users found for Crisp website ID: ${websiteId}`}); 
//         return; 
//       } else if (userResponse.data.data.user_ids.length > 1) {
//         // Handle cases where multiple users are found for the same website ID
//         console.error(`[AuthMiddleware] Multiple users found for Crisp website ID: ${websiteId}`);
//         // Return 409 Conflict as this indicates a configuration issue
//         res.status(409).json({ success: false, error: `Multiple users found for Crisp website ID: ${websiteId}. Please resolve conflict.`});
//         return;
//       }
      
//       // Extract the unique user ID
//       const userId = userResponse.data.data.user_ids[0];
//       console.log(`[AuthMiddleware] Found user ID: ${userId} for Crisp website ID: ${websiteId}`);

//       // Get/Create API Key (Mocked)
//       const apiKey = await getOrCreateWebhookApiKey(userId, providerId);

//       // Inject headers into the request object for downstream route handlers
//       // Ensure headers are strings if required by downstream consumers
//       req.headers['x-user-id'] = String(userId); 
//       req.headers['x-api-key'] = apiKey; 
      
//       console.log(`[AuthMiddleware] /webhook/${providerId} request validated. Injected user: ${userId}`);
//       // --- End Crisp Specific Logic ---

//     } else {
//       // For any other paths not explicitly handled, log and pass through.
//       // Depending on security requirements, you might want to deny unknown paths.
//       console.log(`[AuthMiddleware] Path ${req.path} not subject to specific webhook auth logic. Passing through.`);
//     }

//     // === Type Enforcement ===
//     // Ensure headers are strings before proceeding, if they exist
//     const finalUserId = req.headers['x-user-id'];
//     const finalApiKey = req.headers['x-api-key'];

//     if (finalUserId !== undefined && typeof finalUserId !== 'string') {
//       console.error(`[AuthMiddleware] Invalid type for x-user-id header: expected string, got ${typeof finalUserId}. Value: ${JSON.stringify(finalUserId)}`);
//       // Use 400 Bad Request as the header format is incorrect
//       res.status(400).json({ success: false, error: 'Invalid x-user-id header format. Must be a single string.' });
//       return;
//     }

//     if (finalApiKey !== undefined && typeof finalApiKey !== 'string') {
//       console.error(`[AuthMiddleware] Invalid type for x-api-key header: expected string, got ${typeof finalApiKey}. Value: ${JSON.stringify(finalApiKey)}`);
//       // Use 400 Bad Request as the header format is incorrect
//       res.status(400).json({ success: false, error: 'Invalid x-api-key header format. Must be a single string.' });
//       return;
//     }
//     // === End Type Enforcement ===

//     // Proceed to the next middleware or the route handler
//     next(); 

//   } catch (error) {
//     // Generic error handling for unexpected issues during middleware execution
//     console.error(`[AuthMiddleware] Unhandled error:`, error);
//     const errorMessage = error instanceof Error ? error.message : 'Internal server error during webhook authentication';
//     // Avoid sending detailed internal errors to the client in production
//     res.status(500).json({
//       success: false,
//       error: 'An internal error occurred while processing the webhook request.' // More generic message
//       // error: errorMessage // Use this for development/debugging if needed
//     });
//   }
// } 