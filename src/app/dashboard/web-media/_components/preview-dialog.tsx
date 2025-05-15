"use client";

import * as React from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react"; // For linking to other file types
import type { CombinedMediaData } from "@/types/media"; // Use CombinedMediaData

interface PreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  media: CombinedMediaData; // Expect CombinedMediaData
}

export default function PreviewDialog({
  isOpen,
  onOpenChange,
  media,
}: PreviewDialogProps) {
  // Use mime type from CombinedMediaData
  const isImage = media.mime?.startsWith("image/");
  const isVideo = media.mime?.startsWith("video/");
  const isPdf = media.mime === "application/pdf";
  // Use fileUrl which should be the full/absolute URL
  const displayUrl = media.fileUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Adjust max width/height for better preview */}
      <DialogContent className="sm:max-w-[90vw] md:max-w-[70vw] lg:max-w-[60vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview:{media.name || media.fileName}</DialogTitle>
          <DialogDescription>
            Filename: {media.fileName || "N/A"} | Type: {media.mime || "N/A"}
          </DialogDescription>
        </DialogHeader>

        {/* Flex container for centering and overflow */}
        <div className="my-4 flex-1 flex items-center justify-center overflow-auto">
          {displayUrl ? (
            <>
              {isImage ? (
                <Image
                  src={displayUrl} // Use the already constructed fileUrl
                  alt={media.alt || media.name || "Media preview"}
                  width={1200} // Suggest larger max width
                  height={800} // Suggest larger max height
                  style={{
                    width: "auto",
                    height: "auto",
                    maxHeight: "75vh",
                    maxWidth: "100%",
                  }} // Responsive styles
                  className="rounded-md object-contain"
                  unoptimized // Use unoptimized for absolute URLs
                />
              ) : isVideo ? (
                <video controls className="max-w-full max-h-[75vh] rounded-md">
                  <source src={displayUrl} type={media.mime ?? undefined} />
                  Your browser does not support the video tag.
                </video>
              ) : isPdf ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(
                    displayUrl
                  )}&embedded=true`}
                  title={`Preview: ${media.name || media.fileName}`}
                  className="w-full h-[75vh] border-0 rounded-md"
                />
              ) : (
                <div className="text-center p-8 border rounded-md bg-muted">
                  <p className="text-muted-foreground mb-4">
                    Preview not available for this file type ({media.mime}).
                  </p>
                  <Button asChild variant="secondary">
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open File <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-destructive text-center p-8">
              File URL not found. Cannot display preview.
            </p>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          {" "}
          {/* Ensure footer sticks to bottom */}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
