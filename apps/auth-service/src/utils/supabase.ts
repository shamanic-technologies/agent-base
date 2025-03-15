/**
 * Supabase Clients
 * 
 * Provides access to Supabase clients for authentication and data access
 */
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

// Regular client with anon key for standard operations
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Admin client with service role key for privileged operations
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
); 