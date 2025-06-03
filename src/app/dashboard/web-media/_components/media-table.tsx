
'use client';

import * as React from 'react';
import Image from 'next/image';
import {
    ColumnDef,
    // ColumnFiltersState, // Removed, filters managed by parent
    // SortingState, // Removed, sorting managed by parent
    VisibilityState,
    flexRender,
    getCoreRowModel,
    // getFilteredRowModel, // Removed, filtering managed by parent
    getPaginationRowModel, // Keep for client-side pagination display logic if table manages its own display
    // getSortedRowModel, // Removed, sorting managed by parent
    useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Image as ImageIcon, Video, FileText, FileQuestion, Copy, Eye, Edit, Trash2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Input removed as main table filter is handled by parent
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useDeleteMediaMutation } from '@/lib/queries/media';
import type { CombinedMediaData } from '@/types/media';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns'; // Added parseISO and isValid

import EditMediaDialog from './edit-media-dialog';
import PreviewDialog from './preview-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const formatBytes = (bytes: number | null, decimals = 2): string => {
    if (bytes === null || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeValue = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return sizeValue + ' ' + (sizes[i] || 'Bytes');
};

const getFileTypeIcon = (mime: string | null): React.ReactElement => {
    if (!mime) return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
    if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (mime.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
};

const MediaActions: React.FC<{
  media: CombinedMediaData;
  onEdit: (media: CombinedMediaData) => void;
  onPreview: (media: CombinedMediaData) => void;
}> = ({ media, onEdit, onPreview }) => {
    const { toast } = useToast();
    const deleteMutation = useDeleteMediaMutation();
    const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false);

    const handleCopyUrl = () => {
        if (media.fileUrl) {
            navigator.clipboard.writeText(media.fileUrl)
                .then(() => toast({ title: 'Success', description: 'File URL copied to clipboard.' }))
                .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to copy URL.' }));
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'File URL is not available.' });
        }
    };

    const handleDelete = () => {
        const webMediaIdToDelete = media.webMediaId;
        const fileIdToDelete = media.fileId;

        if (webMediaIdToDelete === undefined || webMediaIdToDelete === null) {
            toast({ variant: "destructive", title: "Error", description: "Cannot delete media: WebMedia identifier (numeric ID) missing."});
            setIsAlertDialogOpen(false);
            return;
        }

        deleteMutation.mutate(
            { webMediaId: webMediaIdToDelete, fileId: fileIdToDelete },
            {
                onSuccess: () => { setIsAlertDialogOpen(false); },
                onError: () => { setIsAlertDialogOpen(false); }
            }
        );
    };


    return (
        <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleCopyUrl} disabled={!media.fileUrl}>
                        <Copy className="mr-2 h-4 w-4" /> Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPreview(media)} disabled={!media.fileUrl}>
                         <Eye className="mr-2 h-4 w-4" /> Preview
                     </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(media)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Metadata
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                     <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                             disabled={deleteMutation.isPending && deleteMutation.variables?.webMediaId === media.webMediaId}
                             onSelect={(e) => e.preventDefault()}
                        >
                             {deleteMutation.isPending && deleteMutation.variables?.webMediaId === media.webMediaId ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                             ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                             )}
                            Delete
                         </DropdownMenuItem>
                    </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the media file
                        <span className="font-semibold"> "{media.name || media.fileName}" </span>
                         and its associated metadata. The actual file in the media library (if linked by ID: {media.fileId || 'N/A'}) will also be attempted to be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                         {deleteMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : null}
                         {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                     </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export const columns: (
    onEdit: (media: CombinedMediaData) => void,
    onPreview: (media: CombinedMediaData) => void,
) => ColumnDef<CombinedMediaData>[] = (onEdit, onPreview) => [
    {
        accessorKey: 'thumbnailUrl',
        header: 'Preview',
        cell: ({ row }) => {
             const media = row.original;
             const previewUrl = media.thumbnailUrl ?? '';
             const mimeType = media.mime ?? '';

             return (
                 <div className="flex items-center justify-center h-10 w-10 rounded overflow-hidden border bg-muted">
                     {mimeType.startsWith('image/') && previewUrl ? (
                         <Image
                            src={previewUrl}
                            alt={media.alt || media.name || 'Media preview'}
                            width={40}
                            height={40}
                            className="object-cover h-full w-full"
                            unoptimized
                         />
                     ) : (
                         getFileTypeIcon(mimeType)
                     )}
                 </div>
             );
        },
         enableSorting: false, // Sorting for preview doesn't make sense
    },
    {
        accessorKey: 'name',
        header: 'Name', // Parent component will handle sort button
        cell: ({ row }) => <div className="font-medium capitalize">{row.getValue('name')}</div>,
        enableSorting: true,
    },
     {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => <div className="text-muted-foreground">{row.getValue('category') || '-'}</div>,
        enableSorting: true,
    },
    {
        accessorKey: 'mime',
        header: 'Type',
        cell: ({ row }) => <Badge variant="outline">{row.getValue('mime') || 'N/A'}</Badge>,
        enableSorting: true,
    },
    {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => <div className="whitespace-nowrap">{formatBytes(row.getValue('size'))}</div>,
        enableSorting: true,
    },
    {
        accessorKey: 'createdAt',
        header: 'Uploaded',
         cell: ({ row }) => {
            const dateValue = row.getValue('createdAt') as string | Date | undefined;
            if (!dateValue) return <div>-</div>;
            try {
                const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
                if (!isValid(date)) return <div>Invalid Date</div>;
                const relativeTime = formatDistanceToNow(date, { addSuffix: true });
                return (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                               <div className="whitespace-nowrap">{relativeTime}</div>
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>{date.toLocaleString()}</p>
                            </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                );
            } catch (e) {
                 console.error("Error formatting date:", dateValue, e);
                 return <div>Invalid Date</div>;
            }
        },
        enableSorting: true,
    },
     {
        accessorKey: 'publishedAt',
        header: 'Published',
         cell: ({ row }) => {
            const dateValue = row.getValue('publishedAt') as string | Date | undefined | null;
            if (!dateValue) return <Badge variant="secondary">Draft</Badge>;
            try {
                const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
                 if (!isValid(date)) return <div>Invalid Date</div>;
                const relativeTime = formatDistanceToNow(date, { addSuffix: true });
                return (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                               <div className="whitespace-nowrap">{relativeTime}</div>
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>{date.toLocaleString()}</p>
                            </TooltipContent>
                        </Tooltip>
                     </TooltipProvider>
                );
            } catch (e) {
                 console.error("Error formatting publishedAt date:", dateValue, e);
                 return <div>Invalid Date</div>;
            }
        },
        enableSorting: true,
    },
    {
        id: 'actions',
         enableHiding: false,
         header: () => <div className="text-right">Actions</div>,
         cell: ({ row }) => {
             const media = row.original;
             return <div className="text-right"><MediaActions media={media} onEdit={onEdit} onPreview={onPreview} /></div>;
        },
    },
];

interface MediaTableProps {
    data: CombinedMediaData[];
    // Removed pagination and sorting props as they are managed by parent now
}

export default function MediaTable({ data }: MediaTableProps) {
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [selectedMedia, setSelectedMedia] = React.useState<CombinedMediaData | null>(null);

    const handleEdit = (media: CombinedMediaData) => {
        setSelectedMedia(media);
        setIsEditOpen(true);
    };

    const handlePreview = (media: CombinedMediaData) => {
        setSelectedMedia(media);
        setIsPreviewOpen(true);
    };

     const tableColumns = React.useMemo(() => columns(handleEdit, handlePreview), []);

    // Table instance now mainly for rendering, pagination/sorting controlled by parent
    const table = useReactTable({
        data,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        // The parent `WebMediaPage` handles pagination state and data fetching.
        // This table component just renders the data it receives.
        // We don't need table.previousPage(), table.nextPage() etc. here.
        // Similarly, sorting and filtering are handled by parent based on API response.
        manualPagination: true, // Indicate pagination is handled externally
        manualSorting: true,    // Indicate sorting is handled externally
        getRowId: (row) => String(row.webMediaId),
    });

    return (
        <TooltipProvider>
             <div className="w-full">
                {/* Filter input is now in the parent WebMediaPage */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && 'selected'}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={tableColumns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {/* Pagination controls are now in the parent WebMediaPage */}
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

        </TooltipProvider>
    );
}
