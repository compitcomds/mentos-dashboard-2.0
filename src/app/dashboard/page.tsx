
'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users, Loader2, AlertCircle } from "lucide-react";
import { fetchCurrentUser } from '@/lib/services/user'; // Import the service function
import type { User } from '@/types/auth'; // Import the User type
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert component

export default function DashboardPage() {

  // Fetch current user data
  const { data: userData, isLoading, error, isError } = useQuery<User, Error>({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1, // Retry once on failure
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
                           Could not fetch your user details. Please try refreshing the page. Error: {error.message}
                         </AlertDescription>
                     </Alert>
                 )}
                 {userData && !isLoading && !isError && (
                    <div>
                        <p className="text-sm">Your registered email: <strong>{userData.email}</strong></p>
                        {/* You can add more user details here if available */}
                        {/* <p className="text-sm mt-1">Full Name: <strong>{userData.full_name || 'N/A'}</strong></p> */}
                        <p className="mt-4 text-sm text-muted-foreground">Use the sidebar navigation to explore different sections.</p>
                    </div>
                 )}
             </CardContent>
        </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">
              +180.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">
              +19% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">
              +201 since last hour
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
