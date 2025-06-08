
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Loader2, AlertCircle, CheckCircle, FileText, Video, ImageIcon as FileTypeIcon, FileQuestion, Search, X, Filter, ChevronLeft, ChevronRight, Tag as TagIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription as AlertDescriptionComponent, AlertTitle } from "@/components/ui/alert";
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


    const [selectedMedia, setSelectedMedia] = React.useState<CombinedMediaData | null>(null);

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


    const handleSelect = () => {
        if (!selectedMedia) return;
        if (returnType === 'id' && (selectedMedia.fileId === null || selectedMedia.fileId === undefined)) {
            console.error("MediaSelectorDialog: Attempted to select media with null fileId when returnType is 'id'.");
            return;
        }
        if (returnType === 'url' && !selectedMedia.fileUrl) {
             console.error("MediaSelectorDialog: Attempted to select media with null fileUrl when returnType is 'url'.");
             return;
        }
        onMediaSelect(selectedMedia);
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setSelectedMedia(null);
        }
    };

     const handleAddNewUserTagForDialog = (newTag: string) => {
        if (!userDefinedTags.includes(newTag)) {
            setUserDefinedTags(prev => [...prev, newTag].sort());
        }
    };

    const canSelectMedia = selectedMedia !== null &&
        (returnType === 'id' ? (selectedMedia.fileId !== null && selectedMedia.fileId !== undefined) : !!selectedMedia.fileUrl);


    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className={cn(
                "max-h-[90vh] flex flex-col",
                "w-[95vw] max-w-md", 
                "sm:w-full sm:max-w-3xl",
                "md:max-w-4xl",
                "lg:max-w-5xl",
                "xl:max-w-6xl"
                )}>
                <DialogHeader className="pb-4 mb-2 border-b">
                    <DialogTitle>Select Media</DialogTitle>
                    <DialogDescription>
                        Choose a file.
                        {expectedMediaTypes.length > 0 && ` (Filtering for: ${expectedMediaTypes.join(', ')})`}
                         {(isFetching || isLoading) && <Loader2 className="ml-2 inline-block h-4 w-4 animate-spin" />}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-3 border-y mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
                        <div className="space-y-1.5">
                            <Label htmlFor="media-name-filter-dialog" className="text-xs font-medium">Filter by Name</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="media-name-filter-dialog"
                                    type="search"
                                    placeholder="Search by media name..."
                                    value={nameFilter}
                                    onChange={(e) => { setNameFilter(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 h-9 text-xs w-full"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                             <Label className="text-xs font-medium">Filter by Tags</Label>
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
                </div>


                <ScrollArea className="flex-1 pr-1 -mr-2 mt-0">
                    <div className="py-4">
                        {isLoading && !allMediaDataResponse && (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="ml-2">Loading media...</p>
                            </div>
                        )}
                        {isError && !isFetching && (
                            <Alert variant="destructive" className="my-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error Loading Media</AlertTitle>
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
                             <p className="text-center text-muted-foreground py-8">
                                 {userKey ? `No media files found${nameFilter || selectedFilterTags.length > 0 ? ' matching filters' : (expectedMediaTypes.length > 0 ? ` for type: ${expectedMediaTypes.join(', ')}` : '')} for your key.` : 'User key not found.'}
                             </p>
                        )}
                        {!isLoading && !isError && filteredMediaData && filteredMediaData.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                                {filteredMediaData.map((media) => {
                                    const isCurrentlySelectedInParentForm = media.fileId !== null && currentSelectionIds.includes(media.fileId);
                                    const isDialogSelected = selectedMedia?.webMediaId === media.webMediaId;
                                    const hasValidIdForSelection = returnType === 'id' ? (media.fileId !== null && media.fileId !== undefined) : !!media.fileUrl;

                                    return (
                                    <button
                                        key={media.webMediaId}
                                        onClick={() => {
                                            if (hasValidIdForSelection) {
                                                setSelectedMedia(media);
                                            }
                                        }}
                                        disabled={!hasValidIdForSelection}
                                        className={cn(
                                            "relative group border rounded-md overflow-hidden aspect-square focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex flex-col items-center justify-center text-center transition-all duration-150",
                                            isDialogSelected ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-105 border-primary' : 'border-border hover:border-primary/50',
                                            isCurrentlySelectedInParentForm && !isDialogSelected && 'border-green-500 ring-1 ring-green-500',
                                            !hasValidIdForSelection && 'opacity-60 cursor-not-allowed bg-muted/30 hover:border-destructive/50',
                                            hasValidIdForSelection && 'bg-card hover:shadow-md'
                                        )}
                                        aria-label={`Select ${media.name}${!hasValidIdForSelection ? ` (Invalid for selection type: ${returnType})` : ''}`}
                                    >
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
                                            <div className="flex flex-col items-center justify-center h-full p-2">
                                                {getFileTypeRenderIcon(media.mime)}
                                                <span className="mt-1 text-xs text-muted-foreground truncate max-w-full px-1">
                                                    {(media.mime?.split('/')[1] || 'File').toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {isDialogSelected && hasValidIdForSelection && (
                                            <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                                                <CheckCircle className="w-10 h-10 text-primary-foreground" />
                                            </div>
                                        )}
                                        {isCurrentlySelectedInParentForm && !isDialogSelected && hasValidIdForSelection && (
                                            <div className="absolute top-1.5 right-1.5 p-0.5 bg-green-600 rounded-full shadow-md">
                                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                                            <p className="text-xs text-white truncate font-semibold">{media.name}</p>
                                        </div>
                                        {!hasValidIdForSelection && (
                                            <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center p-1 backdrop-blur-sm">
                                                <span className="text-xs text-destructive-foreground font-semibold text-center leading-tight">
                                                    {returnType === 'id' ? 'No File ID' : 'No URL'}
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                )})}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-auto flex-shrink-0 flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                        {pagination && pagination.total > 0 ? (
                            `Page ${pagination.page} of ${pagination.pageCount} (Total: ${pagination.total} items)`
                        ) : (
                            isFetching || isLoading ? 'Loading pages...' : 'No media items'
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || isLoading || isFetching || !pagination || pagination.pageCount === 0}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(pagination?.pageCount || 1, p + 1))}
                            disabled={!pagination || currentPage === pagination.pageCount || pagination.pageCount === 0 || isLoading || isFetching}
                        >
                            Next <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                        <DialogClose asChild className="w-full sm:w-auto">
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={handleSelect}
                            disabled={!canSelectMedia || isLoading || isFetching}
                            className="w-full sm:w-auto"
                        >
                            Select Media
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    
    