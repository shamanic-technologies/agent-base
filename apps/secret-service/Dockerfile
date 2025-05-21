# Dockerfile for secret-service (located at monorepo root)

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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .nvmrc turbo.json tsconfig.json ./

# Optional: Copy .npmrc if needed for private packages
# COPY .npmrc ./

# Use the cachebust arg to ensure this layer isn't cached inappropriately
RUN echo "Cachebust: ${CACHEBUST}"

# Copy the entire monorepo source code FIRST
COPY . .

# Clear pnpm cache within the builder stage
RUN pnpm store prune

# Install ALL monorepo dependencies (using --frozen-lockfile)
# Reverted from filtered install
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Explicitly build the 'types' package first to isolate potential issues
RUN pnpm --filter @agent-base/types build

# Build only the target service (secret-service) and its dependencies
RUN pnpm --filter secret-service... build

# Prepare deployment bundle in the builder stage
# Using the name 'secret-service'
RUN pnpm --filter secret-service --prod deploy --legacy ./deploy_temp

# Stage 3: Production Runner - Create a smaller final image using pnpm deploy
FROM base AS runner

WORKDIR /app

# Copy the pre-built deployment bundle from the builder stage
COPY --from=builder_stage /app/deploy_temp .

# Expose the port the service listens on (ensure this matches your service)
# Secret service likely runs on 8080 as well, adjust if needed.
# Standardizing to 8080, but this should be confirmed or made an environment variable.
EXPOSE 8080

# Define the command to run the built service from the root of the runner stage
# From secret-service's package.json
CMD ["node", "dist/server.js"] 