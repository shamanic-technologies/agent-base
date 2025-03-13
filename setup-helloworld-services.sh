#!/bin/bash

# Install dependencies for all HelloWorld services
echo "Installing dependencies for all HelloWorld services..."

# Model Service
echo "Installing dependencies for Model Service..."
pnpm --filter model-service install

# Proxy Service
echo "Installing dependencies for Proxy Service..."
pnpm --filter proxy-service install

# Key Service
echo "Installing dependencies for Key Service..."
pnpm --filter key-service install

# Client Service
echo "Installing dependencies for Client Service..."
pnpm --filter client install

# Make the script executable
chmod +x setup-helloworld-services.sh

echo "All dependencies installed!"
echo "You can now run the services using: pnpm dev" 