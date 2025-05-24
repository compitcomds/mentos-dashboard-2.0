
// src/app/dashboard/extra-content/data/_components/media-renderer.tsx
'use client';

import * as React from 'react';
import NextImage from 'next/image'; // Renamed to NextImage to avoid conflict
import { useGetMediaFileDetailsById } from '@/lib/queries/media'; // Changed to useGetMediaFileDetailsById
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileText, Video as VideoIcon, ImageIcon as FileTypeIcon, FileQuestion, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MediaRendererProps {
  mediaId: number; // Changed from mediaDocumentId: string to mediaId: number
  className?: string;
}

export default function MediaRenderer({ mediaId, className }: MediaRendererProps) {
  // Use the renamed hook and pass the numeric mediaId
  const { data: mediaDetails, isLoading, isError, error } = useGetMediaFileDetailsById(mediaId);
  console.log(mediaDetails)
  if (isLoading) {
    return <Skeleton className={cn("w-full h-32 rounded-md", className)} />;
  }

  if (isError || !mediaDetails) {
    return (
      <div className={cn("flex items-center justify-center p-2 border rounded-md bg-destructive/10 text-destructive", className || "h-32")}>
        <AlertCircle className="h-5 w-5 mr-2" />
        <div className="text-xs">
            <p className="font-semibold">Media Error</p>
            <p>{error?.message || `Could not load (ID: ${mediaId}).`}</p>
        </div>
      </div>
    );
  }

  const { url, mime, name, alternativeText } = mediaDetails;
  const displayAlt = alternativeText || name || 'Media file';

  if (!url) {
    return <div className={cn("text-xs text-muted-foreground p-2 border rounded-md", className || "h-32")}>Media URL missing.</div>;
  }

  if (mime?.startsWith('image/')) {
    console.log(url)
    return (
      <div className={cn("relative w-full aspect-video overflow-hidden rounded-md border bg-muted", className)}>

        <NextImage
          src={url}
          alt={displayAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-contain"
          unoptimized
        />
      </div>
    );
  }

  if (mime?.startsWith('video/')) {
    return (
      <div className={cn("relative w-full aspect-video overflow-hidden rounded-md border bg-black", className)}>
        <video controls className="w-full h-full object-contain">
          <source src={url} type={mime} />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  if (mime === 'application/pdf') {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center p-3 border rounded-md aspect-square bg-muted hover:bg-muted/80", className)}>
        <FileText className="h-8 w-8 text-red-500 mb-1" />
        <p className="text-xs font-medium truncate max-w-full" title={name}>{name}</p>
        <Button asChild variant="link" size="sm" className="mt-1 text-xs h-auto p-0">
          <a href={url} target="_blank" rel="noopener noreferrer">
            View PDF <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-3 border rounded-md aspect-square bg-muted hover:bg-muted/80", className)}>
      <FileQuestion className="h-8 w-8 text-muted-foreground mb-1" />
      <p className="text-xs font-medium truncate max-w-full" title={name}>{name}</p>
      <Button asChild variant="link" size="sm" className="mt-1 text-xs h-auto p-0">
        <a href={url} target="_blank" rel="noopener noreferrer">
          Download File <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </Button>
    </div>
  );
}
