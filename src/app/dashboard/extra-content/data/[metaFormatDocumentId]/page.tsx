
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGetMetaFormat } from '@/lib/queries/meta-format';
import { useGetMetaDataEntries, useDeleteMetaDataEntry } from '@/lib/queries/meta-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionForJson,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertCircle, PlusCircle, MoreHorizontal, Edit, Trash2, Eye, Loader2, FileJson as FileJsonIcon, ImageIcon, Video as VideoIcon, FileText as FileTextIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { MetaData } from '@/types/meta-data';
import type { FormFormatComponent } from '@/types/meta-format';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MediaRenderer from '../_components/media-renderer'; // Corrected import path


// Helper to generate field names, consistent with form rendering
const getFieldName = (component: FormFormatComponent): string => {
  if (component.label && component.label.trim() !== '') {
    const slugifiedLabel = component.label
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    return `${slugifiedLabel}_${component.id}`;
  }
  return `component_${component.__component.replace('dynamic-component.', '')}_${component.id}`;
};


export default function MetaDataListingPage() {
  const router = useRouter();
  const params = useParams();
  const metaFormatDocumentId = params.metaFormatDocumentId as string;

  const { data: metaFormat, isLoading: isLoadingMetaFormat, isError: isErrorMetaFormat, error: errorMetaFormat } = useGetMetaFormat(metaFormatDocumentId);
  const { data: metaDataEntries, isLoading: isLoadingMetaData, isError: isErrorMetaData, error: errorMetaData, refetch: refetchMetaData, isFetching: isFetchingMetaData } = useGetMetaDataEntries(metaFormatDocumentId);
  const deleteMetaDataMutation = useDeleteMetaDataEntry();

  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [metaDataToDelete, setMetaDataToDelete] = React.useState<MetaData | null>(null);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = React.useState(false);
  const [selectedEntryJson, setSelectedEntryJson] = React.useState<Record<string, any> | null>(null);
  const [selectedEntryIdForJson, setSelectedEntryIdForJson] = React.useState<string | null>(null);


  const handleDeleteConfirmation = (entry: MetaData) => {
    setMetaDataToDelete(entry);
    setIsAlertOpen(true);
  };

  const executeDelete = () => {
    if (metaDataToDelete?.documentId) {
      deleteMetaDataMutation.mutate(
        { documentId: metaDataToDelete.documentId, metaFormatDocumentId: metaFormatDocumentId },
        {
          onSuccess: () => {
            setIsAlertOpen(false);
            setMetaDataToDelete(null);
          },
          onError: () => {
            setIsAlertOpen(false);
          }
        }
      );
    }
  };

  const handleViewJson = (entry: MetaData) => {
    setSelectedEntryJson(entry.meta_data || {});
    setSelectedEntryIdForJson(entry.documentId || entry.id?.toString() || 'N/A');
    setIsJsonDialogOpen(true);
  };

  const isLoading = isLoadingMetaFormat || isLoadingMetaData;
  const isError = isErrorMetaFormat || isErrorMetaData;
  const error = errorMetaFormat || errorMetaData;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-36" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
                 <Card key={i} className="flex flex-col">
                    <CardContent className="p-4 pb-0">
                        <Skeleton className="w-full h-32 rounded-md" />
                    </CardContent>
                    <CardHeader className="pb-2 pt-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-2 flex-1 pt-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter className="border-t pt-3"><Skeleton className="h-8 w-20 ml-auto" /></CardFooter>
                 </Card>
            ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{(error as Error)?.message || 'Could not load data for this extra content format.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!metaFormat) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Extra Content Format Not Found</AlertTitle>
          <AlertDescription>The requested extra content format could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const createNewEntryLink = `/dashboard/extra-content/render/${metaFormatDocumentId}?action=create`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard/extra-content')}>
        &larr; Back to Extra Content Management
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data for: {metaFormat.name}</h1>
          {metaFormat.description && <p className="text-muted-foreground">{metaFormat.description}</p>}
        </div>
        <Button asChild>
          <Link href={createNewEntryLink}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Entry
          </Link>
        </Button>
      </div>

    {(isFetchingMetaData && (!metaDataEntries || metaDataEntries.length === 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[...Array(3)].map((_, i) => (
                 <Card key={`skeleton-${i}`} className="flex flex-col">
                     <CardContent className="p-4 pb-0">
                         <Skeleton className="w-full h-32 rounded-md" />
                     </CardContent>
                     <CardHeader className="pb-2 pt-3">
                         <Skeleton className="h-5 w-3/4" />
                         <Skeleton className="h-4 w-1/2 mt-1" />
                     </CardHeader>
                     <CardContent className="space-y-2 flex-1 pt-2">
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-5/6" />
                     </CardContent>
                     <CardFooter className="border-t pt-3"><Skeleton className="h-8 w-20 ml-auto" /></CardFooter>
                 </Card>
             ))}
        </div>
    )}

    {(!metaDataEntries || metaDataEntries.length === 0) && !isFetchingMetaData && (
         <p className="text-muted-foreground text-center py-8">No data entries found for this format yet.</p>
      ) }

      {metaDataEntries && metaDataEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metaDataEntries.map((entry) => {
                const entryMediaIds: number[] = []; // Still storing numeric media IDs for MediaRenderer
                const otherFields: { label: string | null; value: any }[] = [];

                metaFormat.from_formate?.forEach(component => {
                    const fieldName = getFieldName(component);
                    const value = entry.meta_data?.[fieldName];

                    if (component.__component === 'dynamic-component.media-field' && value) {
                        if (component.is_array && Array.isArray(value)) {
                            value.forEach(mediaId => {
                                // Value is now string documentId from form, MediaRenderer expects numeric id.
                                // This part needs alignment if MediaRenderer depends on numeric media.id
                                // For now, if value is a string, attempt to parse as number, otherwise use as is if already number
                                const numericMediaId = typeof mediaId === 'string' ? parseInt(mediaId, 10) : typeof mediaId === 'number' ? mediaId : null;
                                if (numericMediaId !== null && !isNaN(numericMediaId)) {
                                     entryMediaIds.push(numericMediaId);
                                } else if (typeof mediaId === 'number') { // Fallback for old numeric data
                                     entryMediaIds.push(mediaId);
                                }
                            });
                        } else {
                             const numericMediaId = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : null;
                             if (numericMediaId !== null && !isNaN(numericMediaId)) {
                                 entryMediaIds.push(numericMediaId);
                             } else if (typeof value === 'number') {
                                 entryMediaIds.push(value);
                             }
                        }
                    } else if (value !== null && value !== undefined && String(value).trim() !== '') {
                        let displayValue = String(value);
                        if (typeof value === 'object' && !Array.isArray(value)) displayValue = '[Object]';
                        else if (Array.isArray(value)) displayValue = value.join(', ');
                        else if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                        else if (component.__component === 'dynamic-component.date-field' && value) {
                           try { displayValue = format(new Date(value), (component.type === 'time' ? 'p' : component.type === 'data&time' || component.type === 'datetime' ? 'Pp' : 'PP')); } catch { /* ignore */ }
                        }
                        if (displayValue.length > 70) displayValue = `${displayValue.substring(0, 67)}...`;
                        otherFields.push({ label: component.label, value: displayValue });
                    }
                });

                return (
                    <Card key={entry.documentId || entry.id} className="flex flex-col">
                        {entryMediaIds.length > 0 && (
                            <CardContent className="p-4 pb-0">
                                {entryMediaIds.length === 1 ? (
                                    <MediaRenderer mediaId={entryMediaIds[0]} className="rounded-md border" />
                                ) : (
                                    <Carousel className="w-full rounded-md border" opts={{ loop: entryMediaIds.length > 1 }}>
                                        <CarouselContent>
                                            {entryMediaIds.map((mediaId, index) => (
                                                <CarouselItem key={`${entry.documentId}-media-${index}`}>
                                                    <div className="p-1">
                                                         <MediaRenderer mediaId={mediaId} />
                                                    </div>
                                                </CarouselItem>
                                            ))}
                                        </CarouselContent>
                                        {entryMediaIds.length > 1 && <CarouselPrevious className="left-2 disabled:opacity-30" />}
                                        {entryMediaIds.length > 1 && <CarouselNext className="right-2 disabled:opacity-30"/>}
                                    </Carousel>
                                )}
                            </CardContent>
                        )}
                        <CardHeader className={entryMediaIds.length > 0 ? "pt-3 pb-2" : "pb-2"}>
                            <CardTitle className="text-base">Data Entry ID: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{entry.documentId || 'N/A'}</span></CardTitle>
                            <CardDescription className="text-xs">
                                Created: {entry.createdAt ? format(new Date(entry.createdAt), 'PPp') : 'N/A'} <br/>
                                Updated: {entry.updatedAt ? format(new Date(entry.updatedAt), 'PPp') : 'N/A'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2 pt-0">
                             {otherFields.length > 0 && (
                                 <div className="space-y-1">
                                     <h4 className="text-sm font-medium mt-2 border-t pt-2">Other Data:</h4>
                                     {otherFields.slice(0, 3).map((field, index) => (
                                         <p key={index} className="text-xs text-muted-foreground truncate">
                                             <span className="font-semibold text-foreground">{field.label || 'Field'}:</span> {field.value}
                                         </p>
                                     ))}
                                     {otherFields.length > 3 && <p className="text-xs text-muted-foreground">...and more.</p>}
                                 </div>
                             )}
                             {entryMediaIds.length === 0 && otherFields.length === 0 && (
                                 <p className="text-xs text-muted-foreground text-center py-4">No displayable data in this entry.</p>
                             )}
                        </CardContent>
                        <CardFooter className="flex justify-end border-t pt-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8">
                                    <MoreHorizontal className="h-4 w-4" /> <span className="ml-2">Actions</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onSelect={() => router.push(`/dashboard/extra-content/render/${metaFormatDocumentId}?action=edit&entry=${entry.documentId}`)}
                                    disabled={!entry.documentId}
                                >
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={() => handleViewJson(entry)}
                                    disabled={!entry.meta_data}
                                >
                                    <FileJsonIcon className="mr-2 h-4 w-4" /> View JSON
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onSelect={() => handleDeleteConfirmation(entry)}
                                    disabled={!entry.documentId || deleteMetaDataMutation.isPending && metaDataToDelete?.documentId === entry.documentId}
                                >
                                    {deleteMetaDataMutation.isPending && metaDataToDelete?.documentId === entry.documentId ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Delete
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
      )}


      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the data entry
              <span className="font-semibold"> "{metaDataToDelete?.documentId || 'this entry'}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMetaDataMutation.isPending} onClick={() => setMetaDataToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleteMetaDataMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMetaDataMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Raw JSON Data for Entry: {selectedEntryIdForJson}</DialogTitle>
            <DialogDescriptionForJson>
              This is the raw JSON data stored for this entry.
            </DialogDescriptionForJson>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] mt-4 border rounded-md">
            <pre className="p-4 text-xs whitespace-pre-wrap break-all">
              {selectedEntryJson ? JSON.stringify(selectedEntryJson, null, 2) : 'No JSON data available.'}
            </pre>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
