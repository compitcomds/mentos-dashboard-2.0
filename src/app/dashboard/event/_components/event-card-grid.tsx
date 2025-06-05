
'use client';

import * as React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PlusCircle, Pencil, Trash2, Loader2, Eye, CalendarIcon, MapPin } from 'lucide-react';
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
import type { Event } from '@/types/event'; // Make sure this path is correct

type deleteMutationTypes = UseMutationResult<Event | void, Error,string, unknown> | UseMutationResult<void | Event, Error, { documentId: string; numericId?: string | undefined; }, unknown>

interface EventCardGridProps {
  events: Event[];
  onDelete: (id: string) => void;
  deleteMutation: deleteMutationTypes;
}

export default function EventCardGrid({
  events,
  onDelete,
  deleteMutation,
}: EventCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        const eventDateTime = event.event_date_time ? new Date(event.event_date_time) : null;

        return (
          <Card key={event.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg truncate">{event.title}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground truncate">
                Category: {event.category}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
              {eventDateTime && (
                <div className="flex items-center text-muted-foreground">
                  <CalendarIcon className="mr-1.5 h-4 w-4" />
                  {format(eventDateTime, "PPP p")}
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                <MapPin className="mr-1.5 h-4 w-4" />
                <span className="truncate" title={event.location?event.location:""}>
                    {event.location}
                </span>
              </div>
              <div>
                <Badge variant={event.event_status === 'Published' ? 'default' : 'secondary'}>
                  {event.event_status}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-1 pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    <Link href={`/events/${event.id}`} target="_blank">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview Event</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    <Link href={`/dashboard/event/${event.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Event</TooltipContent>
              </Tooltip>
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending && deleteMutation.variables === String(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete Event</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the event: "{event.title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(String(event.id))}
                      disabled={deleteMutation.isPending && deleteMutation.variables === String(event.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === String(event.id) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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