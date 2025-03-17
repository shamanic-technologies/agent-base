#!/bin/bash

# Display info
echo "Starting HelloWorld Client + Proxy Service Setup"

# Start proxy service in the background
echo "Starting Proxy Service on port 3004..."
cd ../proxy-service && npm run dev &
PROXY_PID=$!

# Wait a moment for proxy to start
sleep 2

# Start the client
echo "Starting Next.js Client on port 3000..."
cd ../client && npm run dev

# Clean up background processes when script is terminated
trap "kill $PROXY_PID; echo 'Shutting down services...'; exit" SIGINT SIGTERM EXIT 