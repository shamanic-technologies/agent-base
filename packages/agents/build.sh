#!/bin/bash

# Clean up previous build
if [ -d "./dist" ]; then
  rm -rf ./dist
fi

# Create dist directory
mkdir -p ./dist

# Build TypeScript files
npx tsc

echo "Build completed successfully!" 