
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Smartphone } from 'lucide-react';

// Dynamically import the editor component to avoid SSR issues
const DynamicToastUIImageEditorWrapper = React.lazy(() =>
    import('../_components/toast-ui-image-editor-wrapper') // Adjust path if necessary
);

import { Button } from '@/components/ui/button';
import { useUploadMediaMutation } from '@/lib/queries/media';
import { useIsMobile } from '@/hooks/use-mobile'; // Import hook to detect mobile
import { useToast } from '@/hooks/use-toast';

export default function EditMediaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const imageUrl = searchParams.get('imageUrl');
    const imageName = searchParams.get('imageName');
    const { toast } = useToast();
    const uploadMutation = useUploadMediaMutation();
    const isMobile = useIsMobile(); // Check if on mobile

    const handleSaveEditedImage = (blob: Blob, filename: string) => {
        console.log('EditMediaPage: Saving edited image', { filename, blobSize: blob.size, blobType: blob.type });

        // Use the upload mutation hook
        uploadMutation.mutate(
            {
                file: new File([blob], filename, { type: blob.type }),
                name: filename.split('.').slice(0, -1).join('.'), // Name without extension
                alt: filename.split('.').slice(0, -1).join('.'), // Default alt text
            },
            {
                onSuccess: () => {
                    toast({
                        title: 'Edit Successful!',
                        description: `Edited image "${filename}" uploaded successfully.`,
                    });
                    // Redirect back to the media library after successful upload
                    router.push('/dashboard/web-media');
                },
                onError: (error) => {
                    // Error toast is handled by the mutation hook
                    console.error('EditMediaPage: Upload failed after edit', error);
                },
            }
        );
    };

    if (!imageUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
                <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
                <p className="text-muted-foreground mb-6">Image URL is missing. Cannot load the editor.</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        // Use flex column layout, make it fill the screen height
        <div className="flex flex-col min-h-screen bg-background"> {/* Use min-h-screen */}
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b flex-shrink-0 sticky top-0 bg-background z-10">
                <h1 className="text-xl font-semibold">Image Editor</h1>
                {isMobile && (
                     <div className="text-xs text-muted-foreground flex items-center gap-1">
                         <Smartphone className="w-3 h-3" /> Best viewed in landscape
                     </div>
                 )}
                <Button variant="outline" onClick={() => router.back()} disabled={uploadMutation.isPending}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Media
                </Button>
            </header>

            {/* Editor Area - takes remaining space, REMOVED overflow-hidden */}
            <main className="flex-1 relative"> {/* Use flex-1 to grow */}
                <React.Suspense fallback={
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2">Loading Editor...</span>
                    </div>
                }>
                    {/* Dynamic Editor fills the main area */}
                     <DynamicToastUIImageEditorWrapper
                         imageUrl={imageUrl}
                         imageName={imageName || 'image-to-edit.png'}
                         onSave={handleSaveEditedImage}
                         onClose={() => router.back()} // Go back if user cancels
                     />
                </React.Suspense>
                 {/* Loading overlay during upload */}
                 {uploadMutation.isPending && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-20">
                         <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                         <p className="text-muted-foreground">Uploading edited image...</p>
                     </div>
                 )}
            </main>
        </div>
    );
}
