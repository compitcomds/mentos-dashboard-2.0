
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
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, PlusCircle, MoreHorizontal, Edit, Trash2, FileJson as FileJsonIcon, Loader2, PackageOpen, Eye, ImageIcon } from 'lucide-react';
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
import MediaRenderer from '../_components/media-renderer'; // Corrected import path

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

const formatDate = (dateString?: string | Date, formatType: string = 'PPP p') => {
  if (!dateString) return 'N/A';
  const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
  return isValid(date) ? format(date, formatType) : 'Invalid Date';
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
  const [selectedEntryForDialog, setSelectedEntryForDialog] = React.useState<MetaData | null>(null);

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
    setSelectedEntryForDialog(entry);
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
                 <Card key={`skeleton-${i}`} className="flex flex-col shadow-sm">
                    <CardContent className="p-4 pb-0 aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                         <Skeleton className="w-full h-full" />
                     </CardContent>
                    <CardHeader className="pb-2 pt-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-2 flex-1 pt-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter className="border-t pt-3 flex justify-end"><Skeleton className="h-8 w-24" /></CardFooter>
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
           <Button onClick={() => router.refresh()} className="mt-2">Retry</Button>
        </Alert>
      </div>
    );
  }

  if (!metaFormat) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Extra Content Format Not Found</AlertTitle>
          <AlertDescription>The requested extra content format (ID: {metaFormatDocumentId}) could not be found.</AlertDescription>
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

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{metaFormat.name}</h1>
          {metaFormat.description && <p className="text-muted-foreground mt-1">{metaFormat.description}</p>}
           <p className="text-xs text-muted-foreground mt-1">Format ID: {metaFormatDocumentId}</p>
        </div>
        <Button asChild className="flex-shrink-0">
          <Link href={createNewEntryLink}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Entry
          </Link>
        </Button>
      </div>

    {(isFetchingMetaData && (!metaDataEntries || metaDataEntries.length === 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[...Array(3)].map((_, i) => (
                 <Card key={`skeleton-fetching-${i}`} className="flex flex-col shadow-sm">
                     <CardContent className="p-4 pb-0 aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                         <Skeleton className="w-full h-full" />
                     </CardContent>
                     <CardHeader className="pb-2 pt-3">
                         <Skeleton className="h-5 w-3/4" />
                         <Skeleton className="h-4 w-1/2 mt-1" />
                     </CardHeader>
                     <CardContent className="space-y-2 flex-1 pt-2">
                         <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-5/6" />
                     </CardContent>
                     <CardFooter className="border-t pt-3 flex justify-end"><Skeleton className="h-8 w-24" /></CardFooter>
                 </Card>
             ))}
        </div>
    )}

    {(!metaDataEntries || metaDataEntries.length === 0) && !isFetchingMetaData && (
         <Card className="col-span-full text-center py-12 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center">
                <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground">No Data Entries Yet</h3>
                <p className="text-muted-foreground mt-1">Get started by creating a new entry for "{metaFormat.name}".</p>
            </CardContent>
         </Card>
      ) }

      {metaDataEntries && metaDataEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metaDataEntries.map((entry) => {
                const entryMediaIds: number[] = [];
                const otherFields: { label: string | null; value: any }[] = [];

                if (metaFormat?.from_formate && entry.meta_data) {
                  metaFormat.from_formate.forEach(component => {
                      const fieldName = getFieldName(component);
                      const value = entry.meta_data?.[fieldName];

                      if (component.__component === 'dynamic-component.media-field' && value !== null && value !== undefined) {
                          const idsToCollect: (number | string)[] = component.is_array && Array.isArray(value) ? value : [value];
                          idsToCollect.forEach(mediaIdValue => {
                             const numericMediaId = typeof mediaIdValue === 'number' ? mediaIdValue : (typeof mediaIdValue === 'string' && !isNaN(parseInt(mediaIdValue, 10)) ? parseInt(mediaIdValue, 10) : null);
                             if (numericMediaId !== null && !isNaN(numericMediaId)) {
                                 entryMediaIds.push(numericMediaId);
                             }
                          });
                      } else if (value !== null && value !== undefined && (typeof value !== 'string' || String(value).trim() !== '')) {
                          let displayValue: any = value;
                          if (typeof value === 'object' && !Array.isArray(value) && value !== null) displayValue = '[Object]';
                          else if (Array.isArray(value) && component.__component !== 'dynamic-component.media-field') displayValue = value.join(', ');
                          else if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                          else if (component.__component === 'dynamic-component.date-field' && value) {
                             try {
                               const parsedDate = parseISO(String(value));
                               if (isValid(parsedDate)) {
                                 displayValue = formatDate(parsedDate, (component.type === 'time' ? 'p' : component.type === 'data&time' || component.type === 'datetime' ? 'Pp' : 'PP'));
                               } else {
                                 displayValue = String(value);
                               }
                             } catch { displayValue = String(value); }
                          }

                          if (typeof displayValue === 'string' && displayValue.length > 60) {
                             displayValue = `${displayValue.substring(0, 57)}...`;
                          }
                          if (component.__component !== 'dynamic-component.media-field') {
                              otherFields.push({ label: component.label ?? null, value: displayValue });
                          }
                      }
                  });
                }

                return (
                    <Card key={entry.documentId || entry.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow rounded-lg overflow-hidden">
                        {entryMediaIds.length > 0 && (
                            <div className="bg-muted border-b">
                                {entryMediaIds.length === 1 && entryMediaIds[0] !== null && !isNaN(entryMediaIds[0]) ? (
                                    <MediaRenderer mediaId={entryMediaIds[0]} className="w-full h-48 object-cover" />
                                ) : entryMediaIds.length > 1 ? (
                                    <Carousel className="w-full" opts={{ loop: entryMediaIds.length > 1 }}>
                                        <CarouselContent>
                                            {entryMediaIds.map((mediaId, index) => (
                                                mediaId !== null && !isNaN(mediaId) && (
                                                <CarouselItem key={`${entry.documentId}-media-${index}`}>
                                                    <div className="p-0 aspect-video flex items-center justify-center">
                                                         <MediaRenderer mediaId={mediaId} className="w-full h-48 object-cover" />
                                                    </div>
                                                </CarouselItem>
                                                )
                                            ))}
                                        </CarouselContent>
                                        {entryMediaIds.length > 1 && <CarouselPrevious className="left-2 disabled:opacity-30 bg-background/50 hover:bg-background/80" />}
                                        {entryMediaIds.length > 1 && <CarouselNext className="right-2 disabled:opacity-30 bg-background/50 hover:bg-background/80"/>}
                                    </Carousel>
                                ) : null }
                            </div>
                        )}
                        <CardHeader className={entryMediaIds.length > 0 ? "pt-4 pb-2" : "pb-2"}>
                            <CardTitle className="text-base font-semibold text-foreground">
                                {entry.handle || `Data Entry ID: ${entry.documentId || 'N/A'}`}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {entry.handle && `ID: ${entry.documentId || 'N/A'} | `}
                                Created: {entry.createdAt ? formatDate(entry.createdAt, 'MMM d, yyyy, HH:mm') : 'N/A'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2 pt-0 text-sm">
                             {otherFields.length > 0 ? (
                                 <div className="space-y-1">
                                     {otherFields.slice(0, 3).map((field, index) => (
                                         <p key={index} className="text-muted-foreground truncate">
                                             <span className="font-medium text-foreground">{field.label || 'Field'}:</span> {String(field.value)}
                                         </p>
                                     ))}
                                     {otherFields.length > 3 && <p className="text-xs text-muted-foreground">...and {otherFields.length - 3} more fields.</p>}
                                 </div>
                             ) : (entryMediaIds.length === 0 && (
                                 <p className="text-xs text-muted-foreground text-center py-4">No displayable text data.</p>
                             ))}
                        </CardContent>
                        <CardFooter className="flex justify-end border-t pt-3 bg-muted/30 p-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 px-2">
                                    <MoreHorizontal className="h-4 w-4" /> <span className="ml-1 sr-only md:not-sr-only">Actions</span>
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
                                    <Eye className="mr-2 h-4 w-4" /> View Data
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
              This action cannot be undone. This will permanently delete the data entry with handle
              <span className="font-semibold"> "{metaDataToDelete?.handle || metaDataToDelete?.documentId || 'this entry'}"</span>.
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
            <DialogTitle>Details for Entry (Handle: {selectedEntryForDialog?.handle || selectedEntryForDialog?.documentId || 'N/A'})</DialogTitle>
            <DialogDescriptionComponent>
              View formatted data or raw JSON.
            </DialogDescriptionComponent>
          </DialogHeader>
          <Tabs defaultValue="ui" className="flex-1 flex flex-col overflow-hidden mt-2">
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="ui">Formatted View</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 mt-2 border rounded-md">
                <TabsContent value="ui" className="p-4 space-y-3 text-sm">
                    {selectedEntryData && metaFormat?.from_formate ? (
                       <>
                        <div className="grid grid-cols-3 gap-2 items-start py-1 border-b">
                            <strong className="col-span-1 break-words">Handle:</strong>
                            <div className="col-span-2 break-words font-mono text-xs bg-muted px-1 py-0.5 rounded">{selectedEntryForDialog?.handle || 'N/A'}</div>
                        </div>
                        {metaFormat.from_formate.map(component => {
                            const fieldName = getFieldName(component);
                            const value = selectedEntryData[fieldName];

                            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                                return (
                                     <div key={component.id} className="grid grid-cols-3 gap-2 items-start py-1 border-b">
                                        <strong className="col-span-1 break-words text-muted-foreground/70">{component.label || fieldName}:</strong>
                                        <div className="col-span-2 break-words text-muted-foreground/70 italic">Not set</div>
                                    </div>
                                );
                            }

                            return (
                                <div key={component.id} className="grid grid-cols-3 gap-2 items-start py-2 border-b last:border-b-0">
                                    <strong className="col-span-1 break-words">{component.label || fieldName}:</strong>
                                    <div className="col-span-2 break-words">
                                        {component.__component === 'dynamic-component.media-field' ? (
                                        Array.isArray(value) ? (
                                            <div className="flex flex-wrap gap-2">
                                            {value.map((mediaId: string | number, idx: number) => (
                                               typeof mediaId === 'number' ?
                                                <MediaRenderer key={idx} mediaId={mediaId} className="w-24 h-24 object-contain border rounded" />
                                                : <code className="text-xs bg-muted px-1 py-0.5 rounded" key={idx}>Invalid ID: {String(mediaId)}</code>
                                            ))}
                                            </div>
                                        ) : (
                                           typeof value === 'number' ?
                                            <MediaRenderer mediaId={value} className="max-w-xs max-h-48 object-contain border rounded" />
                                            : <code className="text-xs bg-muted px-1 py-0.5 rounded">Invalid ID: {String(value)}</code>
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
                                            value ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Yes</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">No</span>
                                        ) : Array.isArray(value) ? (
                                            value.map((item, i) => <code key={i} className="text-xs bg-muted px-1 py-0.5 rounded mr-1 mb-1 inline-block">{String(item)}</code>)
                                        ) : component.inputType === 'tip-tap' && typeof value === 'string' && value.startsWith('<') ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none border rounded p-2 bg-background" dangerouslySetInnerHTML={{ __html: value }} />
                                        ) : (
                                            String(value)
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        </>
                    ) : (
                        <p>No data to display or format definition missing.</p>
                    )}
                </TabsContent>
                <TabsContent value="raw" className="p-0">
                    <ScrollArea className="h-full">
                        <pre className="p-4 text-xs whitespace-pre-wrap break-all bg-muted rounded-b-md h-full">
                            {selectedEntryData ? JSON.stringify(selectedEntryData, null, 2) : 'No JSON data available.'}
                        </pre>
                    </ScrollArea>
                </TabsContent>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="mt-4 flex-shrink-0 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
