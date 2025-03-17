'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { LogOut, User, Settings, Mail, Calendar, Clock } from 'lucide-react';
import { logout, validateAuth } from '../../lib/auth/auth-service';
import { getUserById } from '../../lib/database/database-service';

// Define user interface based on available fields from database-service
interface UserProfile {
  id: string;
  username?: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  createdAt: string;
  active: boolean;
  // Other fields might be available based on the database-service
}

/**
 * User Profile Page
 * Displays detailed information about the current user
 * Fetches data from the database-service
 */
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Format date in a readable way
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      const success = await logout();
      
      if (success) {
        console.log('Successfully logged out');
        router.push('/'); // Redirect to login page
      } else {
        throw new Error('Logout failed');
      }
    } catch (err) {
      console.error('Error during logout:', err);
      alert('Failed to log out. Please try again.');
    }
  };

  // Fetch user data from the database-service
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        // First, get the current user ID from the auth service
        const userData = await validateAuth();
        
        if (!userData) {
          router.push('/');
          return;
        }
        
        const userId = userData.userId;
        
        // Fetch detailed user data from the database service
        const user = await getUserById(userId);
        
        if (user) {
          setUser(user);
        } else {
          throw new Error('User data not found');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load your profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-500">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/chat')}>Back to Chat</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // User not found or not authenticated
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>Unable to load user profile</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/chat')}>Back to Chat</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Determine display name based on available fields
  const displayName = user.displayName || 
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) || 
    user.username || 
    'User';

  return (
    <div className="container mx-auto py-10 px-4">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => router.push('/chat')}
      >
        ← Back to Chat
      </Button>
      
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">User Profile</CardTitle>
          <CardDescription>Manage your account details and preferences</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              {user.picture ? (
                <AvatarImage src={user.picture} alt={displayName} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials(displayName)}
                </AvatarFallback>
              )}
            </Avatar>
            
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              <p className="text-muted-foreground">{user.email || 'No email available'}</p>
              <p className="text-sm text-muted-foreground mt-1">
                User ID: {user.id}
              </p>
            </div>
          </div>
          
          <Separator />
          
          {/* User Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Account Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.username && (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{user.username}</p>
                  </div>
                </div>
              )}
              
              {user.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
              )}
              
              {user.createdAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">
                    <span className={user.active ? "text-green-600" : "text-red-600"}>
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional user data could be displayed here */}
        </CardContent>
        
        <CardFooter className="flex justify-between flex-wrap gap-4">
          <Button variant="outline" onClick={() => alert('Settings functionality not implemented')}>
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
          
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 