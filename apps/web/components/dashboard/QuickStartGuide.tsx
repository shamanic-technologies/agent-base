/**
 * Quick Start Guide Component
 * 
 * Displays code examples and setup instructions for the API
 */
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Code } from 'lucide-react';

interface QuickStartGuideProps {
  apiKey: string;
  isKeyVisible: boolean;
}

/**
 * Quick start guide with code examples
 */
export function QuickStartGuide({ apiKey, isKeyVisible }: QuickStartGuideProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-indigo-600" />
          <CardTitle>Quick Start Guide</CardTitle>
        </div>
        <CardDescription>Follow these steps to integrate Agent Base</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">1. Install the SDK</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <code className="text-sm font-mono">npm install @agent-base/sdk</code>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">2. Initialize with your API key</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <code className="text-sm font-mono whitespace-pre">{`import { AgentBase } from '@agent-base/sdk';

const agentBase = new AgentBase({ 
  apiKey: '${isKeyVisible ? apiKey : '********************************'}'
});`}</code>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">3. Create your first agent</h3>
            <div className="bg-gray-50 p-3 rounded-md">
              <code className="text-sm font-mono whitespace-pre">{`const myAgent = agentBase.createAgent({
  name: 'MyFirstAgent',
  description: 'A helpful assistant',
  model: 'gpt-4'
});

// Send a message to your agent
const response = await myAgent.sendMessage({
  content: 'Hello, world!'
});

console.log(response.content);`}</code>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          variant="ghost" 
          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" 
          onClick={() => window.open('https://docs.agentbase.dev', '_blank')}
        >
          View full documentation →
        </Button>
      </CardFooter>
    </Card>
  );
} 