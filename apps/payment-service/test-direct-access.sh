#!/bin/bash

# Define URL base
BASE_URL="http://localhost:3007"
ECHO_SEPARATOR="------------------------------------------------------"

# Set text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print response
print_response() {
  echo -e "\n${ECHO_SEPARATOR}"
  echo "$1"
  echo "$2" | jq '.' || echo "$2"
  echo -e "${ECHO_SEPARATOR}\n"
}

# Get the customer ID directly from the user
if [ -z "$1" ]; then
  echo -e "${RED}Usage: ./test-direct-access.sh <customer_id>${NC}"
  echo -e "${YELLOW}Example: ./test-direct-access.sh cus_Rz219PyWmJVskR${NC}"
  exit 1
fi

CUSTOMER_ID="$1"

# First, get the customer details from Stripe directly
echo -e "${YELLOW}Getting customer information...${NC}"
RESPONSE=$(curl -s -X GET "${BASE_URL}/payment/customers-direct/${CUSTOMER_ID}")
print_response "CUSTOMER INFO:" "$RESPONSE"

if echo "$RESPONSE" | grep -q "success\":false"; then
  echo -e "${RED}Failed to retrieve customer. Exiting tests.${NC}"
  exit 1
fi

# Extract the userId
USER_ID=$(echo "$RESPONSE" | jq -r '.data.userId')
echo -e "${GREEN}Customer ID: $CUSTOMER_ID${NC}"
echo -e "${GREEN}User ID: $USER_ID${NC}"

# Test adding credit to the customer
echo -e "${YELLOW}Testing Add Credit endpoint with direct customer ID...${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/payment/add-credit-direct" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\": \"$CUSTOMER_ID\", \"amount\": 10, \"description\": \"Test Direct Credit\"}")
print_response "ADD CREDIT DIRECT:" "$RESPONSE"

if echo "$RESPONSE" | grep -q "success\":false"; then
  echo -e "${RED}Failed to add credit. Exiting tests.${NC}"
  exit 1
fi

# Test getting the credit balance
echo -e "${YELLOW}Testing Get Credit Balance with direct customer ID...${NC}"
RESPONSE=$(curl -s "${BASE_URL}/payment/customers-direct/${CUSTOMER_ID}/credit")
print_response "GET CREDIT BALANCE DIRECT:" "$RESPONSE"

if echo "$RESPONSE" | grep -q "success\":false"; then
  echo -e "${RED}Failed to get credit balance. Exiting tests.${NC}"
  exit 1
fi

# Test deducting credit
echo -e "${YELLOW}Testing Deduct Credit with direct customer ID...${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/payment/deduct-credit-direct" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\": \"$CUSTOMER_ID\", \"amount\": 2, \"description\": \"Test Direct Deduction\"}")
print_response "DEDUCT CREDIT DIRECT:" "$RESPONSE"

if echo "$RESPONSE" | grep -q "success\":false"; then
  echo -e "${RED}Failed to deduct credit. Exiting tests.${NC}"
  exit 1
fi

# Test getting transaction history
echo -e "${YELLOW}Testing Get Transaction History with direct customer ID...${NC}"
RESPONSE=$(curl -s "${BASE_URL}/payment/customers-direct/${CUSTOMER_ID}/transactions")
print_response "GET TRANSACTIONS DIRECT:" "$RESPONSE"

echo -e "${GREEN}Direct access test completed successfully!${NC}" 