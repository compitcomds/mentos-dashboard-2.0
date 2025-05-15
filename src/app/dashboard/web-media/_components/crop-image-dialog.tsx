
// This component is optional and provides basic cropping.
// You'll need to install react-easy-crop: npm install react-easy-crop
'use client';

import * as React from 'react';
import Cropper, { Area, Point } from 'react-easy-crop'; // Import react-easy-crop
import { Loader2, CropIcon, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react'; // Import icons

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
import { Slider } from '@/components/ui/slider'; // Use Slider for zoom
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'; // For aspect ratio selection
import { cn } from '@/lib/utils';
// TODO: Add mutation/service for uploading the cropped image if needed

interface CropImageDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrl: string | null;
    imageName: string | null; // Original name for potential re-upload filename
    onCropComplete?: (croppedImageBlob: Blob) => void; // Callback with cropped blob
}

type AspectRatioOption = {
    value: number | undefined; // Use undefined for free ratio
    label: string;
    icon: React.ElementType;
};

const aspectRatios: AspectRatioOption[] = [
    { value: undefined, label: 'Free', icon: CropIcon },
    { value: 1 / 1, label: '1:1', icon: Square },
    { value: 16 / 9, label: '16:9', icon: RectangleHorizontal },
    { value: 4 / 3, label: '4:3', icon: RectangleHorizontal },
    // { value: 9 / 16, label: '9:16', icon: RectangleVertical }, // Example vertical
    // { value: 3 / 4, label: '3:4', icon: RectangleVertical },   // Example vertical
];


// Helper function to create cropped image blob
const getCroppedImg = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg'); // Or use original mime type if known
    });
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Needed if image is from different origin
    image.src = imageSrc;
  });
};


export default function CropImageDialog({
    isOpen,
    onOpenChange,
    imageUrl,
    imageName,
    onCropComplete
}: CropImageDialogProps) {
    const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = React.useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);
    const [isCropping, setIsCropping] = React.useState(false);
    const [aspectRatio, setAspectRatio] = React.useState<number | undefined>(aspectRatios[0].value); // Default to 'Free'
    const { toast } = useToast();

    const onCropCompleteInternal = React.useCallback((_croppedArea: Area, croppedAreaPixelsValue: Area) => {
        // Update state to display pixel dimensions
        setCroppedAreaPixels(croppedAreaPixelsValue);
    }, []);

    const handleCrop = async () => {
        if (!imageUrl || !croppedAreaPixels) {
            toast({ variant: 'destructive', title: 'Error', description: 'Image or crop area missing.' });
            return;
        }
         // Ensure width/height are positive before cropping
         if (croppedAreaPixels.width <= 0 || croppedAreaPixels.height <= 0) {
             toast({ variant: 'destructive', title: 'Invalid Crop', description: 'Crop area must have positive width and height.' });
             return;
         }

        setIsCropping(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageUrl, croppedAreaPixels);
             toast({ title: 'Success', description: 'Image cropped.' });
            onCropComplete?.(croppedImageBlob); // Pass blob to parent
            onOpenChange(false); // Close dialog
        } catch (error) {
            console.error('Cropping failed:', error);
            toast({ variant: 'destructive', title: 'Cropping Failed', description: 'Could not crop the image.' });
        } finally {
            setIsCropping(false);
        }
    };

    // Reset state when dialog closes or image changes
    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
           setCrop({ x: 0, y: 0 });
           setZoom(1);
           setCroppedAreaPixels(null);
           setIsCropping(false);
           setAspectRatio(aspectRatios[0].value); // Reset aspect ratio
        }
    };

     React.useEffect(() => {
        // Reset crop state when imageUrl changes (e.g., opening for a new image)
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setAspectRatio(aspectRatios[0].value);
    }, [imageUrl]);


    if (!imageUrl) return null; // Don't render if no image URL

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            {/* Increase max-width for better cropping experience */}
            <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw]">
                <DialogHeader>
                    <DialogTitle>Crop Image</DialogTitle>
                    <DialogDescription>
                        Adjust zoom, position, and aspect ratio. Crop dimensions: {croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)}px × ${Math.round(croppedAreaPixels.height)}px` : 'N/A'}
                    </DialogDescription>
                </DialogHeader>

                <div className="relative w-full h-[60vh] bg-muted border rounded-md overflow-hidden my-4">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio} // Use state for aspect ratio
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropCompleteInternal}
                    />
                </div>

                <div className="grid gap-6">
                    {/* Zoom Slider */}
                     <div className="space-y-2">
                        <Label htmlFor="zoom">Zoom</Label>
                        <Slider
                            id="zoom"
                            min={1}
                            max={3}
                            step={0.1}
                            value={[zoom]}
                            onValueChange={(value) => setZoom(value[0])}
                            className="w-full"
                            aria-label="Zoom"
                        />
                     </div>

                     {/* Aspect Ratio Selector */}
                     <div className="space-y-2">
                        <Label>Aspect Ratio</Label>
                         <ToggleGroup
                            type="single"
                            value={aspectRatio === undefined ? 'free' : String(aspectRatio)} // Convert undefined to 'free' for value
                            onValueChange={(value) => {
                                // Convert back from string to number/undefined
                                if (value === 'free' || !value) {
                                    setAspectRatio(undefined);
                                } else {
                                    setAspectRatio(Number(value));
                                }
                            }}
                            className="flex-wrap justify-start" // Allow wrapping on smaller screens
                        >
                            {aspectRatios.map(({ value, label, icon: Icon }) => (
                                <ToggleGroupItem
                                    key={label}
                                    value={value === undefined ? 'free' : String(value)} // Use 'free' or stringified number
                                    aria-label={label}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 h-auto text-xs", // Adjusted padding/height
                                        // Apply active style based on state
                                        (aspectRatio === value) && "bg-primary/10 text-primary"
                                    )}
                                >
                                     <Icon className="h-4 w-4" />
                                    {label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                     </div>

                     {/* Display Cropped Dimensions */}
                     <div className="text-sm text-muted-foreground">
                         Crop Dimensions: {croppedAreaPixels ? `${Math.round(croppedAreaPixels.width)}px × ${Math.round(croppedAreaPixels.height)}px` : 'Adjust crop area'}
                     </div>

                 </div>

                <DialogFooter className='mt-4'>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isCropping}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleCrop} disabled={isCropping || !croppedAreaPixels || (croppedAreaPixels.width <= 0 || croppedAreaPixels.height <= 0)}>
                        {isCropping ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isCropping ? 'Cropping...' : 'Apply Crop'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
