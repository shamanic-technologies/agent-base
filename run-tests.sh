#!/bin/bash

# Run Tests Script
# This script runs tests for all microservices

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running HelloWorld Microservices Tests...${NC}"

# Create directory for test reports
mkdir -p test-reports

# Function to run tests for a service
run_test() {
  local service_name=$1
  local service_dir=$2
  
  echo -e "${YELLOW}Testing $service_name...${NC}"
  cd "$service_dir" || { echo -e "${RED}Failed to enter $service_dir directory${NC}"; return 1; }
  
  # Run the test and capture output
  npm test > "../../test-reports/$service_name-test.log" 2>&1
  local test_result=$?
  
  # Check if test was successful
  if [ $test_result -eq 0 ]; then
    echo -e "${GREEN}$service_name tests passed${NC}"
  else
    echo -e "${RED}$service_name tests failed${NC}"
    echo -e "${RED}See test-reports/$service_name-test.log for details${NC}"
  fi
  
  cd ../..
  return $test_result
}

# Track overall success/failure
ALL_TESTS_PASSED=true

# Run tests for each service
echo -e "${YELLOW}Note: Make sure all services are running before running tests${NC}"

# Test services with proper test scripts
if ! run_test "auth-service" "apps/auth-service"; then ALL_TESTS_PASSED=false; fi
if ! run_test "database-service" "apps/database-service"; then ALL_TESTS_PASSED=false; fi
if ! run_test "payment-service" "apps/payment-service"; then ALL_TESTS_PASSED=false; fi
if ! run_test "proxy-service" "apps/proxy-service"; then ALL_TESTS_PASSED=false; fi

# Display overall result
if [ "$ALL_TESTS_PASSED" = true ]; then
  echo -e "${GREEN}All tests passed!${NC}"
else
  echo -e "${RED}Some tests failed. Check the test reports for details.${NC}"
  exit 1
fi 