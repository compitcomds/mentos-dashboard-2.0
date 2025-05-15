
'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUpdateMediaMutation } from '@/lib/queries/media';
import type { CombinedMediaData, UpdateWebMediaPayload } from '@/types/media';
import Image from 'next/image'; // For showing image preview

interface EditMediaDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    media: CombinedMediaData;
    onSuccess?: () => void;
}

export default function EditMediaDialog({ isOpen, onOpenChange, media, onSuccess }: EditMediaDialogProps) {
    const [name, setName] = React.useState(media.name || '');
    const [alt, setAlt] = React.useState(media.alt || '');
    const { toast } = useToast();
    const updateMutation = useUpdateMediaMutation();

    // Update state if the media prop changes (e.g., opening dialog for a different item)
    React.useEffect(() => {
        if (media) {
            setName(media.name || '');
            setAlt(media.alt || '');
        }
    }, [media]);

    const handleSubmit = () => {
        const payload: UpdateWebMediaPayload = {
            name: name || media.fileName || 'Untitled', // Fallback name
            alt: alt || null,
        };

        updateMutation.mutate(
            // Pass the webMediaId from CombinedMediaData
            { id: media.webMediaId, payload },
            {
                onSuccess: () => {
                    // Toast is handled by the hook
                    onSuccess?.(); // Call external success handler (e.g., close dialog)
                    onOpenChange(false); // Close the dialog on success
                },
                onError: (error) => {
                    // Error toast is handled by the hook
                },
            }
        );
    };

    // Reset state when dialog closes without saving
     const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            // Reset state if needed, or rely on useEffect when reopening
            // setName(media.name || '');
            // setAlt(media.alt || '');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Media Metadata</DialogTitle>
                    <DialogDescription>
                        Update the name and alt text for this media file.
                    </DialogDescription>
                </DialogHeader>

                 {/* Optional: Show a small preview using thumbnailUrl */}
                 {/* Check if mime starts with image AND thumbnailUrl exists */}
                {media.thumbnailUrl && media.mime?.startsWith('image/') && (
                    <div className="my-4 flex justify-center">
                        <Image
                            src={media.thumbnailUrl} // Use thumbnailUrl directly
                            alt={media.alt || media.name || "Current media preview"}
                            width={100}
                            height={100}
                            className="rounded-md object-contain border"
                            unoptimized // Use unoptimized if URLs are absolute/external
                        />
                    </div>
                 )}


                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                            placeholder="Enter media name"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="alt" className="text-right">
                            Alt Text
                        </Label>
                        <Input
                            id="alt"
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            className="col-span-3"
                            placeholder="Describe the image (for accessibility)"
                            // Only enable for images based on mime type
                             disabled={!media.mime?.startsWith('image/')}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={updateMutation.isPending}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSubmit} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
