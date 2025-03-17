/**
 * Tools Section Component
 * 
 * Displays available AI tools organized by category
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
  ChevronDown, 
  ChevronRight, 
  Copy,
  Check,
  Wrench
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Badge } from '../../components/ui/badge';
import { ToolCategory } from './tools-data';

interface ToolsSectionProps {
  utilityCategories: ToolCategory[];
}

/**
 * Section displaying available tools organized by category
 * Professional UI with improved visuals and interactions
 */
export function ToolsSection({ utilityCategories }: ToolsSectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [copiedTools, setCopiedTools] = useState<Record<string, boolean>>({});
  
  // Toggle category expansion
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  
  // Copy tool ID to clipboard with feedback
  const copyToolId = (toolId: string) => {
    navigator.clipboard.writeText(toolId);
    setCopiedTools(prev => ({ ...prev, [toolId]: true }));
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedTools(prev => ({ ...prev, [toolId]: false }));
    }, 2000);
  };
  
  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 pb-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-indigo-600" />
          <CardTitle>Available Tools</CardTitle>
        </div>
        <CardDescription className="text-gray-600">
          Pre-configured tools for your agents to leverage
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-100">
          {utilityCategories.map((category) => (
            <div key={category.name} className="overflow-hidden">
              <div 
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(category.name)}
              >
                <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
                  {category.icon}
                </div>
                <div className="font-medium text-gray-800">{category.name}</div>
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  {category.utilities.length}
                </Badge>
                <div className="ml-auto">
                  {expandedCategories[category.name] ? 
                    <ChevronDown className="h-5 w-5 text-gray-400" /> : 
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  }
                </div>
              </div>
              
              {expandedCategories[category.name] && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {category.utilities.map((utility) => (
                    <div 
                      key={utility.utility} 
                      className="flex items-center justify-between p-3 pl-14 hover:bg-gray-100 transition-colors"
                    >
                      <div className="pr-4">
                        <div className="font-medium text-sm text-gray-700">{utility.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{utility.description}</div>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToolId(utility.utility);
                              }}
                            >
                              <span className="text-xs font-mono text-gray-500 mr-2">{utility.utility}</span>
                              {copiedTools[utility.utility] ? 
                                <Check className="h-3.5 w-3.5 text-green-500" /> : 
                                <Copy className="h-3.5 w-3.5 text-gray-400" />
                              }
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{copiedTools[utility.utility] ? "Copied!" : "Copy tool ID"}</p>
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
  );
} 