# Web Service Integration Example

This document provides guidance on integrating API key management into your Web Service. Since you're using a Supabase SaaS starter, you already have authentication and account management infrastructure.

## Adding API Keys Management Page

### 1. Create an API Keys Page

Create this file at `apps/web/app/home/(user)/api-keys/page.tsx`:

```tsx
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { ApiKeysHeader } from './_components/api-keys-header';
import { ApiKeysList } from './_components/api-keys-list';
import { loadUserApiKeys } from './_lib/server/api-keys-page.loader';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:apiKeysPage');

  return {
    title,
  };
};

async function ApiKeysPage() {
  const apiKeys = await loadUserApiKeys();

  return (
    <>
      <ApiKeysHeader
        title={<Trans i18nKey={'common:routes.apiKeys'} />}
        description={<Trans i18nKey={'common:apiKeysDescription'} />}
      />

      <PageBody>
        <ApiKeysList initialApiKeys={apiKeys} />
      </PageBody>
    </>
  );
}

export default withI18n(ApiKeysPage);
```

### 2. Create API Keys Data Loader

Create this file at `apps/web/app/home/(user)/api-keys/_lib/server/api-keys-page.loader.ts`:

```tsx
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getCurrentUserAccountId } from '~/lib/server/auth/user-auth-utils';
import { cache } from 'react';

export const loadUserApiKeys = cache(async () => {
  const accountId = await getCurrentUserAccountId();
  
  if (!accountId) {
    return [];
  }
  
  const supabase = getSupabaseServerClient();
  
  const { data } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, expires_at, last_used_at')
    .eq('account_id', accountId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  
  return data || [];
});
```

### 3. Server Actions for API Key Management

Create this file at `apps/web/app/home/(user)/api-keys/_lib/server/server-actions.ts`:

```tsx
'use server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getLogger } from '@kit/shared/logger';
import { revalidatePath } from 'next/cache';
import { getCurrentUserAccountId } from '~/lib/server/auth/user-auth-utils';

// This action calls the Key Service to create a new API key
export async function createApiKey(name: string) {
  const logger = await getLogger();
  
  try {
    const accountId = await getCurrentUserAccountId();
    
    if (!accountId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Call the Key Service to create a new API key
    const response = await fetch('http://localhost:3003/api/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: accountId,
        name,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      logger.error('Failed to create API key', { error: result.error });
      return {
        success: false,
        error: 'Failed to create API key',
      };
    }
    
    revalidatePath('/home/api-keys');
    
    return {
      success: true,
      apiKey: result.apiKey,
      prefix: result.data.key_prefix,
      apiKeyData: result.data,
    };
  } catch (error) {
    logger.error('Error creating API key', { error });
    
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}

// This action calls the Key Service to revoke an API key
export async function revokeApiKey(keyId: string) {
  const logger = await getLogger();
  
  try {
    const accountId = await getCurrentUserAccountId();
    
    if (!accountId) {
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    // Call the Key Service to revoke the API key
    const response = await fetch('http://localhost:3003/api/keys/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key_id: keyId,
        account_id: accountId,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      logger.error('Failed to revoke API key', { error: result.error });
      return {
        success: false,
        error: 'Failed to revoke API key',
      };
    }
    
    revalidatePath('/home/api-keys');
    
    return {
      success: true,
    };
  } catch (error) {
    logger.error('Error revoking API key', { error });
    
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
```

### 4. Create UI Components for API Keys

Create the header component at `apps/web/app/home/(user)/api-keys/_components/api-keys-header.tsx`:

```tsx
import { PageHeader } from '@kit/ui/page-header';

export function ApiKeysHeader({
  title,
  description
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  return (
    <PageHeader
      title={title}
      description={description}
    />
  );
}
```

Create the API keys list component at `apps/web/app/home/(user)/api-keys/_components/api-keys-list.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { useToast } from '@kit/ui/toast';
import { Trans } from '@kit/ui/trans';
import { Plus } from 'lucide-react';
import { createApiKey, revokeApiKey } from '../_lib/server/server-actions';
import { ApiKeyItem } from './api-key-item';
import { CreateApiKeyDialog } from './create-api-key-dialog';

export function ApiKeysList({ 
  initialApiKeys 
}: { 
  initialApiKeys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    created_at: string;
    expires_at?: string;
    last_used_at?: string;
  }> 
}) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<{key: string, prefix: string} | null>(null);
  const { toast } = useToast();

  const handleCreateKey = async (name: string) => {
    try {
      const result = await createApiKey(name);
      
      if (result.success) {
        setNewApiKey({
          key: result.apiKey,
          prefix: result.prefix
        });
        
        setApiKeys((prev) => [result.apiKeyData, ...prev]);
        toast({
          title: 'API Key Created',
          description: 'Your API key has been created successfully.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key.',
        variant: 'destructive',
      });
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      const result = await revokeApiKey(id);
      
      if (result.success) {
        setApiKeys((prev) => prev.filter(key => key.id !== id));
        toast({
          title: 'API Key Revoked',
          description: 'Your API key has been revoked successfully.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          <Trans i18nKey="common:apiKeys" />
        </h2>
        
        <Button variant="default" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          <Trans i18nKey="common:createNewApiKey" />
        </Button>
      </div>

      <Card>
        {apiKeys.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p>
              <Trans i18nKey="common:noApiKeysYet" />
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {apiKeys.map((apiKey) => (
              <ApiKeyItem 
                key={apiKey.id} 
                apiKey={apiKey} 
                onRevoke={() => handleRevokeKey(apiKey.id)} 
              />
            ))}
          </div>
        )}
      </Card>

      <CreateApiKeyDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateKey}
        newApiKey={newApiKey}
        onNewApiKeyDismiss={() => setNewApiKey(null)}
      />
    </div>
  );
}
```

### 5. Add Translations

Add these translations to your locale files:

```json
// apps/web/public/locales/en/common.json
{
  "routes": {
    "apiKeys": "API Keys"
  },
  "apiKeysDescription": "Manage your API keys to access the HelloWorld AI Agent",
  "apiKeys": "API Keys",
  "createNewApiKey": "Create New API Key",
  "noApiKeysYet": "You don't have any API keys yet. Create one to get started."
}
```

### 6. Add to Navigation

Add the API Keys route to your navigation menu:

```tsx
// Update the sidebar navigation component
<Link href="/home/api-keys">
  <Key className="w-4 h-4 mr-2" />
  <Trans i18nKey="common:routes.apiKeys" />
</Link>
```

## Testing the Integration

1. Ensure the API Keys table is created in Supabase by running the `setup-helloworld-database.sh` script
2. Install dependencies with `setup-helloworld-services.sh`
3. Run all services with `pnpm dev`
4. Navigate to your Web Service and sign in
5. Access the API Keys page to create and manage keys
6. Use the created keys in the Client Service to chat with the AI

## Production Considerations

For production:

1. Use proper environment variables instead of hardcoded localhost URLs
2. Set up proper CORS policies for your services
3. Consider using a reverse proxy like Nginx to route traffic to your microservices
4. Implement proper authentication between services (e.g., service-to-service auth tokens)
5. Set up monitoring and logging for all services 