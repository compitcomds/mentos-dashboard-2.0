
'use client';

import * as React from 'react';
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { PlusCircle, Pencil, Trash2, Loader2, AlertCircle, Eye, CalendarIcon, MapPin, LayoutGrid, List, Search, X, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription as AlertDescriptionComponent } from "@/components/ui/alert";
import { useGetEvents, useDeleteEvent, type UseGetEventsOptions } from "@/lib/queries/event";
import { useCurrentUser } from '@/lib/queries/user';
import EventCardGrid from './_components/event-card-grid'; 
import type { Event } from '@/types/event';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getStoredPreference, setStoredPreference } from '@/lib/storage';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'card';
type SortFieldEvent = 'title' | 'event_date_time' | 'createdAt' | 'category' | 'event_status';
type SortOrderEvent = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE_EVENT_TABLE = 10;
const DEFAULT_PAGE_SIZE_EVENT_CARD = 9;
const EVENT_CATEGORIES_MOCK = ["Conference", "Workshop", "Webinar", "Meetup", "Party", "Product Launch", "Networking", "Charity", "Sports", "Cultural"];
const EVENT_STATUSES = ["Draft", "Published"];
const DEFAULT_SORT_FIELD: SortFieldEvent = 'event_date_time';
const DEFAULT_SORT_ORDER: SortOrderEvent = 'desc';

const PAGE_SIZE_OPTIONS_EVENT = [
    { label: "9 per page (Card)", value: "9" }, { label: "10 per page (Table)", value: "10" },
    { label: "12 per page", value: "12" }, { label: "20 per page", value: "20" },
    { label: "24 per page", value: "24" }, { label: "50 per page", value: "50" },
];
const SORT_FIELD_OPTIONS_EVENT: { label: string; value: SortFieldEvent }[] = [
  { label: "Title", value: "title" }, { label: "Event Date", value: "event_date_time" },
  { label: "Category", value: "category" }, { label: "Status", value: "event_status" },
  { label: "Created At", value: "createdAt" },
];
const SORT_ORDER_OPTIONS_EVENT: { label: string; value: SortOrderEvent }[] = [
  { label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" },
];

const getPaginationItems = (currentPage: number, totalPages: number, maxPagesToShow: number = 5): (number | string)[] => {
    if (totalPages <= 1) return [];
    const items: (number | string)[] = [];
    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) items.push(i);
        return items;
    }
    items.push(1);
    let startPage = Math.max(2, currentPage - Math.floor((maxPagesToShow - 3) / 2));
    let endPage = Math.min(totalPages - 1, currentPage + Math.floor((maxPagesToShow - 2) / 2));
    if (currentPage - 1 <= Math.floor((maxPagesToShow - 3) / 2)) endPage = maxPagesToShow - 2;
    if (totalPages - currentPage <= Math.floor((maxPagesToShow - 2) / 2)) startPage = totalPages - (maxPagesToShow - 3);
    if (startPage > 2) items.push('...');
    for (let i = startPage; i <= endPage; i++) items.push(i);
    if (endPage < totalPages - 1) items.push('...');
    items.push(totalPages);
    return items;
};

export default function EventPage() {
   const router = useRouter();
   const pathname = usePathname();
   const searchParams = useSearchParams();

   const { data: currentUser, isLoading: isLoadingUser, isError: isUserError } = useCurrentUser();
   const userKey = currentUser?.tenent_id;

   const viewMode = (searchParams.get('view') as ViewMode | null) || getStoredPreference('eventViewMode', 'table');
   const currentPage = parseInt(searchParams.get('page') || '1', 10);
   const pageSize = parseInt(searchParams.get('limit') || String(getStoredPreference('eventPageSize', viewMode === 'table' ? DEFAULT_PAGE_SIZE_EVENT_TABLE : DEFAULT_PAGE_SIZE_EVENT_CARD)), 10);
   const sortField = (searchParams.get('sortBy') as SortFieldEvent | null) || getStoredPreference('eventSortField', DEFAULT_SORT_FIELD);
   const sortOrder = (searchParams.get('order') as SortOrderEvent | null) || getStoredPreference('eventSortOrder', DEFAULT_SORT_ORDER);
   const activeTitleFilter = searchParams.get('search') || null;
   const selectedCategoryFilter = searchParams.get('category') || null;
   const selectedStatusFilter = searchParams.get('status') || null;

   const [localTitleFilter, setLocalTitleFilter] = React.useState(activeTitleFilter || '');
   React.useEffect(() => { setLocalTitleFilter(activeTitleFilter || ''); }, [activeTitleFilter]);

   const eventQueryOptions: UseGetEventsOptions = {
        page: currentPage,
        pageSize,
        sortField,
        sortOrder,
        titleFilter: activeTitleFilter,
        categoryFilter: selectedCategoryFilter,
        statusFilter: selectedStatusFilter,
   };
   const { data: eventDataResponse, isLoading: isLoadingEvents, isError: isEventsError, error: eventsError, refetch, isFetching } = useGetEvents(eventQueryOptions);
   const events = eventDataResponse?.data || [];
   const pagination = eventDataResponse?.meta?.pagination;

   const deleteMutation = useDeleteEvent();
   
   const updateUrl = React.useCallback((newParams: Record<string, string | number | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === null || String(value).trim() === '') current.delete(key);
      else current.set(key, String(value));
    });
    if (newParams.page === 1 || newParams.page === '1') current.delete('page');
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const handleViewModeChange = (newMode: ViewMode) => { updateUrl({ view: newMode }); setStoredPreference('eventViewMode', newMode); };
  const handlePageChange = (newPage: number) => updateUrl({ page: newPage });
  const handlePageSizeChange = (value: string) => { updateUrl({ limit: value, page: null }); setStoredPreference('eventPageSize', Number(value)); };
  const handleSortFieldChange = (value: SortFieldEvent) => { updateUrl({ sortBy: value, page: null }); setStoredPreference('eventSortField', value); };
  const handleSortOrderChange = (value: SortOrderEvent) => { updateUrl({ order: value, page: null }); setStoredPreference('eventSortOrder', value); };
  const handleCategoryFilterChange = (value: string | null) => updateUrl({ category: value, page: null });
  const handleStatusFilterChange = (value: string | null) => updateUrl({ status: value, page: null });
  const applyTitleFilter = () => updateUrl({ search: localTitleFilter.trim() || null, page: null });

   const isLoading = isLoadingUser || isLoadingEvents;
   const isError = isUserError || isEventsError;
   const queryError = isUserError ? new Error("Failed to load user data.") : eventsError;

   const handleDelete = (eventToDelete: Event) => {
       if (!eventToDelete.documentId) {
            toast({ variant: "destructive", title: "Error", description: "Cannot delete event: missing identifier."});
            return;
       }
       deleteMutation.mutate({ documentId: eventToDelete.documentId, numericId: String(eventToDelete.id) }, {
        onSuccess: () => {
            if (events.length === 1 && currentPage > 1) {
                handlePageChange(currentPage - 1);
            }
        }
      });
   };
   
   const currentFullUrl = `${pathname}?${searchParams.toString()}`;

   return (
     <TooltipProvider>
       <div className="flex flex-col space-y-6">
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           <h1 className="text-3xl font-bold tracking-tight">Events</h1>
           <div className="flex items-center space-x-2 self-end sm:self-center">
                <Tooltip>
                    <TooltipTrigger asChild><Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => handleViewModeChange('table')} aria-label="Table View" disabled={isLoading}><List className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent>Table View</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild><Button variant={viewMode === 'card' ? 'default' : 'outline'} size="icon" onClick={() => handleViewModeChange('card')} aria-label="Card View" disabled={isLoading}><LayoutGrid className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent>Card View</TooltipContent>
                </Tooltip>
               <Link href={`/dashboard/event/new?returnUrl=${encodeURIComponent(currentFullUrl)}`}>
                 <Button disabled={isLoadingUser || !userKey}><PlusCircle className="mr-2 h-4 w-4" /> New Event</Button>
               </Link>
           </div>
         </div>

        <Card>
            <CardHeader className="pb-2">
                 <CardTitle className="text-lg">Event Filters & Options</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Filter className="h-4 w-4" />
                                <span>Filter & Sort Controls</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                                <div>
                                    <Label htmlFor="title-filter-input" className="text-xs text-muted-foreground mb-1 block">Filter by Title</Label>
                                    <Input id="title-filter-input" type="search" placeholder="Title..." value={localTitleFilter} onChange={(e) => setLocalTitleFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyTitleFilter()} className="h-8 text-xs" disabled={isLoadingEvents || isFetching}/>
                                </div>
                                <div>
                                    <Label htmlFor="category-filter-select" className="text-xs text-muted-foreground mb-1 block">Filter by Category</Label>
                                    <Select value={selectedCategoryFilter || 'all'} onValueChange={(value) => handleCategoryFilterChange(value === 'all' ? null : value)} disabled={isLoadingEvents || isFetching}>
                                        <SelectTrigger id="category-filter-select" className="h-8 text-xs"><SelectValue placeholder="Category..." /></SelectTrigger>
                                        <SelectContent>{['all', ...EVENT_CATEGORIES_MOCK].map(cat => <SelectItem key={cat} value={cat} className="text-xs capitalize">{cat === 'all' ? 'All Categories' : cat}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="status-filter-select" className="text-xs text-muted-foreground mb-1 block">Filter by Status</Label>
                                    <Select value={selectedStatusFilter || 'all'} onValueChange={(value) => handleStatusFilterChange(value === 'all' ? null : value)} disabled={isLoadingEvents || isFetching}>
                                        <SelectTrigger id="status-filter-select" className="h-8 text-xs"><SelectValue placeholder="Status..." /></SelectTrigger>
                                        <SelectContent>{['all', ...EVENT_STATUSES].map(stat => <SelectItem key={stat} value={stat} className="text-xs capitalize">{stat === 'all' ? 'All Statuses' : stat}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={applyTitleFilter} size="sm" className="h-8 text-xs mt-2 px-3 py-1" disabled={isLoadingEvents || isFetching}>
                                <Search className="h-3.5 w-3.5 mr-1.5" /> Apply Title Filter
                            </Button>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-3 border-t mt-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Sort By</Label>
                                    <Select value={sortField} onValueChange={(value) => handleSortFieldChange(value as SortFieldEvent)} disabled={isLoadingEvents || isFetching}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                                        <SelectContent>{SORT_FIELD_OPTIONS_EVENT.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Order</Label>
                                    <Select value={sortOrder} onValueChange={(value) => handleSortOrderChange(value as SortOrderEvent)} disabled={isLoadingEvents || isFetching}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Order..." /></SelectTrigger>
                                        <SelectContent>{SORT_ORDER_OPTIONS_EVENT.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Items/Page</Label>
                                    <Select value={String(pageSize)} onValueChange={handlePageSizeChange} disabled={isLoadingEvents || isFetching}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Per page" /></SelectTrigger>
                                        <SelectContent>{PAGE_SIZE_OPTIONS_EVENT.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>

        {(isLoading && !eventDataResponse) || (isFetching && !eventDataResponse) ? <EventPageSkeleton viewMode={viewMode} pageSize={pageSize} /> : null}

         {isError && !isFetching && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error Loading Data</AlertTitle>
             <AlertDescriptionComponent>
               Could not fetch user data or events. Please try again. <br />
               <span className="text-xs">{queryError?.message}</span>
             </AlertDescriptionComponent>
             <Button onClick={() => refetch()} variant="secondary" size="sm" className="mt-2" disabled={isFetching}>
               {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
               {isFetching ? 'Retrying...' : 'Retry'}
             </Button>
           </Alert>
         )}

         {!isLoading && !isError && userKey && events.length === 0 && (
           <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
             No events found for your key ({userKey}) matching the current filters. Click "New Event" to create one.
           </div>
         )}

         {!isLoading && !isError && userKey && events.length > 0 && (
            viewMode === 'table' ? (
            <Card>
                <CardHeader>
                    <CardTitle>Manage Events</CardTitle>
                    <CardDescription>
                    View, create, edit, and delete your events.
                    {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Category</TableHead>
                        <TableHead className="hidden sm:table-cell">Date & Time</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {events.map((event) => {
                        const eventDateTime = event.event_date_time ? parseISO(String(event.event_date_time)) : null;
                        const editLink = `/dashboard/event/${event.documentId || event.id}?returnUrl=${encodeURIComponent(currentFullUrl)}`;
                        return (
                        <TableRow key={event.id || event.documentId}>
                            <TableCell className="font-medium">{event.title || 'N/A'}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">{event.category || 'N/A'}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                            {eventDateTime && isValid(eventDateTime) ? (
                                <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                    {format(eventDateTime, "dd MMM yyyy, HH:mm")}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {format(eventDateTime, "PPP p")}
                                </TooltipContent>
                                </Tooltip>
                            ) : (
                                'N/A'
                            )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                                <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1 text-muted-foreground truncate max-w-xs">
                                        <MapPin className="h-4 w-4 flex-shrink-0" />
                                        <span>{event.location || 'N/A'}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {event.location_url ? (
                                            <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                {event.location || 'N/A'} (View Map)
                                            </a>
                                        ) : (
                                            event.location || 'N/A'
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                            <Badge variant={event.event_status === 'Published' ? 'default' : 'secondary'}>
                                {event.event_status || 'N/A'}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                                    <Link href={`/events/${event.documentId || event.id}`} target="_blank">
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Preview Event</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                                    <Link href={editLink}>
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Event</TooltipContent>
                                </Tooltip>
                                <AlertDialog>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={deleteMutation.isPending && deleteMutation.variables?.documentId === event.documentId}
                                        >
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Event</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the event: "{event.title || 'this event'}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDelete(event)}
                                        disabled={deleteMutation.isPending && deleteMutation.variables?.documentId === event.documentId}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {deleteMutation.isPending && deleteMutation.variables?.documentId === event.documentId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            </TableCell>
                        </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
            ) : (
               <EventCardGrid
                 events={events}
                 onDelete={(id: string) => { const eventToDelete = events.find(e => String(e.id) === id || e.documentId === id); if (eventToDelete) handleDelete(eventToDelete);}}
                 deleteMutation={deleteMutation}
                />
            )
         )}
         {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isFetching}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <div className="flex items-center gap-1">
                    {getPaginationItems(currentPage, pagination.pageCount).map((item, index) =>
                        typeof item === 'number' ? (
                            <Button
                                key={`page-${item}-${index}`}
                                variant={currentPage === item ? 'default' : 'outline'}
                                size="icon"
                                className="h-8 w-8 text-xs"
                                onClick={() => handlePageChange(item)}
                                disabled={isFetching}
                            >
                                {item}
                            </Button>
                        ) : (
                            <span key={`ellipsis-${index}`} className="px-1.5 py-1 text-xs flex items-center justify-center h-8 w-8">...</span>
                        )
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pagination.pageCount || isFetching}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
          )}

         {!isLoadingUser && !isUserError && !userKey && (
           <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
             User tenent_id is missing. Cannot display events.
           </div>
         )}
       </div>
     </TooltipProvider>
   );
}

function EventPageSkeleton({ viewMode, pageSize }: { viewMode: ViewMode, pageSize: number }) {
    const skeletonItems = Array(pageSize).fill(0);
    return (
      <div className="space-y-4">
        <Card>
            <CardHeader className="pb-0"><Skeleton className="h-6 w-1/3" /></CardHeader>
            <CardContent className="p-4">
                 <Skeleton className="h-10 w-full rounded-md" /> {/* Accordion Trigger Skeleton */}
            </CardContent>
        </Card>
        {viewMode === 'table' ? (
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                    <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead>
                    <TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {skeletonItems.map((_, i) => (
                    <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4/5" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {skeletonItems.map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-3/4" /> {/* Title */}
                            <Skeleton className="h-4 w-1/2 mt-1" /> {/* Category */}
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" /> {/* Date */}
                            <Skeleton className="h-4 w-2/3" /> {/* Location */}
                            <Skeleton className="h-4 w-1/4" /> {/* Status */}
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                        </CardFooter>
                    </Card>
                 ))}
            </div>
        )}
         <div className="flex items-center justify-between pt-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-8 w-20" /></div>
      </div>
    );
}
    
