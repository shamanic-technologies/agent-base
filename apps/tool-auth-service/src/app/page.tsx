/**
 * Home Page
 * 
 * Simple landing page for the tool authentication service
 */
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <main className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Tool Authentication Service</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          OAuth authentication service for AI agent tools
        </p>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Service information and endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">Running on port 3060</span>
              </div>
              
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 text-left font-medium border-b">API Endpoints</div>
                  <ul className="divide-y">
                    <li className="px-4 py-3 text-left">
                      <code className="text-sm bg-muted-foreground/20 px-1 py-0.5 rounded">/api/check-auth</code>
                      <span className="text-muted-foreground text-sm ml-2">Check auth status for a tool</span>
                    </li>
                    <li className="px-4 py-3 text-left">
                      <code className="text-sm bg-muted-foreground/20 px-1 py-0.5 rounded">/api/auth/[...nextauth]</code>
                      <span className="text-muted-foreground text-sm ml-2">NextAuth.js endpoints</span>
                    </li>
                    <li className="px-4 py-3 text-left">
                      <code className="text-sm bg-muted-foreground/20 px-1 py-0.5 rounded">/auth/signin</code>
                      <span className="text-muted-foreground text-sm ml-2">Sign-in page</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Part of the Agent Base platform
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
} 