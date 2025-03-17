#!/bin/bash

# Start Services Script
# This script starts all microservices in development mode

# Colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}Starting Microservices...${NC}"

# Create directories for logs and PIDs
mkdir -p "$SCRIPT_DIR/logs"
mkdir -p "$SCRIPT_DIR/pids"

# Function to check if a process is running
is_process_running() {
  local pid=$1
  if [ -z "$pid" ]; then
    return 1  # Not running
  fi
  
  if ps -p "$pid" > /dev/null; then
    return 0  # Running
  else
    return 1  # Not running
  fi
}

# Function to start a service in the background
start_service() {
  local service_name=$1
  local service_dir="$SCRIPT_DIR/apps/$service_name"
  local pid_file="$SCRIPT_DIR/pids/$service_name.pid"
  
  # Check if service directory exists
  if [ ! -d "$service_dir" ]; then
    echo -e "${YELLOW}Warning: Service directory $service_dir not found, skipping...${NC}"
    return
  fi
  
  # Check if service is already running
  if [ -f "$pid_file" ]; then
    local pid=$(cat "$pid_file")
    if is_process_running "$pid"; then
      echo -e "${YELLOW}$service_name is already running with PID $pid, skipping...${NC}"
      return
    else
      echo -e "${YELLOW}Stale PID file found for $service_name, will start fresh...${NC}"
      rm -f "$pid_file"
    fi
  fi
  
  echo -e "${YELLOW}Starting $service_name...${NC}"
  cd "$service_dir" || { echo -e "${RED}Failed to enter $service_dir directory${NC}"; exit 1; }
  
  npm run dev > "$SCRIPT_DIR/logs/$service_name.log" 2>&1 &
  echo $! > "$pid_file"
  echo -e "${GREEN}$service_name started with PID $(cat $pid_file)${NC}"
  
  # Return to the script directory
  cd "$SCRIPT_DIR"
}

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