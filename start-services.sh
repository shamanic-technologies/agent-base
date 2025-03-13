#!/bin/bash

# Start Services Script
# This script starts all microservices in development mode

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting HelloWorld Microservices...${NC}"

# Function to start a service in the background
start_service() {
  local service_name=$1
  local service_dir=$2
  
  echo -e "${YELLOW}Starting $service_name...${NC}"
  cd "$service_dir" || { echo "Failed to enter $service_dir directory"; exit 1; }
  npm run dev > "../logs/$service_name.log" 2>&1 &
  echo $! > "../pids/$service_name.pid"
  echo -e "${GREEN}$service_name started with PID $(cat ../pids/$service_name.pid)${NC}"
  cd ..
}

# Create directories for logs and PIDs
mkdir -p logs
mkdir -p pids

# Start each service
start_service "model-service" "apps/model-service"
start_service "key-service" "apps/key-service"
start_service "proxy-service" "apps/proxy-service"
start_service "auth-service" "apps/auth-service"
start_service "database-service" "apps/database-service"
start_service "payment-service" "apps/payment-service"

echo -e "${BLUE}All services started!${NC}"
echo -e "${YELLOW}Service logs can be found in the logs/ directory${NC}"
echo -e "${YELLOW}To stop all services, run ./stop-services.sh${NC}" 