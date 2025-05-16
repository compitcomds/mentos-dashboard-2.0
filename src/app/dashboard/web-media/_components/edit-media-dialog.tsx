
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

    React.useEffect(() => {
        if (media) {
            setName(media.name || '');
            setAlt(media.alt || '');
        }
    }, [media]);

    const handleSubmit = () => {
        const payload: UpdateWebMediaPayload = {
            name: name || media.fileName || 'Untitled',
            alt: alt || null,
        };

        // Use webMediaDocumentId if available, otherwise fall back to webMediaId (number) cast to string for the path
        // This assumes your API endpoint for update expects a string ID (documentId or numeric ID as string)
        const idForApi = media.webMediaDocumentId || String(media.webMediaId);

        if (!idForApi) {
            toast({ variant: "destructive", title: "Error", description: "Media identifier (documentId or ID) is missing."});
            return;
        }

        updateMutation.mutate(
            { documentId: idForApi, payload }, // Pass documentId to the mutation
            {
                onSuccess: () => {
                    onSuccess?.();
                    onOpenChange(false);
                },
                onError: (error) => {
                    // Error toast handled by hook
                },
            }
        );
    };

     const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
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

                {media.thumbnailUrl && media.mime?.startsWith('image/') && (
                    <div className="my-4 flex justify-center">
                        <Image
                            src={media.thumbnailUrl}
                            alt={media.alt || media.name || "Current media preview"}
                            width={100}
                            height={100}
                            className="rounded-md object-contain border"
                            unoptimized
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
