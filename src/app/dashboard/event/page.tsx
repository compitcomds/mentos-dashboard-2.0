
'use client';

import * as React from 'react';
import Link from "next/link";
import { format } from "date-fns";
import { PlusCircle, Pencil, Trash2, Loader2, AlertCircle, Eye, CalendarIcon, MapPin, LayoutGrid, List } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useGetEvents, useDeleteEvent } from "@/lib/queries/event";
import { useCurrentUser } from '@/lib/queries/user';
import EventCardGrid from './_components/event-card-grid'; 
import type { Event } from '@/types/event'; // Import Event type

type ViewMode = 'table' | 'card';

export default function EventPage() {
   const { data: currentUser, isLoading: isLoadingUser, isError: isUserError } = useCurrentUser();
   const userKey = currentUser?.tenent_id;
   const { data: events, isLoading: isLoadingEvents, isError: isEventsError, error: eventsError, refetch, isFetching } = useGetEvents();
   const deleteMutation = useDeleteEvent();
   const [viewMode, setViewMode] = React.useState<ViewMode>('table');

   const isLoading = isLoadingUser || isLoadingEvents;
   const isError = isUserError || isEventsError;
   const error = isUserError ? new Error("Failed to load user data.") : eventsError;

    React.useEffect(() => {
        // console.log("[EventPage] Current User:", currentUser);
        // console.log("[EventPage] User Key (tenent_id):", userKey);
        // console.log("[EventPage] Events Data:", events);
        // console.log("[EventPage] Is Loading User:", isLoadingUser);
        // console.log("[EventPage] Is Loading Events:", isLoadingEvents);
        // console.log("[EventPage] Is Combined Loading:", isLoading);
        // console.log("[EventPage] Is Events Error:", isEventsError);
        // console.log("[EventPage] Events Error Object:", eventsError);
        // console.log("[EventPage] Is Combined Error:", isError);
        // console.log("[EventPage] Combined Error Object:", error);
        // console.log("[EventPage] Is Fetching (useGetEvents):", isFetching);
    }, [currentUser, userKey, events, isLoadingUser, isLoadingEvents, isLoading, isEventsError, eventsError, isError, error, isFetching]);


   const handleDelete = (eventToDelete: Event) => { // Accept full event object
       if (!eventToDelete.documentId) {
            console.error("Cannot delete event: documentId is missing.", eventToDelete);
            toast({ variant: "destructive", title: "Error", description: "Cannot delete event: missing identifier."});
            return;
       }
       deleteMutation.mutate({ 
           documentId: eventToDelete.documentId, 
           numericId: eventToDelete.id ? String(eventToDelete.id) : undefined 
       });
   };

   return (
     <TooltipProvider>
       <div className="flex flex-col space-y-6">
         <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold tracking-tight">Events</h1>
           <div className="flex items-center space-x-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                        variant={viewMode === 'table' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('table')}
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
                        variant={viewMode === 'card' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('card')}
                        aria-label="Card View"
                        disabled={isLoading}
                        >
                        <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Card View</TooltipContent>
                </Tooltip>
               <Link href="/dashboard/event/new">
                 <Button disabled={isLoadingUser || !userKey}>
                   <PlusCircle className="mr-2 h-4 w-4" /> New Event
                 </Button>
               </Link>
           </div>
         </div>

        {(isLoading || isFetching) && <EventPageSkeleton viewMode={viewMode} />}

         {isError && !isFetching && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Error Loading Data</AlertTitle>
             <AlertDescription>
               Could not fetch user data or events. Please try again. <br />
               <span className="text-xs">{error?.message}</span>
             </AlertDescription>
             <Button onClick={() => refetch()} variant="secondary" size="sm" className="mt-2" disabled={isFetching}>
               {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
               {isFetching ? 'Retrying...' : 'Retry'}
             </Button>
           </Alert>
         )}

         {!isLoading && !isError && userKey && events && events.length === 0 && (
           <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
             No events found for your key ({userKey}). Click "New Event" to create one.
           </div>
         )}

         {!isLoading && !isError && userKey && events && events.length > 0 && (
            viewMode === 'table' ? (
            <Card>
                <CardHeader>
                    <CardTitle>Manage Events</CardTitle>
                    <CardDescription>
                    View, create, edit, and delete your events.
                    {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead className="hidden md:table-cell">Category</TableHead>
                        <TableHead className="hidden sm:table-cell">Date & Time</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {events.map((event) => {
                        const eventDateTime = event.event_date_time ? new Date(event.event_date_time as string) : null;
                        return (
                        <TableRow key={event.id}>
                            <TableCell className="font-medium">{event.title || 'N/A'}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">{event.category || 'N/A'}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                            {eventDateTime ? (
                                <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                    {format(eventDateTime, "dd MMM yyyy, HH:mm")}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {format(eventDateTime, "PPP p")}
                                </TooltipContent>
                                </Tooltip>
                            ) : (
                                'N/A'
                            )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                                <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1 text-muted-foreground truncate max-w-xs">
                                        <MapPin className="h-4 w-4 flex-shrink-0" />
                                        <span>{event.location || 'N/A'}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {event.location_url ? (
                                            <a href={event.location_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                {event.location || 'N/A'} (View Map)
                                            </a>
                                        ) : (
                                            event.location || 'N/A'
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                            <Badge variant={event.event_status === 'Published' ? 'default' : 'secondary'}>
                                {event.event_status || 'N/A'}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
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
                                        disabled={deleteMutation.isPending && deleteMutation.variables?.documentId === event.documentId}
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
                                        This will permanently delete the event: "{event.title || 'this event'}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleDelete(event)}
                                        disabled={deleteMutation.isPending && deleteMutation.variables?.documentId === event.documentId}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {deleteMutation.isPending && deleteMutation.variables?.documentId === event.documentId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
               <EventCardGrid
                 events={events}
                 onDelete={handleDelete}
                 deleteMutation={deleteMutation}
                />
            )
         )}

         {!isLoadingUser && !isUserError && !userKey && (
           <div className="mt-4 border border-dashed border-border rounded-md p-8 text-center text-muted-foreground">
             User tenent_id is missing. Cannot display events.
           </div>
         )}
       </div>
     </TooltipProvider>
   );
}

function EventPageSkeleton({ viewMode }: { viewMode: ViewMode }) {
    const skeletonItems = Array(viewMode === 'table' ? 5 : 6).fill(0);
    return (
      <div className="space-y-4">
        {viewMode === 'table' ? (
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-3/4" /></TableHead>
                    <TableHead className="hidden md:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead>
                    <TableHead className="hidden lg:table-cell"><Skeleton className="h-5 w-1/2" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-5 w-1/3" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-5 w-16" /></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {skeletonItems.map((_, i) => (
                    <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4/5" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-3/4" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
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
                            <Skeleton className="h-5 w-3/4" /> {/* Title */}
                            <Skeleton className="h-4 w-1/2 mt-1" /> {/* Category */}
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-4 w-full" /> {/* Date */}
                            <Skeleton className="h-4 w-2/3" /> {/* Location */}
                            <Skeleton className="h-4 w-1/4" /> {/* Status */}
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                        </CardFooter>
                    </Card>
                 ))}
            </div>
        )}
      </div>
    );
}
