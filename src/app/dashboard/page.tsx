"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Activity,
  CreditCard,
  DollarSign,
  Users,
  Loader2,
  AlertCircle,
  FileText,
  BarChart3,
  ShoppingBag,
  MessageSquare,
} from "lucide-react";
import { fetchCurrentUser } from "@/lib/services/user";
import type { User } from "@/types/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QuickNav from "./_components/quick-nav";

export default function DashboardPage() {
  const {
    data: userData,
    isLoading,
    error,
    isError,
  } = useQuery<User, Error>({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  return (
    <div className="flex flex-col space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome,{" "}
            {isLoading
              ? "..."
              : isError
              ? "User"
              : userData?.username || "User"}
            !
          </CardTitle>
          <CardDescription>
            Here's an overview of your application's activity and key metrics.
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
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading User</AlertTitle>
              <AlertDescription>
                Could not fetch your user details. Please try refreshing the
                page. Error: {(error as Error).message}
              </AlertDescription>
            </Alert>
          )}
          {userData && !isLoading && !isError && (
            <div>
              <p className="text-sm text-muted-foreground">
                Your registered email: <strong>{userData.email}</strong>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Use the sidebar navigation to explore different sections.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <QuickNav />

      {/* Placeholder for a chart or recent activity feed */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Activity Overview
              (Placeholder)
            </CardTitle>
            <CardDescription>
              A visual summary of recent activities.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            [Chart/Graph Data Would Go Here]
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Recent Documents
              (Placeholder)
            </CardTitle>
            <CardDescription>
              Quick access to your latest documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            [List of Recent Documents Would Go Here]
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
