
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import MediaTable from './_components/media-table';
import UploadButton from './_components/upload-button';
import { useFetchMedia } from '@/lib/queries/media';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LayoutGrid, List } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/queries/user';
import MediaCardGrid from './_components/media-card-grid'; // Import new component
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type ViewMode = 'table' | 'card';

export default function WebMediaPage() {
    const { data: currentUser, isLoading: isLoadingUser, isError: isUserError } = useCurrentUser();
    const userKey = currentUser?.tenent_id;
    const { data: mediaData, isLoading: isLoadingMedia, isError: isMediaError, error: mediaError, refetch, isFetching } = useFetchMedia(userKey);
    const [viewMode, setViewMode] = React.useState<ViewMode>('table');

    const handleUploadSuccess = () => {
        refetch();
    };

    React.useEffect(() => {
        if (isMediaError) {
            console.error("Error fetching media data in WebMediaPage:", mediaError);
        }
        if (isUserError) {
            console.error("Error fetching current user in WebMediaPage");
        }
    }, [isMediaError, mediaError, isUserError]);

    const isLoading = isLoadingUser || isLoadingMedia;
    const isError = isUserError || isMediaError;
    const error = isUserError ? new Error("Failed to load user data.") : mediaError;

    return (
        <TooltipProvider>
            <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Web Media</h1>
                    <div className="flex items-center space-x-2">
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                variant={viewMode === 'table' ? 'default' : 'outline'}
                                size="icon"
                                onClick={() => setViewMode('table')}
                                aria-label="Table View"
                                disabled={isLoading}
                                >
                                <List className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Table View</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                variant={viewMode === 'card' ? 'default' : 'outline'}
                                size="icon"
                                onClick={() => setViewMode('card')}
                                aria-label="Card View"
                                disabled={isLoading}
                                >
                                <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Card View</TooltipContent>
                        </Tooltip>
                        <UploadButton onUploadSuccess={handleUploadSuccess} disabled={isLoadingUser || !userKey} />
                    </div>
                </div>

                {(isLoading || isFetching) && <WebMediaPageSkeleton viewMode={viewMode} />}

                {isError && !isFetching && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error Loading Data</AlertTitle>
                        <AlertDescription>
                        Could not fetch user or media files. Please check the browser console for more details.
                        <br/>
                        <strong>Error:</strong> {error?.message || 'Unknown error'}
                        </AlertDescription>
                        <Button onClick={() => refetch()} variant="secondary" size="sm" className="mt-2" disabled={isFetching}>
                        {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {isFetching ? 'Retrying...' : 'Retry'}
                        </Button>
                    </Alert>
                )}

                {!isLoading && !isError && userKey && mediaData && mediaData.length === 0 && (
                    <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
                        No media files found matching your key ({userKey}). Click "Upload New Media" to add some.
                    </div>
                )}

                {!isLoading && !isError && userKey && mediaData && mediaData.length > 0 && (
                    viewMode === 'table' ? (
                        <Card className='w-full overflow-x-auto max-w-full'> {/* Removed max-w-[41vh] */}
                            <CardHeader>
                                <CardTitle>Manage Media</CardTitle>
                                <CardDescription>
                                    Upload, view, edit, and delete your media files.
                                    {isFetching && <Loader2 className="ml-2 inline-block h-4 w-4 animate-spin" />}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MediaTable data={mediaData} />
                            </CardContent>
                        </Card>
                    ) : (
                        <MediaCardGrid mediaItems={mediaData} />
                    )
                )}

                {!isLoadingUser && !isUserError && !userKey && (
                    <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
                        User key is missing. Cannot display media.
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

function WebMediaPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
    const skeletonItems = Array(viewMode === 'table' ? 5 : 6).fill(0);
    return (
      <div className="space-y-4">
        {viewMode === 'table' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-1/4" />
            </div>
            <div className="rounded-md border">
              <div className="flex items-center p-4 border-b bg-muted/50">
                <Skeleton className="h-6 w-10 mr-4" />
                <Skeleton className="h-6 w-1/4 mr-4" />
                <Skeleton className="h-6 w-1/4 mr-4" />
                <Skeleton className="h-6 w-1/6 mr-4" />
                <Skeleton className="h-6 w-1/6 mr-4" />
                <Skeleton className="h-6 w-1/6 mr-4" />
                <Skeleton className="h-6 w-1/6 mr-4" />
                <Skeleton className="h-6 w-10 ml-auto" />
              </div>
              <div className="divide-y divide-border">
                {skeletonItems.map((_, i) => (
                  <div key={i} className="flex items-center p-4 space-x-4">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-4 w-1/6" />
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {skeletonItems.map((_, i) => (
                    <Card key={i}>
                        <Skeleton className="aspect-square w-full rounded-t-md bg-muted" />
                        <CardHeader className="p-4">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-3 w-1/2 mt-1" />
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-1">
                            <Skeleton className="h-3 w-1/4" />
                            <Skeleton className="h-3 w-1/3" />
                        </CardContent>
                        <CardFooter className="p-4 flex justify-end space-x-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      </div>
    );
}

    