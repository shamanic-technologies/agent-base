/**
 * Setup Webhook API Endpoint (Secret Service)
 * 
 * Receives webhook setup parameters from the client and forwards them 
 * to the dedicated webhook-service for actual processing and database interaction.
 */
import { NextRequest, NextResponse } from 'next/server';
import { WebhookProvider, WebhookResponse, Webhook } from '@agent-base/agents';

/**
 * Handles POST requests to set up a webhook.
 * 
 * @param {NextRequest} request - The incoming Next.js request object.
 * @returns {Promise<NextResponse>} A promise that resolves to the Next.js response object, 
 *                                   either proxied from webhook-service or an error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let webhookGatewayServiceUrl: string | undefined;
  try {
    // --- 1. Get Webhook Service URL --- 
    webhookGatewayServiceUrl = process.env.WEBHOOK_GATEWAY_SERVICE_URL;
    if (!webhookGatewayServiceUrl) {
      console.error('[SECRET SERVICE] WEBHOOK_GATEWAY_SERVICE_URL environment variable is not set.');
      // Throw configuration error if URL is missing.
      throw new Error('Internal server configuration error: Webhook gateway service URL is missing.');
    }

    // --- 2. Parse and Validate Request Body --- 
    const body = await request.json();
    // Extract parameters directly from the body.
    const { webhook_provider_id, user_id: userId, agent_id: agentId, webhook_credentials } = body;

    // Validate webhook provider
    if (!webhook_provider_id || !Object.values(WebhookProvider).includes(webhook_provider_id as WebhookProvider)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid webhook_provider_id: ${webhook_provider_id}. Supported providers: ${Object.values(WebhookProvider).join(', ')}`
        } as WebhookResponse,
        { status: 400 }
      );
    }

    // Validate required parameters.
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required in the request body' } as WebhookResponse,
        { status: 400 }
      );
    }
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agent_id is required in the request body' } as WebhookResponse,
        { status: 400 }
      );
    }

    // --- 3. Call Webhook Gateway Service --- 
    console.log(`[SECRET SERVICE] Forwarding setup request to webhook-gateway-service at ${webhookGatewayServiceUrl}/api/setup-webhook`);
    
    // Construct webhook data using the Webhook interface
    const webhookData: Webhook & { agent_id: string } = {
      webhook_provider_id,
      user_id: userId,
      agent_id: agentId,
      webhook_credentials: webhook_credentials || {}
    };

    const webhookGatewayServiceResponse = await fetch(`${webhookGatewayServiceUrl}/api/setup-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData),
    });

    // --- 4. Proxy Response from Webhook Gateway Service --- 
    // Parse the response body from webhook-gateway-service.
    const responseData = await webhookGatewayServiceResponse.json() as WebhookResponse;

    // Check if the call to webhook-gateway-service failed.
    if (!webhookGatewayServiceResponse.ok) {
      // Log the error received from the downstream service.
      console.error(`[SECRET SERVICE] Error response received from webhook-gateway-service (${webhookGatewayServiceResponse.status}):`, responseData);
      // Return the exact error response (body and status) from webhook-gateway-service.
      return NextResponse.json(responseData, { status: webhookGatewayServiceResponse.status });
    }

    // Log the success response received from the downstream service.
    console.log(`[SECRET SERVICE] Success response received from webhook-gateway-service (${webhookGatewayServiceResponse.status}):`, responseData);
    // Return the exact success response (body and status) from webhook-gateway-service.
    return NextResponse.json(responseData, { status: webhookGatewayServiceResponse.status });

  } catch (error: unknown) {
    // --- 5. Handle Errors in Secret Service --- 
    // Catches errors from: initial request parsing (request.json()), missing env var, fetch network issues.
    console.error('[SECRET SERVICE] Error processing setup-webhook request:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to process webhook setup request.';

    // Handle specific error types for better client feedback.
    if (error instanceof SyntaxError) { // JSON parsing error from request.json()
        statusCode = 400;
        errorMessage = 'Invalid request body: Could not parse JSON.';
    } else if (error instanceof Error) {
        if (error.message.includes('Webhook gateway service URL is missing')) {
            statusCode = 500; // Internal config issue
            errorMessage = 'Internal server configuration error.';
        } else if (error.message.toLowerCase().includes('fetch')) { // Basic check for network error (e.g., ECONNREFUSED)
            statusCode = 503; // Service Unavailable
            errorMessage = 'Failed to connect to internal webhook gateway service.';
        } else {
             errorMessage = error.message; // Use other specific error messages
        }
    }

    // Return a standardized error response.
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'An unknown error occurred'
      } as WebhookResponse,
      { status: statusCode }
    );
  }
} 