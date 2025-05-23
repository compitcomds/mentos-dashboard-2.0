
'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users, Loader2, AlertCircle } from "lucide-react";
import { fetchCurrentUser } from '@/lib/services/user';
import type { User } from '@/types/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QuickNav from './_components/quick-nav'; // Import the new QuickNav component

export default function DashboardPage() {
  const { data: userData, isLoading, error, isError } = useQuery<User, Error>({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  return (
    <div className="flex flex-col space-y-6">
        {/* Welcome Message and User Info */}
        <Card>
             <CardHeader>
                 <CardTitle>Welcome, {isLoading ? '...' : isError ? 'User' : userData?.username || 'User'}!</CardTitle>
                 <CardDescription>
                    This is the main overview of your application. Here you can monitor key metrics, manage your content, and configure settings.
                 </CardDescription>
             </CardHeader>
             <CardContent>
                {isLoading && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading user details...</span>
                    </div>
                )}
                 {isError && (
                     <Alert variant="destructive">
                         <AlertCircle className="h-4 w-4" />
                         <AlertTitle>Error Loading User</AlertTitle>
                         <AlertDescription>
                           Could not fetch your user details. Please try refreshing the page. Error: {(error as Error).message}
                         </AlertDescription>
                     </Alert>
                 )}
                 {userData && !isLoading && !isError && (
                    <div>
                        <p className="text-sm">Your registered email: <strong>{userData.email}</strong></p>
                        <p className="mt-4 text-sm text-muted-foreground">Use the sidebar navigation to explore different sections.</p>
                    </div>
                 )}
             </CardContent>
        </Card>

      {/* Quick Navigation Section */}
      <QuickNav />

      {/* Stats Cards */}
      
    </div>
  );
}
