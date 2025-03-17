#!/bin/bash

# Stop Services Script
# This script stops all microservices started with start-services.sh

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}Stopping Microservices...${NC}"

# Check if pids directory exists
if [ ! -d "$SCRIPT_DIR/pids" ]; then
  echo -e "${RED}PID directory not found. No services are running or they were started manually.${NC}"
  exit 1
fi

# Function to stop a service
stop_service() {
  local service_name=$1
  local pid_file="$SCRIPT_DIR/pids/$service_name.pid"
  
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    echo -e "${YELLOW}Stopping $service_name (PID: $pid)...${NC}"
    
    # Check if process is running
    if ps -p "$pid" > /dev/null; then
      kill "$pid"
      echo -e "${GREEN}$service_name stopped${NC}"
    else
      echo -e "${RED}$service_name is not running (PID: $pid)${NC}"
    fi
    
    # Remove PID file
    rm "$pid_file"
  else
    echo -e "${YELLOW}No PID file found for $service_name${NC}"
  fi
}

# Stop each service
stop_service "model-service"
stop_service "key-service"
stop_service "proxy-service"
stop_service "auth-service"
stop_service "database-service"
stop_service "payment-service"
stop_service "utility-service"
stop_service "web"
stop_service "client"
stop_service "dev-tool"

echo -e "${BLUE}All services stopped!${NC}"
echo -e "${YELLOW}Logs are still available in $SCRIPT_DIR/logs/ directory${NC}" 