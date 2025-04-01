#!/bin/bash
# Build script for the credentials package

echo "Building credentials package..."

# Clean previous build
rm -rf dist

# Create dist directory
mkdir -p dist

# Compile TypeScript
npx tsc

echo "Credentials package built successfully!" 