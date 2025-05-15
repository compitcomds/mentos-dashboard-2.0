
'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { useGetQueryForms } from '@/lib/queries/query-form';
import type { QueryForm } from '@/types/query-form';
import { AlertCircle, Loader2, LayoutGrid, List, Eye } from "lucide-react";
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type ViewMode = 'card' | 'table';

// Component to display a single query form in a card
const QueryFormCard: React.FC<{ queryForm: QueryForm; onViewDetails: (queryForm: QueryForm) => void }> = ({ queryForm, onViewDetails }) => {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate">{queryForm.name}</CardTitle>
        <CardDescription className="truncate">{queryForm.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
          {queryForm.description || "No description provided."}
        </p>
        {queryForm.createdAt && (
            <p className="text-xs text-muted-foreground">
                Submitted: {format(new Date(queryForm.createdAt), "PPP")}
            </p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => onViewDetails(queryForm)}>
          <Eye className="mr-2 h-4 w-4" /> View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

// Component to display query forms in a table
const QueryFormTable: React.FC<{ queryForms: QueryForm[]; onViewDetails: (queryForm: QueryForm) => void }> = ({ queryForms, onViewDetails }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="hidden md:table-cell">Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queryForms.map((form) => (
          <TableRow key={form.id}>
            <TableCell className="font-medium">{form.name}</TableCell>
            <TableCell>{form.email}</TableCell>
            <TableCell className="hidden md:table-cell text-muted-foreground">
              {form.createdAt ? (
                <Tooltip>
                  <TooltipTrigger>
                    {format(new Date(form.createdAt), "dd MMM yyyy")}
                  </TooltipTrigger>
                  <TooltipContent>
                    {format(new Date(form.createdAt), "PPP p")}
                  </TooltipContent>
                </Tooltip>
              ) : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onViewDetails(form)} className="h-8 w-8">
                <Eye className="h-4 w-4" />
                <span className="sr-only">View Details</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


export default function QueryFormsPage() {
  const { data: queryForms, isLoading, isError, error, refetch, isFetching } = useGetQueryForms();
  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [selectedQueryForm, setSelectedQueryForm] = React.useState<QueryForm | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

  const handleViewDetails = (queryForm: QueryForm) => {
    setSelectedQueryForm(queryForm);
    setIsDetailDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Query Forms</h1>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('card')}
                  aria-label="Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Card View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('table')}
                  aria-label="Table View"
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {(isLoading || isFetching) && (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader>
                    <CardContent><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-1/4 mt-2" /></CardContent>
                    <CardFooter><Skeleton className="h-8 w-24" /></CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Skeleton className="h-5 w-1/4" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-1/4" /></TableHead>
                      <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/4" /></TableHead>
                      <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              Could not fetch query forms. {error?.message}
              <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && queryForms && queryForms.length === 0 && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            No query forms found for your key.
          </div>
        )}

        {!isLoading && !isError && queryForms && queryForms.length > 0 && (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {queryForms.map((form) => (
                  <QueryFormCard key={form.id} queryForm={form} onViewDetails={handleViewDetails} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                    <QueryFormTable queryForms={queryForms} onViewDetails={handleViewDetails} />
                </CardContent>
              </Card>
            )}
          </>
        )}
         {!isLoading && queryForms === undefined && !isError && ( // Handle case where queryForms is undefined but no error
            <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
                User key may be missing or an issue occurred fetching data. Try refreshing.
            </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedQueryForm && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Query Details: {selectedQueryForm.name}</DialogTitle>
              <DialogDescription>From: {selectedQueryForm.email}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
                <div className="py-4 space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Description:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedQueryForm.description || "N/A"}
                        </p>
                    </div>
                    {selectedQueryForm.createdAt && (
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Submitted At:</h4>
                            <p className="text-sm text-muted-foreground">
                                {format(new Date(selectedQueryForm.createdAt), "PPP p")}
                            </p>
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-sm mb-1">User Key:</h4>
                        <Badge variant="secondary">{selectedQueryForm.key}</Badge>
                    </div>
                    {selectedQueryForm.other_meta && (
                        <div>
                        <h4 className="font-semibold text-sm mb-1">Other Metadata:</h4>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48">
                            {JSON.stringify(selectedQueryForm.other_meta, null, 2)}
                        </pre>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}
