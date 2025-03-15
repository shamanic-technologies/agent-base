# Utility Service

This service provides utility functions for the application using LangGraph and other tools.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/utility/process` | POST | Process utility functions |

## Tests

Tests are organized in the `tests/` directory:

```
tests/
├── integration/               # Tests requiring the server to be running
│   └── utility-service.test.js # Tests the API endpoints
├── unit/                      # Unit tests (if any)
└── run-all.js                 # Script to run all tests
```

### Running Tests

We have several test commands:

```bash
# Run all tests
npm run test

# Run specific tests
npm run test:integration  # Run integration tests
npm run test:simple       # Run simple API test
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Deployment

This service is configured for deployment on Railway. To deploy:

1. Push your changes to the repository
2. Configure the required environment variables in Railway
3. Deploy using the Railway CLI or dashboard

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Anthropic Claude (optional) |
| `PORT` | Port for the server (default: 3001) |
| `NODE_ENV` | Environment (development/production) | 