import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoginArea } from './LoginArea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const { user } = useCurrentUser();

  if (!user) {
    // Return a login prompt instead of redirecting
    return (
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-md mx-auto mt-20">
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-lime-400">
                Login Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                You must be logged in to access the paranormal map.
              </p>
              <div className="flex justify-center">
                <LoginArea className="w-full max-w-60" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}