# Webhook Service

A simple, modern Express service that handles webhook events from external providers and forwards them to appropriate AI agents.

## Overview

The Webhook Service receives events from external providers (like Crisp) and forwards them to AI agents. It uses a direct database mapping between agents and webhook providers.

### Key Features

- Receive webhook events from Crisp (message:send events)
- Map agents to webhook providers
- Forward webhook events to mapped agents
- Respond to webhook events with AI-generated content

## Setup

### Prerequisites

- Node.js 18+
- Environment variables set (see .env.local)

### Installation

```bash
# Install dependencies
npm install

# Start the service in development mode
npm run dev

# Build and start in production mode
npm run build
npm run start
```

### Environment Variables

Create a `.env.local` file with the following variables:

```
PORT=3015
NODE_ENV=development
WEBHOOK_SERVICE_API_KEY=your_webhook_service_api_key_here
WEBHOOK_SERVICE_URL=http://localhost:3015
AGENT_SERVICE_URL=http://localhost:3000
AGENT_SERVICE_API_KEY=your_agent_service_api_key_here
CRISP_API_IDENTIFIER=your_crisp_identifier_here
CRISP_API_KEY=your_crisp_api_key_here
```

## API Endpoints

### Crisp Webhook

#### Receive webhook events
```
POST /webhooks/crisp
```

#### Map an agent to Crisp webhook
```
POST /webhooks/crisp/map-agent
```
Body:
```json
{
  "agent_id": "your_agent_id"
}
```

#### Unmap an agent from Crisp webhook
```
POST /webhooks/crisp/unmap-agent
```
Body:
```json
{
  "agent_id": "your_agent_id"
}
```

#### Get Crisp webhook registration instructions
```
GET /webhooks/crisp/register-url
```

## Connecting to Crisp

1. Get your webhook URL from `GET /webhooks/crisp/register-url`
2. Configure the webhook in your Crisp dashboard:
   - Go to Settings > Websites > Your Website > Settings > Webhook
   - Add a new webhook with the URL from step 1
   - Select the "message:send" event
   - Save the configuration

## Architecture

The service follows a straightforward direct mapping architecture:

1. Webhook events arrive at the service
2. Events are processed and normalized to a standard format
3. The service looks up agents mapped to the webhook in the database
4. Events are forwarded to mapped agents' /run endpoints
5. Agent responses are sent back to the original provider when needed

## Database Schema

The service uses two database tables:

### webhook
- `webhook_id` (string): Unique identifier for the webhook provider (e.g., 'crisp')
- `webhook_data` (jsonb): Provider-specific configuration (webhook secret, website ID, etc.)

### agent_webhook
- `agent_id` (string): ID of the agent
- `webhook_id` (string): ID of the webhook provider

## Adding New Webhook Providers

To add support for new webhook providers:

1. Add the provider to the `WebhookProvider` enum in `src/types/index.ts`
2. Create provider-specific event types
3. Implement a service for the provider in `src/services/`
4. Create controller and routes for the provider
5. Update the main server to register the new routes 