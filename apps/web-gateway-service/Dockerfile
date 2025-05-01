# Dockerfile for web-gateway-service

# Stage 1: Base Image - Use Node.js 20 (matching previous Nixpacks setting)
FROM node:20-slim AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory for the monorepo root
WORKDIR /app

# Copy root dependency manifests
# These are needed for pnpm to understand the workspace structure.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Optional: Uncomment and use if you have a .npmrc file for private packages
# COPY .npmrc ./

# Install all dependencies using the lockfile
# We install all dependencies first, as the build process might need devDeps
# from other workspace packages.
# Using --shamefully-hoist based on the previous logs; remove if not needed.
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy the entire source code from the monorepo root
# This is simpler for setup but less optimized for image size than copying only necessary packages.
# Consider a multi-stage build for optimization later.
COPY . .

# Build the target service (web-gateway-service)
# Assumes the build script is named 'build' in the service's package.json
# The --filter flag targets the specific package within the pnpm workspace.
RUN pnpm --filter web-gateway-service build

# Set the final working directory to the service directory
WORKDIR /app/apps/web-gateway-service

# Expose the port the service listens on.
# Common default is 8080, but verify this from your service's configuration or code.
EXPOSE 8080

# Define the command to run the built service
# Assumes the build output is in 'dist' and the entrypoint is 'index.js'
# This matches the previous NIXPACKS_START_CMD pattern.
CMD ["node", "dist/index.js"] 