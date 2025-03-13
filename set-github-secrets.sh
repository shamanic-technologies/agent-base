#!/bin/bash

REPO="blooming-generation/agent-base"

# Read each line from .env.production
while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip empty lines and comments
  if [[ -z "$line" || "$line" =~ ^# ]]; then
    continue
  fi
  
  # Parse variable name and value
  if [[ "$line" =~ ^([A-Za-z0-9_]+)=(.*)$ ]]; then
    NAME="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"
    
    # Remove quotes if they exist
    VALUE=$(echo "$VALUE" | sed -E 's/^"(.*)"$/\1/')
    VALUE=$(echo "$VALUE" | sed -E "s/^'(.*)'$/\1/")
    
    echo "Setting $NAME..."
    echo "$VALUE" | gh secret set "$NAME" --repo "$REPO"
  fi
done < apps/web/.env.production

echo "All secrets have been set!" 