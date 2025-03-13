#!/bin/bash

# Execute the API keys table migration in Supabase
echo "Setting up HelloWorld database migrations..."

# Make sure Supabase CLI is available
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found. Please install it first: npm install -g supabase"
    exit 1
fi

# Check if Supabase is running
echo "Checking if Supabase is running..."
if ! pnpm --filter web supabase status &> /dev/null
then
    echo "Starting Supabase..."
    pnpm --filter web supabase start
fi

# Copy migration file to web app migrations
echo "Copying API keys migration to web app migrations..."
mkdir -p apps/web/supabase/migrations
TIMESTAMP=$(date +%Y%m%d%H%M%S)
cp apps/key-service/migrations/api_keys_table.sql apps/web/supabase/migrations/${TIMESTAMP}_api_keys.sql

# Run migrations
echo "Running migrations..."
pnpm --filter web supabase migration up

echo "Database migration complete!"
echo "The API keys table has been created in your Supabase database." 