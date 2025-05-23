
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useGetMetaFormats } from '@/lib/queries/meta-format';
import type { MetaFormat } from '@/types/meta-format';
import { AlertCircle, ArrowRight, FileJson, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/lib/queries/user';

export default function QuickNav() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  const {
    data: metaFormats,
    isLoading: isLoadingMetaFormats,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetMetaFormats();

  const quickNavItems = React.useMemo(() => {
    if (!metaFormats) return [];
    return metaFormats.filter(
      (format) => format.placing === 'sidebar' || format.placing === 'both'
    );
  }, [metaFormats]);

  const isLoading = isLoadingUser || isLoadingMetaFormats;

  if (isLoading || isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
          <CardDescription>Fast access to your key content forms.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError && !isFetching) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Quick Navigation</AlertTitle>
            <AlertDescription>
              Could not fetch extra content for quick navigation. {(error as Error)?.message}
              <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!userTenentId && !isLoadingUser) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">User information not available. Cannot load quick navigation items.</p>
            </CardContent>
        </Card>
     );
  }

  if (quickNavItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Navigation</CardTitle>
          <CardDescription>Fast access to your key content forms.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No quick navigation items configured for sidebar/both display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Navigation</CardTitle>
        <CardDescription>Fast access to your key content forms.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickNavItems.map((item) => (
          <Card key={item.documentId || item.id} className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                {item.name || 'Unnamed Form'}
              </CardTitle>
              {item.description && (
                <CardDescription className="text-xs line-clamp-2">
                  {item.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1" /> {/* Spacer */}
            <CardContent className="pt-0">
              {item.documentId ? (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/dashboard/extra-content/render/${item.documentId}`}>
                    Open Form <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Unavailable
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
