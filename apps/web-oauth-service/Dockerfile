# Dockerfile for web-oauth-service (located at monorepo root)

# Stage 1: Base Dependencies - Use Node.js 20
FROM node:20-slim AS base

# Install pnpm globally (consistent with packageManager field in root package.json)
RUN npm install -g pnpm

# Stage 2: Build - Build the specific service within the monorepo context
FROM base AS builder_stage

# Add a build argument to bust cache
ARG CACHEBUST=1

# Set working directory
WORKDIR /app

# Copy root dependency manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Optional: Copy .npmrc if needed for private packages
# COPY .npmrc ./

# Use the cachebust arg to ensure this layer isn't cached inappropriately
RUN echo "Cachebust: ${CACHEBUST}"

# Copy the entire monorepo source code FIRST
# Note: This assumes the Docker build context is the monorepo root
COPY . .

# Clear pnpm cache within the builder stage
RUN pnpm store prune

# Install ALL monorepo dependencies (using --frozen-lockfile)
# Necessary because pnpm build requires devDependencies from other workspaces
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Explicitly build the 'types' package first as it's a common dependency
RUN pnpm --filter @agent-base/types build

# Build only the target service (web-oauth-service) and its dependencies
# The '...' includes dependencies of web-oauth-service
RUN pnpm --filter @agent-base/web-oauth-service... build

# Prepare deployment bundle in the builder stage using pnpm deploy
# This copies only production dependencies and built files
# The destination directory within the builder is 'deploy_temp'
# The --filter ensures only web-oauth-service is included in the deploy package
RUN pnpm --filter @agent-base/web-oauth-service --prod deploy --legacy ./deploy_temp

# Stage 3: Production Runner - Create a smaller final image using pnpm deploy
FROM base AS runner

WORKDIR /app

# Copy the pre-built deployment bundle from the builder stage
# The source is /app/deploy_temp in the builder_stage
# The destination is the root of the runner's WORKDIR (/app)
COPY --from=builder_stage /app/deploy_temp .

# Expose the port the service listens on (ensure this matches your service configuration, e.g., .env or config files)
# Defaulting to 8080 based on the previous railway.toml
EXPOSE 8080

# Define the command to run the built service
# This should match the 'start' script in web-oauth-service/package.json
CMD ["node", "dist/index.js"] 