
"use client";

import * as React from "react";
import { PlusCircle, UploadCloud, X, Loader2, Edit, Tag } from "lucide-react"; // Added Tag icon
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
import ToastUIImageEditorWrapper from './toast-ui-image-editor-wrapper';
import { Badge } from "@/components/ui/badge"; // Import Badge

interface UploadButtonProps {
  onUploadSuccess?: () => void;
  disabled?: boolean;
}

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

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const PREDEFINED_TAGS = ["profile", "banner", "gallery", "product", "icon", "document", "archive", "logo", "background", "avatar"];


export default function UploadButton({ onUploadSuccess, disabled }: UploadButtonProps) {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [fileToUpload, setFileToUpload] = React.useState<File | Blob | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = React.useState<string | null>(null);
  const [mediaName, setMediaName] = React.useState("");
  const [altText, setAltText] = React.useState("");
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [category, setCategory] = React.useState(""); // State for category
  const [tagInput, setTagInput] = React.useState(""); // State for current tag input
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]); // State for selected tags


  const { toast } = useToast();
  const uploadMutation = useUploadMediaMutation();

  React.useEffect(() => {
    const currentPreview = previewUrl;
    return () => {
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
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
    setCategory(""); // Reset category
    setSelectedTags([]); // Reset tags
    setTagInput(""); // Reset tag input
    setIsEditorOpen(false);
  };

  const onDrop = React.useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections && fileRejections.length > 0) {
        fileRejections.forEach(rejection => {
            rejection.errors.forEach((error: any) => {
                if (error.code === 'file-too-large') {
                    toast({
                        variant: "destructive",
                        title: "File Too Large",
                        description: `File "${rejection.file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
                    });
                } else {
                     toast({
                        variant: "destructive",
                        title: "File Rejected",
                        description: `Could not accept file "${rejection.file.name}": ${error.message}`,
                    });
                }
            });
        });
        return;
    }

    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const fileNameBase = file.name.split(".").slice(0, -1).join(".");
      resetAllStates();
      setOriginalFileName(file.name);
      setFileToUpload(file);
      setMediaName(fileNameBase);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setIsUploadDialogOpen(true);
      setUploadProgress(null);
      setIsEditorOpen(false);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
  });

  const openEditor = () => {
    if (fileToUpload && fileToUpload.type.startsWith("image/") && previewUrl) {
      setIsEditorOpen(true);
    } else {
      toast({ variant: "destructive", title: "Cannot Edit", description: "Only image files can be edited." });
    }
  };

  const handleEditorSave = (blob: Blob, filename: string) => {
    setFileToUpload(blob);
    setMediaName(filename.split('.').slice(0, -1).join('.') || filename);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(blob);
    setPreviewUrl(newPreviewUrl);
    setIsEditorOpen(false);
  };

  const handleAddTag = (tagValue: string) => {
    const newTag = tagValue.trim().toLowerCase();
    if (newTag && !selectedTags.includes(newTag) && selectedTags.length < 10) {
        setSelectedTags(prevTags => [...prevTags, newTag]);
    } else if (selectedTags.length >= 10) {
        toast({ variant: "destructive", title: "Tag Limit", description: "Maximum 10 tags allowed." });
    }
    setTagInput(""); // Clear input after adding
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "," || e.key === "Enter") && tagInput) {
        e.preventDefault();
        handleAddTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
        e.preventDefault();
        setSelectedTags(prevTags => prevTags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(prevTags => prevTags.filter(tag => tag !== tagToRemove));
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
        category: category || null,
        tags: selectedTags.length > 0 ? selectedTags.map(tag => ({ tag_value: tag })) : [], // Send empty array if no tags
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

  const displayFile = fileToUpload;
  const isImageFile = displayFile?.type.startsWith("image/");
  const isUploading = uploadMutation.isPending || (uploadProgress !== null && uploadProgress < 100);

  return (
    <>
      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogOpenChange} >
        <DialogTrigger asChild>
          <Button disabled={disabled}>
            <PlusCircle className="mr-2 h-4 w-4" /> Upload New Media
          </Button>
        </DialogTrigger>
        <DialogContent className={cn(
            "sm:max-w-[525px] transition-all duration-300",
            isEditorOpen && "scale-95 sm:max-w-fit h-[95vh] flex flex-col "
            )}>
            {isEditorOpen && previewUrl ? (
                <>
                    <div className="flex-1 overflow-auto ">
                        <ToastUIImageEditorWrapper
                            imageUrl={previewUrl}
                            imageName={originalFileName || undefined}
                            onSave={handleEditorSave}
                            onClose={() => setIsEditorOpen(false)}
                        />
                    </div>
                </>
            ) : (
                <>
                    <DialogHeader>
                        <DialogTitle>Upload Media</DialogTitle>
                        <DialogDescription>
                        Review the file details and add metadata. Max file size: {MAX_FILE_SIZE_MB}MB.
                        </DialogDescription>
                    </DialogHeader>
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
                            Max {MAX_FILE_SIZE_MB}MB. Most file types accepted.
                        </p>
                        </div>
                    )}
                    {displayFile && (
                        <div className="mt-4 space-y-4">
                            <div className="flex items-start space-x-4 p-4 border rounded-md relative">
                                {previewUrl && isImageFile ? (
                                <Image
                                    src={previewUrl}
                                    alt="Preview"
                                    width={80}
                                    height={80}
                                    className="rounded-md object-cover flex-shrink-0"
                                    unoptimized
                                />
                                ) : (
                                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-xs uppercase">
                                    {displayFile.type?.split("/")[1] || 'File'}
                                </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium break-words">
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
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g., general, blog, product"
                                    disabled={isUploading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="tags">Tags (max 10)</Label>
                                <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px]">
                                    {selectedTags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                        {tag}
                                        <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring"
                                        disabled={isUploading}
                                        >
                                        <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                    ))}
                                    <Input
                                        id="tags-input"
                                        type="text"
                                        value={tagInput}
                                        onChange={handleTagInputChange}
                                        onKeyDown={handleTagInputKeyDown}
                                        placeholder={selectedTags.length === 0 ? "Add tags (comma/Enter)..." : ""}
                                        className="flex-1 bg-transparent outline-none text-sm min-w-[150px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 shadow-none"
                                        disabled={isUploading || selectedTags.length >= 10}
                                    />
                                </div>
                                {selectedTags.length < 10 && PREDEFINED_TAGS.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {PREDEFINED_TAGS.filter(pt => !selectedTags.includes(pt)).map(tag => (
                                            <Button
                                                key={tag}
                                                type="button"
                                                variant="outline"
                                                size="xs" // Custom smaller size for tag buttons
                                                onClick={() => handleAddTag(tag)}
                                                disabled={isUploading}
                                                className="px-2 py-0.5 h-auto text-xs"
                                            >
                                                <Tag className="mr-1 h-3 w-3" /> {tag}
                                            </Button>
                                        ))}
                                    </div>
                                )}
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
