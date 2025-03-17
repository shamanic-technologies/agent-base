/**
 * Utilities Section Component
 * 
 * Displays available utilities organized by category
 */
import { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  Copy,
  PlayCircle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { UtilityCategory } from './utility-data';

// Custom test messages for each utility
const TEST_MESSAGES: Record<string, string> = {
  // Database utilities
  utility_create_table: "I want to inventory my products, can you create a personalized table for me to store that information?",
  utility_query_table: "Insert in database a new product: Apple Macbook Air M4. If the product table doesn't exist then create it!",
  utility_get_table: "Can you get the information of the \"product\" table? If it doesn't exist then create it!",
  utility_alter_table: "Can you add a column \"brand\" to my \"product\" table? If the table doesn't exist then create it!",
  utility_delete_table: "Can you delete my \"product\" table?",
  utility_get_database: "What info do you have in my database?",
  
  // GitHub utilities
  utility_github_get_code: "Can you fetch the README.md file from the main branch of the repository hello-world/demo?",
  utility_github_create_file: "Can you create a new file called greeting.js with a simple hello world function in my repository?",
  utility_github_update_file: "Can you update my app.js file to add error handling to the main function?",
  utility_github_read_file: "Can you read the content of my package.json file and explain what dependencies I'm using?",
  utility_github_list_directory: "Can you list all the files in my src directory?",
  utility_github_run_code: "Can you run my tests.js file and tell me if all tests pass?",
  utility_github_lint_code: "Can you lint my JavaScript files and tell me about any style issues?",
  utility_github_deploy_code: "Can you deploy my app to production after running tests?",
  utility_github_create_codespace: "Can you create a new codespace for my project so I can start development?",
  utility_github_list_codespaces: "Can you list all my active codespaces?",
  utility_github_destroy_codespace: "Can you delete the codespace I created yesterday for the demo project?",
  
  // Web browsing utilities
  utility_google_search: "Can you search for the latest news about artificial intelligence?",
  utility_firecrawl_extract_content: "Can you extract the main content from the webpage at https://example.com?",
  
  // Other utilities
  utility_get_current_datetime: "What's the current date and time?",
  
  // Default message for any utilities not explicitly defined
  default: "Can you help me test this utility?"
};

interface UtilitiesSectionProps {
  utilityCategories: UtilityCategory[];
  sendMessage?: (message: string) => void;
}

/**
 * Section displaying available utilities organized by category
 */
export function UtilitiesSection({ utilityCategories, sendMessage }: UtilitiesSectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Handle test button click
  const handleTestClick = (utility: string) => {
    if (sendMessage) {
      // Get the custom message for this utility, or use the default if not found
      const message = TEST_MESSAGES[utility] || TEST_MESSAGES.default;
      sendMessage(message);
    }
  };
  
  return (
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
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTestClick(utility.utility);
                                }}
                              >
                                <PlayCircle className="h-3 w-3 mr-1" />
                                Test Me
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Test this utility</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copy utility ID</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 