
'use client';

import * as React from 'react';
import Image from 'next/image';
import { Loader2, AlertCircle, CheckCircle, FileText, Video, ImageIcon as FileTypeIcon, FileQuestion } from 'lucide-react'; // Added more icons

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
import { ScrollArea } from '@/components/ui/scroll-area'; // Use ScrollArea for list
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFetchMedia } from '@/lib/queries/media';
import { useCurrentUser } from '@/lib/queries/user'; // Import hook to get user key
import type { CombinedMediaData } from '@/types/media';
import { cn } from '@/lib/utils';

// Define the possible callback signatures based on returnType
type OnMediaSelectCallback =
    | ((url: string, alt: string | null, mimeType: string | null) => void) // For returnType 'url'
    | ((selectedMedia: CombinedMediaData) => void); // For returnType 'id' (passing full object)

interface MediaSelectorDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onMediaSelect: OnMediaSelectCallback;
    returnType?: 'url' | 'id'; // Prop to control return value, 'id' now means CombinedMediaData object
}

const getFileTypeRenderIcon = (mime: string | null, className?: string): React.ReactElement => {
    const iconClasses = cn("h-10 w-10", className); // Default size, can be overridden
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
    returnType = 'url',
}: MediaSelectorDialogProps) {
    const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
    const userKey = currentUser?.tenent_id;

    const { data: mediaData, isLoading: isLoadingMedia, isError, error, refetch, isFetching } = useFetchMedia(userKey);
    const [selectedMedia, setSelectedMedia] = React.useState<CombinedMediaData | null>(null);

    const isLoading = isLoadingUser || isLoadingMedia;

    const handleSelect = () => {
        if (!selectedMedia) return;

        if (returnType === 'url') {
            if (selectedMedia.fileUrl) {
                (onMediaSelect as (url: string, alt: string | null, mimeType: string | null) => void)(
                    selectedMedia.fileUrl,
                    selectedMedia.alt || selectedMedia.name,
                    selectedMedia.mime
                );
            } else {
                console.warn("Selected media has no fileUrl.");
            }
        } else { // returnType === 'id'
            // Pass the entire CombinedMediaData object
            // The consuming component will extract selectedMedia.fileId (numeric)
            (onMediaSelect as (selectedMedia: CombinedMediaData) => void)(selectedMedia);
        }
        onOpenChange(false);
    };

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setSelectedMedia(null);
        }
    };

     React.useEffect(() => {
        if (!isLoading && !isError) {
             // console.log("[MediaSelectorDialog] Media Data Received:", mediaData);
        }
         if (isError) {
             console.error("[MediaSelectorDialog] Error fetching media:", error);
         }
    }, [mediaData, isLoading, isError, error]);

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Media</DialogTitle>
                    <DialogDescription>
                        Choose an image or video to insert.
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
                        {!isLoading && !isError && (!mediaData || mediaData.length === 0) && (
                             <p className="text-center text-muted-foreground py-8">
                                 {userKey ? `No media files found for your key (${userKey}).` : 'User key not found.'}
                             </p>
                        )}
                        {!isLoading && !isError && mediaData && mediaData.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {mediaData.map((media) => (
                                    <button
                                        key={media.webMediaId} // webMediaId is number
                                        onClick={() => setSelectedMedia(media)}
                                        className={cn(
                                            "relative group border rounded-md overflow-hidden aspect-square focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex flex-col items-center justify-center text-center",
                                            selectedMedia?.webMediaId === media.webMediaId ? 'ring-2 ring-primary ring-offset-2' : 'border-border',
                                            'bg-muted hover:bg-muted/80 transition-colors'
                                        )}
                                        aria-label={`Select ${media.name}`}
                                    >
                                         {media.mime?.startsWith('image/') && media.thumbnailUrl ? (
                                            <Image
                                                src={media.thumbnailUrl}
                                                alt={media.alt || media.name || 'Media thumbnail'}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                className="object-cover transition-transform group-hover:scale-105"
                                                unoptimized
                                                onError={(e) => {
                                                     console.error(`Error loading image: ${media.thumbnailUrl}`, e);
                                                }}
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full p-2">
                                                {getFileTypeRenderIcon(media.mime)}
                                                <span className="mt-1 text-xs text-muted-foreground truncate max-w-full px-1">
                                                    {(media.mime?.split('/')[1] || 'File').toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {selectedMedia?.webMediaId === media.webMediaId && (
                                            <div className="absolute inset-0 bg-primary/60 flex items-center justify-center">
                                                <CheckCircle className="w-8 h-8 text-primary-foreground" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                                            <p className="text-xs text-white truncate font-medium">{media.name}</p>
                                        </div>
                                    </button>
                                ))}
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
                        disabled={!selectedMedia}
                    >
                        Select Media
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
