
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'; // Added CardFooter
import MediaTable from './_components/media-table';
import UploadButton from './_components/upload-button';
import { useFetchMedia } from '@/lib/queries/media';
import type { FetchMediaFilesParams } from '@/lib/services/media';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, LayoutGrid, List, HardDrive, Search, X, Filter, ChevronLeft, ChevronRight, Tag as TagIcon } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/queries/user';
import MediaCardGrid from './_components/media-card-grid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useGetUserResource } from '@/lib/queries/user-resource';
import { getStoredPreference, setStoredPreference } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CombinedMediaData } from '@/types/media';
import { Label } from '@/components/ui/label';
import { TagFilterControl } from '@/components/ui/tag-filter-control';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PREDEFINED_TAGS_FOR_WEB_MEDIA } from '@/types/media'; // Import from types/media

type ViewMode = 'table' | 'card';
type SortField = 'name' | 'category' | 'createdAt' | 'updatedAt' | 'publishedAt';
type SortOrder = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE_TABLE = 10;
const DEFAULT_PAGE_SIZE_CARD = 12;
const USER_DEFINED_TAGS_STORAGE_KEY = 'webMediaUserDefinedTags';
const SELECTED_TAGS_STORAGE_KEY = 'webMediaSelectedFilterTags';

// PREDEFINED_TAGS_FOR_WEB_MEDIA is now imported from types/media

const PAGE_SIZE_OPTIONS = [
    { label: "10 per page", value: "10" }, { label: "12 per page", value: "12" },
    { label: "20 per page", value: "20" }, { label: "24 per page", value: "24" },
    { label: "50 per page", value: "50" }, { label: "100 per page", value: "100" },
];
const SORT_FIELD_OPTIONS: { label: string; value: SortField }[] = [
  { label: "Name", value: "name" }, { label: "Category", value: "category" },
  { label: "Upload Date", value: "createdAt" }, { label: "Last Updated", value: "updatedAt" },
  { label: "Published Date", value: "publishedAt" },
];
const SORT_ORDER_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" },
];

const formatBytesForDisplay = (bytes?: number | null, decimals = 2): string => {
    if (bytes === null || bytes === undefined || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeValue = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return sizeValue + ' ' + (sizes[i] || 'Bytes');
};

export default function WebMediaPage() {
    const { data: currentUser, isLoading: isLoadingUser, isError: isUserError } = useCurrentUser();
    const userKey = currentUser?.tenent_id;

    const [viewMode, setViewMode] = React.useState<ViewMode>(() => getStoredPreference('webMediaViewMode', 'table'));
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(() =>
        getStoredPreference('webMediaPageSize', viewMode === 'table' ? DEFAULT_PAGE_SIZE_TABLE : DEFAULT_PAGE_SIZE_CARD)
    );
    const [sortField, setSortField] = React.useState<SortField>(() => getStoredPreference('webMediaSortField', 'createdAt'));
    const [sortOrder, setSortOrder] = React.useState<SortOrder>(() => getStoredPreference('webMediaSortOrder', 'desc'));
    
    const [localNameFilter, setLocalNameFilter] = React.useState('');
    const [activeNameFilter, setActiveNameFilter] = React.useState('');
    const [localCategoryFilter, setLocalCategoryFilter] = React.useState('');
    const [activeCategoryFilter, setActiveCategoryFilter] = React.useState('');


    const [userDefinedTags, setUserDefinedTags] = React.useState<string[]>(() => getStoredPreference(USER_DEFINED_TAGS_STORAGE_KEY, []));
    const [selectedFilterTags, setSelectedFilterTags] = React.useState<string[]>(() => getStoredPreference(SELECTED_TAGS_STORAGE_KEY, []));
    const allAvailableTagsForFilter = React.useMemo(() => {
      return Array.from(new Set([...PREDEFINED_TAGS_FOR_WEB_MEDIA, ...userDefinedTags])).sort();
    }, [userDefinedTags]);


    const mediaQueryOptions: Omit<FetchMediaFilesParams, 'userTenentId'> = {
        page: currentPage,
        pageSize,
        sortField,
        sortOrder,
        categoryFilter: activeCategoryFilter || null,
        nameFilter: activeNameFilter || null,
        tagsFilter: selectedFilterTags.length > 0 ? selectedFilterTags : null,
    };
    const { data: mediaDataResponse, isLoading: isLoadingMedia, isError: isMediaError, error: mediaError, refetch, isFetching } = useFetchMedia(mediaQueryOptions);
    const mediaItems = mediaDataResponse?.data || [];
    const pagination = mediaDataResponse?.meta?.pagination;

    const { data: userResource, isLoading: isLoadingUserResource } = useGetUserResource();

    React.useEffect(() => { setStoredPreference('webMediaViewMode', viewMode); }, [viewMode]);
    React.useEffect(() => { setStoredPreference('webMediaPageSize', pageSize); setCurrentPage(1); }, [pageSize]);
    React.useEffect(() => { setStoredPreference('webMediaSortField', sortField); setCurrentPage(1); }, [sortField]);
    React.useEffect(() => { setStoredPreference('webMediaSortOrder', sortOrder); setCurrentPage(1); }, [sortOrder]);
    React.useEffect(() => { setCurrentPage(1); }, [activeCategoryFilter, activeNameFilter, selectedFilterTags]);

    React.useEffect(() => {
        setStoredPreference(USER_DEFINED_TAGS_STORAGE_KEY, userDefinedTags);
    }, [userDefinedTags]);

    React.useEffect(() => {
        setStoredPreference(SELECTED_TAGS_STORAGE_KEY, selectedFilterTags);
    }, [selectedFilterTags]);

    const handleUploadSuccess = () => {
        refetch();
    };

    const applyTextFilters = () => {
        setActiveNameFilter(localNameFilter);
        setActiveCategoryFilter(localCategoryFilter);
    };

    const handleAddNewUserTag = (newTag: string) => {
        if (!userDefinedTags.includes(newTag)) {
            setUserDefinedTags(prev => [...prev, newTag].sort());
        }
    };

    const handleTagSelectionChange = (newSelectedTags: string[]) => {
        setSelectedFilterTags(newSelectedTags);
    };

    const isLoading = isLoadingUser || isLoadingMedia || isLoadingUserResource;
    const isError = isUserError || isMediaError;
    const error = isUserError ? new Error("Failed to load user data.") : mediaError;

    const totalStorageKB = userResource?.storage ?? 0;
    const usedStorageKB = userResource?.used_storage ?? 0;
    const storageProgress = totalStorageKB > 0 ? (usedStorageKB / totalStorageKB) * 100 : 0;

    return (
        <TooltipProvider>
            <div className="flex flex-col space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Web Media</h1>
                    <div className="flex items-center space-x-2">
                         <Tooltip>
                            <TooltipTrigger asChild><Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('table')} aria-label="Table View" disabled={isLoading}><List className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent>Table View</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild><Button variant={viewMode === 'card' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('card')} aria-label="Card View" disabled={isLoading}><LayoutGrid className="h-4 w-4" /></Button></TooltipTrigger>
                            <TooltipContent>Card View</TooltipContent>
                        </Tooltip>
                        <UploadButton onUploadSuccess={handleUploadSuccess} disabled={isLoadingUser || !userKey} />
                    </div>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Filters & Display Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2">
                        {/* Visible Filters: Name and Category */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            <div className="relative md:col-span-1">
                                <Label htmlFor="name-filter-input" className="text-xs text-muted-foreground">Filter by Name</Label>
                                <Input id="name-filter-input" type="search" placeholder="Media name..." value={localNameFilter} onChange={(e) => setLocalNameFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyTextFilters()} className="h-9 text-xs" disabled={isLoadingMedia || isFetching}/>
                            </div>
                            <div className="relative md:col-span-1">
                                <Label htmlFor="category-filter-input" className="text-xs text-muted-foreground">Filter by Category</Label>
                                <Input id="category-filter-input" type="search" placeholder="Category..." value={localCategoryFilter} onChange={(e) => setLocalCategoryFilter(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyTextFilters()} className="h-9 text-xs" disabled={isLoadingMedia || isFetching} />
                            </div>
                            <Button onClick={applyTextFilters} className="w-full md:w-auto h-9 text-xs" disabled={isLoadingMedia || isFetching}>
                                <Search className="h-3.5 w-3.5 mr-1.5" /> Apply Text Filters
                            </Button>
                        </div>

                        {/* Accordion for Advanced Filters & Sorting */}
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="advanced-filters">
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Filter className="h-4 w-4" />
                                        <span>Advanced Filters & Sorting</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-4">
                                    {/* Sort Controls */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Sort By</Label>
                                            <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)} disabled={isLoadingMedia || isFetching}>
                                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                                                <SelectContent>{SORT_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Order</Label>
                                            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)} disabled={isLoadingMedia || isFetching}>
                                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Order..." /></SelectTrigger>
                                                <SelectContent>{SORT_ORDER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Items/Page</Label>
                                            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))} disabled={isLoadingMedia || isFetching}>
                                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Items per page" /></SelectTrigger>
                                                <SelectContent>{PAGE_SIZE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Tag Filter */}
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                                        <TagIcon className="h-3.5 w-3.5" /> Filter by Tags (select one or more)
                                        </Label>
                                        <TagFilterControl
                                            allAvailableTags={allAvailableTagsForFilter}
                                            selectedTags={selectedFilterTags}
                                            onTagSelectionChange={handleTagSelectionChange}
                                            onAddNewTag={handleAddNewUserTag}
                                            isLoading={isLoadingMedia || isFetching}
                                            predefinedTags={PREDEFINED_TAGS_FOR_WEB_MEDIA}
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <HardDrive className="h-5 w-5 text-primary" />
                            Storage Usage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingUserResource && !userResource ? (
                            <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-full" /></div>
                        ) : userResource ? (
                            <><Progress value={storageProgress} className="w-full h-2 mb-1" /><p className="text-sm text-muted-foreground">Used {formatBytesForDisplay(usedStorageKB * 1024)} of {formatBytesForDisplay(totalStorageKB * 1024)}{` (${storageProgress.toFixed(1)}%)`}</p></>
                        ) : (<p className="text-sm text-muted-foreground">Storage information not available.</p>)}
                    </CardContent>
                </Card>

                {(isLoading && !mediaDataResponse) || (isFetching && !mediaDataResponse) ? <WebMediaPageSkeleton viewMode={viewMode} pageSize={pageSize} /> : null}

                {isError && !isFetching && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" /><AlertTitle>Error Loading Data</AlertTitle>
                        <AlertDescription>Could not fetch user or media files. Error: {error?.message || 'Unknown error'}
                         <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                        {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Retry</Button>
                        </AlertDescription>
                    </Alert>
                )}

                {!isLoading && !isError && userKey && mediaItems.length === 0 && (
                    <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
                        No media files found matching your criteria for tenent ({userKey}).
                    </div>
                )}

                {!isLoading && !isError && userKey && mediaItems.length > 0 && (
                    viewMode === 'table' ? (
                        <Card className='w-full overflow-x-auto max-w-full'>
                            <CardHeader>
                                <CardTitle>Manage Media</CardTitle>
                                <CardDescription>Upload, view, edit, and delete your media files. {isFetching && <Loader2 className="ml-2 inline-block h-4 w-4 animate-spin" />}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MediaTable data={mediaItems} />
                            </CardContent>
                        </Card>
                    ) : (
                        <MediaCardGrid mediaItems={mediaItems} />
                    )
                )}
                 {pagination && pagination.pageCount > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isFetching}>
                            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {pagination.page} of {pagination.pageCount} (Total: {pagination.total} items)
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(pagination.pageCount, prev + 1))} disabled={currentPage === pagination.pageCount || isFetching}>
                            Next <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
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

function WebMediaPageSkeleton({ viewMode, pageSize }: { viewMode: ViewMode, pageSize: number }) {
    const skeletonItemsCount = pageSize;
    return (
      <div className="space-y-4">
        <Card>
            <CardHeader className="pb-2"><Skeleton className="h-5 w-1/4" /></CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-1 space-y-1"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-9 w-full"/></div>
                    <div className="md:col-span-1 space-y-1"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-9 w-full"/></div>
                    <Skeleton className="h-9 w-full md:w-auto"/>
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
            </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><Skeleton className="h-5 w-1/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2 mb-1" /><Skeleton className="h-2 w-full" /></CardContent></Card>
        
        {viewMode === 'table' ? (
          <Card><CardHeader><Skeleton className="h-6 w-1/3"/><Skeleton className="h-4 w-1/2 mt-1"/></CardHeader><CardContent>
            <div className="rounded-md border"><Table><TableHeader><TableRow>{[...Array(7)].map((_, i) => <TableHead key={i}><Skeleton className="h-5 w-full" /></TableHead>)}<TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead></TableRow></TableHeader><TableBody>{[...Array(skeletonItemsCount)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell>{[...Array(6)].map((_,j)=><TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}<TableCell className="text-right"><div className="flex justify-end"><Skeleton className="h-8 w-8" /></div></TableCell></TableRow>))}</TableBody></Table></div>
          </CardContent></Card>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(skeletonItemsCount)].map((_, i) => (
                    <Card key={i}><Skeleton className="aspect-square w-full rounded-t-md bg-muted" /><CardHeader className="p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-1/2 mt-1" /></CardHeader><CardContent className="p-4 pt-0 space-y-1"><Skeleton className="h-3 w-1/4" /><Skeleton className="h-3 w-1/3" /></CardContent><CardFooter className="p-3 flex justify-end"><Skeleton className="h-8 w-8" /></CardFooter></Card>
                ))}
            </div>
        )}
         <div className="flex items-center justify-between pt-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-8 w-20" /></div>
      </div>
    );
}

    
