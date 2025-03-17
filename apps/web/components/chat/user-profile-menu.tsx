"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock user data - this would typically come from your auth context
interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface UserProfileMenuProps {
  user?: UserProfile;
  onLogout: () => void;
}

/**
 * UserProfileMenu Component
 * Displays the current user's profile picture and name with a dropdown menu
 */
export function UserProfileMenu({ 
  user = { 
    name: "John Doe", 
    email: "john@example.com",
    avatarUrl: undefined
  }, 
  onLogout 
}: UserProfileMenuProps) {
  const router = useRouter();
  
  // Get initials from name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  // Navigate to profile page
  const handleProfileClick = () => {
    router.push('/profile');
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          className="flex items-center gap-2 bg-transparent hover:bg-accent text-foreground border-none"
        >
          <Avatar className="h-8 w-8">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.name} />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="font-medium hidden sm:inline">{user.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem className="cursor-pointer" onClick={handleProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>View Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 