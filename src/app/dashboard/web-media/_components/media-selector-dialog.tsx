
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Loader2, AlertCircle, CheckCircle, FileText, Video, ImageIcon as FileTypeIcon, FileQuestion } from 'lucide-react';

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFetchMedia } from '@/lib/queries/media';
import { useCurrentUser } from '@/lib/queries/user';
import type { CombinedMediaData } from '@/types/media';
import { cn } from '@/lib/utils';

interface MediaSelectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onMediaSelect: (selectedMedia: CombinedMediaData) => void;
    returnType?: 'id'; // 'id' implies CombinedMediaData is returned, from which consumer extracts fileId (numeric)
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

    const { data: allMediaData, isLoading: isLoadingMedia, isError, error, refetch, isFetching } = useFetchMedia(userKey);
    const [selectedMedia, setSelectedMedia] = React.useState<CombinedMediaData | null>(null);

    const isLoading = isLoadingUser || isLoadingMedia;

    const filteredMediaData = React.useMemo(() => {
        if (!allMediaData) return [];
        if (expectedMediaTypes.length === 0) return allMediaData;

        return allMediaData.filter(media => {
            if (!media.mime) return false;
            // Check if media.mime starts with any of the expectedMediaTypes
            // e.g., expectedMediaTypes = ['image'] matches 'image/png', 'image/jpeg'
            // e.g., expectedMediaTypes = ['video'] matches 'video/mp4'
            // e.g., expectedMediaTypes = ['application/pdf'] matches 'application/pdf'
            return expectedMediaTypes.some(type => {
                if (type === 'image' && media.mime!.startsWith('image/')) return true;
                if (type === 'video' && media.mime!.startsWith('video/')) return true;
                if (type === 'pdf' && media.mime === 'application/pdf') return true;
                // Add more specific checks if needed, or a general check:
                if (media.mime!.startsWith(type)) return true; // For types like 'application/'
                return false;
            });
        });
    }, [allMediaData, expectedMediaTypes]);


    const handleSelect = () => {
        if (!selectedMedia) return;

        // Ensure that if an item is selected, it has a valid fileId (numeric media ID)
        if (selectedMedia.fileId === null || selectedMedia.fileId === undefined) {
            // This case should ideally be prevented by disabling the button,
            // but it's a good safeguard.
            console.error("MediaSelectorDialog: Attempted to select media with null fileId.");
            // Optionally show a toast here too, or let the consumer handle it.
            return;
        }

        onMediaSelect(selectedMedia); // Pass the full CombinedMediaData object
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setSelectedMedia(null);
        }
    };

    const canSelectMedia = selectedMedia !== null && selectedMedia.fileId !== null && selectedMedia.fileId !== undefined;

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Media</DialogTitle>
                    <DialogDescription>
                        Choose a file.
                        {expectedMediaTypes.length > 0 && ` (Filtering for: ${expectedMediaTypes.join(', ')})`}
                         {isFetching && <Loader2 className="ml-2 inline-block h-4 w-4 animate-spin" />}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-4 -mr-4">
                    <div className="py-4">
                        {isLoading && (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="ml-2">Loading media...</p>
                            </div>
                        )}
                        {isError && !isFetching && (
                            <Alert variant="destructive" className="my-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error Loading Media</AlertTitle>
                                <AlertDescription>
                                    Could not load media files. {error?.message || 'Unknown error'}
                                    <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                                         {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                        {isFetching ? 'Retrying...' : 'Retry'}
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}
                        {!isLoading && !isError && (!filteredMediaData || filteredMediaData.length === 0) && (
                             <p className="text-center text-muted-foreground py-8">
                                 {userKey ? `No media files found${expectedMediaTypes.length > 0 ? ` matching the type: ${expectedMediaTypes.join(', ')}` : ''} for your key (${userKey}).` : 'User key not found.'}
                             </p>
                        )}
                        {!isLoading && !isError && filteredMediaData && filteredMediaData.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {filteredMediaData.map((media) => {
                                    // fileId is numeric Media ID
                                    const isCurrentlySelectedInParentForm = media.fileId !== null && currentSelectionIds.includes(media.fileId);
                                    const isDialogSelected = selectedMedia?.webMediaId === media.webMediaId;
                                    const hasValidFileId = media.fileId !== null && media.fileId !== undefined;

                                    return (
                                    <button
                                        key={media.webMediaId} // Use numeric webMediaId as key
                                        onClick={() => {
                                            if (hasValidFileId) {
                                                setSelectedMedia(media);
                                            }
                                        }}
                                        disabled={!hasValidFileId} // Disable if no valid fileId
                                        className={cn(
                                            "relative group border rounded-md overflow-hidden aspect-square focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex flex-col items-center justify-center text-center",
                                            isDialogSelected ? 'ring-2 ring-primary ring-offset-2' : 'border-border',
                                            isCurrentlySelectedInParentForm && !isDialogSelected && 'border-green-500 ring-1 ring-green-500',
                                            !hasValidFileId && 'opacity-50 cursor-not-allowed bg-muted/50', // Style for disabled items
                                            hasValidFileId && 'bg-muted hover:bg-muted/80 transition-colors'
                                        )}
                                        aria-label={`Select ${media.name}${!hasValidFileId ? ' (Invalid File ID)' : ''}`}
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
                                        {isDialogSelected && hasValidFileId && (
                                            <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
                                                <CheckCircle className="w-8 h-8 text-primary-foreground" />
                                            </div>
                                        )}
                                        {isCurrentlySelectedInParentForm && !isDialogSelected && hasValidFileId && (
                                            <div className="absolute top-1 right-1 p-0.5 bg-green-500 rounded-full">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                                            <p className="text-xs text-white truncate font-medium">{media.name}</p>
                                        </div>
                                        {!hasValidFileId && (
                                            <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center p-1">
                                                <span className="text-xs text-destructive-foreground font-semibold">No File ID</span>
                                            </div>
                                        )}
                                    </button>
                                )})}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="mt-4 flex-shrink-0">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        onClick={handleSelect}
                        disabled={!canSelectMedia}
                    >
                        Select Media
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    