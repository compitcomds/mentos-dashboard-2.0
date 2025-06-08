
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDescriptionComponent,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDescriptionComponent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Pencil, Trash2, Loader2, AlertCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/lib/queries/user';
import {
  useGetCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type UseGetCategoriesOptions,
} from '@/lib/queries/category';
import type { Categorie as Category, CreateCategoryPayload } from '@/types/category';
import { getStoredPreference, setStoredPreference } from '@/lib/storage';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  description: z.string().optional(),
  slug: z.string().min(1, { message: 'Slug is required.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

type SortField = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const DEFAULT_PAGE_SIZE_CATEGORIES = 10;
const PAGE_SIZE_OPTIONS_CATEGORIES = [
    { label: "10 per page", value: "10" }, { label: "20 per page", value: "20" },
    { label: "50 per page", value: "50" }, { label: "100 per page", value: "100" },
];
const SORT_FIELD_OPTIONS_CATEGORIES: { label: string; value: SortField }[] = [
  { label: "Name", value: "name" }, { label: "Created At", value: "createdAt" },
  { label: "Updated At", value: "updatedAt" },
];
const SORT_ORDER_OPTIONS_CATEGORIES: { label: string; value: SortOrder }[] = [
  { label: "Ascending", value: "asc" }, { label: "Descending", value: "desc" },
];

export default function CategoriesPage() {
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userKey = currentUser?.tenent_id;

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(() => getStoredPreference('categoriesPageSize', DEFAULT_PAGE_SIZE_CATEGORIES));
  const [sortField, setSortField] = React.useState<SortField>(() => getStoredPreference('categoriesSortField', 'name'));
  const [sortOrder, setSortOrder] = React.useState<SortOrder>(() => getStoredPreference('categoriesSortOrder', 'asc'));

  const categoryQueryOptions: UseGetCategoriesOptions = { page: currentPage, pageSize, sortField, sortOrder };
  const { data: categoriesData, isLoading: isLoadingCategories, isError, error, refetch, isFetching } = useGetCategories(categoryQueryOptions);
  
  const categories = categoriesData?.data || [];
  const pagination = categoriesData?.meta?.pagination;
  
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);

  React.useEffect(() => { setStoredPreference('categoriesPageSize', pageSize); setCurrentPage(1); }, [pageSize]);
  React.useEffect(() => { setStoredPreference('categoriesSortField', sortField); setCurrentPage(1); }, [sortField]);
  React.useEffect(() => { setStoredPreference('categoriesSortOrder', sortOrder); setCurrentPage(1); }, [sortOrder]);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', description: '', slug: '' },
  });

  const handleOpenForm = (category?: Category) => {
    setSelectedCategory(category || null);
    form.reset(category ? {
      name: category.name || '', description: category.description || '', slug: category.slug || '',
    } : { name: '', description: '', slug: '' });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false); setSelectedCategory(null); form.reset();
  };

  const onSubmit = (values: CategoryFormValues) => {
    if (!userKey) {
      toast({ variant: 'destructive', title: 'Error', description: 'User tenent_id not found.' });
      return;
    }
    if (selectedCategory && selectedCategory.documentId) {
      updateMutation.mutate({ documentId: selectedCategory.documentId, category: values }, { onSuccess: handleCloseForm });
    } else {
      createMutation.mutate({ ...values, tenent_id: userKey }, { onSuccess: handleCloseForm });
    }
  };

  const handleDelete = (category: Category) => { setSelectedCategory(category); setIsAlertOpen(true); };

  const confirmDelete = () => {
    if (selectedCategory?.documentId && userKey) {
      deleteMutation.mutate({ documentId: selectedCategory.documentId, userKey }, {
        onSuccess: () => { setIsAlertOpen(false); setSelectedCategory(null); },
        onError: () => setIsAlertOpen(false)
      });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Category documentId or user key missing.' });
      setIsAlertOpen(false); setSelectedCategory(null);
    }
  };

  const isLoadingPage = isLoadingUser || isLoadingCategories;
  const mutationPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <Button onClick={() => handleOpenForm()} disabled={isLoadingUser || !userKey || mutationPending}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Category
          </Button>
        </div>

         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sort Options</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Filter className="h-4 w-4" />
                                <span>Sorting & Pagination</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-3 space-y-3">
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Sort By</Label>
                                    <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)} disabled={isLoadingCategories || isFetching}>
                                        <SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder="Sort by..." /></SelectTrigger>
                                        <SelectContent>{SORT_FIELD_OPTIONS_CATEGORIES.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Order</Label>
                                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)} disabled={isLoadingCategories || isFetching}>
                                        <SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder="Order..." /></SelectTrigger>
                                        <SelectContent>{SORT_ORDER_OPTIONS_CATEGORIES.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1 block">Items/Page</Label>
                                    <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))} disabled={isLoadingCategories || isFetching}>
                                        <SelectTrigger className="w-full h-8 text-xs"><SelectValue placeholder="Per page" /></SelectTrigger>
                                        <SelectContent>{PAGE_SIZE_OPTIONS_CATEGORIES.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>

        {(isLoadingPage || (isFetching && !categoriesData)) && <CategoryPageSkeleton />}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Categories</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || 'Could not fetch categories.'}
              <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoadingPage && !isError && userKey && categories.length === 0 && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            No categories found. Click "New Category" to create one.
          </div>
        )}

        {!isLoadingPage && !isError && userKey && categories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
              <CardDescription>View, create, edit, and delete your categories. {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="hidden sm:table-cell">Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id || category.documentId}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.slug || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-xs">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {category.createdAt ? format(new Date(category.createdAt), "dd MMM yyyy") : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Tooltip><TooltipTrigger asChild><Button onClick={() => handleOpenForm(category)} size="icon" variant="ghost" className="h-8 w-8" disabled={mutationPending || !category.documentId}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit Category</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button onClick={() => handleDelete(category)} size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={mutationPending || !category.documentId}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete Category</TooltipContent></Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
         {pagination && pagination.pageCount > 1 && (
            <div className="flex items-center justify-between pt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isFetching}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pageCount} (Total: {pagination.total} categories)
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(pagination.pageCount, prev + 1))} disabled={currentPage === pagination.pageCount || isFetching}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
          )}

        {!isLoadingUser && !userKey && (<div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">User tenent_id is missing. Cannot display categories.</div>)}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
            <DialogDescriptionComponent>
              {selectedCategory ? 'Update details.' : 'Fill in details.'}
            </DialogDescriptionComponent>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="Category Name" {...field} disabled={mutationPending} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="slug" render={({ field }) => (<FormItem><FormLabel>Slug <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="category-slug" {...field} disabled={mutationPending} /></FormControl><FormDescription>Lowercase alphanumeric & hyphens.</FormDescription><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Brief description" {...field} disabled={mutationPending} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={mutationPending}>Cancel</Button></DialogClose><Button type="submit" disabled={mutationPending}>{mutationPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{selectedCategory ? 'Save Changes' : 'Create'}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescriptionComponent>This will permanently delete category "<span className="font-semibold">{selectedCategory?.name}</span>".</AlertDialogDescriptionComponent></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={mutationPending}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} disabled={mutationPending || !selectedCategory?.documentId} className="bg-destructive hover:bg-destructive/90">{deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function CategoryPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><Skeleton className="h-9 w-1/3" /><Skeleton className="h-10 w-32" /></div>
      <Card>
          <CardHeader className="pb-0"><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full rounded-md" /> {/* Accordion Trigger Skeleton */}
          </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-7 w-1/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
        <CardContent><div className="rounded-md border"><Table><TableHeader><TableRow><TableHead><Skeleton className="h-5 w-1/3" /></TableHead><TableHead><Skeleton className="h-5 w-1/3" /></TableHead><TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead><TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead><TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead></TableRow></TableHeader><TableBody>{[...Array(3)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-4 w-4/5" /></TableCell><TableCell><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell><TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell><TableCell className="text-right"><div className="flex justify-end space-x-1"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell></TableRow>))}</TableBody></Table></div></CardContent>
      </Card>
      <div className="flex items-center justify-between pt-4"><Skeleton className="h-8 w-24" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-8 w-20" /></div>
    </div>
  );
}

    