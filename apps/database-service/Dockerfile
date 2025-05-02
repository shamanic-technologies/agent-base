# Dockerfile for database-service (located at monorepo root)

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
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

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

# Build only the target service (database-service) and its dependencies
RUN pnpm --filter database-service... build

# Prepare deployment bundle in the builder stage
RUN pnpm --filter database-service --prod deploy --legacy ./deploy_temp

# Stage 3: Production Runner - Create a smaller final image using pnpm deploy
FROM base AS runner

WORKDIR /app

# Copy the pre-built deployment bundle from the builder stage
COPY --from=builder_stage /app/deploy_temp .

# Expose the port the service listens on (ensure this matches your service, 8080 default for railway)
EXPOSE 8080

# Define the command to run the built service from the root of the runner stage
# Assumes the main entry point is dist/index.js, adjust if necessary
CMD ["node", "dist/index.js"] 