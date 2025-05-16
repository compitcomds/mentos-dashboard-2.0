
'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PlusCircle, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/lib/queries/user';
import {
  useGetCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/queries/category';
import type { Categorie as Category, CreateCategoryPayload } from '@/types/category';

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }),
  description: z.string().optional(),
  slug: z.string().min(1, { message: 'Slug is required.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug must be lowercase alphanumeric with hyphens.' }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoriesPage() {
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userKey = currentUser?.tenent_id;

  const { data: categories, isLoading: isLoadingCategories, isError, error, refetch, isFetching } = useGetCategories(userKey);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      slug: '',
    },
  });

  const handleOpenForm = (category?: Category) => {
    setSelectedCategory(category || null);
    form.reset(category ? {
      name: category.name || '',
      description: category.description || '',
      slug: category.slug || '',
    } : {
      name: '',
      description: '',
      slug: '',
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCategory(null);
    form.reset();
  };

  const onSubmit = (values: CategoryFormValues) => {
    if (!userKey) {
      toast({ variant: 'destructive', title: 'Error', description: 'User tenent_id not found.' });
      return;
    }

    if (selectedCategory && selectedCategory.documentId) {
      updateMutation.mutate({ documentId: selectedCategory.documentId, category: values }, {
        onSuccess: () => {
          handleCloseForm();
        },
      });
    } else {
      const createPayload: CreateCategoryPayload = { ...values, tenent_id: userKey };
      createMutation.mutate(createPayload, {
        onSuccess: () => {
          handleCloseForm();
        },
      });
    }
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsAlertOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCategory && selectedCategory.documentId && userKey) {
      deleteMutation.mutate({ documentId: selectedCategory.documentId, userKey: userKey }, {
        onSuccess: () => {
          setIsAlertOpen(false);
          setSelectedCategory(null);
        },
        onError: () => {
            setIsAlertOpen(false);
        }
      });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Category documentId not found or user key missing for deletion.' });
        setIsAlertOpen(false);
        setSelectedCategory(null);
    }
  };

  const isLoading = isLoadingUser || isLoadingCategories;
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

        {(isLoading || isFetching) && <CategoryPageSkeleton />}

        {isError && !isFetching && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Categories</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || 'Could not fetch categories.'}
              <Button onClick={() => refetch()} variant="secondary" size="sm" className="ml-2 mt-2" disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && userKey && categories && categories.length === 0 && (
          <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
            No categories found. Click "New Category" to create one.
          </div>
        )}

        {!isLoading && !isError && userKey && categories && categories.length > 0 && (
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
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleOpenForm(category)}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={mutationPending || !category.documentId} // Disable if no documentId for update
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Category</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleDelete(category)}
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={mutationPending || !category.documentId}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Category</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!isLoadingUser && !userKey && (
            <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
                User tenent_id is missing. Cannot display categories.
            </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
            <DialogDescription>
              {selectedCategory ? 'Update the details of your category.' : 'Fill in the details to create a new category.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Category Name" {...field} disabled={mutationPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="category-slug" {...field} disabled={mutationPending} />
                    </FormControl>
                    <FormDescription>Lowercase alphanumeric and hyphens only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of the category" {...field} disabled={mutationPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={mutationPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={mutationPending}>
                  {mutationPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {selectedCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category
              <span className="font-semibold"> "{selectedCategory?.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutationPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={mutationPending || !selectedCategory?.documentId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function CategoryPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-5 w-1/3" /></TableHead>
                  <TableHead><Skeleton className="h-5 w-1/3" /></TableHead>
                  <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4/5" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
