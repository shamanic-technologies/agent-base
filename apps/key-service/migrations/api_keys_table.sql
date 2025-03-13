-- Create the API keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (account_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can view their own API keys
CREATE POLICY "Users can view their own API keys" ON public.api_keys
  FOR SELECT USING (account_id = auth.uid() OR public.has_role_on_account(account_id));

-- Users can create API keys for their accounts
CREATE POLICY "Users can create API keys for their accounts" ON public.api_keys
  FOR INSERT WITH CHECK (account_id = auth.uid() OR public.has_role_on_account(account_id));

-- Users can update their own API keys
CREATE POLICY "Users can update their own API keys" ON public.api_keys
  FOR UPDATE USING (account_id = auth.uid() OR public.has_role_on_account(account_id));

-- Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys" ON public.api_keys
  FOR DELETE USING (account_id = auth.uid() OR public.has_role_on_account(account_id));

-- Create indexes
CREATE INDEX IF NOT EXISTS api_keys_account_id_idx ON public.api_keys (account_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON public.api_keys (key_hash); 