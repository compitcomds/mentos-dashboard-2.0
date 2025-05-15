
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ImageEditor from 'tui-image-editor';
import 'tui-image-editor/dist/tui-image-editor.css'; // Basic styles
// Optional: Import custom white theme
// import 'tui-image-editor/dist/tui-image-editor-white-theme.css';

import { Loader2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Import Button if needed within wrapper
import { useToast } from '@/hooks/use-toast'; // Correct path for shadcn toast
import { cn } from '@/lib/utils'; // Import cn utility
import { useIsMobile } from '@/hooks/use-mobile'; // Import hook to detect mobile


interface ToastUIImageEditorWrapperProps {
    imageUrl: string; // Expecting a Blob URL or existing URL
    imageName?: string;
    onSave: (blob: Blob, filename: string) => void;
    onClose: () => void;
}

export default function ToastUIImageEditorWrapper({
    imageUrl,
    imageName = 'edited-image.png',
    onSave,
    onClose,
}: ToastUIImageEditorWrapperProps) {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<ImageEditor | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingEditor, setIsLoadingEditor] = useState(true); // Start loading true
    const { toast } = useToast(); // Initialize toast hook
    const isMobile = useIsMobile(); // Check if on mobile

    // Define handleResize outside useEffect
    const handleResize = useCallback(() => {
        if (editorInstanceRef.current && editorContainerRef.current?.parentElement) {
            // TUI doesn't have a direct resize method for the whole UI after init.
            // Relying on CSS or container adjustments is generally preferred.
            console.log("TUI Editor Wrapper: Window resized. Relying on CSS for responsiveness.");
            // You could potentially destroy and re-initialize the editor here,
            // but that might be disruptive and lose current edits.
        }
    }, []); // Empty dependency array as it doesn't depend on props/state directly related to resizing logic itself


    useEffect(() => {
        let editorInstance: ImageEditor | null = null;
        setIsLoadingEditor(true); // Set loading true when effect starts

        if (imageUrl && editorContainerRef.current) {
            // Ensure container is empty before initializing
            editorContainerRef.current.innerHTML = '';
            console.log("TUI Editor Wrapper: Initializing...");

            // Use a small timeout to ensure the container is definitely ready
            const timer = setTimeout(() => {
                if (!editorContainerRef.current) {
                    console.error("TUI Editor Wrapper: Container ref became null during timeout.");
                    setIsLoadingEditor(false);
                    return;
                }
                try {
                     // Determine dimensions dynamically based on container
                     const container = editorContainerRef.current.parentElement; // Get parent for dimensions
                     const cssMaxWidth = container ? Math.max(container.offsetWidth * 0.95, 400) : 1000;


                    editorInstance = new ImageEditor(editorContainerRef.current, {
                        includeUI: {
                            loadImage: {
                                path: imageUrl,
                                name: imageName || 'Image',
                            },
                            initMenu: 'filter', // Example: start with filter menu
                            menuBarPosition: 'bottom',
                            // Full menu options
                            menu: [
                                'crop', // Crop tool
                                'flip', // Flip tool (X, Y, Reset)
                                'rotate', // Rotate tool (30 degrees, -30 degrees, Reset)
                                'draw', // Drawing tool (Free, Line)
                                'shape', // Shape tool (Rectangle, Circle, Triangle)
                                'icon', // Icon tool (Arrow, Location) - Requires icon paths
                                'text', // Text tool
                                'mask', // Mask Filter tool
                                'filter' // Filter tool (grayscale, blur, sharpen, emboss, remove white, brightness, noise, pixelate, color filter, tint, multiply, blend)
                            ],
                            uiSize: { // Adjust UI size if needed, though defaults are often fine
                                width: '100%', // Let parent container control width
                                height: '100%' // Let content determine height
                            },
                            theme: {}, // Use default theme
                        },
                        // Set dimensions based on container
                         cssMaxWidth: cssMaxWidth, // Use calculated max width
                         // cssMaxHeight: '100%', // Let height be flexible within container
                        selectionStyle: {
                            cornerSize: 20,
                            rotatingPointOffset: 70,
                        },
                        usageStatistics: false,
                    });
                    editorInstanceRef.current = editorInstance;
                    console.log("TUI Editor Wrapper: Initialized successfully.");

                    // Attach the resize listener
                    window.addEventListener('resize', handleResize);


                } catch (error) {
                    console.error("TUI Editor Wrapper: Failed to initialize:", error);
                    toast({
                        variant: 'destructive',
                        title: 'Editor Error',
                        description: 'Could not load the image editor.',
                    });
                    onClose(); // Close if initialization fails
                } finally {
                    setIsLoadingEditor(false); // Set loading false after attempt
                }
            }, 100); // Small delay

            return () => {
                 clearTimeout(timer); // Clear timeout on cleanup
                 window.removeEventListener('resize', handleResize); // Clean up resize listener using the function defined outside
                 // Destroy editor instance on unmount
                 if (editorInstanceRef.current) {
                     console.log("TUI Editor Wrapper: Destroying instance...");
                     try {
                         editorInstanceRef.current.destroy();
                     } catch (destroyError) {
                         console.error("TUI Editor Wrapper: Error destroying instance:", destroyError);
                     }
                     editorInstanceRef.current = null;
                 }
            };
        } else {
            console.warn("TUI Editor Wrapper: No image URL or container ref.");
            setIsLoadingEditor(false); // Ensure loading is false if prerequisites aren't met
        }
    }, [imageUrl, imageName, onClose, toast, handleResize]); // Added dependencies including handleResize

    const handleSave = async () => {
        if (!editorInstanceRef.current) {
            toast({ variant: 'destructive', title: 'Error', description: 'Editor instance not found.' });
            return;
        }
        setIsSaving(true);
        console.log("TUI Editor Wrapper: Saving...");

        // Get image data as a data URL (e.g., PNG format)
        const dataUrl = editorInstanceRef.current.toDataURL({ format: 'png' }); // Or 'jpeg', 'webp'

        if (!dataUrl) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not get image data from editor.' });
            setIsSaving(false);
            return;
        }

        try {
            // Convert the data URL to a Blob
            const blob = await fetch(dataUrl).then((res) => res.blob());
            console.log("TUI Editor Wrapper: Image converted to Blob:", blob);

            // Determine a filename
            let baseName = imageName || 'edited-image';
            // Remove existing extension if present
            baseName = baseName.includes('.') ? baseName.split('.').slice(0, -1).join('.') : baseName;
            const finalFilename = `${baseName}.png`; // Use the format specified in toDataURL

            onSave(blob, finalFilename); // Pass blob and filename up
            console.log("TUI Editor Wrapper: Save callback executed.");
            // onClose(); // Let the parent component handle closing if needed
        } catch (error) {
            console.error("TUI Editor Wrapper: Error converting data URL to Blob or saving:", error);
            toast({ variant: 'destructive', title: 'Save Error', description: 'Failed to process the edited image.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        // Outer container controlling size - Use flex column to position buttons below
        // Apply fullscreen-like styles based on viewport (desktop: 95%+, mobile: full)
         <div className={cn(
            "flex flex-col w-full h-full bg-background", // Keep full height/width for container
            // Desktop: Use large percentage of viewport, allow natural height based on content
            "md:w-[95vw] md:max-w-[1600px] md:mx-auto md:my-4 md:rounded-lg md:shadow-xl md:border",
             // Mobile: Fullscreen (effectively)
             "fixed inset-0 md:relative" // Fullscreen on mobile, relative on desktop
         )}>
             {/* Header for Mobile - Show Landscape Hint */}
             {isMobile && (
                 <div className="flex-shrink-0 p-2 text-xs text-muted-foreground flex items-center justify-center gap-1 border-b">
                     <Smartphone className="w-3 h-3" /> Rotate to Landscape for best experience
                 </div>
             )}
            {/* Editor container - REMOVED overflow-auto */}
             {/* Added 'relative' to help contain the editor UI */}
             {/* Use flex-1 to allow it to grow vertically */}
            <div className="flex-1 relative border-t md:border rounded-t-none md:rounded-md bg-muted">
                {isLoadingEditor && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2">Loading Editor...</span>
                    </div>
                )}
                {/* This div is where the editor instance will mount */}
                 {/* Ensure this div allows the editor canvas to expand */}
                 {/* Applied w-full, height determined by content */}
                <div ref={editorContainerRef} className="w-full" />
            </div>

            {/* Action Buttons - place them below the editor */}
            <div className="flex justify-end space-x-2 p-4 border-t bg-background md:rounded-b-lg sticky bottom-0 flex-shrink-0">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || isLoadingEditor}>
                    Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingEditor || !editorInstanceRef.current}>
                    {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isSaving ? 'Saving...' : 'Apply & Save Edit'}
                </Button>
            </div>
        </div>
    );
}
