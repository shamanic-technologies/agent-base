import { Skeleton } from "../../components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";

/**
 * Profile Page Loading State
 * Displays a skeleton UI while the profile data is being loaded
 */
export default function ProfileLoading() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Button variant="ghost" className="mb-6" disabled>
        ← Back to Chat
      </Button>
      
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">User Profile</CardTitle>
          <CardDescription>Manage your account details and preferences</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Profile Header Loading State */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            
            <div className="text-center sm:text-left w-full sm:w-auto">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          
          <Separator />
          
          {/* User Details Loading State */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="w-full">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between flex-wrap gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
} 