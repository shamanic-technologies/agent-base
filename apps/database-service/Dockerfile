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

# Copy migrations folder to the location pnpm deploy will pick up for database-service
# Assuming database-service is in apps/database-service
COPY apps/database-service/migrations ./apps/database-service/migrations

# Prepare deployment bundle in the builder stage
# This will now include the migrations folder if it's within the package contents
RUN pnpm --filter database-service --prod deploy --legacy ./deploy_temp

# Stage 3: Production Runner - Create a smaller final image using pnpm deploy
FROM base AS runner

WORKDIR /app

# Copy the pre-built deployment bundle from the builder stage
COPY --from=builder_stage /app/deploy_temp .

# IMPORTANT: For production, DATABASE_URL should be injected as an environment variable 
# into the container, not from a .env file. Copying .env here for convenience in environments
# where it might be used, but this is not a recommended production practice.

# Expose the port the service listens on (ensure this matches your service, 8080 default for railway)
EXPOSE 8080

# Define the command to run migrations and then run the built service
# This assumes migrate:up script correctly loads .env or DATABASE_URL is in the environment
CMD sh -c "echo 'DATABASE_URL_IS: '$DATABASE_URL && echo '--- ls /app ---' && ls -la /app && echo '--- ls /app/migrations ---' && ls -la /app/migrations && echo '--- Running migrations ---' && pnpm migrate:up && echo '--- Migrations finished, starting app ---' && node dist/index.js" 