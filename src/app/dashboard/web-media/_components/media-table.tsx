
'use client';

import * as React from 'react';
import Image from 'next/image';
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { MoreHorizontal, ArrowUpDown, Image as ImageIcon, Video, FileText, FileQuestion, Copy, Eye, Edit, Trash2, Loader2 } from 'lucide-react'; // Added Loader2

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { formatDistanceToNow } from 'date-fns';

import EditMediaDialog from './edit-media-dialog';
import PreviewDialog from './preview-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


// Helper function to format bytes into KB/MB/GB
const formatBytes = (bytes: number | null, decimals = 2): string => {
    if (bytes === null || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeValue = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
    return sizeValue + ' ' + (sizes[i] || 'Bytes');
};

// Helper to get file type icon
const getFileTypeIcon = (mime: string | null): React.ReactElement => {
    if (!mime) return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
    if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (mime.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    return <FileQuestion className="h-5 w-5 text-muted-foreground" />;
};

// Component for the Actions dropdown
const MediaActions: React.FC<{
  media: CombinedMediaData;
  onEdit: (media: CombinedMediaData) => void;
  onPreview: (media: CombinedMediaData) => void;
}> = ({ media, onEdit, onPreview }) => {
    const { toast } = useToast();
    const deleteMutation = useDeleteMediaMutation();
    const [isAlertDialogOpen, setIsAlertDialogOpen] = React.useState(false); // State for alert dialog

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
        console.log('Deleting media:', media.webMediaId, 'File ID:', media.fileId);
        if (media.webMediaId === undefined || media.webMediaId === null) {
            toast({ variant: 'destructive', title: 'Error', description: 'Media ID missing, cannot delete.' });
            setIsAlertDialogOpen(false); // Close dialog if ID is missing
            return;
        }

        deleteMutation.mutate(
            // Ensure correct IDs are passed
            { webMediaId: media.webMediaId, fileId: media.fileId },
            {
                onSuccess: () => {
                    // Toast handled by hook
                    setIsAlertDialogOpen(false); // Close dialog on success
                },
                onError: () => {
                    // Toast handled by hook
                    // Keep dialog open on error for user feedback or retry?
                    // setIsAlertDialogOpen(false); // Or close it
                }
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
                            // Disable trigger if mutation is pending for *this specific item*
                             disabled={deleteMutation.isPending && deleteMutation.variables?.webMediaId === media.webMediaId}
                             onSelect={(e) => e.preventDefault()} // Prevent closing dropdown
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
                         and its associated metadata. The actual file will also be deleted.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
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
    );
};


// Define table columns using CombinedMediaData
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
         enableSorting: false,
    },
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Name
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-medium capitalize">{row.getValue('name')}</div>,
    },
    {
        accessorKey: 'fileName',
        header: 'Original Filename',
         cell: ({ row }) => <div className="text-muted-foreground truncate max-w-xs">{row.getValue('fileName') || '-'}</div>,
         enableSorting: true,
    },
    {
        accessorKey: 'alt',
        header: 'Alt Text',
         cell: ({ row }) => <div className="text-muted-foreground truncate max-w-xs">{row.getValue('alt') || '-'}</div>,
    },
    {
        accessorKey: 'mime',
        header: 'Type',
        cell: ({ row }) => <Badge variant="outline">{row.getValue('mime') || 'N/A'}</Badge>,
    },
    {
        accessorKey: 'size',
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Size
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="whitespace-nowrap">{formatBytes(row.getValue('size'))}</div>,
    },
    {
        accessorKey: 'createdAt',
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Uploaded
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
         cell: ({ row }) => {
            const dateValue = row.getValue('createdAt');
            if (!dateValue) return <div>-</div>;
            try {
                const date = new Date(dateValue as string);
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
    },
    {
        id: 'actions',
         enableHiding: false,
         cell: ({ row }) => {
             const media = row.original;
             // Pass down necessary props to MediaActions
             return <MediaActions media={media} onEdit={onEdit} onPreview={onPreview} />;
        },
    },
];

// Main DataTable component
interface MediaTableProps {
    data: CombinedMediaData[];
}

export default function MediaTable({ data }: MediaTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

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

     // Memoize columns
     const tableColumns = React.useMemo(() => columns(handleEdit, handlePreview), []);


    const table = useReactTable({
        data,
        columns: tableColumns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
         initialState: {
             pagination: {
                 pageSize: 10,
             },
             sorting: [{ id: 'createdAt', desc: true }],
         },
    });

    return (
        <TooltipProvider>
             <div className="w-full">
                <div className="flex items-center py-4">
                    <Input
                        placeholder="Filter by name..."
                        value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
                        onChange={(event) =>
                            table.getColumn('name')?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                </div>
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
                <div className="flex items-center justify-end space-x-2 py-4">
                     <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredRowModel().rows.length} row(s) displayed.
                    </div>
                    <div className="space-x-2">
                         <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                             disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {selectedMedia && (
                <EditMediaDialog
                    isOpen={isEditOpen}
                     onOpenChange={setIsEditOpen}
                    media={selectedMedia}
                    onSuccess={() => {
                         setIsEditOpen(false);
                        // Refetch handled by mutation hook
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
