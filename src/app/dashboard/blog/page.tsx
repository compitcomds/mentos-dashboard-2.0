
'use client'; 

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2, Loader2, AlertCircle, Eye, ImageIcon, LayoutGrid, List, Search, X, ArrowUpDown, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"; 
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { useGetBlogs, useDeleteBlog, type UseGetBlogsOptions } from "@/lib/queries/blog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Blog } from "@/types/blog";
import type { Media } from "@/types/media";
import type { FindMany } from "@/types/strapi_response";
import { useCurrentUser } from "@/lib/queries/user";
import BlogCardGrid from './_components/blog-card-grid';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetCategories } from '@/lib/queries/category';
import type { Categorie } from '@/types/category'; 
import { toast } from '@/hooks/use-toast';
import { getStoredPreference, setStoredPreference } from '@/lib/storage';
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || '';

type ViewMode = 'table' | 'card';
type SortField = 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
type SortOrder = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [
    { label: "10 per page", value: "10" },
    { label: "20 per page", value: "20" },
    { label: "50 per page", value: "50" },
    { label: "100 per page", value: "100" },
];
const SORT_FIELD_OPTIONS: { label: string; value: SortField }[] = [
  { label: "Created At", value: "createdAt" },
  { label: "Updated At", value: "updatedAt" },
  { label: "Published At", value: "publishedAt" },
  { label: "Title", value: "title" },
];
const SORT_ORDER_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: "Ascending", value: "asc" },
  { label: "Descending", value: "desc" },
];

export default function BlogPage() {
   const { data: currentUser, isLoading: isLoadingUser, isError: isUserError } = useCurrentUser();
   const userTenentId = currentUser?.tenent_id;
   
   const [currentPage, setCurrentPage] = React.useState(1);
   const [pageSize, setPageSize] = React.useState(() => getStoredPreference('blogPageSize', DEFAULT_PAGE_SIZE));
   const [sortField, setSortField] = React.useState<SortField>(() => getStoredPreference('blogSortField', 'createdAt'));
   const [sortOrder, setSortOrder] = React.useState<SortOrder>(() => getStoredPreference('blogSortOrder', 'desc'));

   const blogQueryOptions: UseGetBlogsOptions = { page: currentPage, pageSize, sortField, sortOrder };
   const { data: blogData, isLoading: isLoadingBlogs, isError: isBlogsError, error: blogsError, refetch, isFetching } = useGetBlogs(blogQueryOptions);
   
   const { data: categories, isLoading: isLoadingCategories, isError: isCategoriesError } = useGetCategories(userTenentId);
   const deleteMutation = useDeleteBlog();

   const [viewMode, setViewMode] = React.useState<ViewMode>(() => getStoredPreference('blogViewMode', 'table'));
   const [searchTerm, setSearchTerm] = React.useState('');
   const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

   React.useEffect(() => { setStoredPreference('blogPageSize', pageSize); setCurrentPage(1); }, [pageSize]);
   React.useEffect(() => { setStoredPreference('blogSortField', sortField); setCurrentPage(1); }, [sortField]);
   React.useEffect(() => { setStoredPreference('blogSortOrder', sortOrder); setCurrentPage(1); }, [sortOrder]);
   React.useEffect(() => { setStoredPreference('blogViewMode', viewMode); }, [viewMode]);


   const isLoading = isLoadingUser || isLoadingBlogs || isLoadingCategories;
   const isError = isUserError || isBlogsError || isCategoriesError;
   const queryError = isUserError ? new Error("Failed to load user data.") : isBlogsError ? blogsError : isCategoriesError ? new Error("Failed to load categories.") : new Error("An unknown error occurred.");

  const handleDelete = (post: Blog) => { 
      if (!post.documentId) {
        toast({ variant: "destructive", title: "Error", description: "Cannot delete blog: missing string documentId."});
        return;
      }
      deleteMutation.mutate({ documentId: post.documentId, documentIdForInvalidation: post.documentId });
  };

  const getImageUrl = (post: Blog): string | null => {
      const mediaFile = post.image as Media | null;
      const relativeUrl = mediaFile?.url;
      if (!relativeUrl) return null;
      const cleanBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
      const cleanRelativeUrl = relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl;
      return `${cleanBaseUrl}/${cleanRelativeUrl}`;
  }

  const filteredBlogPosts = React.useMemo(() => {
    if (!blogData?.data) return [];
    return blogData.data.filter(post => {
      const matchesSearchTerm = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (post.slug && post.slug.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = !selectedCategoryId || (post.categories && String(post.categories.id) === selectedCategoryId); 
      return matchesSearchTerm && matchesCategory;
    });
  }, [blogData?.data, searchTerm, selectedCategoryId]);

  const pagination = blogData?.meta?.pagination;

  return (
    <TooltipProvider>
        <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
            <div className="flex items-center space-x-2">
                <Tooltip>
                    <TooltipTrigger asChild><Button variant={viewMode === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('table')} aria-label="Table View" disabled={isLoading}><List className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent>Table View</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild><Button variant={viewMode === 'card' ? 'default' : 'outline'} size="icon" onClick={() => setViewMode('card')} aria-label="Card View" disabled={isLoading}><LayoutGrid className="h-4 w-4" /></Button></TooltipTrigger>
                    <TooltipContent>Card View</TooltipContent>
                </Tooltip>
                <Link href="/dashboard/blog/new">
                  <Button disabled={isLoadingUser || !userTenentId}><PlusCircle className="mr-2 h-4 w-4" /> New Post</Button>
                </Link>
            </div>
        </div>

        <Card>
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:flex-grow">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="search" placeholder="Search by title or slug..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-full" disabled={isLoadingBlogs} />
                     {searchTerm && (<Button variant="ghost" size="icon" className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setSearchTerm('')}><X className="h-4 w-4" /><span className="sr-only">Clear search</span></Button>)}
                </div>
                <div className="w-full md:w-auto md:min-w-[200px]">
                    <Select value={selectedCategoryId || ''} onValueChange={(value) => setSelectedCategoryId(value === 'all' ? null : value)} disabled={isLoadingCategories || !categories || categories.length === 0 || isLoadingBlogs}>
                        <SelectTrigger><SelectValue placeholder="Filter by category..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories?.map((category: Categorie) => (<SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>))}
                             {isLoadingCategories && <SelectItem value="loading" disabled>Loading categories...</SelectItem>}
                             {isCategoriesError && <SelectItem value="error" disabled>Error loading categories</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
             <CardContent className="p-4 pt-0 flex flex-col sm:flex-row items-center gap-2 border-t">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Sort:</span>
                </div>
                <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)} disabled={isLoadingBlogs}>
                    <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                    <SelectContent>{SORT_FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)} disabled={isLoadingBlogs}>
                    <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs"><SelectValue placeholder="Order..." /></SelectTrigger>
                    <SelectContent>{SORT_ORDER_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))} disabled={isLoadingBlogs}>
                     <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs"><SelectValue placeholder="Items per page" /></SelectTrigger>
                     <SelectContent>{PAGE_SIZE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                </Select>
            </CardContent>
        </Card>


        {(isLoadingBlogs && !blogData) || (isFetching && !blogData) ? <BlogPageSkeleton viewMode={viewMode} /> : null}

        {isError && !isFetching && (
             <Alert variant="destructive">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Error Loading Data</AlertTitle>
                 <AlertDescription>
                   Could not fetch user data or blog posts. <br />
                   <span className="text-xs">{queryError?.message}</span>
                 </AlertDescription>
                  <Button onClick={() => refetch()} variant="secondary" size="sm" className="mt-2" disabled={isFetching}>
                     {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                     {isFetching ? 'Retrying...' : 'Retry'}
                  </Button>
             </Alert>
         )}

         {!isLoading && !isError && userTenentId && filteredBlogPosts.length === 0 && (
            <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            {blogData?.data && blogData.data.length > 0 ? 'No blog posts match your current filters.' : `No blog posts found for your tenent_id (${userTenentId}). Click "New Post" to create one.`}
            </div>
         )}

         {!isLoading && !isError && userTenentId && filteredBlogPosts.length > 0 && (
           viewMode === 'table' ? (
            <Card className="w-full overflow-x-auto">
                <CardHeader>
                  <CardTitle>Manage Blog Posts</CardTitle>
                  <CardDescription>View, create, edit, and delete your blog posts here. {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                         <TableHead className="w-[50px]">Image</TableHead>
                         <TableHead>Title</TableHead>
                         <TableHead className="hidden md:table-cell">Slug</TableHead>
                         <TableHead className="hidden sm:table-cell">Status</TableHead>
                         <TableHead className="hidden lg:table-cell">Author</TableHead>
                         <TableHead className="hidden lg:table-cell">Category</TableHead>
                         <TableHead className="hidden sm:table-cell">Created At</TableHead>
                         <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBlogPosts.map((post) => {
                            const imageUrl = getImageUrl(post);
                            const authorName = post.author || 'N/A';
                            const categoryName = post.categories?.name ?? 'N/A'; 
                            const createdAtDate = post.createdAt ? new Date(post.createdAt as string) : null;
                            const editLink = post.documentId ? `/dashboard/blog/${post.documentId}` : `/dashboard/blog/${post.id}`;

                            return (
                             <TableRow key={post.id}>
                               <TableCell><div className="flex items-center justify-center h-10 w-10 rounded overflow-hidden border bg-muted">{imageUrl ? (<Image src={imageUrl} alt={post.title || 'Blog post image'} width={40} height={40} className="object-cover h-full w-full" unoptimized />) : (<ImageIcon className="h-5 w-5 text-muted-foreground" />)}</div></TableCell>
                               <TableCell className="font-medium">{post.title}</TableCell>
                               <TableCell className="hidden md:table-cell text-muted-foreground">{post.slug}</TableCell>
                               <TableCell className="hidden sm:table-cell"><Badge variant={post.Blog_status === 'published' ? 'default' : 'secondary'}>{post.Blog_status}</Badge></TableCell>
                               <TableCell className="hidden lg:table-cell text-muted-foreground">{authorName}</TableCell>
                               <TableCell className="hidden lg:table-cell text-muted-foreground">{categoryName}</TableCell>
                               <TableCell className="hidden sm:table-cell text-muted-foreground">{createdAtDate ? (<Tooltip><TooltipTrigger>{format(createdAtDate, "dd MMM yyyy")}</TooltipTrigger><TooltipContent>{format(createdAtDate, "PPP p")}</TooltipContent></Tooltip>) : ('N/A')}</TableCell>
                               <TableCell className="text-right">
                                 <div className="flex justify-end space-x-1">
                                   <Tooltip><TooltipTrigger asChild><Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link href={`/blog/${post.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link></Button></TooltipTrigger><TooltipContent>View Post</TooltipContent></Tooltip>
                                   <Tooltip><TooltipTrigger asChild><Button asChild size="icon" variant="ghost" className="h-8 w-8" disabled={!post.documentId && !post.id}><Link href={editLink}><Pencil className="h-4 w-4" /></Link></Button></TooltipTrigger><TooltipContent>Edit Post</TooltipContent></Tooltip>
                                   <AlertDialog><Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={deleteMutation.isPending && deleteMutation.variables?.documentId === post.documentId || !post.documentId}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent>Delete Post</TooltipContent></Tooltip><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the blog post<span className="font-semibold"> "{post.title}"</span>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(post)} disabled={deleteMutation.isPending && deleteMutation.variables?.documentId === post.documentId} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleteMutation.isPending && deleteMutation.variables?.documentId === post.documentId ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : null}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                 </div>
                               </TableCell>
                             </TableRow>
                           );
                        })}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
           ) : (
            <BlogCardGrid
                blogPosts={filteredBlogPosts}
                getImageUrl={getImageUrl}
                onDelete={handleDelete}
                deleteMutation={deleteMutation}
             />
           )
         )}
          {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isFetching}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pageCount} (Total: {pagination.total} blogs)
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(pagination.pageCount, prev + 1))} disabled={currentPage === pagination.pageCount || isFetching}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
          )}
         {!isLoadingUser && !isUserError && !userTenentId && (<div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">User tenent_id is missing. Cannot display blogs.</div>)}
        </div>
    </TooltipProvider>
  );
}

function BlogPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
  const skeletonItems = Array(viewMode === 'table' ? 5 : 6).fill(0);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <Skeleton className="h-10 w-full md:flex-grow" />
          <Skeleton className="h-10 w-full md:w-[200px]" />
        </CardContent>
         <CardContent className="p-4 pt-0 flex flex-col sm:flex-row items-center gap-2 border-t">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-9 w-full sm:w-[180px]" />
            <Skeleton className="h-9 w-full sm:w-[120px]" />
            <Skeleton className="h-9 w-full sm:w-[150px]" />
        </CardContent>
      </Card>

      {viewMode === 'table' ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead className="w-[50px]"><Skeleton className="h-5 w-full" /></TableHead><TableHead><Skeleton className="h-5 w-3/4" /></TableHead><TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead><TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead><TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead><TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead><TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead><TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead></TableRow></TableHeader>
            <TableBody>{skeletonItems.map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-10 w-10 rounded" /></TableCell><TableCell><Skeleton className="h-4 w-4/5" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell><TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell><TableCell className="text-right"><div className="flex justify-end space-x-1"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell></TableRow>))}</TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{skeletonItems.map((_, i) => (<Card key={i}><CardHeader><Skeleton className="h-32 w-full mb-2 rounded-md" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></CardHeader><CardContent className="space-y-1.5"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter className="flex justify-end space-x-1 pt-4"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></CardFooter></Card>))}</div>
      )}
      <div className="flex items-center justify-between pt-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-8 w-20" /></div>
    </div>
  );
}
