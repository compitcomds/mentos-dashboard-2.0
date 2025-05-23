
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertCircle, PlusCircle, MoreHorizontal, Edit, Trash2, Eye, Loader2, FileJson as FileJsonIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { MetaData } from '@/types/meta-data';
import type { FormFormatComponent } from '@/types/meta-format';

// Helper to generate a unique field name for RHF from MetaFormat component
// This needs to be consistent with how names are generated in RenderExtraContentPage
const getFieldName = (component: FormFormatComponent): string => {
  if (component.id) {
    return `component_${component.__component.replace('dynamic-component.', '')}_${component.id}`;
  }
  const label = component.label || component.__component.split('.').pop() || 'unknown_field';
  return label.toLowerCase().replace(/\s+/g, '_') + `_${Math.random().toString(36).substring(7)}`;
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

  const getContentPreview = (entry: MetaData): string => {
    if (!metaFormat || !metaFormat.from_formate || !entry.meta_data) {
      return 'N/A';
    }

    let previewValue: string | null = null;

    for (const component of metaFormat.from_formate) {
      const fieldName = getFieldName(component);
      const value = entry.meta_data[fieldName];
      if (component.label && (component.label.toLowerCase().includes('name') || component.label.toLowerCase().includes('title'))) {
        if (typeof value === 'string' && value.trim() !== '') {
          previewValue = value;
          break;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          previewValue = String(value);
          break;
        }
      }
    }

    if (!previewValue) {
      for (const component of metaFormat.from_formate) {
        const fieldName = getFieldName(component);
        const value = entry.meta_data[fieldName];
        if (typeof value === 'string' && value.trim() !== '') {
          previewValue = value;
          break;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          previewValue = String(value);
          break;
        }
      }
    }
    
    if (previewValue) {
        return previewValue.length > 50 ? `${previewValue.substring(0, 47)}...` : previewValue;
    }

    return 'N/A';
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
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/4" /></CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
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

      <Card>
        <CardHeader>
          <CardTitle>Existing Entries</CardTitle>
          <CardDescription>
            Manage data entries for the "{metaFormat.name}" format.
            {isFetchingMetaData && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {(!metaDataEntries || metaDataEntries.length === 0) && !isFetchingMetaData ? (
            <p className="text-muted-foreground text-center py-8">No data entries found for this format yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Entry ID</TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead className="hidden sm:table-cell">Created At</TableHead>
                  <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metaDataEntries?.map((entry) => (
                  <TableRow key={entry.documentId || entry.id}>
                    <TableCell className="font-mono text-xs">{entry.documentId || 'N/A'}</TableCell>
                    <TableCell className="truncate max-w-xs">{getContentPreview(entry)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {entry.createdAt ? format(new Date(entry.createdAt), 'PPp') : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {entry.updatedAt ? format(new Date(entry.updatedAt), 'PPp') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
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
                          {/* <DropdownMenuItem
                            onSelect={() => router.push(`/dashboard/extra-content/render/${metaFormatDocumentId}?action=view&entry=${entry.documentId}`)}
                            disabled={true} // View functionality not yet implemented
                          >
                            <Eye className="mr-2 h-4 w-4" /> View (Soon)
                          </DropdownMenuItem> */}
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
        <DialogContent className="sm:max-w-2xl"> {/* Wider dialog for JSON */}
          <DialogHeader>
            <DialogTitle>Raw JSON Data for Entry: {selectedEntryIdForJson}</DialogTitle>
            <DialogDescription>
              This is the raw JSON data stored for this entry.
            </DialogDescription>
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
    
    

    