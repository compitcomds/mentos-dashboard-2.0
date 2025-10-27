
"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
  ImageIcon,
  LayoutGrid,
  List,
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import {
  useGetBlogs,
  useDeleteBlog,
  type UseGetBlogsOptions,
} from "@/lib/queries/blog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertTitle,
  AlertDescription as AlertDescriptionComponent,
} from "@/components/ui/alert";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Blog } from "@/types/blog";
import type { Media } from "@/types/media";
import type { FindMany } from "@/types/strapi_response";
import { useCurrentUser } from "@/lib/queries/user";
import BlogCardGrid from "./_components/blog-card-grid";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetCategories } from "@/lib/queries/category";
import type { Categorie } from "@/types/category";
import { toast } from "@/hooks/use-toast";
import { getStoredPreference, setStoredPreference } from "@/lib/storage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";

type ViewMode = "table" | "card";
type SortField = "createdAt" | "updatedAt" | "publishedAt" | "title";
type SortOrder = "asc" | "desc";

const DEFAULT_PAGE_SIZE_BLOG_TABLE = 10;
const DEFAULT_PAGE_SIZE_BLOG_CARD = 9; // Slightly less for card view
const DEFAULT_SORT_FIELD: SortField = "createdAt";
const DEFAULT_SORT_ORDER: SortOrder = "desc";

const PAGE_SIZE_OPTIONS = [
  { label: "9 per page (Card)", value: "9" },
  { label: "10 per page (Table)", value: "10" },
  { label: "12 per page", value: "12" },
  { label: "20 per page", value: "20" },
  { label: "24 per page", value: "24" },
  { label: "50 per page", value: "50" },
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

const getPaginationItems = (
  currentPage: number,
  totalPages: number,
  maxPagesToShow: number = 5
): (number | string)[] => {
  if (totalPages <= 1) return [];
  const items: (number | string)[] = [];
  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
    return items;
  }
  items.push(1);
  let startPage = Math.max(
    2,
    currentPage - Math.floor((maxPagesToShow - 3) / 2)
  );
  let endPage = Math.min(
    totalPages - 1,
    currentPage + Math.floor((maxPagesToShow - 2) / 2)
  );
  if (currentPage - 1 <= Math.floor((maxPagesToShow - 3) / 2))
    endPage = maxPagesToShow - 2;
  if (totalPages - currentPage <= Math.floor((maxPagesToShow - 2) / 2))
    startPage = totalPages - (maxPagesToShow - 3);
  if (startPage > 2) items.push("...");
  for (let i = startPage; i <= endPage; i++) items.push(i);
  if (endPage < totalPages - 1) items.push("...");
  items.push(totalPages);
  return items;
};

export default function BlogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    data: currentUser,
    isLoading: isLoadingUser,
    isError: isUserError,
  } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  const viewMode =
    (searchParams.get("view") as ViewMode | null) ||
    getStoredPreference("blogViewMode", "table");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(
    searchParams.get("limit") ||
      String(
        getStoredPreference(
          "blogPageSize",
          viewMode === "table"
            ? DEFAULT_PAGE_SIZE_BLOG_TABLE
            : DEFAULT_PAGE_SIZE_BLOG_CARD
        )
      ),
    10
  );
  const sortField =
    (searchParams.get("sortBy") as SortField | null) ||
    getStoredPreference("blogSortField", DEFAULT_SORT_FIELD);
  const sortOrder =
    (searchParams.get("order") as SortOrder | null) ||
    getStoredPreference("blogSortOrder", DEFAULT_SORT_ORDER);
  const searchTerm = searchParams.get("search") || "";
  const selectedCategoryId = searchParams.get("category") || null;

  const [localSearchTerm, setLocalSearchTerm] = React.useState(searchTerm);
  React.useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const blogQueryOptions: UseGetBlogsOptions = {
    page: currentPage,
    pageSize,
    sortField,
    sortOrder,
  };
  const {
    data: blogData,
    isLoading: isLoadingBlogs,
    isError: isBlogsError,
    error: blogsError,
    refetch,
    isFetching,
  } = useGetBlogs(blogQueryOptions);

  const {
    data: categoriesData,
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
  } = useGetCategories();
  const categories = categoriesData?.data;
  const deleteMutation = useDeleteBlog();

  const updateUrl = React.useCallback(
    (newParams: Record<string, string | number | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || String(value).trim() === "") current.delete(key);
        else current.set(key, String(value));
      });
      if (newParams.page === 1 || newParams.page === "1")
        current.delete("page"); // Remove page if it's 1
      router.push(`${pathname}?${current.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleViewModeChange = (newMode: ViewMode) => {
    updateUrl({ view: newMode });
    setStoredPreference("blogViewMode", newMode);
  };
  const handlePageChange = (newPage: number) => updateUrl({ page: newPage });
  const handlePageSizeChange = (value: string) => {
    updateUrl({ limit: value, page: null });
    setStoredPreference("blogPageSize", Number(value));
  };
  const handleSortFieldChange = (value: SortField) => {
    updateUrl({ sortBy: value, page: null });
    setStoredPreference("blogSortField", value);
  };
  const handleSortOrderChange = (value: SortOrder) => {
    updateUrl({ order: value, page: null });
    setStoredPreference("blogSortOrder", value);
  };
  const handleCategoryFilterChange = (value: string | null) => {
    updateUrl({ category: value, page: null });
  };
  const applySearchTerm = () =>
    updateUrl({ search: localSearchTerm.trim() || null, page: null });

  const isLoading = isLoadingUser || isLoadingBlogs || isLoadingCategories;
  const isError = isUserError || isBlogsError || isCategoriesError;
  const queryError = isUserError
    ? new Error("Failed to load user data.")
    : isBlogsError
    ? blogsError
    : isCategoriesError
    ? new Error("Failed to load categories.")
    : new Error("An unknown error occurred.");

  const handleDelete = async (post: Blog) => {
    if (!post.documentId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot delete blog: missing string documentId.",
      });
      return;
    }
    deleteMutation.mutate(
      {
        documentId: post.documentId,
        documentIdForInvalidation: post.documentId,
      },
      {
        onSuccess: () => {
          if (filteredBlogPosts.length === 1 && currentPage > 1) {
            handlePageChange(currentPage - 1);
          }
        },
      }
    );
  };

  const getImageUrl = (post: Blog): string | null => {
    const mediaFile = post.image as Media | null;
    const relativeUrl = mediaFile?.url;
    if (!relativeUrl) return null;
    const cleanRelativeUrl = relativeUrl.startsWith("/")
      ? relativeUrl.substring(1)
      : relativeUrl;
    return `${cleanRelativeUrl}`;
  };

  const filteredBlogPosts = React.useMemo(() => {
    if (!blogData?.data) return [];
    // Server-side filtering for search/category is now done by the API query, so client-side filtering might not be needed
    // unless you want to further refine client-side after initial API fetch.
    // For simplicity, assuming API handles the primary filtering based on URL params.
    // Client-side filtering can be re-added if necessary.
    // Current implementation assumes 'blogData.data' is already filtered by the API.
    // If we were still doing client-side search after API fetch:
    // return blogData.data.filter(post => {
    //   const matchesSearchTerm = post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //                             (post.slug && post.slug.toLowerCase().includes(searchTerm.toLowerCase()));
    //   const matchesCategory = !selectedCategoryId || (post.categories && String(post.categories.id) === selectedCategoryId);
    //   return matchesSearchTerm && matchesCategory;
    // });
    return blogData.data;
  }, [blogData?.data, searchTerm, selectedCategoryId]);

  const pagination = blogData?.meta?.pagination;
  const currentFullUrl = `${pathname}?${searchParams.toString()}`;

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Blog Posts</h1>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleViewModeChange("table")}
                  aria-label="Table View"
                  disabled={isLoading}
                >
                  <List className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Table View</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleViewModeChange("card")}
                  aria-label="Card View"
                  disabled={isLoading}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Card View</TooltipContent>
            </Tooltip>
            <Link
              href={`/dashboard/blog/new?returnUrl=${encodeURIComponent(
                currentFullUrl
              )}`}
            >
              <Button disabled={isLoadingUser || !userTenentId}>
                <PlusCircle className="mr-2 h-4 w-4" /> New Post
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Filter & Sort Options</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    <span>Filter & Sort Controls</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                    <div className="relative md:col-span-1">
                      <Label
                        htmlFor="search-blogs"
                        className="text-xs text-muted-foreground mb-1 block"
                      >
                        Search Title/Slug
                      </Label>
                      <Input
                        id="search-blogs"
                        type="search"
                        placeholder="Search..."
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && applySearchTerm()
                        }
                        className="pl-8 h-8 text-xs"
                        disabled={isLoadingBlogs || isFetching}
                      />
                      {localSearchTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 mt-2.5"
                          onClick={() => {
                            setLocalSearchTerm("");
                            updateUrl({ search: null, page: null });
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">Clear search</span>
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor="category-filter"
                        className="text-xs text-muted-foreground mb-1 block"
                      >
                        Filter by Category
                      </Label>
                      <Select
                        value={selectedCategoryId || ""}
                        onValueChange={(value) =>
                          handleCategoryFilterChange(
                            value === "all" ? null : value
                          )
                        }
                        disabled={
                          isLoadingCategories ||
                          !categories ||
                          categories.length === 0 ||
                          isLoadingBlogs ||
                          isFetching
                        }
                      >
                        <SelectTrigger
                          id="category-filter"
                          className="h-8 text-xs"
                        >
                          <SelectValue placeholder="Category..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs">
                            All Categories
                          </SelectItem>
                          {categories?.map((category: Categorie) => (
                            <SelectItem
                              key={category.id}
                              value={String(category.id)}
                              className="text-xs"
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                          {isLoadingCategories && (
                            <SelectItem
                              value="loading"
                              disabled
                              className="text-xs"
                            >
                              Loading...
                            </SelectItem>
                          )}
                          {isCategoriesError && (
                            <SelectItem
                              value="error"
                              disabled
                              className="text-xs"
                            >
                              Error
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={applySearchTerm}
                      size="sm"
                      className="w-full md:w-auto h-8 text-xs px-3 py-1"
                      disabled={isLoadingBlogs || isFetching}
                    >
                      <Search className="h-3.5 w-3.5 mr-1.5" /> Apply Search
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-3 border-t mt-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Sort By
                      </Label>
                      <Select
                        value={sortField}
                        onValueChange={(value) =>
                          handleSortFieldChange(value as SortField)
                        }
                        disabled={isLoadingBlogs || isFetching}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_FIELD_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Order
                      </Label>
                      <Select
                        value={sortOrder}
                        onValueChange={(value) =>
                          handleSortOrderChange(value as SortOrder)
                        }
                        disabled={isLoadingBlogs || isFetching}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Order..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_ORDER_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        Items/Page
                      </Label>
                      <Select
                        value={String(pageSize)}
                        onValueChange={handlePageSizeChange}
                        disabled={isLoadingBlogs || isFetching}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Per page" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {(isLoadingBlogs && !blogData) || (isFetching && !blogData) ? (
          <BlogPageSkeleton viewMode={viewMode} />
        ) : null}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescriptionComponent>
              Could not fetch user data or blog posts. <br />
              <span className="text-xs">{queryError?.message}</span>
            </AlertDescriptionComponent>
            <Button
              onClick={() => refetch()}
              variant="secondary"
              size="sm"
              className="mt-2"
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </Alert>
        )}

        {!isLoading &&
          !isError &&
          userTenentId &&
          filteredBlogPosts.length === 0 && (
            <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
              {blogData?.data && blogData.data.length > 0
                ? "No blog posts match your current filters."
                : `No blog posts found for your tenent_id (${userTenentId}).`}
            </div>
          )}

        {!isLoading &&
          !isError &&
          userTenentId &&
          filteredBlogPosts.length > 0 &&
          (viewMode === "table" ? (
            <Card className="w-full overflow-x-auto">
              <CardHeader>
                <CardTitle>Manage Blog Posts</CardTitle>
                <CardDescription>
                  View, create, edit, and delete your blog posts here.{" "}
                  {isFetching && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Image</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Slug
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Author
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Created At
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBlogPosts.map((post) => {
                      const imageUrl = getImageUrl(post);
                      const authorName = post.author || "N/A";
                      const categoryName = post.categories?.name ?? "N/A";
                      const createdAtDate = post.createdAt
                        ? new Date(post.createdAt as string)
                        : null;
                      const editLink = `/dashboard/blog/${
                        post.documentId || post.id
                      }?returnUrl=${encodeURIComponent(currentFullUrl)}`;
                      const publicUrl = post.seo_blog?.canonicalURL || post.seo_blog?.openGraph?.ogUrl || `/blog/${post.slug}`;

                      return (
                        <TableRow key={post.id}>
                          <TableCell>
                            <div className="flex items-center justify-center h-10 w-10 rounded overflow-hidden border bg-muted">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={post.title || "Blog post image"}
                                  width={40}
                                  height={40}
                                  className="object-cover h-full w-full"
                                  unoptimized
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {post.title}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {post.slug}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge
                              variant={
                                post.Blog_status === "published"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {post.Blog_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {authorName}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {categoryName}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {createdAtDate ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  {format(createdAtDate, "dd MMM yyyy")}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {format(createdAtDate, "PPP p")}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    asChild
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                  >
                                    <Link
                                      href={publicUrl}
                                      target="_blank"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Post</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    asChild
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    disabled={!post.documentId && !post.id}
                                  >
                                    <Link href={editLink}>
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Post</TooltipContent>
                              </Tooltip>
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={
                                          (deleteMutation.isPending &&
                                            deleteMutation.variables
                                              ?.documentId ===
                                              post.documentId) ||
                                          !post.documentId
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete Post</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the blog post
                                      <span className="font-semibold">
                                        {" "}
                                        "{post.title}"
                                      </span>
                                      .
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(post)}
                                      disabled={
                                        deleteMutation.isPending &&
                                        deleteMutation.variables?.documentId ===
                                          post.documentId
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {deleteMutation.isPending &&
                                      deleteMutation.variables?.documentId ===
                                        post.documentId ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : null}
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
          ))}
        {pagination && pagination.pageCount > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isFetching}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <div className="flex items-center gap-1">
              {getPaginationItems(currentPage, pagination.pageCount).map(
                (item, index) =>
                  typeof item === "number" ? (
                    <Button
                      key={`page-${item}-${index}`}
                      variant={currentPage === item ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => handlePageChange(item)}
                      disabled={isFetching}
                    >
                      {item}
                    </Button>
                  ) : (
                    <span
                      key={`ellipsis-${index}`}
                      className="px-1.5 py-1 text-xs flex items-center justify-center h-8 w-8"
                    >
                      ...
                    </span>
                  )
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === pagination.pageCount || isFetching}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
        {!isLoadingUser && !isUserError && !userTenentId && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            User tenent_id is missing. Cannot display blogs.
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function BlogPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
  const skeletonItems = Array(viewMode === "table" ? 5 : 6).fill(0);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-0">
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full rounded-md" />{" "}
          {/* Accordion Trigger Skeleton */}
        </CardContent>
      </Card>

      {viewMode === "table" ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Skeleton className="h-5 w-full" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-5 w-3/4" />
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Skeleton className="h-5 w-1/2" />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Skeleton className="h-5 w-1/3" />
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-1/2" />
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Skeleton className="h-5 w-1/2" />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <Skeleton className="h-5 w-1/3" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="h-5 w-16" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skeletonItems.map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-10 w-10 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-4/5" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-1/2" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-1/2" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skeletonItems.map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-32 w-full mb-2 rounded-md" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </CardHeader>
              <CardContent className="space-y-1.5">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter className="flex justify-end space-x-1 pt-4">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
