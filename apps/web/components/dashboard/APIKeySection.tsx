/**
 * API Key Section Component
 * 
 * Displays and manages the user's API key
 */
import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Copy, Check, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

interface APIKeySectionProps {
  userId?: string;
  apiKey: string;
  isLoadingKey: boolean;
  regenerateApiKey: () => void;
}

/**
 * API Key display and management section
 */
export function APIKeySection({ userId, apiKey, isLoadingKey, regenerateApiKey }: APIKeySectionProps) {
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Toggle password visibility
  const toggleKeyVisibility = () => {
    setIsKeyVisible(!isKeyVisible);
  };
  
  // Copy API key to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Welcome to Agent Base</CardTitle>
            <CardDescription>Your AI agent infrastructure dashboard</CardDescription>
          </div>
          {userId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={regenerateApiKey}
              disabled={isLoadingKey}
              className="flex items-center gap-1"
            >
              {isLoadingKey ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>New Key</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Your API Key</label>
              <Badge variant="outline" className="text-xs">Secret</Badge>
            </div>
            <div className="flex">
              <Input 
                readOnly 
                value={apiKey}
                type={isKeyVisible ? "text" : "password"}
                className="font-mono text-sm bg-gray-50 rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-none border-l-0 border-r-0"
                onClick={toggleKeyVisibility}
              >
                {isKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-l-none"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              This key is used to authenticate your API requests. Keep it secure!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 