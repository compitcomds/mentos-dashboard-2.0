
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Not directly used, FormLabel is
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  useForm,
  SubmitHandler,
  Controller,
  FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import TipTapEditor from "@/components/ui/tiptap";
import { useCreateBlog, useGetBlog, useUpdateBlog } from "@/lib/queries/blog";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Blog,
  BlogFormValues,
  CreateBlogPayload,
  GetMediaUrlFunction,
  GetTagValuesFunction,
  SeoBlogPayload,
  OpenGraphPayload,
} from "@/types/blog";
import type { Categorie } from "@/types/category";
import type { OtherTag } from "@/types/common";
import type { Media } from "@/types/media";
import { Loader2, X, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import MediaSelectorDialog from "@/app/dashboard/web-media/_components/media-selector-dialog";
import NextImage from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { blogFormSchema, seoBlogSchema, openGraphSchema } from "@/types/blog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCurrentUser } from "@/lib/queries/user";
import { useGetCategories } from "@/lib/queries/category";
import { format } from "date-fns";
import type { CombinedMediaData } from "@/types/media";

// Get the API base URL from environment variables, remove trailing '/api' if present
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";

const getMediaUrl: GetMediaUrlFunction = (mediaField) => {
  if (!mediaField) return null;
  const relativeUrl = mediaField.url;
  if (!relativeUrl) return null;
  const fullUrl = relativeUrl.startsWith("http")
    ? relativeUrl
    : `${apiBaseUrl}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  return fullUrl;
};

// Updated to get numeric ID from media object
const getMediaId = (mediaField: Media | null | undefined): number | null => {
  return mediaField?.id ?? null;
};

const getTagValues: GetTagValuesFunction = (tagField) => {
  if (!tagField || !Array.isArray(tagField)) return [];
  return tagField.map((t) => t.tag_value).filter(Boolean) as string[];
};

const formatStructuredData = (data: any): string | null => {
  if (typeof data === "string") {
    try {
      JSON.parse(data);
      return data;
    } catch {
      // If parsing fails but it's a non-empty string, return it as is, assuming it might be pre-formatted or a simple string keyword.
      // If it's an empty string, fall back to default.
      return data.trim() !== ""
        ? data
        : '{ "@context": "https://schema.org", "@type": "Article" }';
    }
  } else if (typeof data === "object" && data !== null) {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return '{ "@context": "https://schema.org", "@type": "Article" }';
    }
  }
  // Default for null, undefined, or unparseable objects
  return '{ "@context": "https://schema.org", "@type": "Article" }';
};

const defaultFormValues: BlogFormValues = {
  title: "",
  excerpt: "",
  slug: "",
  content: "<p></p>",
  image: null,
  categories: null,
  author: null,
  sub_category: "",
  tags: "",
  view: 0,
  Blog_status: "draft",
  seo_blog: {
    // Ensure this matches SeoBlogPayload structure for defaults
    metaTitle: "",
    metaDescription: "",
    metaImage: null,
    openGraph: {
      ogTitle: "",
      ogDescription: "",
      ogImage: null,
      ogUrl: null,
      ogType: "article",
    },
    keywords: null,
    metaRobots: "index, follow",
    metaViewport: "width=device-width, initial-scale=1.0",
    canonicalURL: null,
    structuredData: '{ "@context": "https://schema.org", "@type": "Article" }',
  },
  tenent_id: "",
};

export default function BlogFormPage() {
  const params = useParams();
  const blogDocumentIdFromUrl = params?.id as string | undefined;
  const isEditing = blogDocumentIdFromUrl && blogDocumentIdFromUrl !== "new";
  const router = useRouter();
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  const {
    data: fetchedCategories,
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
  } = useGetCategories(userTenentId);

  const [isLoadingComponent, setIsLoadingComponent] = useState(true); // Renamed from isLoading to avoid conflict
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [currentMediaTarget, setCurrentMediaTarget] = useState<
    "image" | "seo_blog.metaImage" | "seo_blog.openGraph.ogImage" | null
  >(null);
  const [imagePreviews, setImagePreviews] = useState<{
    featured: string | null;
    meta: string | null;
    og: string | null;
  }>({
    featured: null,
    meta: null,
    og: null,
  });
  const [submissionPayloadJson, setSubmissionPayloadJson] = useState<
    string | null
  >(null);

  const {
    data: blogData,
    isLoading: isLoadingBlog,
    isError: isErrorBlog,
    error: errorBlog,
  } = useGetBlog(isEditing ? blogDocumentIdFromUrl : null); // Use string documentId for fetching

  const createMutation = useCreateBlog();
  const updateMutation = useUpdateBlog();

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: defaultFormValues,
  });

  const { control, handleSubmit, reset, setValue, watch } = form;

  const watchedTitle = watch("title", "");
  const watchedExcerpt = watch("excerpt", "");
  const watchedMetaTitle = watch("seo_blog.metaTitle", "");
  const watchedMetaDesc = watch("seo_blog.metaDescription", "");
  const watchedOgTitle = watch("seo_blog.openGraph.ogTitle", "");
  const watchedOgDesc = watch("seo_blog.openGraph.ogDescription", "");

  useEffect(() => {
    if (isLoadingUser) return;

    let initialValues = { ...defaultFormValues };

    if (userTenentId) {
      initialValues.tenent_id = userTenentId;
    } else if (!isEditing) {
      console.error(
        "User tenent_id is missing. Cannot create a new blog post."
      );
    }

    if (isEditing && blogData && !isLoadingBlog && (fetchedCategories || !isCategoriesError)) {
      setIsLoadingComponent(true);
      if (blogData.tenent_id !== userTenentId) {
        toast({
          variant: "destructive",
          title: "Authorization Error",
          description: "You are not authorized to edit this blog post.",
        });
        router.push("/dashboard/blog");
        setIsLoadingComponent(false);
        return;
      }

      const fetchedTags = getTagValues(blogData.tags);
      setTags(fetchedTags);
      if (defaultFormValues.seo_blog) {
        initialValues = {
          ...initialValues,
          title: blogData.title || "",
          excerpt: blogData.excerpt || "",
          slug: blogData.slug || "",
          content: blogData.content || "<p></p>",
          image: getMediaId(blogData.image as Media | null),
          categories: blogData.categories?.id ?? null,
          author: blogData.author || null,
          sub_category: blogData.sub_category || "",
          tags: fetchedTags.join(", "),
          view: blogData.view ?? 0,
          Blog_status: blogData.Blog_status || "draft",
          seo_blog: blogData.seo_blog
            ? {
                metaTitle: blogData.seo_blog.metaTitle || "",
                metaDescription: blogData.seo_blog.metaDescription || "",
                metaImage: getMediaId(
                  blogData.seo_blog?.metaImage as Media | null
                ),
                openGraph: blogData.seo_blog.openGraph
                  ? {
                      ogTitle: blogData.seo_blog.openGraph.ogTitle || "",
                      ogDescription:
                        blogData.seo_blog.openGraph.ogDescription || "",
                      ogImage: getMediaId(
                        blogData.seo_blog.openGraph.ogImage as Media | null
                      ),
                      ogUrl: blogData.seo_blog.openGraph.ogUrl || null,
                      ogType: blogData.seo_blog.openGraph.ogType || "article",
                    }
                  : defaultFormValues.seo_blog.openGraph,
                keywords: blogData.seo_blog.keywords || null,
                metaRobots: blogData.seo_blog.metaRobots || "index, follow",
                metaViewport:
                  blogData.seo_blog.metaViewport ||
                  "width=device-width, initial-scale=1.0",
                canonicalURL: blogData.seo_blog.canonicalURL || null,
                structuredData: formatStructuredData(
                  blogData.seo_blog.structuredData
                ),
              }
            : defaultFormValues.seo_blog,
          tenent_id: blogData.tenent_id || userTenentId || "",
        };
      }

      setImagePreviews({
        featured: getMediaUrl(blogData.image as Media | null),
        meta: getMediaUrl(blogData.seo_blog?.metaImage as Media | null),
        og: getMediaUrl(blogData.seo_blog?.openGraph?.ogImage as Media | null),
      });
    } else if (!isEditing) {
      setImagePreviews({ featured: null, meta: null, og: null });
      setTags([]);
      // For new posts, ensure tenent_id is set if available from current user
      if (userTenentId) {
        initialValues.tenent_id = userTenentId;
      }
    }

    reset(initialValues);
    setIsLoadingComponent(false);
  }, [
    isEditing,
    blogData,
    isLoadingBlog,
    fetchedCategories,
    reset,
    isLoadingUser,
    userTenentId,
    router,
    toast,
    isCategoriesError,
  ]);

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "," || e.key === "Enter") && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tags.includes(newTag) && tags.length < 15) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        setValue("tags", newTags.join(", "), { shouldValidate: true });
      } else if (tags.length >= 15) {
        toast({
          variant: "destructive",
          title: "Tag Limit Reached",
          description: "Maximum 15 tags allowed.",
        });
      }
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      e.preventDefault();
      const newTags = tags.slice(0, -1);
      setTags(newTags);
      setValue("tags", newTags.join(", "), { shouldValidate: true });
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    setValue("tags", newTags.join(", "), { shouldValidate: true });
  };

  const openMediaSelector = (
    target: "image" | "seo_blog.metaImage" | "seo_blog.openGraph.ogImage"
  ) => {
    setCurrentMediaTarget(target);
    setIsMediaSelectorOpen(true);
  };

  const handleMediaSelect = useCallback(
    (selectedMedia: CombinedMediaData) => {
      if (
        !currentMediaTarget ||
        !selectedMedia ||
        typeof selectedMedia.fileId !== "number"
      ) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Media target or selected media ID missing or invalid.",
        });
        setIsMediaSelectorOpen(false);
        return;
      }

      const fileIdToSet = selectedMedia.fileId;
      const previewUrl = selectedMedia.thumbnailUrl || selectedMedia.fileUrl;

      if (selectedMedia.mime?.startsWith("image/")) {
        const targetFieldName = currentMediaTarget;
        const previewTarget =
          targetFieldName === "image"
            ? "featured"
            : targetFieldName === "seo_blog.metaImage"
            ? "meta"
            : "og";

        setValue(targetFieldName, fileIdToSet, { shouldValidate: true });
        setImagePreviews((prev) => ({ ...prev, [previewTarget]: previewUrl }));

        toast({
          title: "Image Selected",
          description: `Set ${targetFieldName} to image ID: ${fileIdToSet}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invalid File Type",
          description: "Please select an image file for this field.",
        });
      }

      setIsMediaSelectorOpen(false);
      setCurrentMediaTarget(null);
    },
    [currentMediaTarget, setValue, toast]
  );

  const removeSelectedImage = (
    target: "image" | "seo_blog.metaImage" | "seo_blog.openGraph.ogImage"
  ) => {
    const previewTarget =
      target === "image"
        ? "featured"
        : target === "seo_blog.metaImage"
        ? "meta"
        : "og";
    setValue(target, null, { shouldValidate: true });
    setImagePreviews((prev) => ({ ...prev, [previewTarget]: null }));
  };

  const onSubmit: SubmitHandler<BlogFormValues> = async (data) => {
    if (!userTenentId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User tenent_id is missing. Cannot submit.",
      });
      return;
    }

    const mutationOptions = {
      onSuccess: () => {
        toast({
          title: "Success",
          description: `Blog post ${
            isEditing ? "updated" : "created"
          } successfully`,
        });
        router.push("/dashboard/blog");
      },
      onError: (err: any) => {
        setSubmissionPayloadJson(
          `Error: ${err.message}\n\n${JSON.stringify(
            err.response?.data || err,
            null,
            2
          )}`
        );
      },
    };

    const tagsPayload: OtherTag[] = data.tags
      ? data.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tagVal) => ({ tag_value: tagVal }))
      : [];
    
    // Destructure 'author' from data and use it for the 'author' field in payload.
    // The rest of 'data' (which excludes 'author' if it was named differently in formValues) is spread.
    const { author: formAuthor, ...restOfData } = data;


    const payload: CreateBlogPayload = {
      ...restOfData,
      tags: tagsPayload,
      tenent_id: userTenentId,
      categories: data.categories, // This is already the single category ID from form
      seo_blog: data.seo_blog
        ? {
            ...data.seo_blog,
            openGraph: data.seo_blog.openGraph ?? openGraphSchema.parse({}),
          }
        : undefined,
      author: formAuthor, // Map the form field 'author' to the API field 'author'
      sub_category: data.sub_category || null,
    };

    setSubmissionPayloadJson(JSON.stringify(payload, null, 2));

    if (isEditing && blogData?.id && blogData.documentId) {
      updateMutation.mutate(
        {
          id: blogData.id, // Numeric ID for the API path for update
          blog: payload,
          numericId: blogData.documentId, // String documentId for cache invalidation
        },
        mutationOptions
      );
    } else {
      createMutation.mutate(payload, mutationOptions);
    }
  };

  const isSubmittingForm = createMutation.isPending || updateMutation.isPending;
  const isPageLoading =
    isLoadingComponent ||
    isLoadingUser ||
    (isEditing && isLoadingBlog) ||
    isLoadingCategories;

  if (isPageLoading) {
    return <BlogFormSkeleton isEditing={!!isEditing} />;
  }
  if (isEditing && isErrorBlog) {
    return (
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-destructive">
          Error Loading Blog Post
        </h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load blog post data. Please try again. DocumentID:{" "}
              {blogDocumentIdFromUrl}
            </p>
            <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
              Error: {errorBlog?.message}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!userTenentId && !isLoadingUser) {
    return (
      <div className="flex flex-col space-y-6 items-center justify-center h-full">
        <h1 className="text-2xl font-bold tracking-tight text-destructive">
          User Tenent ID Missing
        </h1>
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive">
              Could not retrieve your user tenent_id. Cannot create or edit blog
              posts.
            </p>
            <Button onClick={() => router.refresh()} className="mt-4">
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ImageSelectorButton = ({
    target,
  }: {
    target: "image" | "seo_blog.metaImage" | "seo_blog.openGraph.ogImage";
  }) => {
    const previewTarget =
      target === "image"
        ? "featured"
        : target === "seo_blog.metaImage"
        ? "meta"
        : "og";
    const previewUrl = imagePreviews[previewTarget];

    return (
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => openMediaSelector(target)}
          disabled={isSubmittingForm}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {previewUrl ? "Change Image" : "Select Image"}
        </Button>
        {previewUrl && (
          <div className="relative group">
            <div className="relative w-16 h-16 rounded-md border overflow-hidden">
              <NextImage
                src={previewUrl}
                alt={`${target} preview`}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeSelectedImage(target)}
              disabled={isSubmittingForm}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? "Edit Blog Post" : "New Blog Post"}
        </h1>
      </div>
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit as SubmitHandler<FieldValues>)}
          className="flex-1 flex flex-col"
        >
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle>
                {isEditing ? "Edit Your Blog Post" : "Create a New Blog Post"}
              </CardTitle>
              <CardDescription>
                {isEditing ? "Modify the details." : "Fill out the form."}{" "}
                Fields marked with <span className="text-destructive">*</span>{" "}
                are required.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
              <FormField
                control={control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter title"
                        {...field}
                        disabled={isSubmittingForm}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormDescription>
                        Min 10, Max 100 chars. Required.
                      </FormDescription>
                      <span
                        className={cn(
                          "text-xs",
                          watchedTitle.length < 10 || watchedTitle.length > 100
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {watchedTitle.length}/100
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Slug <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., my-awesome-post"
                        {...field}
                        disabled={isSubmittingForm}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase alphanumeric and hyphens only. Required.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Excerpt <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Short summary of the blog post"
                        {...field}
                        disabled={isSubmittingForm}
                        rows={3}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormDescription>
                        Required. Max 250 chars.
                      </FormDescription>
                      <span
                        className={cn(
                          "text-xs",
                          watchedExcerpt.length === 0 ||
                            watchedExcerpt.length > 250
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {watchedExcerpt.length} / 250
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Image</FormLabel>
                    <FormControl>
                      <ImageSelectorButton target="image" />
                    </FormControl>
                    <FormDescription>
                      Optional. Recommended size: 1200x630px.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="">
                <FormField
                  control={control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-[400px]">
                      <FormLabel htmlFor="content">Content</FormLabel>
                      <FormControl>
                        <TipTapEditor
                          key={`blog-editor-${blogDocumentIdFromUrl || "new"}`}
                          content={field.value || "<p></p>"}
                          onContentChange={field.onChange}
                          className="flex-1 min-h-full border border-input rounded-md"
                        />
                      </FormControl>
                      <FormDescription>
                        Main blog content. Optional.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
               <FormField
                control={control}
                name="sub_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter sub category"
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmittingForm}
                      />
                    </FormControl>
                    <FormDescription>Optional.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="">
                <FormField
                  control={control}
                  name="tags"
                  render={() => (
                    <FormItem>
                      <FormLabel htmlFor="tags-input">Tags</FormLabel>
                      <FormControl>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px]">
                            {tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                            <input
                              id="tags-input"
                              type="text"
                              value={tagInput}
                              onChange={handleTagInputChange}
                              onKeyDown={handleTagInputKeyDown}
                              placeholder={
                                tags.length === 0
                                  ? "Add tags (comma/Enter)..."
                                  : ""
                              }
                              className="flex-1 bg-transparent outline-none text-sm min-w-[150px]"
                              disabled={isSubmittingForm || tags.length >= 15}
                            />
                          </div>
                          <Controller
                            name="tags"
                            control={control}
                            render={({ field }) => (
                              <input
                                type="hidden"
                                {...field}
                                value={tags.join(", ")}
                              />
                            )}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Max 15 allowed. Optional.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <FormField
                  control={control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Author Name"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmittingForm}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional. Enter author's name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="categories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value ? parseInt(value) : null)
                        }
                        value={
                          typeof field.value === "string" ||
                          typeof field.value === "number"
                            ? field.value.toString()
                            : ""
                        }
                        disabled={
                          isLoadingCategories ||
                          (fetchedCategories &&
                            fetchedCategories.length === 0) ||
                          isSubmittingForm ||
                          isCategoriesError
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingCategories
                                  ? "Loading..."
                                  : isCategoriesError
                                  ? "Error loading"
                                  : fetchedCategories &&
                                    fetchedCategories.length === 0
                                  ? "No categories"
                                  : "Select category"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fetchedCategories &&
                            fetchedCategories.map((category: Categorie) => (
                              <SelectItem
                                key={category.id}
                                value={category.id!.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Optional.</FormDescription>
                      <FormMessage />
                      {isCategoriesError && (
                        <p className="text-xs text-destructive mt-1">
                          Failed to load categories.
                        </p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="Blog_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Status <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? "draft"}
                        disabled={isSubmittingForm}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Required.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h2 className="text-xl font-semibold tracking-tight">
                  SEO & Social Sharing
                </h2>

                <Card>
                  <CardHeader>
                    <CardTitle>Meta Settings</CardTitle>
                    <CardDescription>
                      Optimize for search engines.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={control}
                      name="seo_blog.metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Meta Title{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Compelling title (max 60 chars)"
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <FormDescription>
                              Max 60 chars. Required.
                            </FormDescription>
                            <span
                              className={cn(
                                "text-xs",
                                (watchedMetaTitle?.length ?? 0) === 0 ||
                                  (watchedMetaTitle?.length ?? 0) > 60
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              )}
                            >
                              {watchedMetaTitle?.length ?? 0}/60
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Meta Description{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Short summary (50-160 chars)"
                              rows={2}
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <FormDescription>
                              Min 50, Max 160 chars. Required.
                            </FormDescription>
                            <span
                              className={cn(
                                "text-xs",
                                (watchedMetaDesc?.length ?? 0) < 50 ||
                                  (watchedMetaDesc?.length ?? 0) > 160
                                  ? "text-destructive"
                                  : "text-muted-foreground"
                              )}
                            >
                              {watchedMetaDesc?.length ?? 0}/160
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.metaImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Image</FormLabel>
                          <FormControl>
                            <ImageSelectorButton target="seo_blog.metaImage" />
                          </FormControl>
                          <FormDescription>
                            Optional. Recommended size: 1200x630px.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.keywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keywords</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Enter comma-separated keywords"
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional. Comma-separated keywords.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.canonicalURL"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Canonical URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="https://example.com/original-post"
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional. If this content is copied from another
                            source.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.metaRobots"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Robots</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? "index, follow"}
                              placeholder="index, follow"
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional. Controls search engine indexing.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.metaViewport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Viewport</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={
                                field.value ??
                                "width=device-width, initial-scale=1.0"
                              }
                              placeholder="width=device-width, initial-scale=1.0"
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional. Defines viewport settings for mobile
                            devices.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seo_blog.structuredData"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Structured Data (JSON-LD)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value ?? ""}
                              placeholder='{ "@context": "https://schema.org", ... }'
                              rows={5}
                              disabled={isSubmittingForm}
                            />
                          </FormControl>
                          <FormDescription>
                            Optional. Must be valid JSON. Helps search engines
                            understand content.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {form.watch("seo_blog") && (
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Open Graph (Social Sharing)
                      </CardTitle>
                      <CardDescription>
                        Customize how content appears on social media.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={control}
                        name="seo_blog.openGraph.ogTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              OG Title{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Title for social (max 70 chars)"
                                disabled={isSubmittingForm}
                              />
                            </FormControl>
                            <div className="flex justify-between items-center">
                              <FormDescription>
                                Max 70 chars. Required.
                              </FormDescription>
                              <span
                                className={cn(
                                  "text-xs",
                                  (watchedOgTitle?.length ?? 0) === 0 ||
                                    (watchedOgTitle?.length ?? 0) > 70
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )}
                              >
                                {watchedOgTitle?.length ?? 0}/70
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="seo_blog.openGraph.ogDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              OG Description{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Description for social (max 200 chars)"
                                rows={2}
                                disabled={isSubmittingForm}
                              />
                            </FormControl>
                            <div className="flex justify-between items-center">
                              <FormDescription>
                                Max 200 chars. Required.
                              </FormDescription>
                              <span
                                className={cn(
                                  "text-xs",
                                  (watchedOgDesc?.length ?? 0) === 0 ||
                                    (watchedOgDesc?.length ?? 0) > 200
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )}
                              >
                                {watchedOgDesc?.length ?? 0}/200
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="seo_blog.openGraph.ogImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OG Image</FormLabel>
                            <FormControl>
                              <ImageSelectorButton target="seo_blog.openGraph.ogImage" />
                            </FormControl>
                            <FormDescription>
                              Optional. Recommended size: 1200x630px.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="seo_blog.openGraph.ogUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OG URL</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="URL for social sharing (e.g., blog post URL)"
                                disabled={isSubmittingForm}
                              />
                            </FormControl>
                            <FormDescription>Optional.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="seo_blog.openGraph.ogType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OG Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? "article"}
                              disabled={isSubmittingForm}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select OG type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="article">Article</SelectItem>
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="book">Book</SelectItem>
                                <SelectItem value="profile">Profile</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Optional. Usually 'article' for blog posts.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col items-end space-y-4 p-4 border-t flex-shrink-0 bg-background sticky bottom-0">
              {submissionPayloadJson && (
                <div className="w-full mb-4 border rounded-md bg-muted p-4 text-xs">
                  <h4 className="text-sm font-semibold mb-2">
                    Submission Payload (Debug):
                  </h4>
                  <pre className="overflow-auto max-h-48 whitespace-pre-wrap">
                    {submissionPayloadJson}
                  </pre>
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmittingForm}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingForm}>
                  {isSubmittingForm ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {isSubmittingForm
                    ? "Saving..."
                    : isEditing
                    ? "Update Post"
                    : "Create Post"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <MediaSelectorDialog
        isOpen={isMediaSelectorOpen}
        onOpenChange={setIsMediaSelectorOpen}
        onMediaSelect={handleMediaSelect}
        returnType="id"
      />
    </div>
  );
}

function BlogFormSkeleton({ isEditing }: { isEditing: boolean }) {
  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <Skeleton className="h-9 w-1/3" />
      </div>
      <Card className="flex-1 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <Skeleton className="h-7 w-1/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/4 mb-1" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-3/4 mt-1" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/4 mb-1" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-3/4 mt-1" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/6 mb-1" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-3 w-1/2 mt-1" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/6 mb-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-1.5 flex-1 flex flex-col min-h-[400px]">
            <Skeleton className="h-4 w-1/6 mb-1" />
            <Skeleton className="h-full w-full flex-1 rounded-md" />
          </div>
          {/* Skeleton for Sub Category */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/4 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/6 mb-1" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-3/4 mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-1/4 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-6 pt-6 border-t">
            <Skeleton className="h-6 w-1/4" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 p-4 border-t flex-shrink-0 bg-background sticky bottom-0">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    </div>
  );
}
