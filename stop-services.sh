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
  echo -e "${YELLOW}PID directory not found. Will attempt to stop services by name instead.${NC}"
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
      # Wait a bit and check if the process is still running
      sleep 1
      if ps -p "$pid" > /dev/null; then
        echo -e "${YELLOW}Process didn't stop gracefully, using force kill...${NC}"
        kill -9 "$pid" 2>/dev/null
      fi
      echo -e "${GREEN}$service_name stopped${NC}"
    else
      echo -e "${RED}$service_name is not running (PID: $pid)${NC}"
    fi
    
    # Remove PID file
    rm "$pid_file"
  else
    echo -e "${YELLOW}No PID file found for $service_name, searching for process...${NC}"
    
    # Try to find and kill the process by its service directory pattern
    local pids=$(ps aux | grep -i "npm run dev" | grep "$service_name" | grep -v grep | awk '{print $2}')
    if [ -n "$pids" ]; then
      for pid in $pids; do
        echo -e "${YELLOW}Found $service_name process with PID: $pid, stopping...${NC}"
        kill "$pid" 2>/dev/null
        sleep 1
        # Force kill if still running
        if ps -p "$pid" > /dev/null; then
          kill -9 "$pid" 2>/dev/null
        fi
      done
      echo -e "${GREEN}$service_name stopped${NC}"
    else
      echo -e "${YELLOW}No running process found for $service_name${NC}"
    fi
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

# Kill any remaining node processes related to the project (optional)
echo -e "${YELLOW}Checking for any remaining node processes in the project directory...${NC}"
pkill -f "$(basename $SCRIPT_DIR)/node_modules" 2>/dev/null
pkill -f "$(basename $SCRIPT_DIR)/apps" 2>/dev/null

echo -e "${BLUE}All services stopped!${NC}"
echo -e "${YELLOW}Logs are still available in $SCRIPT_DIR/logs/ directory${NC}" 