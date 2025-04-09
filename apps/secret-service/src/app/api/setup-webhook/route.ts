/**
 * Setup Webhook API Endpoint (Secret Service)
 * 
 * Receives webhook setup parameters from the client and forwards them 
 * to the dedicated webhook-service for actual processing and database interaction.
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles POST requests to set up a webhook.
 * 
 * @param {NextRequest} request - The incoming Next.js request object.
 * @returns {Promise<NextResponse>} A promise that resolves to the Next.js response object, 
 *                                   either proxied from webhook-service or an error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let webhookServiceUrl: string | undefined;
  try {
    // --- 1. Get Webhook Service URL --- 
    webhookServiceUrl = process.env.WEBHOOK_SERVICE_URL;
    if (!webhookServiceUrl) {
      console.error('[SECRET SERVICE] WEBHOOK_SERVICE_URL environment variable is not set.');
      // Throw configuration error if URL is missing.
      throw new Error('Internal server configuration error: Webhook service URL is missing.');
    }

    // --- 2. Parse and Validate Request Body --- 
    const body = await request.json();
    // Extract parameters directly from the body.
    const { webhook_provider_id, user_id: userId, agent_id: agentId, webhook_data } = body;

    // Log received parameters.
    console.log(`[SECRET SERVICE] Setup-webhook request received:`, {
      webhook_provider_id,
      user_id: userId,
      agent_id: agentId,
      webhook_data: webhook_data
    });

    // Validate required parameters.
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required in the request body' },
        { status: 400 }
      );
    }
    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agent_id is required in the request body' },
        { status: 400 }
      );
    }
    if (!webhook_provider_id) {
      return NextResponse.json(
        { success: false, error: 'webhook_provider_id is required in the request body' },
        { status: 400 }
      );
    }

    // --- 3. Call Webhook Service --- 
    console.log(`[SECRET SERVICE] Forwarding setup request to webhook-service at ${webhookServiceUrl}/api/setup-webhook`);
    
    const webhookServiceResponse = await fetch(`${webhookServiceUrl}/api/setup-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Pass required data in the body, matching webhook-service expectations.
      body: JSON.stringify({
        webhook_provider_id,
        user_id: userId,
        agent_id: agentId,
        webhook_data: webhook_data || {} // Send empty object if null/undefined
      }),
    });

    // --- 4. Proxy Response from Webhook Service --- 
    // Parse the response body from webhook-service.
    const responseData = await webhookServiceResponse.json();

    // Check if the call to webhook-service failed.
    if (!webhookServiceResponse.ok) {
      // Log the error received from the downstream service.
      console.error(`[SECRET SERVICE] Error response received from webhook-service (${webhookServiceResponse.status}):`, responseData);
      // Return the exact error response (body and status) from webhook-service.
      return NextResponse.json(responseData, { status: webhookServiceResponse.status });
    }

    // Log the success response received from the downstream service.
    console.log(`[SECRET SERVICE] Success response received from webhook-service (${webhookServiceResponse.status}):`, responseData);
    // Return the exact success response (body and status) from webhook-service.
    return NextResponse.json(responseData, { status: webhookServiceResponse.status });

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
        if (error.message.includes('Webhook service URL is missing')) {
            statusCode = 500; // Internal config issue
            errorMessage = 'Internal server configuration error.';
        } else if (error.message.toLowerCase().includes('fetch')) { // Basic check for network error (e.g., ECONNREFUSED)
            statusCode = 503; // Service Unavailable
            errorMessage = 'Failed to connect to internal webhook service.';
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
      },
      { status: statusCode }
    );
  }
} 