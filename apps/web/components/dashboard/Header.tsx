/**
 * Dashboard Header Component
 * 
 * Displays the top navigation and user profile dropdown
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../../components/ui/dropdown-menu';
import { 
  FileText, 
  ChevronDown, 
  Loader2, 
  CreditCard, 
  LogOut,
  BookOpen,
  ExternalLink
} from 'lucide-react';

interface HeaderProps {
  user: { 
    name: string; 
    picture: string; 
    email: string; 
    id?: string 
  } | null;
  isLoading: boolean;
  getUserInitials: () => string;
  handleLogout: () => void;
}

/**
 * Dashboard header with navigation and user dropdown
 */
export function Header({ user, isLoading, getUserInitials, handleLogout }: HeaderProps) {
  const router = useRouter();
  
  return (
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
            onClick={() => window.open('https://docs.helloworld.ai', '_blank')}
            className="flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Documentation
            <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
          </Button>
          
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
  );
} 