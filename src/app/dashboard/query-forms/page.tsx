
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
import { Alert, AlertDescription as AlertDescriptionComponent, AlertTitle } from "@/components/ui/alert"; // Aliased AlertDescription
import { Skeleton } from "@/components/ui/skeleton";
import { useGetQueryForms, type UseGetQueryFormsOptions } from '@/lib/queries/query-form';
import type { QueryForm } from '@/types/query-form';
import type { Media } from '@/types/media';
import { AlertCircle, Loader2, LayoutGrid, List, Eye, FileText, Image as ImageIconLucide, Video, Search, X, ChevronLeft, ChevronRight, Filter, Paperclip, Code2 } from "lucide-react";
import { format, parseISO, isValid } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredPreference, setStoredPreference } from '@/lib/storage';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';

type ViewModeQuery = 'card' | 'table';
type SortFieldQuery = 'name' | 'email' | 'type' | 'group_id' | 'createdAt';
type SortOrderQuery = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE_QUERY_TABLE = 10;
const DEFAULT_PAGE_SIZE_QUERY_CARD = 9;
const QUERY_FORM_TYPES_FILTER = ["contact", "career", "event", "membership"]; 

const PAGE_SIZE_OPTIONS_QUERY = [
    { label: "9 per page (Card)", value: "9" }, { label: "10 per page (Table)", value: "10" },
    { label: "12 per page", value: "12" }, { label: "20 per page", value: "20" },
    { label: "24 per page", value: "24" }, { label: "50 per page", value: "50" },
];
const SORT_FIELD_OPTIONS_QUERY: { label: string; value: SortFieldQuery }[] = [
  { label: "Name", value: "name" }, { label: "Email", value: "email" },
  { label: "Type", value: "type" }, { label: "Group ID", value: "group_id" },
  { label: "Submitted At", value: "createdAt" },
];
const SORT_ORDER_OPTIONS_QUERY: { label: string; value: SortOrderQuery }[] = [
  { label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" },
];

const formatBytes = (bytes?: number | null, decimals = 2) => {
    if (bytes === null || bytes === undefined || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const MediaPreview: React.FC<{ mediaItem: Media }> = ({ mediaItem }) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";
    const getFullUrl = (url?: string | null) => {
      if (!url) return null;
      return url.startsWith('http') ? url : `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    };
  
    const url = getFullUrl(mediaItem.url);
    const thumbUrl = getFullUrl(mediaItem.formats?.thumbnail?.url) || url;
  
    if (!url) return <div className="text-xs text-muted-foreground p-1 flex items-center justify-center bg-muted rounded h-16 w-16"><FileText className="w-6 h-6" /></div>;
  
    if (mediaItem.mime?.startsWith('image/')) {
      return <img src={thumbUrl!} alt={mediaItem.alternativeText || mediaItem.name || 'media'} className="w-16 h-16 object-cover rounded border" />;
    }
    if (mediaItem.mime?.startsWith('video/')) {
      return <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border"><Video className="w-8 h-8 text-purple-500" /></div>;
    }
    if (mediaItem.mime === 'application/pdf') {
      return <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border"><FileText className="w-8 h-8 text-red-500" /></div>;
    }
    return <div className="w-16 h-16 flex items-center justify-center bg-muted rounded border"><FileText className="w-8 h-8 text-gray-500" /></div>;
};

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
  const [viewMode, setViewMode] = React.useState<ViewModeQuery>(() => getStoredPreference('queryFormViewMode', 'card'));
  const [selectedQueryForm, setSelectedQueryForm] = React.useState<QueryForm | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(() =>
    getStoredPreference('queryFormPageSize', viewMode === 'table' ? DEFAULT_PAGE_SIZE_QUERY_TABLE : DEFAULT_PAGE_SIZE_QUERY_CARD)
  );
  const [sortField, setSortField] = React.useState<SortFieldQuery>(() => getStoredPreference('queryFormSortField', 'createdAt'));
  const [sortOrder, setSortOrder] = React.useState<SortOrderQuery>(() => getStoredPreference('queryFormSortOrder', 'desc'));

  const [selectedTypeFilter, setSelectedTypeFilter] = React.useState<string | null>(() => getStoredPreference('queryFormTypeFilter', null));
  const [localGroupIdFilter, setLocalGroupIdFilter] = React.useState('');
  const [activeGroupIdFilter, setActiveGroupIdFilter] = React.useState<string | null>(null);

  const queryFormOptions: UseGetQueryFormsOptions = {
    page: currentPage,
    pageSize,
    sortField,
    sortOrder,
    type: selectedTypeFilter,
    group_id: activeGroupIdFilter,
  };
  const { data: queryFormsData, isLoading, isError, error, refetch, isFetching } = useGetQueryForms(queryFormOptions);

  const queryForms = queryFormsData?.data || [];
  const pagination = queryFormsData?.meta?.pagination;

  React.useEffect(() => { setStoredPreference('queryFormViewMode', viewMode); }, [viewMode]);
  React.useEffect(() => { setStoredPreference('queryFormPageSize', pageSize); setCurrentPage(1); }, [pageSize]);
  React.useEffect(() => { setStoredPreference('queryFormSortField', sortField); setCurrentPage(1); }, [sortField]);
  React.useEffect(() => { setStoredPreference('queryFormSortOrder', sortOrder); setCurrentPage(1); }, [sortOrder]);
  React.useEffect(() => { setStoredPreference('queryFormTypeFilter', selectedTypeFilter); setCurrentPage(1); }, [selectedTypeFilter]);
  React.useEffect(() => { setCurrentPage(1); }, [activeGroupIdFilter]);


  const handleViewDetails = (queryForm: QueryForm) => {
    setSelectedQueryForm(queryForm);
    setIsDetailDialogOpen(true);
  };
  
  const applyGroupIdFilter = () => {
    setActiveGroupIdFilter(localGroupIdFilter.trim() === '' ? null : localGroupIdFilter.trim());
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Query Forms</h1>
          <div className="flex items-center space-x-2 self-end sm:self-center">
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
            <CardTitle className="text-lg">Filter Query Forms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div>
                    <Label htmlFor="type-filter-select" className="text-xs text-muted-foreground">Filter by Type</Label>
                    <Select value={selectedTypeFilter || 'all'} onValueChange={(value) => setSelectedTypeFilter(value === 'all' ? null : value)} disabled={isLoading || isFetching}>
                        <SelectTrigger id="type-filter-select" className="h-9 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
                        <SelectContent>{['all', ...QUERY_FORM_TYPES_FILTER].map(type => <SelectItem key={type} value={type} className="text-xs capitalize">{type === 'all' ? 'All Types' : type}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="relative md:col-span-1">
                    <Label htmlFor="group-id-filter-input" className="text-xs text-muted-foreground">Filter by Group ID</Label>
                    <Input id="group-id-filter-input" type="search" placeholder="Group ID..." value={localGroupIdFilter} onChange={(e) => setLocalGroupIdFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyGroupIdFilter()} className="h-9 text-xs" disabled={isLoading || isFetching}/>
                </div>
                <Button onClick={applyGroupIdFilter} className="w-full md:w-auto h-9 text-xs" disabled={isLoading || isFetching}>
                    <Search className="h-3.5 w-3.5 mr-1.5" /> Apply Group ID Filter
                </Button>
            </div>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced-sort-pagination">
                    <AccordionTrigger className="text-sm font-medium">
                        <div className="flex items-center gap-2"><Filter className="h-4 w-4" />Advanced Sorting & Pagination</div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                                <Label className="text-xs text-muted-foreground">Sort By</Label>
                                <Select value={sortField} onValueChange={(value) => setSortField(value as SortFieldQuery)} disabled={isLoading || isFetching}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                                    <SelectContent>{SORT_FIELD_OPTIONS_QUERY.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Order</Label>
                                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrderQuery)} disabled={isLoading || isFetching}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Order..." /></SelectTrigger>
                                    <SelectContent>{SORT_ORDER_OPTIONS_QUERY.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Items/Page</Label>
                                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))} disabled={isLoading || isFetching}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Items per page" /></SelectTrigger>
                                    <SelectContent>{PAGE_SIZE_OPTIONS_QUERY.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {(isLoading && !queryFormsData) || (isFetching && !queryFormsData) ? <QueryFormsPageSkeleton viewMode={viewMode} pageSize={pageSize} /> : null}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescriptionComponent>
              Could not fetch query forms. {error?.message}
              <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Retry
              </Button>
            </AlertDescriptionComponent>
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
                <CardHeader>
                    <CardTitle>Submitted Queries</CardTitle>
                    <CardDescription>
                        Review submitted forms.
                        {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
                    </CardDescription>
                </CardHeader>
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
                  Page {pagination.page} of {pagination.pageCount} (Total: {pagination.total} forms)
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
              <DialogDescription>From: {selectedQueryForm.email || 'N/A'}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 my-2 -mr-4 pr-4">
                <div className="py-4 space-y-3 text-sm">
                    <DetailItem label="Name" value={selectedQueryForm.name} />
                    <DetailItem label="Email" value={selectedQueryForm.email} />
                    <DetailItem label="Description" value={selectedQueryForm.description} preWrap />
                    <DetailItem label="Type" value={selectedQueryForm.type} badge capitalize />
                    <DetailItem label="Group ID" value={selectedQueryForm.group_id} badge="secondary" />
                    <DetailItem label="Submitted At" value={selectedQueryForm.createdAt ? format(parseISO(String(selectedQueryForm.createdAt)), "PPP p") : undefined} />
                    <DetailItem label="User Key (Tenent ID)" value={selectedQueryForm.tenent_id} badge="outline"/>
                    
                    {selectedQueryForm.media && selectedQueryForm.media.length > 0 && (
                        <>
                            <Separator className="my-3"/>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 text-muted-foreground"/>
                                    Attached Media
                                    {selectedQueryForm.media_size_Kb ? (
                                        <Badge variant="outline" className="ml-2 text-xs font-normal">
                                            Total Size: {formatBytes(selectedQueryForm.media_size_Kb)}
                                        </Badge>
                                    ) : null}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {selectedQueryForm.media.map(mediaItem => (
                                        <a 
                                          key={mediaItem.id} 
                                          href={mediaItem.url} // Assume mediaItem.url is the full URL
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="block border rounded-lg p-2 hover:shadow-lg transition-shadow text-center group"
                                        >
                                            <MediaPreview mediaItem={mediaItem} />
                                            <p className="text-xs truncate mt-1.5 group-hover:text-primary" title={mediaItem.name}>{mediaItem.name}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {selectedQueryForm.other_meta && Object.keys(selectedQueryForm.other_meta).length > 0 && (
                        <>
                            <Separator className="my-3"/>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Code2 className="h-4 w-4 text-muted-foreground"/>
                                    Other Metadata (JSON)
                                </h4>
                                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-60 border">
                                    <code>
                                        {(() => {
                                            try {
                                                const jsonData = typeof selectedQueryForm.other_meta === 'string'
                                                    ? JSON.parse(selectedQueryForm.other_meta)
                                                    : selectedQueryForm.other_meta;
                                                return JSON.stringify(jsonData, null, 2);
                                            } catch (e) {
                                                return String(selectedQueryForm.other_meta); // Fallback if parsing/stringifying fails
                                            }
                                        })()}
                                    </code>
                                </pre>
                            </div>
                        </>
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
        <div className="grid grid-cols-3 gap-2 items-start py-1 border-b border-border/60 last:border-b-0">
            <strong className="col-span-1 text-muted-foreground font-medium">{label}:</strong>
            <div className={`col-span-2 ${preWrap ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                {badge ? <Badge variant={badge === true ? 'default' : badge} className={capitalize ? 'capitalize' : ''}>{String(value)}</Badge> : String(value)}
            </div>
        </div>
    );
};

function QueryFormsPageSkeleton({ viewMode, pageSize }: { viewMode: ViewModeQuery, pageSize: number }) {
    const skeletonItemsCount = pageSize;
    return (
      <>
        <Card>
            <CardHeader className="pb-2"><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <Skeleton className="h-9 w-full"/>
                    <Skeleton className="h-9 w-full"/>
                    <Skeleton className="h-9 w-full"/>
                </div>
                 <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
        </Card>
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(skeletonItemsCount)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-1/4 mt-2" /></CardContent><CardFooter><Skeleton className="h-8 w-24" /></CardFooter></Card>
            ))}
          </div>
        ) : (
          <Card><CardHeader><Skeleton className="h-6 w-1/3"/><Skeleton className="h-4 w-1/2 mt-1"/></CardHeader><CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow>{[...Array(6)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}</TableRow></TableHeader>
              <TableBody>{[...Array(skeletonItemsCount)].map((_, i) => (<TableRow key={i}>{[...Array(6)].map((_,j)=><TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>))}</TableBody>
            </Table>
          </div>
          </CardContent></Card>
        )}
         <div className="flex items-center justify-between pt-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-8 w-20" /></div>
      </>
    );
}
