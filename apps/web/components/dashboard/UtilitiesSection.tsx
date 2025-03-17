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
  const handleTestClick = (utilityName: string) => {
    if (sendMessage) {
      sendMessage(`HelloWorld`);
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
                                  handleTestClick(utility.name);
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