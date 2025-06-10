'use client';

import * as React from 'react';
import Image from 'next/image';
import { Loader2, AlertCircle, CheckCircle, FileText, Video, ImageIcon as FileTypeIcon, FileQuestion, Search, X, Filter, ChevronLeft, ChevronRight, Tag as TagIcon, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader, 
    DialogTitle,  
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription as AlertDescriptionComponent, AlertTitle as AlertTitleComponentUI } from "@/components/ui/alert"; 
import { useFetchMedia } from '@/lib/queries/media';
import { useCurrentUser } from '@/lib/queries/user';
import type { CombinedMediaData } from '@/types/media';
import { cn } from '@/lib/utils';
import { TagFilterControl } from '@/components/ui/tag-filter-control';
import { Input } from '@/components/ui/input';
import { PREDEFINED_TAGS_FOR_WEB_MEDIA } from '@/types/media';
import { Label } from '@/components/ui/label';

interface MediaSelectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onMediaSelect: (selectedMedia: CombinedMediaData) => void;
    returnType?: 'id' | 'url';
    expectedMediaTypes?: string[];
    currentSelectionIds?: (number | null)[];
}

const getFileTypeRenderIcon = (mime: string | null, className?: string): React.ReactElement => {
    const iconClasses = cn("h-10 w-10", className);
    if (!mime) return <FileQuestion className={iconClasses} />;
    if (mime.startsWith('image/')) return <FileTypeIcon className={cn(iconClasses, "text-blue-500")} />;
    if (mime.startsWith('video/')) return <Video className={cn(iconClasses, "text-purple-500")} />;
    if (mime === 'application/pdf') return <FileText className={cn(iconClasses, "text-red-500")} />;
    return <FileQuestion className={iconClasses} />;
};

const DIALOG_PAGE_SIZE = 12;

export default function MediaSelectorDialog({
    isOpen,
    onOpenChange,
    onMediaSelect,
    returnType = 'id',
    expectedMediaTypes = [],
    currentSelectionIds = [],
}: MediaSelectorDialogProps) {
    const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
    const userKey = currentUser?.tenent_id;

    const [currentPage, setCurrentPage] = React.useState(1);
    const [nameFilter, setNameFilter] = React.useState('');
    const [selectedFilterTags, setSelectedFilterTags] = React.useState<string[]>([]);
    const [userDefinedTags, setUserDefinedTags] = React.useState<string[]>([]);

    const allAvailableTagsForDialog = React.useMemo(() => {
      return Array.from(new Set([...PREDEFINED_TAGS_FOR_WEB_MEDIA, ...userDefinedTags])).sort();
    }, [userDefinedTags]);


    const { data: allMediaDataResponse, isLoading: isLoadingMedia, isError, error, refetch, isFetching } = useFetchMedia({
        page: currentPage,
        pageSize: DIALOG_PAGE_SIZE,
        sortField: 'createdAt',
        sortOrder: 'desc',
        nameFilter: nameFilter || null,
        tagsFilter: selectedFilterTags.length > 0 ? selectedFilterTags : null,
    });

    const allMediaData = allMediaDataResponse;
    const pagination = allMediaData?.meta?.pagination;

    const [selectedMediaInDialog, setSelectedMediaInDialog] = React.useState<CombinedMediaData | null>(null);

    const isLoading = isLoadingUser || isLoadingMedia;

    const filteredMediaData = React.useMemo(() => {
        if (!allMediaData?.data) return [];
        if (expectedMediaTypes.length === 0) return allMediaData.data;

        return allMediaData.data.filter(media => {
            if (!media.mime) return false;
            return expectedMediaTypes.some(type => {
                if (type === 'image' && media.mime!.startsWith('image/')) return true;
                if (type === 'video' && media.mime!.startsWith('video/')) return true;
                if (type === 'pdf' && media.mime === 'application/pdf') return true;
                if (media.mime!.startsWith(type)) return true;
                return false;
            });
        });
    }, [allMediaData, expectedMediaTypes]);


    const handleConfirmSelection = () => {
        if (!selectedMediaInDialog) return;
        if (returnType === 'id' && (selectedMediaInDialog.fileId === null || selectedMediaInDialog.fileId === undefined)) {
            console.error("MediaSelectorDialog: Attempted to select media with null fileId when returnType is 'id'.");
            return;
        }
        if (returnType === 'url' && !selectedMediaInDialog.fileUrl) {
             console.error("MediaSelectorDialog: Attempted to select media with null fileUrl when returnType is 'url'.");
             return;
        }
        onMediaSelect(selectedMediaInDialog);
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setSelectedMediaInDialog(null);
            // Optionally reset filters on close:
            // setNameFilter('');
            // setSelectedFilterTags([]);
            // setCurrentPage(1);
        }
    };

     const handleAddNewUserTagForDialog = (newTag: string) => {
        if (!userDefinedTags.includes(newTag)) {
            setUserDefinedTags(prev => [...prev, newTag].sort());
        }
    };

    const canConfirmSelection = selectedMediaInDialog !== null &&
        (returnType === 'id' ? (selectedMediaInDialog.fileId !== null && selectedMediaInDialog.fileId !== undefined) : !!selectedMediaInDialog.fileUrl);


    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className={cn(
                "max-h-[90vh] flex flex-col p-0",
                "w-[95vw] max-w-md",
                "sm:w-full sm:max-w-3xl", 
                "md:max-w-4xl",
                "lg:max-w-5xl",
                "xl:max-w-6xl"
                )}>
                
                <DialogHeader className="sr-only"> {/* Visually hidden for accessibility */}
                    <DialogTitle>Select Media</DialogTitle>
                </DialogHeader>

                {/* Top Bar: Search Input and Close Button */}
                <div className="flex items-center p-3 border-b flex-shrink-0">
                    <div className="relative flex-grow mr-2">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="media-name-filter-dialog"
                            type="search"
                            placeholder="Search media by name..."
                            value={nameFilter}
                            onChange={(e) => { setNameFilter(e.target.value); setCurrentPage(1); }}
                            className="pl-9 h-9 text-xs w-full rounded-full bg-muted border-transparent focus:border-primary focus:bg-background"
                            disabled={isLoading}
                        />
                    </div>
                    {/* DialogClose is handled by Radix Primitive, no explicit button needed here unless custom styling */}
                </div>

                {/* Filter by Tag Section - Horizontally Scrollable */}
                <div className="px-3 py-2 border-b flex-shrink-0">
                     <div className="overflow-x-auto whitespace-nowrap pb-1 -mb-1 no-scrollbar"> 
                         <TagFilterControl
                            allAvailableTags={allAvailableTagsForDialog}
                            selectedTags={selectedFilterTags}
                            onTagSelectionChange={(tags) => { setSelectedFilterTags(tags); setCurrentPage(1); }}
                            onAddNewTag={handleAddNewUserTagForDialog}
                            isLoading={isLoading}
                            predefinedTags={PREDEFINED_TAGS_FOR_WEB_MEDIA}
                         />
                    </div>
                </div>

                {/* Media Grid Area */}
                <ScrollArea className="flex-1 px-3 py-8 overflow-scroll bg-slate-200 ">
                    <div className="min-h-[200px]"> {/* Ensure some min height for loading/empty states */}
                        {isLoading && !allMediaDataResponse && (
                            <div className="flex items-center justify-center h-full py-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {isError && !isFetching && (
                            <Alert variant="destructive" className="my-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitleComponentUI>Error Loading Media</AlertTitleComponentUI>
                                <AlertDescriptionComponent>
                                    Could not load media files. {error?.message || 'Unknown error'}
                                    <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                                         {isFetching || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {isFetching || isLoading ? 'Retrying...' : 'Retry'}
                                    </Button>
                                </AlertDescriptionComponent>
                            </Alert>
                        )}
                        {!isLoading && !isError && (!filteredMediaData || filteredMediaData.length === 0) && (
                             <p className="text-center text-muted-foreground py-10 text-sm">
                                 {userKey ? `No media files found${nameFilter || selectedFilterTags.length > 0 ? ' matching filters' : (expectedMediaTypes.length > 0 ? ` for type: ${expectedMediaTypes.join(', ')}` : '')}.` : 'User key not found.'}
                             </p>
                        )}
                        {!isLoading && !isError && filteredMediaData && filteredMediaData.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3">
                                {filteredMediaData.map((media) => {
                                    const isCurrentlySelectedInParentForm = media.fileId !== null && currentSelectionIds.includes(media.fileId);
                                    const isDialogSelected = selectedMediaInDialog?.webMediaId === media.webMediaId;
                                    const hasValidIdForSelection = returnType === 'id' ? (media.fileId !== null && media.fileId !== undefined) : !!media.fileUrl;

                                    return (
                                    <div
                                        key={media.webMediaId}
                                        className={cn(
                                            "relative group border rounded-md overflow-hidden aspect-square flex flex-col text-center transition-all duration-150",
                                            isDialogSelected && hasValidIdForSelection ? 'ring-2 ring-primary ring-offset-1 shadow-lg border-primary' : 'border-border',
                                            isCurrentlySelectedInParentForm && !isDialogSelected && 'border-green-500 ring-1 ring-green-500',
                                            !hasValidIdForSelection && 'opacity-60 bg-muted/30'
                                        )}
                                    >
                                        <div className="relative w-full aspect-[4/3] bg-muted flex-shrink-0"> {/* Preview area */}
                                            {media.mime?.startsWith('image/') && media.thumbnailUrl ? (
                                                <Image
                                                    src={media.thumbnailUrl}
                                                    alt={media.alt || media.name || 'Media thumbnail'}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                    className="object-cover transition-transform group-hover:scale-105"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full p-1">
                                                    {getFileTypeRenderIcon(media.mime, "h-8 w-8 sm:h-10 sm:w-10")}
                                                    <span className="mt-1 text-[10px] sm:text-xs text-muted-foreground truncate max-w-full px-0.5">
                                                        {(media.mime?.split('/')[1] || 'File').toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            {isCurrentlySelectedInParentForm && !isDialogSelected && hasValidIdForSelection && (
                                                <div className="absolute top-1 right-1 p-0.5 bg-green-600 rounded-full shadow-md" title="Already selected in form">
                                                    <CheckCircle className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-1.5 sm:p-2 flex flex-col flex-grow justify-between">
                                            <p className="text-[10px] sm:text-xs text-foreground truncate font-medium leading-tight mb-1" title={media.name}>{media.name}</p>
                                            <Button
                                                size="sm"
                                                variant={isDialogSelected && hasValidIdForSelection ? 'default' : 'outline'}
                                                onClick={() => { if (hasValidIdForSelection) setSelectedMediaInDialog(media); }}
                                                disabled={!hasValidIdForSelection}
                                                className={cn(
                                                    "w-full text-xs h-7 sm:h-8",
                                                    !hasValidIdForSelection && "cursor-not-allowed"
                                                )}
                                                aria-label={isDialogSelected && hasValidIdForSelection ? `Deselect ${media.name}` : `Select ${media.name}`}
                                            >
                                                {isDialogSelected && hasValidIdForSelection ? <Check className="mr-1 h-3.5 w-3.5" /> : null}
                                                {isDialogSelected && hasValidIdForSelection ? 'Selected' : 'Select'}
                                            </Button>
                                        </div>
                                        {!hasValidIdForSelection && (
                                            <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center p-1 backdrop-blur-sm rounded-md">
                                                <span className="text-[10px] sm:text-xs text-destructive-foreground font-semibold text-center leading-tight">
                                                    {returnType === 'id' ? 'No File ID' : 'No URL'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer: Pagination and Action Buttons */}
                <DialogFooter className="p-3 border-t flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <div className="text-xs text-muted-foreground order-1 sm:order-none">
                        {pagination && pagination.total > 0 ? (
                            `Page ${pagination.page} of ${pagination.pageCount} (Total: ${pagination.total} items)`
                        ) : (
                            isFetching || isLoading ? 'Loading...' : 'No media'
                        )}
                    </div>
                    <div className="flex gap-2 order-2 sm:order-none">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || isLoading || isFetching || !pagination || pagination.pageCount === 0}
                            className="px-3"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(pagination?.pageCount || 1, p + 1))}
                            disabled={!pagination || currentPage === pagination.pageCount || pagination.pageCount === 0 || isLoading || isFetching}
                            className="px-3"
                        >
                            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto order-first sm:order-last">
                        <DialogClose asChild className="flex-1 sm:flex-initial">
                            <Button type="button" variant="outline" size="sm">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={handleConfirmSelection}
                            disabled={!canConfirmSelection || isLoading || isFetching}
                            size="sm"
                            className="flex-1 sm:flex-initial"
                        >
                            Select Media
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
