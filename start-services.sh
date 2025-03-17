#!/bin/bash

# Start Services Script
# This script starts all microservices in development mode

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}Starting Microservices...${NC}"

# Function to start a service in the background
start_service() {
  local service_name=$1
  local service_dir="$SCRIPT_DIR/apps/$service_name"
  
  # Check if service directory exists
  if [ ! -d "$service_dir" ]; then
    echo -e "${YELLOW}Warning: Service directory $service_dir not found, skipping...${NC}"
    return
  fi
  
  echo -e "${YELLOW}Starting $service_name...${NC}"
  cd "$service_dir" || { echo "Failed to enter $service_dir directory"; exit 1; }
  
  # Create directories for logs and PIDs if they don't exist
  mkdir -p "$SCRIPT_DIR/logs"
  mkdir -p "$SCRIPT_DIR/pids"
  
  npm run dev > "$SCRIPT_DIR/logs/$service_name.log" 2>&1 &
  echo $! > "$SCRIPT_DIR/pids/$service_name.pid"
  echo -e "${GREEN}$service_name started with PID $(cat $SCRIPT_DIR/pids/$service_name.pid)${NC}"
  # Return to the script directory
  cd "$SCRIPT_DIR"
}

# Create directories for logs and PIDs
mkdir -p "$SCRIPT_DIR/logs"
mkdir -p "$SCRIPT_DIR/pids"

# Start each service
start_service "model-service"
start_service "key-service"
start_service "proxy-service"
start_service "auth-service"
start_service "database-service"
start_service "payment-service"
start_service "utility-service"
start_service "web"
start_service "client" 
# Optionally include dev tools
start_service "dev-tool"
# Not starting e2e as it's likely for testing

echo -e "${BLUE}All services started!${NC}"
echo -e "${YELLOW}Service logs can be found in the $SCRIPT_DIR/logs/ directory${NC}"
echo -e "${YELLOW}To stop all services, run $SCRIPT_DIR/stop-services.sh${NC}" 