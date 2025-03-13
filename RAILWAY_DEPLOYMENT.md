# Deploying the HelloWorld Microservices on Railway

This guide explains how to deploy the HelloWorld microservices on Railway using our Turborepo monorepo structure.

## Prerequisites

1. A [Railway](https://railway.app) account
2. The [Railway CLI](https://docs.railway.app/develop/cli) installed
3. Git repository with your code pushed to GitHub (or GitLab)

## Setup Process

### 1. Create a New Railway Project

First, create a new project on Railway:

```bash
railway login
railway project create helloworld-microservices
```

Or create a new project through the Railway dashboard.

### 2. Set Up Services

You'll need to create a separate Railway service for each microservice in the `/apps` directory.

#### For Each Service:

1. **Navigate to your Railway project dashboard**
2. **Click "New Service" → "GitHub Repo"**
3. **Connect your repository**
4. **Configure service settings**:
   - Set the service name (e.g., "auth-service")
   - Configure "Root Directory" to point to the specific service (e.g., "apps/auth-service")
   - Railway will automatically detect the `railway.json` file for configuration
   - Set up required environment variables (see below)

### 3. Configure Environment Variables

Each service requires specific environment variables. You can add these in the Railway dashboard under the "Variables" tab for each service.

#### Common Variables:
- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: The port on which the service will run

#### Service-Specific Variables:
- **Model Service**: None specific
- **Auth Service**: `JWT_SECRET` 
- **Key Service**: None specific
- **Proxy Service**:
  - `MODEL_SERVICE_URL`: The URL of the deployed Model Service
  - `KEY_SERVICE_URL`: The URL of the deployed Key Service
- **Database Service**: None specific
- **Payment Service**: None specific

### 4. Set Up Service URLs

After deploying, Railway will generate a unique URL for each service. Use these URLs to configure the connections between services.

For example, once the Model Service and Key Service are deployed:
1. Copy their URLs from the Railway dashboard
2. Add them as environment variables for the Proxy Service:
   - `MODEL_SERVICE_URL`: `https://model-service-xxxx.railway.app`
   - `KEY_SERVICE_URL`: `https://key-service-xxxx.railway.app`

### 5. Deploy All Services

Deploying is as simple as pushing changes to your GitHub repository. Railway will automatically detect changes and deploy the affected services based on the watch patterns defined in each `railway.json` file.

```bash
git push origin main
```

## Monitoring and Logs

Railway provides built-in monitoring and logging:

1. Go to your service in the Railway dashboard
2. Click on the "Logs" tab to view real-time logs
3. Click on the "Metrics" tab to view performance metrics

## Troubleshooting

If you encounter issues:

1. **Check service logs** in the Railway dashboard
2. **Verify environment variables** are correctly set
3. **Ensure proper watch patterns** in each service's `railway.json` file
4. **Look for build failures** in the deployment logs

## Useful Commands

```bash
# Deploy a specific service
railway up --service auth-service

# View logs for a service
railway logs --service auth-service

# Connect to the shell of a service
railway connect --service auth-service

# Open dashboard
railway open
```

## Further Resources

- [Railway Documentation](https://docs.railway.app/)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Railway CLI Documentation](https://docs.railway.app/develop/cli) 