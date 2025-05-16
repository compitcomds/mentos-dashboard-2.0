
'use client';

import * as React from 'react';
import Image from 'next/image';
import { MoreHorizontal, Copy, Eye, Edit, Trash2, Loader2, FileQuestion, Video, FileText, ImageIcon as FileTypeIcon } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useDeleteMediaMutation } from '@/lib/queries/media';
import type { CombinedMediaData } from '@/types/media';
import EditMediaDialog from './edit-media-dialog';
import PreviewDialog from './preview-dialog';

interface MediaCardGridProps {
  mediaItems: CombinedMediaData[];
}

const formatBytes = (bytes: number | null, decimals = 2): string => {
    if (bytes === null || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeValue = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return sizeValue + ' ' + (sizes[i] || 'Bytes');
};

const getFileTypeRenderIcon = (mime: string | null): React.ReactElement => {
    if (!mime) return <FileQuestion className="h-12 w-12 text-muted-foreground" />;
    if (mime.startsWith('image/')) return <FileTypeIcon className="h-12 w-12 text-blue-500" />;
    if (mime.startsWith('video/')) return <Video className="h-12 w-12 text-purple-500" />;
    if (mime === 'application/pdf') return <FileText className="h-12 w-12 text-red-500" />;
    return <FileQuestion className="h-12 w-12 text-muted-foreground" />;
};

export default function MediaCardGrid({ mediaItems }: MediaCardGridProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteMediaMutation();
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [selectedMedia, setSelectedMedia] = React.useState<CombinedMediaData | null>(null);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [mediaToDelete, setMediaToDelete] = React.useState<CombinedMediaData | null>(null);


  const handleEdit = (media: CombinedMediaData) => {
    setSelectedMedia(media);
    setIsEditOpen(true);
  };

  const handlePreview = (media: CombinedMediaData) => {
    setSelectedMedia(media);
    setIsPreviewOpen(true);
  };

  const handleCopyUrl = (url: string | null) => {
    if (url) {
      navigator.clipboard.writeText(url)
        .then(() => toast({ title: 'Success', description: 'File URL copied to clipboard.' }))
        .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to copy URL.' }));
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'File URL is not available.' });
    }
  };

  const confirmDelete = (media: CombinedMediaData) => {
    setMediaToDelete(media);
    setIsAlertOpen(true);
  };

  const handleDelete = () => {
    if (!mediaToDelete) return;

    const webMediaIdToDelete = mediaToDelete.webMediaId; // Numeric ID for WebMedia entry
    const fileDocumentIdToDelete = mediaToDelete.fileDocumentId; // String Document ID for the file

    if (webMediaIdToDelete === undefined || webMediaIdToDelete === null) { // Check if webMediaId is valid
        toast({ variant: "destructive", title: "Error", description: "Cannot delete media: WebMedia identifier missing."});
        setIsAlertOpen(false);
        setMediaToDelete(null);
        return;
    }

    deleteMutation.mutate(
        { webMediaId: webMediaIdToDelete, fileDocumentId: fileDocumentIdToDelete },
        {
            onSuccess: () => {
                setIsAlertOpen(false);
                setMediaToDelete(null);
            },
            onError: (error: any) => {
                setIsAlertOpen(false);
                setMediaToDelete(null);
            }
        }
    );
  };


  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {mediaItems.map((media) => (
          <Card key={media.webMediaId} className="flex flex-col overflow-hidden">
            <div className="relative aspect-square w-full bg-muted border-b">
              {media.thumbnailUrl && media.mime?.startsWith('image/') ? (
                <Image
                  src={media.thumbnailUrl}
                  alt={media.alt || media.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  {getFileTypeRenderIcon(media.mime)}
                </div>
              )}
            </div>
            <CardHeader className="p-4 flex-shrink-0">
              <CardTitle className="text-base font-semibold truncate" title={media.name}>
                {media.name}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate" title={media.fileName || undefined}>
                {media.fileName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1 space-y-1 text-xs">
              <Badge variant="outline" className="text-muted-foreground">{media.mime || 'N/A'}</Badge>
              <p className="text-muted-foreground">Size: {formatBytes(media.size)}</p>
            </CardContent>
            <CardFooter className="p-3 border-t flex justify-end items-center space-x-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleCopyUrl(media.fileUrl)} disabled={!media.fileUrl}>
                    <Copy className="mr-2 h-4 w-4" /> Copy URL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePreview(media)} disabled={!media.fileUrl}>
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEdit(media)}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Metadata
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={() => confirmDelete(media)}
                    disabled={deleteMutation.isPending && deleteMutation.variables?.webMediaId === media.webMediaId}
                  >
                    {deleteMutation.isPending && deleteMutation.variables?.webMediaId === media.webMediaId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>

      {selectedMedia && (
        <EditMediaDialog
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          media={selectedMedia}
          onSuccess={() => {
            setIsEditOpen(false);
          }}
        />
      )}

      {selectedMedia && (
        <PreviewDialog
          isOpen={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          media={selectedMedia}
        />
      )}

      {mediaToDelete && (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the media file
                        <span className="font-semibold"> "{mediaToDelete.name || mediaToDelete.fileName}" </span>
                         and its associated metadata.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setMediaToDelete(null)} disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                         {deleteMutation.isPending ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         ) : null}
                         {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                     </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
