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
│   └── proxy-service/  # API gateway
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

## Service Descriptions

- **Model Service**: AI model inference service
- **Key Service**: API key management and validation
- **Proxy Service**: API gateway that routes requests to appropriate services
- **Auth Service**: User authentication and authorization
- **Database Service**: Data persistence layer
- **Payment Service**: Subscription and payment processing

## Deployment

This project is designed to be deployed on Railway. See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed deployment instructions.
