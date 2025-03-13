#!/bin/bash

# Simple script to test the HelloWorld services

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}HelloWorld Services Test Script${NC}"
echo "This script will test the connections between services"
echo "Make sure all services are running with 'pnpm dev'"

# Test Model Service
echo -e "\n${YELLOW}Testing Model Service...${NC}"
MODEL_RESPONSE=$(curl -s -X POST http://localhost:3001/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello, World!"}')

if [[ $MODEL_RESPONSE == *"Hello, World"* ]]; then
  echo -e "${GREEN}✓ Model Service is working!${NC}"
  echo "Response: $MODEL_RESPONSE"
else
  echo -e "${RED}✗ Model Service test failed!${NC}"
  echo "Response: $MODEL_RESPONSE"
fi

# Test Key Service
echo -e "\n${YELLOW}Testing Key Service...${NC}"
echo "Creating a test API key..."
KEY_RESPONSE=$(curl -s -X POST http://localhost:3003/api/keys \
  -H "Content-Type: application/json" \
  -d '{"account_id":"00000000-0000-0000-0000-000000000000","name":"test-key"}')

if [[ $KEY_RESPONSE == *"success"*"true"* ]]; then
  echo -e "${GREEN}✓ Key Service is working!${NC}"
  # Extract the API key from the response
  API_KEY=$(echo $KEY_RESPONSE | grep -o '"apiKey":"[^"]*' | sed 's/"apiKey":"//')
  echo "Created API key: $API_KEY"
else
  echo -e "${RED}✗ Key Service test failed!${NC}"
  echo "Response: $KEY_RESPONSE"
  API_KEY="helloworld-demo-key" # Use default test key
fi

# Test Proxy Service with the API key
echo -e "\n${YELLOW}Testing Proxy Service...${NC}"
PROXY_RESPONSE=$(curl -s -X POST http://localhost:3002/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{"prompt":"Testing proxy service"}')

if [[ $PROXY_RESPONSE == *"generated_text"* ]]; then
  echo -e "${GREEN}✓ Proxy Service is working!${NC}"
  echo "Response: $PROXY_RESPONSE"
else
  echo -e "${RED}✗ Proxy Service test failed!${NC}"
  echo "Response: $PROXY_RESPONSE"
fi

echo -e "\n${YELLOW}Test Summary:${NC}"
echo "Model Service, Key Service, and Proxy Service have been tested."
echo "Check errors if any tests failed."
echo "For Client Service, open http://localhost:3004 in your browser and use the API key:"
echo "$API_KEY" 