
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
import type { Media } from '@/types/media';
import { AlertCircle, Loader2, LayoutGrid, List, Eye, FileText, Image as ImageIconLucide, Video, Search, X, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ViewMode = 'card' | 'table';
const ITEMS_PER_PAGE = 9; // For card view, table uses its own pagination
const QUERY_FORM_TYPES = ["contact", "career", "event", "membership"];

const MediaPreview: React.FC<{ mediaItem: Media }> = ({ mediaItem }) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";
    const getFullUrl = (url?: string | null) => {
      if (!url) return null;
      return url.startsWith('http') ? url : `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };
  
    const url = getFullUrl(mediaItem.url);
    const thumbUrl = getFullUrl(mediaItem.formats?.thumbnail?.url) || url;
  
    if (!url) return <div className="text-xs text-muted-foreground">No URL</div>;
  
    if (mediaItem.mime?.startsWith('image/')) {
      return <img src={thumbUrl!} alt={mediaItem.alternativeText || mediaItem.name || 'media'} className="w-12 h-12 object-cover rounded border" />;
    }
    if (mediaItem.mime?.startsWith('video/')) {
      return <Video className="w-10 h-10 text-purple-500" />;
    }
    if (mediaItem.mime === 'application/pdf') {
      return <FileText className="w-10 h-10 text-red-500" />;
    }
    return <FileText className="w-10 h-10 text-gray-500" />;
};


// Component to display a single query form in a card
const QueryFormCard: React.FC<{ queryForm: QueryForm; onViewDetails: (queryForm: QueryForm) => void }> = ({ queryForm, onViewDetails }) => {
  return (
    <Card className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg truncate" title={queryForm.name || 'N/A'}>{queryForm.name || 'N/A'}</CardTitle>
        <CardDescription className="text-xs truncate" title={queryForm.email || 'N/A'}>{queryForm.email || 'N/A'}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        <p className="text-muted-foreground line-clamp-2 mb-1">
          {queryForm.description || "No description."}
        </p>
        {queryForm.type && <Badge variant="outline" className="mr-1 capitalize">{queryForm.type}</Badge>}
        {queryForm.group_id && <Badge variant="secondary">Group: {queryForm.group_id}</Badge>}
        {queryForm.createdAt && (
            <p className="text-xs text-muted-foreground pt-1">
                Submitted: {format(parseISO(String(queryForm.createdAt)), "PPP")}
            </p>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3">
        <Button variant="outline" size="sm" onClick={() => onViewDetails(queryForm)} className="w-full">
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
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden md:table-cell">Group ID</TableHead>
          <TableHead className="hidden lg:table-cell">Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {queryForms.map((form) => (
          <TableRow key={form.documentId || form.id}>
            <TableCell className="font-medium">{form.name || 'N/A'}</TableCell>
            <TableCell>{form.email || 'N/A'}</TableCell>
            <TableCell className="hidden sm:table-cell capitalize">{form.type || '-'}</TableCell>
            <TableCell className="hidden md:table-cell">{form.group_id || '-'}</TableCell>
            <TableCell className="hidden lg:table-cell text-muted-foreground">
              {form.createdAt ? (
                <Tooltip>
                  <TooltipTrigger>
                    {format(parseISO(String(form.createdAt)), "dd MMM yyyy")}
                  </TooltipTrigger>
                  <TooltipContent>
                    {format(parseISO(String(form.createdAt)), "PPP p")}
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
  const [viewMode, setViewMode] = React.useState<ViewMode>('card');
  const [selectedQueryForm, setSelectedQueryForm] = React.useState<QueryForm | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

  const [typeFilter, setTypeFilter] = React.useState<string | null>(null);
  const [groupIdFilter, setGroupIdFilter] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState(''); // For group_id text search
  const [currentPage, setCurrentPage] = React.useState(1);

  const { data: queryFormsData, isLoading, isError, error, refetch, isFetching } = useGetQueryForms({
    type: typeFilter,
    group_id: searchTerm, // Use searchTerm for group_id filter
    page: currentPage,
    pageSize: ITEMS_PER_PAGE,
  });

  const queryForms = queryFormsData?.data || [];
  const pagination = queryFormsData?.meta?.pagination;

  const handleViewDetails = (queryForm: QueryForm) => {
    setSelectedQueryForm(queryForm);
    setIsDetailDialogOpen(true);
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value === 'all' ? null : value);
    setCurrentPage(1); // Reset to first page on filter change
  };
  
  const handleGroupIdSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setGroupIdFilter(event.target.value);
  };

  const applyGroupIdFilter = () => {
    setSearchTerm(groupIdFilter);
    setCurrentPage(1); // Reset to first page
  };

  const clearGroupIdFilter = () => {
    setGroupIdFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };


  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Query Forms</h1>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild><Button variant={viewMode === 'card' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('card')} aria-label="Card View"><LayoutGrid className="h-4 w-4" /></Button></TooltipTrigger>
              <TooltipContent>Card View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('table')} aria-label="Table View"><List className="h-4 w-4" /></Button></TooltipTrigger>
              <TooltipContent>Table View</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5"/>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-4 pt-2">
            <div className="w-full md:w-auto md:min-w-[200px]">
              <Select value={typeFilter || 'all'} onValueChange={handleTypeFilterChange}>
                <SelectTrigger><SelectValue placeholder="Filter by type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {QUERY_FORM_TYPES.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full md:flex-grow">
              <Input
                type="search"
                placeholder="Search by Group ID..."
                value={groupIdFilter}
                onChange={handleGroupIdSearchChange}
                onKeyDown={(e) => e.key === 'Enter' && applyGroupIdFilter()}
                className="pr-16"
              />
              {groupIdFilter && (
                <Button variant="ghost" size="icon" className="absolute right-9 top-1/2 h-7 w-7 -translate-y-1/2" onClick={clearGroupIdFilter}><X className="h-4 w-4" /><span className="sr-only">Clear</span></Button>
              )}
              <Button size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={applyGroupIdFilter}><Search className="h-4 w-4" /><span className="sr-only">Search</span></Button>
            </div>
          </CardContent>
        </Card>


        {(isLoading || isFetching) && !queryFormsData && <QueryFormsPageSkeleton viewMode={viewMode} />}

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

        {!isLoading && !isError && queryForms.length === 0 && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            No query forms found matching your criteria.
          </div>
        )}

        {!isLoading && !isError && queryForms.length > 0 && (
          <>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {queryForms.map((form) => (
                  <QueryFormCard key={form.documentId || form.id} queryForm={form} onViewDetails={handleViewDetails} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0"><QueryFormTable queryForms={queryForms} onViewDetails={handleViewDetails} /></CardContent>
              </Card>
            )}

            {pagination && pagination.pageCount > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isFetching}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pageCount} (Total: {pagination.total})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.pageCount, prev + 1))}
                  disabled={currentPage === pagination.pageCount || isFetching}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedQueryForm && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Query Details: {selectedQueryForm.name || 'N/A'}</DialogTitle>
              <DialogDescriptionComponent>From: {selectedQueryForm.email || 'N/A'}</DialogDescriptionComponent>
            </DialogHeader>
            <ScrollArea className="flex-1 my-2 -mr-4 pr-4">
                <div className="py-4 space-y-4 text-sm">
                    <DetailItem label="Name" value={selectedQueryForm.name} />
                    <DetailItem label="Email" value={selectedQueryForm.email} />
                    <DetailItem label="Description" value={selectedQueryForm.description} preWrap />
                    <DetailItem label="Type" value={selectedQueryForm.type} badge capitalize />
                    <DetailItem label="Group ID" value={selectedQueryForm.group_id} badge="secondary" />
                    <DetailItem label="Submitted At" value={selectedQueryForm.createdAt ? format(parseISO(String(selectedQueryForm.createdAt)), "PPP p") : undefined} />
                    <DetailItem label="User Key (Tenent ID)" value={selectedQueryForm.tenent_id} badge="outline"/>
                    
                    {selectedQueryForm.media && selectedQueryForm.media.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm mb-2">Attached Media ({selectedQueryForm.media_size_Kb ? `${(selectedQueryForm.media_size_Kb / 1024).toFixed(2)} MB` : ''}):</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {selectedQueryForm.media.map(mediaItem => (
                                    <a key={mediaItem.id} href={mediaItem.url} target="_blank" rel="noopener noreferrer" className="block border rounded-md p-2 hover:shadow-md transition-shadow text-center space-y-1">
                                        <MediaPreview mediaItem={mediaItem} />
                                        <p className="text-xs truncate" title={mediaItem.name}>{mediaItem.name}</p>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedQueryForm.other_meta && Object.keys(selectedQueryForm.other_meta).length > 0 && (
                        <div>
                        <h4 className="font-semibold text-sm mb-1">Other Metadata:</h4>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-60">
                            {JSON.stringify(selectedQueryForm.other_meta, null, 2)}
                        </pre>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter className="mt-auto pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}

const DetailItem: React.FC<{ label: string; value?: string | number | null; preWrap?: boolean; badge?: true | "outline" | "secondary"; capitalize?: boolean }> = ({ label, value, preWrap = false, badge, capitalize }) => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    return (
        <div className="grid grid-cols-3 gap-2 items-start">
            <strong className="col-span-1 text-muted-foreground">{label}:</strong>
            <div className={`col-span-2 ${preWrap ? 'whitespace-pre-wrap' : ''}`}>
                {badge ? <Badge variant={badge === true ? 'default' : badge} className={capitalize ? 'capitalize' : ''}>{String(value)}</Badge> : String(value)}
            </div>
        </div>
    );
};

function QueryFormsPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
    return (
      <>
        <Card><CardHeader className="pb-2"><Skeleton className="h-6 w-1/4" /></CardHeader><CardContent className="flex flex-col md:flex-row items-center gap-4 pt-2"><Skeleton className="h-10 w-full md:w-1/3" /><Skeleton className="h-10 w-full md:flex-grow" /></CardContent></Card>
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-1/4 mt-2" /></CardContent><CardFooter><Skeleton className="h-8 w-24" /></CardFooter></Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>{[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}</TableRow></TableHeader>
              <TableBody>{[...Array(5)].map((_, i) => (<TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>))}</TableBody>
            </Table>
          </div>
          </CardContent></Card>
        )}
         <div className="flex items-center justify-between pt-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-8 w-20" /></div>
      </>
    );
}
