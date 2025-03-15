# HelloWorld Microservices

A modern microservices architecture built with Node.js, Express, and Turborepo, optimized for deployment on Railway.

## Project Structure

This project is organized as a monorepo using Turborepo:

```
/
├── apps/               # All microservices
│   ├── auth-service/   # Authentication service
│   ├── database-service/ # Database service
│   ├── key-service/    # API key management
│   ├── model-service/  # AI model serving
│   ├── payment-service/ # Payment processing
│   ├── proxy-service/  # API gateway
│   └── utility-service/ # Utility functions
├── packages/           # Shared code
│   └── shared/         # Common utilities
└── ...
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build all packages and applications
npm run build
```

### Development

```bash
# Start all services in development mode
npm run dev

# Start a specific service
npm run dev --filter="@helloworld/auth-service"
```

### Testing

```bash
# Run all tests
npm test

# Test a specific service
npm test --filter="@helloworld/auth-service"
```

## Service Descriptions and Ports

| Service | Description | Port |
|---------|-------------|------|
| **auth-service** | User authentication and authorization | 3005 |
| **database-service** | Data persistence layer | 3006 |
| **key-service** | API key management and validation | 3003 |
| **model-service** | AI model inference service | 3001 |
| **payment-service** | Subscription and payment processing | 3007 |
| **proxy-service** | API gateway that routes requests to appropriate services | 3004 |
| **utility-service** | Utility functions for application features | 3008 |
| **dev-tool** | Development tools and debugging | 3010 |
| **web** | Main web application (Next.js) | 3000 |
| **client** | React client application (Vite) | 5173 |

## Deployment

This project is designed to be deployed on Railway. See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed deployment instructions.

# Agent Base - Next.js App

This is a Next.js application configured to deploy on Vercel.

## Deployment

This application is set up for deployment on Vercel with the following configuration:
- Framework: Next.js
- Root Directory: apps/web
- Environment Variables: Set in Vercel project settings

Last updated: March 13, 2025
