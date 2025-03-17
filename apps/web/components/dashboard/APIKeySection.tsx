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
import { Copy, Check, Eye, EyeOff, RefreshCw, Loader2, Key, ShieldAlert } from 'lucide-react';
import { Badge } from '../../components/ui/badge';

interface APIKeySectionProps {
  userId?: string;
  apiKey: string;
  isLoadingKey: boolean;
  regenerateApiKey: () => void;
}

/**
 * API Key display and management section with enhanced professional styling
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
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              <CardTitle>Welcome to Agent Base</CardTitle>
            </div>
            <CardDescription className="text-gray-600">Your AI agent infrastructure dashboard</CardDescription>
          </div>
          {userId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={regenerateApiKey}
              disabled={isLoadingKey}
              className="flex items-center gap-1 shadow-sm hover:shadow transition-all h-9 bg-white"
            >
              {isLoadingKey ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>Regenerate Key</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                Your API Key
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500 ml-1" />
              </label>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Secret</Badge>
            </div>
            <div className="flex shadow-sm rounded-md overflow-hidden border border-gray-200">
              <Input 
                readOnly 
                value={apiKey}
                type={isKeyVisible ? "text" : "password"}
                className="font-mono text-sm bg-gray-50 rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-none border-x border-gray-200 hover:bg-gray-100 h-10 w-10"
                onClick={toggleKeyVisibility}
              >
                {isKeyVisible ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-l-none hover:bg-gray-100 h-10 w-10"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
              </Button>
            </div>
            <p className="mt-3 text-xs text-gray-500 flex items-center">
              <ShieldAlert className="h-3 w-3 text-amber-500 mr-1 inline-block" />
              This key grants full access to your account. Keep it secure and never share it publicly.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 