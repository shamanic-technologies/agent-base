#!/bin/bash

# Clean up previous build
if [ -d "./dist" ]; then
  rm -rf ./dist
fi

# Create dist directory
mkdir -p ./dist

# Build TypeScript files
# Use pnpm exec for consistency
pnpm exec tsc

echo "Build completed successfully!" 