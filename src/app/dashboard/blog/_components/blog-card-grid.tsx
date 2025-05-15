
'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Pencil, Trash2, Loader2, Eye, ImageIcon } from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Blog } from '@/types/blog';
import type { Media } from '@/types/media'; // Import Media type

interface BlogCardGridProps {
  blogPosts: Blog[];
  getImageUrl: (post: Blog) => string | null;
  onDelete: (id: string) => void;
  deleteMutation: UseMutationResult<Blog | void, Error, string, unknown>;
}

export default function BlogCardGrid({
  blogPosts,
  getImageUrl,
  onDelete,
  deleteMutation,
}: BlogCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {blogPosts.map((post) => {
        const imageUrl = getImageUrl(post);
        const authorName = post.author || 'N/A'; // Use post.author (string)
        const categoryName = Array.isArray(post.categories) && post.categories.length > 0 && post.categories[0]?.name ? post.categories[0].name : 'N/A';
        const createdAtDate = post.createdAt ? new Date(post.createdAt as string) : null; // Cast to string for Date constructor

        return (
          <Card key={post.id} className="flex flex-col">
            <CardHeader>
              <div className="relative aspect-video rounded-md overflow-hidden mb-2 border bg-muted">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={post.title || 'Blog post image'}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardTitle className="text-lg truncate">{post.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate">
                Slug: {post.slug}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
              <div>
                <Badge variant={post.Blog_status === 'published' ? 'default' : 'secondary'}>
                  {post.Blog_status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Author: <span className="font-medium text-foreground">{authorName}</span>
              </p>
              <p className="text-muted-foreground">
                Category: <span className="font-medium text-foreground">{categoryName}</span>
              </p>
              {createdAtDate && (
                <p className="text-xs text-muted-foreground">
                  Created: {format(createdAtDate, "PPP")}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end space-x-1 pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    {/* Assuming public blog view path, adjust if necessary */}
                    <Link href={`/blog/${post.slug}`} target="_blank">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View Post</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    <Link href={`/dashboard/blog/${post.id}`}>
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
                        disabled={deleteMutation.isPending && deleteMutation.variables === String(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete Post</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the blog post
                      <span className="font-semibold"> "{post.title}"</span>.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(String(post.id))}
                      disabled={deleteMutation.isPending && deleteMutation.variables === String(post.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === String(post.id) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
