
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMetaFormats } from '@/lib/queries/meta-format';
import type { MetaFormat } from '@/types/meta-format';
import { AlertCircle, Loader2, FileJson, Settings2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MetaFormatsPage() {
  const { data: metaFormats, isLoading, isError, error, refetch, isFetching } = useGetMetaFormats();

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Meta Formats</h1>
          {/* Future: Add "Create New Meta Format" button here */}
           <Button disabled>
             <Settings2 className="mr-2 h-4 w-4" /> Configure New Format (Soon)
           </Button>
        </div>

        {(isLoading || isFetching) && (
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-1/3 mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Skeleton className="h-5 w-1/4" /></TableHead>
                      <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                      <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Meta Formats</AlertTitle>
            <AlertDescription>
              Could not fetch meta formats. {error?.message}
              <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && metaFormats && metaFormats.length === 0 && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            No meta formats found.
          </div>
        )}

        {!isLoading && !isError && metaFormats && metaFormats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Available Meta Formats</CardTitle>
              <CardDescription>
                Select a format to render a dynamic form.
                {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Placing</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metaFormats.map((format) => (
                    <TableRow key={format.documentId || format.id}>
                      <TableCell className="font-medium">{format.name || 'Unnamed Format'}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-xs">
                        {format.description || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format.placing || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm" disabled={!format.documentId}>
                          <Link href={format.documentId ? `/dashboard/meta-formats/render/${format.documentId}` : '#'}>
                            Render Form
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
