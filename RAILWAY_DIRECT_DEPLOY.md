# Deploying HelloWorld Microservices to Railway

This document provides a step-by-step guide to deploy your Turborepo monorepo to Railway.

## Prerequisites

1. Railway CLI installed: `npm install -g @railway/cli`
2. Railway account (https://railway.app)
3. GitHub repository connected to Railway

## Deployment Options

There are two main approaches to deploying this monorepo to Railway:

### Option 1: Deploy Individual Services (Recommended)

This option creates a separate Railway service for each microservice, giving you more granular control over each deployment.

1. **Login to Railway CLI**:
   ```bash
   railway login
   ```

2. **Link to your Railway project**:
   ```bash
   railway link
   ```

3. **Deploy services using the deployment script**:
   ```bash
   # Make the script executable
   chmod +x railway-deploy.sh
   
   # Deploy all services
   ./railway-deploy.sh all
   
   # Or deploy a specific service
   ./railway-deploy.sh model-service
   ```

4. **Configure environment variables for each service**:
   - Go to the Railway dashboard
   - Select each service
   - Add the necessary environment variables
   - For services that communicate with each other, you'll need to add the service URLs as environment variables

### Option 2: Monorepo Direct Deploy

This approach deploys the entire monorepo as a single Railway service. This is simpler but less flexible.

1. **Login to Railway CLI**:
   ```bash
   railway login
   ```

2. **Deploy the project**:
   ```bash
   railway up
   ```

## Troubleshooting Common Issues

### 1. Build Failures

**Issue**: Build script fails with errors related to paths or npm commands.

**Solution**: 
- Ensure each service has a correctly configured `railway.json` file
- Check that build commands use the correct paths relative to where the command is executed
- Replace `cd ../../` references with absolute paths or restructure commands

### 2. Dependency Issues

**Issue**: Dependencies not installing correctly.

**Solution**:
- Ensure your `package.json` correctly lists all dependencies
- If using workspaces, ensure your service's package.json has all required dependencies (don't rely on hoisting)
- Make sure you're using the correct package manager (Railway prefers npm by default)

### 3. Environment Variable Problems

**Issue**: Services can't communicate with each other or environment variables aren't available.

**Solution**:
- Double-check all environment variables in the Railway dashboard
- For inter-service communication, set the service URLs as environment variables
- Use the Railway CLI to set variables: `railway variables set KEY=VALUE`

### 4. Port Configuration

**Issue**: Service running but not accessible.

**Solution**:
- Ensure the service listens on the port specified by the `PORT` environment variable provided by Railway
- Your code should have something like: `const port = process.env.PORT || 3000;`

## Monitoring Deployed Services

1. **View logs**: 
   ```bash
   railway logs
   ```

2. **Check service status**:
   ```bash
   railway status
   ```

3. **Open the Railway dashboard**:
   ```bash
   railway open
   ```

## Best Practices

1. **Use separate Railway JSON configurations** for each service
2. **Set up proper health checks** in your `railway.json` files
3. **Configure auto-scaling** based on your needs
4. **Set up proper error handling** in your services
5. **Implement logging** for easier debugging
6. **Use environment variables** for configuration
7. **Set up proper CI/CD pipelines** using GitHub Actions 