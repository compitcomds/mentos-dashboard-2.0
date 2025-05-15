
"use client";

import * as React from "react";
import { PlusCircle, UploadCloud, X, Loader2, Edit } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useUploadMediaMutation } from "@/lib/queries/media";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { cn } from "@/lib/utils";
// Import the new TUI editor wrapper
import ToastUIImageEditorWrapper from './toast-ui-image-editor-wrapper';

interface UploadButtonProps {
  onUploadSuccess?: () => void;
  disabled?: boolean;
}

// Helper function to format bytes
const formatBytesLocal = (bytes: number | null, decimals = 2): string => {
  if (bytes === null || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeValue =
    bytes > 0 ? parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) : 0;
  return sizeValue + " " + sizes[i];
};


export default function UploadButton({ onUploadSuccess, disabled }: UploadButtonProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false); // State to control editor visibility
  const [fileToUpload, setFileToUpload] = React.useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = React.useState<string | null>(null); // Store original name
  const [mediaName, setMediaName] = React.useState("");
  const [altText, setAltText] = React.useState("");
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);

  const { toast } = useToast();
  const uploadMutation = useUploadMediaMutation();

  // Revoke object URLs when component unmounts or previewUrl changes
  React.useEffect(() => {
    const currentPreview = previewUrl; // Capture current preview URL
    return () => {
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
        console.log("Revoked blob URL:", currentPreview);
      }
    };
  }, [previewUrl]);

  const resetAllStates = () => {
    setFileToUpload(null);
    setOriginalFileName(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setMediaName("");
    setAltText("");
    setUploadProgress(null);
    setIsEditorOpen(false); // Ensure editor is closed on full reset
  };

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const fileNameBase = file.name.split(".").slice(0, -1).join(".");

      // Reset previous state FIRST
      resetAllStates();

      setOriginalFileName(file.name); // Store original name
      setFileToUpload(file);
      setMediaName(fileNameBase);
      setAltText("");

      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      console.log("Created blob URL:", objectUrl);
      setPreviewUrl(objectUrl);

      setIsUploadDialogOpen(true);
      setUploadProgress(null);
      setIsEditorOpen(false); // Start in detail view, not editor
    }
  }, []); // Removed resetAllStates from dependencies

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".png", ".gif", ".webp", ".svg", ".jpg"],
      "video/*": [".mp4", ".webm", ".ogg"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  // Function to open the TUI Editor
  const openEditor = () => {
    if (fileToUpload && fileToUpload.type.startsWith("image/") && previewUrl) {
      setIsEditorOpen(true); // Set state to show the editor wrapper
    } else {
      toast({ variant: "destructive", title: "Cannot Edit", description: "Only image files can be edited." });
    }
  };

  // Called when TUI editor wrapper saves
  const handleEditorSave = (blob: Blob, filename: string) => {
    console.log("TUI Editor saved Blob:", blob);
    setFileToUpload(blob); // Set the edited blob as the file to upload
    setMediaName(filename.split('.').slice(0, -1).join('.') || filename); // Update name

    // Update preview URL for the main dialog preview
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(blob);
    console.log("Created new blob URL after edit:", newPreviewUrl);
    setPreviewUrl(newPreviewUrl);

    setIsEditorOpen(false); // Close the editor view and return to the details/upload view
  };


  const handleUpload = async () => {
    if (!fileToUpload) {
      toast({ variant: "destructive", title: "No file selected" });
      return;
    }
     if (!(fileToUpload instanceof File) && !(fileToUpload instanceof Blob)) {
        toast({ variant: "destructive", title: "Invalid file type" });
        return;
    }

    // Determine filename (use original if available and no edits, otherwise use mediaName or default)
     const filename = fileToUpload instanceof File
         ? fileToUpload.name
         : `${mediaName || 'edited-image'}.${fileToUpload.type.split('/')[1] || 'png'}`;

    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 100) {
        setUploadProgress(progress);
      } else {
        clearInterval(interval);
      }
    }, 200);

    uploadMutation.mutate(
      {
        file: fileToUpload instanceof File ? fileToUpload : new File([fileToUpload], filename, { type: fileToUpload.type }),
        name: mediaName || filename.split('.').slice(0, -1).join('.'),
        alt: altText || null,
      },
      {
        onSuccess: () => {
          clearInterval(interval);
          setUploadProgress(100);
          toast({
              title: "Upload Successful!",
              description: `Media "${mediaName || filename.split('.').slice(0, -1).join('.')}" uploaded.`,
          });
          onUploadSuccess?.();
          setTimeout(() => {
            resetAllStates();
            setIsUploadDialogOpen(false);
          }, 1500);
        },
        onError: (error) => {
          clearInterval(interval);
          setUploadProgress(null);
          // Error handled by mutation hook
        },
      }
    );
  };

  const handleUploadDialogOpenChange = (open: boolean) => {
    setIsUploadDialogOpen(open);
    if (!open) {
      resetAllStates();
    }
  };

  const displayFile = fileToUpload; // Use the current file/blob state
  const isImageFile = displayFile?.type.startsWith("image/");
  const isUploading = uploadMutation.isPending || (uploadProgress !== null && uploadProgress < 100);

  return (
    <>
      {/* Main Dialog Trigger */}
      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogOpenChange} >
        <DialogTrigger asChild>
          <Button disabled={disabled}>
            <PlusCircle className="mr-2 h-4 w-4" /> Upload New Media
          </Button>
        </DialogTrigger>
        {/* Adjust content width and height based on whether editor is open */}
        <DialogContent className={cn(
            "sm:max-w-[525px] transition-all duration-300",
            isEditorOpen && "scale-95 sm:max-w-fit h-[95vh] flex flex-col " // Editor styles
            )}>

            {/* Conditional Rendering: Editor or Upload Details */}
            {isEditorOpen && previewUrl ? (
                // Render Editor Wrapper
                <>
                    
                    <div className="flex-1 overflow-auto "> {/* Make editor area scrollable if needed */}
                        <ToastUIImageEditorWrapper
                            imageUrl={previewUrl}
                            imageName={originalFileName || undefined}
                            onSave={handleEditorSave}
                            onClose={() => setIsEditorOpen(false)} // Go back to detail view
                        />
                    </div>
                    {/* Footer is handled within the wrapper for editor actions */}
                </>

            ) : (
                // Render Upload Details Form
                <>
                    <DialogHeader>
                        <DialogTitle>Upload Media</DialogTitle>
                        <DialogDescription>
                        Review the file details and add metadata. Edit images before uploading.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Dropzone Area (only show if no file selected yet) */}
                    {!displayFile && (
                        <div
                        {...getRootProps()}
                        className={`mt-4 flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors ${
                            isDragActive
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted/50"
                        }`}
                        >
                        <input {...getInputProps()} />
                        <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                        {isDragActive ? (
                            <p className="text-primary font-semibold">
                            Drop the file here ...
                            </p>
                        ) : (
                            <p className="text-center text-muted-foreground">
                            Drag & drop a file here, or{" "}
                            <span className="text-primary font-medium">
                                click to select
                            </span>
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Images, Videos, PDFs supported
                        </p>
                        </div>
                    )}

                    {/* File Preview and Actions (Show AFTER a file is selected) */}
                    {displayFile && (
                        <div className="mt-4 space-y-4">
                            {/* File Preview and Info */}
                            <div className="flex items-start space-x-4 p-4 border rounded-md relative">
                                {previewUrl && isImageFile ? (
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    width={80}
                                    height={80}
                                    className="rounded-md object-cover flex-shrink-0" // Prevent shrinking
                                    unoptimized // If using blob URLs
                                />
                                ) : (
                                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-xs uppercase">
                                    {displayFile.type?.split("/")[1] || 'File'}
                                </div>
                                )}
                                <div className="flex-1 min-w-0"> {/* Prevent text overflow issues */}
                                    <p className="text-sm font-medium break-words"> {/* Allow words to break */}
                                        {mediaName || (displayFile instanceof File ? displayFile.name : 'edited-image')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytesLocal(displayFile.size)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {displayFile.type}
                                    </p>
                                    {isImageFile && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={openEditor}
                                            disabled={isUploading || !previewUrl}
                                            className="mt-2"
                                        >
                                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Image
                                        </Button>
                                    )}
                                </div>
                                {/* Remove file button */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={resetAllStates}
                                    disabled={isUploading}
                                    className="absolute top-1 right-1 h-6 w-6"
                                >
                                    <X className="h-4 w-4"/>
                                    <span className="sr-only">Remove file</span>
                                </Button>
                            </div>

                            {/* Metadata Inputs */}
                            <div className="grid gap-2">
                                <Label htmlFor="media-name">Name</Label>
                                <Input
                                id="media-name"
                                value={mediaName}
                                onChange={(e) => setMediaName(e.target.value)}
                                placeholder="Enter media name (defaults to filename)"
                                disabled={isUploading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="alt-text">Alt Text (for images)</Label>
                                <Input
                                id="alt-text"
                                value={altText}
                                onChange={(e) => setAltText(e.target.value)}
                                placeholder="Describe the image (optional)"
                                disabled={!isImageFile || isUploading}
                                />
                            </div>

                            {uploadProgress !== null && (
                                <div className="space-y-1">
                                <Label>Upload Progress</Label>
                                <Progress value={uploadProgress} className="w-full" />
                                <p className="text-xs text-muted-foreground text-right">
                                    {uploadProgress}%
                                </p>
                                </div>
                            )}

                            <DialogFooter className="sm:justify-between flex flex-col sm:flex-row sm:gap-2 pt-4">
                                {isUploading ? (
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                                    </div>
                                ) : uploadProgress === 100 ? (
                                    <p className="text-sm text-green-600 font-medium flex items-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Success! Closing...
                                    </p>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={handleUpload}
                                        disabled={!displayFile}
                                        className="w-full sm:w-auto"
                                    >
                                        <UploadCloud className="mr-2 h-4 w-4" /> Upload File
                                    </Button>
                                )}
                                <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isUploading} className="w-full sm:w-auto mt-2 sm:mt-0">
                                    Cancel
                                </Button>
                                </DialogClose>
                            </DialogFooter>
                        </div>
                    )}
                </>
             )}

        </DialogContent>
      </Dialog>
    </>
  );
}
