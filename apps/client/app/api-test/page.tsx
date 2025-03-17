'use client';

import { useState, useEffect } from 'react';
import { callAgentBase, testAgentBaseConnection } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

/**
 * API Test Page
 * 
 * This page tests the secure connection to the Agent Base service
 */
export default function ApiTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'failed'>('loading');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Test connection on page load
  useEffect(() => {
    async function checkConnection() {
      try {
        const result = await testAgentBaseConnection();
        setConnectionStatus(result.status === 'connected' ? 'connected' : 'failed');
        setConnectionDetails(result);
      } catch (error) {
        console.error('Connection test error:', error);
        setConnectionStatus('failed');
        setConnectionDetails({ error: 'Failed to test connection' });
      }
    }
    
    checkConnection();
  }, []);
  
  // Handle form submission to test API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Call the proxy-mode endpoint
      const result = await callAgentBase('/api/proxy-mode', 'GET');
      setApiResponse(result);
    } catch (error) {
      console.error('API call error:', error);
      setApiResponse({ error: 'Failed to call API' });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Agent Base API Test</h1>
      
      <div className="grid gap-6">
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Base Connection</CardTitle>
            <CardDescription>
              Status of the secure connection to the Agent Base service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500' 
                    : connectionStatus === 'failed' 
                    ? 'bg-red-500' 
                    : 'bg-yellow-500'
                }`} 
              />
              <span>
                {connectionStatus === 'connected' 
                  ? 'Connected' 
                  : connectionStatus === 'failed' 
                  ? 'Connection Failed' 
                  : 'Checking Connection...'}
              </span>
            </div>
            
            {connectionStatus === 'connected' && (
              <div className="mt-4 p-3 bg-green-50 text-green-800 rounded">
                Successfully connected to the Agent Base using a secure server-side API key!
              </div>
            )}
            
            {connectionStatus === 'failed' && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">
                Failed to connect to the Agent Base. Please check:
                <ul className="list-disc ml-5 mt-2">
                  <li>Is the proxy service running?</li>
                  <li>Is the API key correctly set in the server environment?</li>
                  <li>Is the Agent Base URL correct?</li>
                </ul>
              </div>
            )}
            
            {connectionDetails && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Connection Details:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(connectionDetails, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* API Test Card */}
        <Card>
          <CardHeader>
            <CardTitle>Test API Call</CardTitle>
            <CardDescription>
              Call the proxy-mode endpoint to test the API connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Button type="submit" disabled={isLoading || connectionStatus !== 'connected'}>
                {isLoading ? 'Testing...' : 'Test API Connection'}
              </Button>
            </form>
            
            {apiResponse && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Response:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Environment Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Configuration</CardTitle>
            <CardDescription>
              Current environment settings for the API connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Agent Base URL:</strong>{' '}
                {process.env.NEXT_PUBLIC_AGENT_BASE_URL || 'http://localhost:3004'}
              </div>
              <div>
                <strong>API Key:</strong>{' '}
                <span className="text-gray-500">Stored securely on the server</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 