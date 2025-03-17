'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { Copy, Check, FileText, Clock, AlertCircle, Code, ChevronDown, ChevronRight, Loader2, CreditCard, LogOut, Eye, EyeOff, RefreshCw } from 'lucide-react';

// Define Badge component inline since we can't find the import
const Badge = ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
      variant === 'outline' ? 'border-gray-200 text-gray-900' : 'bg-gray-100 text-gray-900 border-transparent'
    } ${className || ''}`}>
      {children}
    </span>
  );
};

/**
 * Professional Dashboard Page
 * Displays user's API key, getting started instructions, available utilities,
 * and provides navigation to the chat interface
 */
export default function Dashboard() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<{ name: string; picture: string; email: string; id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Endpoint would typically be secured and use authentication
        const response = await fetch('http://localhost:3006/db/users');
        const data = await response.json();
        
        if (data.success && data.data.items.length > 0) {
          const userData = data.data.items[0];
          setUser({
            id: userData.id,
            name: userData.data.name,
            picture: userData.data.picture,
            email: userData.data.email
          });
          
          // Fetch API key after getting user data
          fetchApiKey(userData.id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Fetch API key for user
  const fetchApiKey = async (userId: string) => {
    if (!userId) return;
    
    setIsLoadingKey(true);
    try {
      // First, check if user already has keys
      const existingKeysResponse = await fetch(`http://localhost:3003/keys?userId=${userId}`);
      const existingKeysData = await existingKeysResponse.json();
      
      if (existingKeysData.success && existingKeysData.data && existingKeysData.data.length > 0) {
        // User already has a key, use the existing one
        setApiKey(`helloworld_xxxx_${existingKeysData.data[0].keyPrefix.substring(10)}`);
      } else {
        // Create new key for user
        const response = await fetch('http://localhost:3003/keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            name: 'Default HelloWorld Key'
          }),
        });
        
        const data = await response.json();
        
        if (data.success && data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          // Fallback to a placeholder if API fails
          setApiKey('helloworld_sk_b8e92a71f9d64e3b95c1a97d19b7b32c');
        }
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      // Fallback to a placeholder if API fails
      setApiKey('helloworld_sk_b8e92a71f9d64e3b95c1a97d19b7b32c');
    } finally {
      setIsLoadingKey(false);
    }
  };
  
  // Regenerate API key
  const regenerateApiKey = async () => {
    if (!user?.id) return;
    
    setIsLoadingKey(true);
    try {
      const response = await fetch('http://localhost:3003/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name: 'Regenerated HelloWorld Key'
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.apiKey) {
        setApiKey(data.apiKey);
        // Set key to be visible when regenerated
        setIsKeyVisible(true);
      }
    } catch (error) {
      console.error('Error regenerating API key:', error);
    } finally {
      setIsLoadingKey(false);
    }
  };
  
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].substring(0, 1).toUpperCase();
    
    return (nameParts[0].substring(0, 1) + nameParts[nameParts.length - 1].substring(0, 1)).toUpperCase();
  };

  // Handle logout
  const handleLogout = () => {
    // In a real app, clear auth tokens, cookies, etc.
    console.log('Logging out...');
    router.push('/');
  };
  
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

  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // PostgreSQL SVG icon
  const PostgresIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 25.6 25.6" width="20" className="h-5 w-5">
      <g fill="none" stroke="#fff">
        <path d="M18.983 18.636c.163-1.357.114-1.555 1.124-1.336l.257.023c.777.035 1.793-.125 2.4-.402 1.285-.596 2.047-1.592.78-1.33-2.89.596-3.1-.383-3.1-.383 3.053-4.53 4.33-10.28 3.227-11.687-3.004-3.84-8.205-2.024-8.292-1.976l-.028.005c-.57-.12-1.2-.19-1.93-.2-1.308-.02-2.3.343-3.054.914 0 0-9.277-3.822-8.846 4.807.092 1.836 2.63 13.9 5.66 10.25C8.29 15.987 9.36 14.86 9.36 14.86c.53.353 1.167.533 1.834.468l.052-.044a2.01 2.01 0 0 0 .021.518c-.78.872-.55 1.025-2.11 1.346-1.578.325-.65.904-.046 1.056.734.184 2.432.444 3.58-1.162l-.046.183c.306.245.285 1.76.33 2.842s.116 2.093.337 2.688.48 2.13 2.53 1.7c1.713-.367 3.023-.896 3.143-5.81" fill="#000" stroke="#000" strokeLinecap="butt" strokeWidth="2.149"/>
        <path d="M23.535 15.6c-2.89.596-3.1-.383-3.1-.383 3.053-4.53 4.33-10.28 3.228-11.687-3.004-3.84-8.205-2.023-8.292-1.976l-.028.005a10.31 10.31 0 0 0-1.929-.201c-1.308-.02-2.3.343-3.054.914 0 0-9.278-3.822-8.846 4.807.092 1.836 2.63 13.9 5.66 10.25C8.29 15.987 9.36 14.86 9.36 14.86c.53.353 1.167.533 1.834.468l.052-.044a2.02 2.02 0 0 0 .021.518c-.78.872-.55 1.025-2.11 1.346-1.578.325-.65.904-.046 1.056.734.184 2.432.444 3.58-1.162l-.046.183c.306.245.52 1.593.484 2.815s-.06 2.06.18 2.716.48 2.13 2.53 1.7c1.713-.367 2.6-1.32 2.725-2.906.088-1.128.286-.962.3-1.97l.16-.478c.183-1.53.03-2.023 1.085-1.793l.257.023c.777.035 1.794-.125 2.39-.402 1.285-.596 2.047-1.592.78-1.33z" fill="#336791" stroke="none"/>
        <g strokeWidth=".716">
          <g strokeLinecap="round">
            <path d="M12.814 16.467c-.08 2.846.02 5.712.298 6.4s.875 2.05 2.926 1.612c1.713-.367 2.337-1.078 2.607-2.647l.633-5.017M10.356 2.2S1.072-1.596 1.504 7.033c.092 1.836 2.63 13.9 5.66 10.25C8.27 15.95 9.27 14.907 9.27 14.907m6.1-13.4c-.32.1 5.164-2.005 8.282 1.978 1.1 1.407-.175 7.157-3.228 11.687" strokeLinejoin="round"/>
            <path d="M20.425 15.17s.2.98 3.1.382c1.267-.262.504.734-.78 1.33-1.054.49-3.418.615-3.457-.06-.1-1.745 1.244-1.215 1.147-1.652-.088-.394-.69-.78-1.086-1.744-.347-.84-4.76-7.29 1.224-6.333.22-.045-1.56-5.7-7.16-5.782S7.99 8.196 7.99 8.196" strokeLinejoin="bevel"/>
          </g>
          <g strokeLinejoin="round">
            <path d="M11.247 15.768c-.78.872-.55 1.025-2.11 1.346-1.578.325-.65.904-.046 1.056.734.184 2.432.444 3.58-1.163.35-.49-.002-1.27-.482-1.468-.232-.096-.542-.216-.94.23z"/>
            <path d="M11.196 15.753c-.08-.513.168-1.122.433-1.836.398-1.07 1.316-2.14.582-5.537-.547-2.53-4.22-.527-4.22-.184s.166 1.74-.06 3.365c-.297 2.122 1.35 3.916 3.246 3.733" strokeLinecap="round"/>
          </g>
        </g>
        <g fill="#fff" strokeLinejoin="miter">
          <path d="M10.322 8.145c-.017.117.215.43.516.472s.558-.202.575-.32-.215-.246-.516-.288-.56.02-.575.136z" strokeWidth=".239"/>
          <path d="M19.486 7.906c.016.117-.215.43-.516.472s-.56-.202-.575-.32.215-.246.516-.288.56.02.575.136z" strokeWidth=".119"/>
        </g>
        <path d="M20.562 7.095c.05.92-.198 1.545-.23 2.524-.046 1.422.678 3.05-.413 4.68" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".716"/>
      </g>
    </svg>
  );
  
  // GitHub SVG icon
  const GitHubIcon = () => (
    <svg width="20" height="20" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
      <path fillRule="evenodd" clipRule="evenodd" d="M44.6308 5.81738C22.5778 5.81738 4.75 23.7763 4.75 45.994C4.75 63.7538 16.1729 78.787 32.0194 84.1078C34.0006 84.5078 34.7263 83.2433 34.7263 82.1796C34.7263 81.2482 34.661 78.0556 34.661 74.7291C23.5671 77.1242 21.2569 69.9398 21.2569 69.9398C19.4741 65.2835 16.8324 64.0868 16.8324 64.0868C13.2014 61.6256 17.0969 61.6256 17.0969 61.6256C21.1247 61.8917 23.2382 65.7496 23.2382 65.7496C26.8031 71.8688 32.5476 70.1398 34.8586 69.0753C35.1884 66.4811 36.2455 64.6852 37.368 63.6876C28.5198 62.7562 19.2104 59.2975 19.2104 43.865C19.2104 39.4749 20.7941 35.8831 23.3035 33.0897C22.9076 32.0921 21.5206 27.9673 23.7002 22.4466C23.7002 22.4466 27.0676 21.3821 34.6602 26.5706C37.9109 25.6911 41.2633 25.2437 44.6308 25.24C47.9982 25.24 51.4308 25.7061 54.6006 26.5706C62.1941 21.3821 65.5614 22.4466 65.5614 22.4466C67.741 27.9673 66.3533 32.0921 65.9573 33.0897C68.5329 35.8831 70.0512 39.4749 70.0512 43.865C70.0512 59.2975 60.7418 62.6893 51.8276 63.6876C53.2806 64.9513 54.5345 67.3455 54.5345 71.1373C54.5345 76.525 54.4692 80.849 54.4692 82.1788C54.4692 83.2433 55.1957 84.5078 57.1761 84.1086C73.0227 78.7862 84.4455 63.7538 84.4455 45.994C84.5108 23.7763 66.6178 5.81738 44.6308 5.81738Z" fill="#24292F"/>
    </svg>
  );
  
  // Chrome SVG icon
  const ChromeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
      <path d="M43.6812 5.74521C43.6812 5.74521 66.7429 4.23339 79.4607 27.1675L42.1823 27.9465C42.1823 27.9465 35.1364 27.8618 29.3141 36.5286C27.657 40.1438 25.889 43.8763 28.1178 51.1023C25.0113 46.0876 11.6143 23.8507 11.6143 23.8507C11.6143 23.8507 20.3874 7.15584 43.6812 5.74521Z" fill="#EA4335"/>
      <path d="M79.0327 63.9327C79.0327 63.9327 68.8162 84.6642 42.593 84.2038L60.5568 51.5316C60.5568 51.5316 64.1527 45.4727 59.562 36.0942C57.2601 32.8529 54.9135 29.4544 47.5395 27.7697C53.4366 27.5889 79.3902 27.1042 79.3902 27.1042C79.3902 27.1042 89.4601 43.0548 79.0327 63.9327Z" fill="#FBBC05"/>
      <path d="M10.97 65.5124C10.97 65.5124 -1.87697 46.2909 11.6391 23.8134L30.9485 55.714C30.9485 55.714 34.3967 61.8576 44.8133 62.571C48.7706 62.1989 52.8869 61.8631 58.034 56.3236C55.2397 61.5209 42.6777 84.2391 42.6777 84.2391C42.6777 84.2391 23.8329 84.9834 10.97 65.5124Z" fill="#34A853"/>
      <path d="M26.947 45.6504C26.8745 42.1955 27.8281 38.7967 29.6872 35.8838C31.5463 32.9708 34.2275 30.6746 37.3916 29.2856C40.5557 27.8965 44.0606 27.4769 47.4632 28.0799C50.8658 28.6829 54.0131 30.2814 56.5072 32.6732C59.0013 35.065 60.7301 38.1428 61.4751 41.5172C62.22 44.8916 61.9476 48.4111 60.6922 51.6307C59.4369 54.8503 57.2551 57.6253 54.4226 59.6048C51.5902 61.5843 48.2343 62.6794 44.7795 62.7516C40.1471 62.8484 35.666 61.1011 32.3219 57.894C28.9777 54.687 27.0443 50.2829 26.947 45.6504Z" fill="white"/>
      <path d="M29.8723 45.5894C29.8118 42.7131 30.6056 39.8834 32.1531 37.4581C33.7007 35.0328 35.9326 33.1209 38.5666 31.964C41.2007 30.8071 44.1186 30.4571 46.9515 30.9585C49.7844 31.4598 52.4051 32.7899 54.4821 34.7805C56.5592 36.7711 57.9994 39.3329 58.6207 42.142C59.242 44.9511 59.0165 47.8813 57.9726 50.5622C56.9288 53.2432 55.1135 55.5544 52.7562 57.2037C50.399 58.853 47.6057 59.7663 44.7294 59.8282C42.8189 59.8693 40.9189 59.5335 39.1381 58.8401C37.3574 58.1467 35.7307 57.1092 34.351 55.7869C32.9712 54.4647 31.8656 52.8835 31.0971 51.1338C30.3286 49.384 29.9124 47.5 29.8723 45.5894Z" fill="#4285F4"/>
    </svg>
  );
  
  // Utility categories with their respective tools
  const utilityCategories = [
    {
      name: 'Database',
      icon: <PostgresIcon />,
      utilities: [
        { name: 'Create Table', description: 'Create a new database table', utility: 'utility_create_table' },
        { name: 'Query Table', description: 'Execute SQL queries on tables', utility: 'utility_query_table' },
        { name: 'Get Table', description: 'Retrieve table schema and data', utility: 'utility_get_table' },
        { name: 'Alter Table', description: 'Modify existing table structure', utility: 'utility_alter_table' },
        { name: 'Delete Table', description: 'Remove tables from database', utility: 'utility_delete_table' },
        { name: 'Get Database', description: 'Get database information', utility: 'utility_get_database' },
      ]
    },
    {
      name: 'GitHub',
      icon: <GitHubIcon />,
      utilities: [
        { name: 'Get Code', description: 'Retrieve code from repositories', utility: 'utility_github_get_code' },
        { name: 'Create File', description: 'Create new files in repositories', utility: 'utility_github_create_file' },
        { name: 'Update File', description: 'Update existing files', utility: 'utility_github_update_file' },
        { name: 'Read File', description: 'Read file contents', utility: 'utility_github_read_file' },
        { name: 'List Directory', description: 'List directory contents', utility: 'utility_github_list_directory' },
        { name: 'Run Code', description: 'Execute code in GitHub repositories', utility: 'utility_github_run_code' },
        { name: 'Lint Code', description: 'Lint code for errors', utility: 'utility_github_lint_code' },
        { name: 'Deploy Code', description: 'Deploy code to environments', utility: 'utility_github_deploy_code' },
        { name: 'Create Codespace', description: 'Create development environments', utility: 'utility_github_create_codespace' },
        { name: 'List Codespaces', description: 'List available codespaces', utility: 'utility_github_list_codespaces' },
        { name: 'Destroy Codespace', description: 'Remove codespace environments', utility: 'utility_github_destroy_codespace' },
      ]
    },
    {
      name: 'Web Browsing',
      icon: <ChromeIcon />,
      utilities: [
        { name: 'Google Search', description: 'Perform Google searches', utility: 'utility_google_search' },
        { name: 'Extract Content', description: 'Extract content from web pages', utility: 'utility_firecrawl_extract_content' },
      ]
    },
    {
      name: 'Utilities',
      icon: <Clock className="h-5 w-5 text-purple-600" />,
      utilities: [
        { name: 'Current DateTime', description: 'Get current date and time', utility: 'utility_get_current_datetime' },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
              Agent Base
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/chat')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Chat
            </Button>
            
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
                <span className="font-medium text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.picture || ''} alt={user?.name || 'User'} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{user?.name || 'Guest'}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <Avatar className="h-4 w-4 mr-2">
                      <AvatarImage src={user?.picture || ''} alt={user?.name || 'User'} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/billing')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="flex-1 container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Getting Started */}
          <div className="space-y-6">
            {/* Welcome and API Key Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Welcome to Agent Base</CardTitle>
                    <CardDescription>Your AI agent infrastructure dashboard</CardDescription>
                  </div>
                  {user?.id && (
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

            {/* Quick Start Guide */}
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
                <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => window.open('https://docs.agentbase.dev', '_blank')}>
                  View full documentation →
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Right Column - Available Utilities */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-indigo-600" />
                  <CardTitle>Available Utilities</CardTitle>
                </div>
                <CardDescription>
                  Pre-configured utilities for your agents to leverage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {utilityCategories.map((category) => (
                    <div key={category.name} className="space-y-2">
                      <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleCategory(category.name)}
                      >
                        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                          {category.icon}
                        </div>
                        <div className="font-medium">{category.name}</div>
                        <div className="ml-auto">
                          {expandedCategories[category.name] ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </div>
                      </div>
                      
                      {expandedCategories[category.name] && (
                        <div className="ml-10 space-y-2 mt-2">
                          {category.utilities.map((utility) => (
                            <div 
                              key={utility.utility} 
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <div>
                                <div className="font-medium text-sm">{utility.name}</div>
                                <div className="text-xs text-gray-500">{utility.description}</div>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Copy utility ID</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 