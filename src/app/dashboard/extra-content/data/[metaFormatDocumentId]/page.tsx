
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
  DialogDescription as DialogDescriptionForDialog,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, PlusCircle, MoreHorizontal, Edit, Trash2, Eye, Loader2, FileJson as FileJsonIcon, ImageIcon, Video as VideoIcon, FileText as FileTextIcon } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { MetaData } from '@/types/meta-data';
import type { FormFormatComponent } from '@/types/meta-format';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import MediaRenderer from '../_components/media-renderer';

// Helper to generate a unique field name for RHF from MetaFormat component
const getFieldName = (component: FormFormatComponent): string => {
  if (component.label && component.label.trim() !== '') {
    const slugifiedLabel = component.label
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    return slugifiedLabel; // ID suffix removed
  }
  // Fallback remains the same, using component ID for uniqueness if no label
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

  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);
  const [selectedEntryData, setSelectedEntryData] = React.useState<Record<string, any> | null>(null);
  const [selectedEntryIdForDialog, setSelectedEntryIdForDialog] = React.useState<string | null>(null);


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

  const handleViewData = (entry: MetaData) => {
    setSelectedEntryData(entry.meta_data || {});
    setSelectedEntryIdForDialog(entry.documentId || entry.id?.toString() || 'N/A');
    setIsDetailDialogOpen(true);
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
                 <Card key={`skeleton-fetching-${i}`} className="flex flex-col">
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
                const entryMediaIds: number[] = [];
                const otherFields: { label: string | null; value: any }[] = [];

                metaFormat.from_formate?.forEach(component => {
                    const fieldName = getFieldName(component);
                    const value = entry.meta_data?.[fieldName];

                    if (component.__component === 'dynamic-component.media-field' && value !== null && value !== undefined) {
                        const idsToCollect: (number | string)[] = component.is_array && Array.isArray(value) ? value : [value];
                        idsToCollect.forEach(mediaIdValue => {
                           const numericMediaId = typeof mediaIdValue === 'string' ? parseInt(mediaIdValue, 10) : typeof mediaIdValue === 'number' ? mediaIdValue : null;
                           if (numericMediaId !== null && !isNaN(numericMediaId)) {
                               entryMediaIds.push(numericMediaId);
                           }
                        });
                    } else if (value !== null && value !== undefined && (typeof value !== 'string' || String(value).trim() !== '')) {
                        let displayValue: any = value;
                        if (typeof value === 'object' && !Array.isArray(value)) displayValue = '[Object]';
                        else if (Array.isArray(value) && component.__component !== 'dynamic-component.media-field') displayValue = value.join(', ');
                        else if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                        else if (component.__component === 'dynamic-component.date-field' && value) {
                           try {
                             const parsedDate = parseISO(String(value));
                             if (isValid(parsedDate)) {
                               displayValue = format(parsedDate, (component.type === 'time' ? 'p' : component.type === 'data&time' || component.type === 'datetime' ? 'Pp' : 'PP'));
                             } else {
                               displayValue = String(value);
                             }
                           } catch { displayValue = String(value); }
                        }

                        if (typeof displayValue === 'string' && displayValue.length > 70) {
                           displayValue = `${displayValue.substring(0, 67)}...`;
                        }
                        if (component.__component !== 'dynamic-component.media-field') {
                            otherFields.push({ label: component.label, value: displayValue });
                        }
                    }
                });

                return (
                    <Card key={entry.documentId || entry.id} className="flex flex-col">
                        {entryMediaIds.length > 0 && (
                            <CardContent className="p-4 pb-0">
                                {entryMediaIds.length === 1 && entryMediaIds[0] !== null && !isNaN(entryMediaIds[0]) ? (
                                    <MediaRenderer mediaId={entryMediaIds[0]} className="rounded-md border" />
                                ) : entryMediaIds.length > 1 ? (
                                    <Carousel className="w-full rounded-md border" opts={{ loop: entryMediaIds.length > 1 }}>
                                        <CarouselContent>
                                            {entryMediaIds.map((mediaId, index) => (
                                                mediaId !== null && !isNaN(mediaId) && (
                                                <CarouselItem key={`${entry.documentId}-media-${index}`}>
                                                    <div className="p-1">
                                                         <MediaRenderer mediaId={mediaId} />
                                                    </div>
                                                </CarouselItem>
                                                )
                                            ))}
                                        </CarouselContent>
                                        {entryMediaIds.length > 1 && <CarouselPrevious className="left-2 disabled:opacity-30" />}
                                        {entryMediaIds.length > 1 && <CarouselNext className="right-2 disabled:opacity-30"/>}
                                    </Carousel>
                                ) : null }
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
                                     <h4 className="text-sm font-medium mt-2 border-t pt-2">Content Preview:</h4>
                                     {otherFields.slice(0, 3).map((field, index) => (
                                         <p key={index} className="text-xs text-muted-foreground truncate">
                                             <span className="font-semibold text-foreground">{field.label || 'Field'}:</span> {String(field.value)}
                                         </p>
                                     ))}
                                     {otherFields.length > 3 && <p className="text-xs text-muted-foreground">...and more.</p>}
                                 </div>
                             )}
                             {(entryMediaIds.length === 0 && otherFields.length === 0) && (
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
                                    onSelect={() => handleViewData(entry)}
                                    disabled={!entry.meta_data}
                                >
                                    <FileJsonIcon className="mr-2 h-4 w-4" /> View Data
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
                );
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

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Details for Entry: {selectedEntryIdForDialog}</DialogTitle>
            <DialogDescriptionForDialog>
              View formatted data or raw JSON.
            </DialogDescriptionForDialog>
          </DialogHeader>
          <Tabs defaultValue="ui" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="ui">Formatted View</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 mt-2 border rounded-md">
                <TabsContent value="ui" className="p-4 space-y-3 text-sm">
                    {selectedEntryData && metaFormat?.from_formate ? (
                        metaFormat.from_formate.map(component => {
                        const fieldName = getFieldName(component);
                        const value = selectedEntryData[fieldName];

                        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                            return null;
                        }

                        return (
                            <div key={component.id} className="grid grid-cols-3 gap-2 items-start">
                                <strong className="col-span-1 break-words">{component.label || fieldName}:</strong>
                                <div className="col-span-2 break-words">
                                    {component.__component === 'dynamic-component.media-field' ? (
                                    Array.isArray(value) ? (
                                        <div className="flex flex-wrap gap-2">
                                        {value.map((mediaId: string | number, idx: number) => ( // Assuming mediaId can be string or number for now
                                           typeof mediaId === 'number' ?
                                            <MediaRenderer key={idx} mediaId={mediaId} className="w-24 h-24 object-contain" />
                                            : <span key={idx} className="text-xs text-muted-foreground">(Invalid Media ID: {String(mediaId)})</span>
                                        ))}
                                        </div>
                                    ) : (
                                       typeof value === 'number' ?
                                        <MediaRenderer mediaId={value} className="max-w-xs max-h-48 object-contain" />
                                        : <span className="text-xs text-muted-foreground">(Unsupported Media ID: {String(value)})</span>
                                    )
                                    ) : component.__component === 'dynamic-component.date-field' ? (
                                        Array.isArray(value) ? (
                                            value.map((v: any) => {
                                                try { return isValid(parseISO(String(v))) ? format(parseISO(String(v)), (component.type === 'time' ? 'p' : component.type === 'data&time' || component.type === 'datetime' ? 'Pp' : 'PP')) : String(v); } catch { return String(v); }
                                            }).join(', ')
                                        ) : (
                                            isValid(parseISO(String(value))) ? format(parseISO(String(value)), (component.type === 'time' ? 'p' : component.type === 'data&time' || component.type === 'datetime' ? 'Pp' : 'PP')) : String(value)
                                        )
                                    ) : typeof value === 'boolean' ? (
                                        value ? 'Yes' : 'No'
                                    ) : Array.isArray(value) ? (
                                        value.join(', ')
                                    ) : (
                                        String(value)
                                    )}
                                </div>
                            </div>
                        );
                        })
                    ) : (
                        <p>No data to display or format definition missing.</p>
                    )}
                </TabsContent>
                <TabsContent value="raw" className="p-0">
                    <pre className="p-4 text-xs whitespace-pre-wrap break-all h-full">
                    {selectedEntryData ? JSON.stringify(selectedEntryData, null, 2) : 'No JSON data available.'}
                    </pre>
                </TabsContent>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="mt-4 flex-shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    