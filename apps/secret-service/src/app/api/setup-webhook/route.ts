/**
 * Mock Setup Webhook API Endpoint
 * 
 * Takes webhook setup parameters and mocks a successful response
 * (Placeholder until webhook-service implements the actual endpoint)
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { webhook_provider_id, webhook_data } = body;
    
    // Get IDs from query params or request body
    const userId = request.nextUrl.searchParams.get('userId') || body.user_id;
    const agentId = request.nextUrl.searchParams.get('agentId') || body.agent_id;
    
    console.log(`[SECRET SERVICE] Mock setup-webhook request received:`, {
      webhook_provider_id,
      user_id: userId,
      agent_id: agentId,
      webhook_data
    });

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'agent_id is required' },
        { status: 400 }
      );
    }

    if (!webhook_provider_id) {
      return NextResponse.json(
        { success: false, error: 'webhook_provider_id is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would call the webhook-service
    // But since the endpoint doesn't exist yet, we'll mock a successful response
    console.log(`[SECRET SERVICE] Would call webhook-service to set up ${webhook_provider_id} webhook`);
    console.log(`[SECRET SERVICE] For user: ${userId}, agent: ${agentId}`);
    console.log(`[SECRET SERVICE] With data:`, webhook_data);

    // Return mock successful response
    return NextResponse.json({
      success: true,
      data: {
        webhook_id: `mock-${webhook_provider_id}-${Date.now()}`,
        provider: webhook_provider_id,
        user_id: userId,
        agent_id: agentId,
        message: `Mock ${webhook_provider_id} webhook setup completed successfully`
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error in mock setup-webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook setup request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 