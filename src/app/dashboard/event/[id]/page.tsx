
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import TipTapEditor from "@/components/ui/tiptap";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  Event,
  EventFormValues,
  CreateEventPayload,
  GetTagValuesFunction,
} from "@/types/event";
import type { OtherTag, SpeakerComponent } from "@/types/common"; // Import SpeakerComponent
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon as CalendarIconLucide, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid } from "date-fns";
import { useCreateEvent, useGetEvent, useUpdateEvent } from "@/lib/queries/event";
import { useCurrentUser } from "@/lib/queries/user";
import MediaSelectorDialog from "@/app/dashboard/web-media/_components/media-selector-dialog";
import NextImage from "next/image";
import { eventFormSchema } from "@/types/event";
import type { CombinedMediaData, Media } from "@/types/media";
import TagInputField from "../_components/tag-input-field"; // Keep for Tags

const getTagValues: GetTagValuesFunction = (tagField) => {
  if (!tagField || !Array.isArray(tagField)) return [];
  return tagField.map((t) => t.tag_value).filter(Boolean) as string[];
};

// Helper to convert SpeakerComponent array to a string for display (if needed, not for form value)
const getSpeakerNames = (speakers: SpeakerComponent[] | null | undefined): string => {
  if (!speakers || !Array.isArray(speakers)) return "";
  return speakers.map(s => s.name || "Unnamed Speaker").join(", ");
};


const getMediaId = (mediaField: Media | null | undefined): number | null => {
  return mediaField?.id ?? null;
};

const getMediaUrl = (mediaField: Media | null | undefined): string | null => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";
  if (!mediaField || !mediaField.url) return null;
  const relativeUrl = mediaField.formats?.thumbnail?.url || mediaField.formats?.small?.url || mediaField.url;
  if (!relativeUrl) return null;
  const fullUrl = relativeUrl.startsWith("http")
    ? relativeUrl
    : `${apiBaseUrl}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  return fullUrl;
};

const defaultFormValues: EventFormValues = {
  title: "",
  description: "<p></p>",
  event_date_time: new Date(),
  category: "",
  location: "",
  location_url: null,
  organizer_name: "",
  poster: null,
  tags: "",
  speakers: [], // Default to empty array for the new structure
  registration_link: null,
  event_status: "Draft",
  publish_date: null,
  tenent_id: '',
};

const mockCategories = ["Conference", "Workshop", "Webinar", "Meetup", "Party"];

export default function EventFormPage() {
  const params = useParams();
  const eventId = params?.id as string | undefined; // This is the numeric ID from URL
  const isEditing = eventId && eventId !== "new";
  const router = useRouter();
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id;

  const [componentIsLoading, setComponentIsLoading] = useState(true);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [submissionPayloadJson, setSubmissionPayloadJson] = useState<string | null>(null);

  const { data: eventData, isLoading: isLoadingEvent, isError: isErrorEvent, error: errorEvent } = useGetEvent(isEditing ? eventId : null);

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultFormValues,
  });

  const { control, handleSubmit, reset, setValue } = form;

  useEffect(() => {
    console.log("[EventForm] useEffect triggered. isEditing:", isEditing, "isLoadingUser:", isLoadingUser, "isLoadingEvent:", isLoadingEvent, "eventId:", eventId);
    
    if (isLoadingUser) {
      console.log("[EventForm] useEffect: User is loading, setting componentIsLoading=true and returning.");
      setComponentIsLoading(true);
      return;
    }
  
    if (!userTenentId && !isEditing) {
      console.error("[EventForm] useEffect: User tenent_id is missing for new event. Cannot proceed.");
      toast({ variant: "destructive", title: "User Error", description: "Cannot create a new event without user tenant ID." });
      setComponentIsLoading(false); 
      router.push('/dashboard/event'); 
      return;
    }
  
    let newInitialValues: EventFormValues = { ...defaultFormValues, tenent_id: userTenentId || '' };
    let newPosterPreview: string | null = null;
  
    if (isEditing) {
      console.log("[EventForm] useEffect: Editing mode. isLoadingEvent:", isLoadingEvent, "isErrorEvent:", isErrorEvent);
      if (isLoadingEvent) {
        console.log("[EventForm] useEffect: Editing mode, eventData is loading. Waiting...");
        setComponentIsLoading(true);
        return; 
      }
      if (isErrorEvent) {
        console.error("[EventForm] useEffect: Error loading event data.", errorEvent);
        toast({ variant: "destructive", title: "Error Loading Event", description: errorEvent?.message || "Could not load event details." });
        setComponentIsLoading(false);
        router.push('/dashboard/event');
        return;
      }
  
      console.log("[EventForm] useEffect: Checking conditions for existing event...", "isEditing:", isEditing, "eventData:", eventData, "isLoadingEvent:", isLoadingEvent);
      if (eventData) { 
        console.log("[EventForm] useEffect: Editing mode, eventData present:", eventData);
        if (eventData.tenent_id !== userTenentId) {
          console.error("[EventForm] useEffect: Authorization Error - User tenent_id does not match event tenent_id.");
          toast({ variant: "destructive", title: "Authorization Error", description: "You are not authorized to edit this event." });
          setComponentIsLoading(false);
          router.push('/dashboard/event');
          return;
        }
  
        const fetchedTags = getTagValues(eventData.tags);
        // For speakers, we now have an array of objects. We'll pass this directly to the form.
        // The UI to manage this complex field is not yet built.
        const fetchedSpeakersArray = eventData.speakers || []; 
        
        newPosterPreview = getMediaUrl(eventData.poster);
        
        let parsedEventDateTime = new Date();
        if (eventData.event_date_time && typeof eventData.event_date_time === 'string') {
          const parsed = parseISO(eventData.event_date_time);
          if (isValid(parsed)) {
            parsedEventDateTime = parsed;
          } else {
            console.warn(`Invalid event_date_time from API: ${eventData.event_date_time}`);
          }
        } else if (eventData.event_date_time instanceof Date) {
            parsedEventDateTime = eventData.event_date_time;
        }


        let parsedPublishDate = null;
        if (eventData.publish_date && typeof eventData.publish_date === 'string') {
          const parsed = parseISO(eventData.publish_date);
           if (isValid(parsed)) {
            parsedPublishDate = parsed;
          } else {
            console.warn(`Invalid publish_date from API: ${eventData.publish_date}`);
          }
        } else if (eventData.publish_date instanceof Date) {
            parsedPublishDate = eventData.publish_date;
        }


        newInitialValues = {
          title: eventData.title || "",
          description: eventData.description || "<p></p>",
          event_date_time: parsedEventDateTime,
          category: eventData.category || "",
          location: eventData.location || "",
          location_url: eventData.location_url || null,
          organizer_name: eventData.organizer_name || "",
          poster: getMediaId(eventData.poster),
          tags: fetchedTags.join(", "),
          speakers: fetchedSpeakersArray, // Pass the array of SpeakerComponent objects
          registration_link: eventData.registration_link || null,
          event_status: eventData.event_status || "Draft",
          publish_date: parsedPublishDate,
          tenent_id: eventData.tenent_id, 
        };
        console.log("[EventForm] useEffect: Populated initialValues for editing:", newInitialValues);
      } else if (!isLoadingEvent && !isErrorEvent) { 
        console.warn("[EventForm] useEffect: Editing mode, but eventData is null/undefined, not loading, and no error. Toasting and redirecting.");
        toast({ variant: "destructive", title: "Event Not Found", description: "The requested event could not be loaded." });
        setComponentIsLoading(false);
        router.push('/dashboard/event');
        return;
      }
    } else { 
      console.log("[EventForm] useEffect: New event mode. Using defaults and userTenentId if available:", userTenentId);
      if (userTenentId) {
        newInitialValues.tenent_id = userTenentId;
      }
    }
    
    console.log("[EventForm] useEffect: Applying states. newPosterPreview:", newPosterPreview);
    setPosterPreview(newPosterPreview);
    
    console.log("[EventForm] useEffect: Resetting form with final initialValues:", newInitialValues);
    reset(newInitialValues);
    setComponentIsLoading(false);
  
  }, [isEditing, eventData, isLoadingEvent, isErrorEvent, errorEvent, reset, isLoadingUser, userTenentId, router, toast, eventId]);
  

  const openMediaSelector = () => setIsMediaSelectorOpen(true);

  const handleMediaSelect = useCallback(
    (selectedMediaItem: CombinedMediaData) => {
      if (selectedMediaItem && typeof selectedMediaItem.fileId === 'number') { 
        const fileId = selectedMediaItem.fileId;
        const previewUrl = selectedMediaItem.thumbnailUrl || selectedMediaItem.fileUrl;
        setValue("poster", fileId, { shouldValidate: true });
        setPosterPreview(previewUrl);
        toast({ title: "Poster Image Selected", description: `Set poster to image ID: ${fileId}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Media selection failed or file ID missing/invalid." });
      }
      setIsMediaSelectorOpen(false);
    }, [setValue, toast]
  );

  const removePosterImage = () => {
    setValue("poster", null, { shouldValidate: true });
    setPosterPreview(null);
  };

  const onSubmit: SubmitHandler<EventFormValues> = async (data) => {
    if (!userTenentId) {
      toast({ variant: "destructive", title: "Error", description: "User tenent_id is missing. Cannot submit." });
      return;
    }

    const transformTagsToPayload = (tagsString: string | undefined): OtherTag[] => {
        return tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean).map(val => ({ tag_value: val })) : [];
    };

    // For speakers, data.speakers should already be an array of SpeakerComponent objects
    // if the form state is managed correctly (though UI is missing).
    const speakersPayload: SpeakerComponent[] | null = Array.isArray(data.speakers) ? data.speakers : null;


    const payload: CreateEventPayload = {
      ...data,
      tenent_id: userTenentId,
      event_date_time: data.event_date_time.toISOString(),
      publish_date: data.publish_date ? data.publish_date.toISOString() : null,
      tags: transformTagsToPayload(data.tags),
      speakers: speakersPayload, // Use the directly passed array
      description: data.description || "",
    };

    setSubmissionPayloadJson(JSON.stringify(payload, null, 2));

    const options = {
      onSuccess: () => {
        toast({ title: "Success", description: `Event ${isEditing ? "updated" : "created"}.` });
        router.push("/dashboard/event");
      },
      onError: (err: any) => {
        // Toast for error is handled by the mutation hook
        setSubmissionPayloadJson(`Error: ${err.message}\n\n${JSON.stringify(err.response?.data || err, null, 2)}`);
      },
    };

    if (isEditing && eventData?.documentId) { 
      updateMutation.mutate({ documentId: eventData.documentId, event: payload, numericId: eventId }, options);
    } else if (!isEditing) {
      createMutation.mutate(payload, options);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Cannot update event: Event documentId is missing." });
        console.error("Update error: eventData or eventData.documentId is missing.", eventData);
    }
  };

  const isPageLoading = componentIsLoading || isLoadingUser || (isEditing && isLoadingEvent);
  const mutationLoading = createMutation.isPending || updateMutation.isPending;

  if (isPageLoading) return <EventFormSkeleton isEditing={!!isEditing} />;

  if (isEditing && isErrorEvent && !isLoadingEvent) { 
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Event</h1>
        <p>Could not load event data. Please try again.</p>
        <pre className="mt-2 text-xs bg-muted p-2 rounded">{errorEvent?.message}</pre>
        <Button onClick={() => router.push("/dashboard/event")} className="mt-4">Back to Events</Button>
      </div>
    );
  }
   if (!userTenentId && !isLoadingUser) {
      return (
          <div className="p-6 text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">User Tenent ID Missing</h1>
              <p>Cannot create or edit events without a user tenent_id.</p>
              <Button onClick={() => router.refresh()} className="mt-4">Refresh</Button>
          </div>
      );
  }


  return (
    <div className="flex flex-col space-y-6 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? "Edit Event" : "New Event"}
        </h1>
      </div>
      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 flex flex-col"
        >
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle>
                {isEditing ? "Edit Event Details" : "Create a New Event"}
              </CardTitle>
              <CardDescription>
                Fill out the form below. Fields marked with <span className="text-destructive">*</span> are required.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
              <FormField
                control={control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter event title" {...field} disabled={mutationLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-[300px]">
                      <FormLabel htmlFor="content">Description</FormLabel>
                      <FormControl>
                         <TipTapEditor
                              key={`event-editor-${eventId || "new"}`}
                              content={field.value || "<p></p>"}
                              onContentChange={field.onChange}
                              className="flex-1 min-h-full border border-input rounded-md"
                          />
                      </FormControl>
                      <FormDescription>Optional. Describe your event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={control}
                  name="event_date_time"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Event Date & Time <span className="text-destructive">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={mutationLoading}
                            >
                              {field.value && isValid(field.value) ? (
                                format(field.value, "PPP HH:mm")
                              ) : (
                                <span>Pick a date and time</span>
                              )}
                              <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value && isValid(field.value) ? field.value : undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || mutationLoading}
                            initialFocus
                          />
                           <div className="p-3 border-t border-border">
                               <Label>Time (HH:mm)</Label>
                               <Input
                                  type="time"
                                  value={field.value && isValid(field.value) ? format(field.value, 'HH:mm') : ''}
                                  onChange={(e) => {
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      const newDate = field.value && isValid(field.value) ? new Date(field.value) : new Date();
                                      newDate.setHours(hours, minutes);
                                      field.onChange(newDate);
                                  }}
                                  disabled={mutationLoading}
                               />
                           </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} disabled={mutationLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mockCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <FormField
                control={control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Online, Conference Hall A, 123 Main St" {...field} disabled={mutationLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={control}
                name="location_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://maps.google.com/..." {...field} value={field.value ?? ""} disabled={mutationLoading} />
                    </FormControl>
                    <FormDescription>Link to map or virtual event platform.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


               <FormField
                 control={control}
                 name="organizer_name"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Organizer Name <span className="text-destructive">*</span></FormLabel>
                     <FormControl>
                       <Input placeholder="Enter organizer name" {...field} disabled={mutationLoading} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                  control={control}
                  name="poster"
                  render={({ field }) => ( 
                    <FormItem>
                      <FormLabel>Event Poster/Banner</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={openMediaSelector}
                            disabled={mutationLoading}
                          >
                            <ImageIcon className="mr-2 h-4 w-4" />
                            {posterPreview ? "Change Image" : "Select Image"}
                          </Button>
                          {posterPreview && (
                            <div className="relative group">
                              <div className="relative w-16 h-16 rounded-md border overflow-hidden">
                                <NextImage
                                  src={posterPreview}
                                  alt="Poster preview"
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
                                onClick={removePosterImage}
                                disabled={mutationLoading}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>Optional. Upload an image for the event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TagInputField
                    control={control}
                    name="tags"
                    setValue={setValue}
                    label="Tags"
                    disabled={mutationLoading}
                    description="Optional. Add relevant tags."
                />
                
                {/* Placeholder for Speakers UI - to be developed separately */}
                <FormField
                  control={control}
                  name="speakers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Speakers</FormLabel>
                      <FormControl>
                        <div className="p-2 border rounded-md bg-muted/50 min-h-[40px]">
                          <p className="text-sm text-muted-foreground">
                            Speakers UI to be implemented. Currently, speakers data (if any) is: {getSpeakerNames(field.value)}
                          </p>
                        </div>
                      </FormControl>
                      <FormDescription>Optional. Manage event speakers (UI coming soon).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                 <FormField
                   control={control}
                   name="registration_link"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Registration Link (Optional)</FormLabel>
                       <FormControl>
                         <Input placeholder="https://your-registration-link.com" {...field} value={field.value ?? ""} disabled={mutationLoading} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={control}
                        name="event_status"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={mutationLoading}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Published">Published</SelectItem>
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                      control={control}
                      name="publish_date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Publish Date (Optional)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  disabled={mutationLoading}
                                >
                                  {field.value && isValid(field.value) ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a publish date</span>
                                  )}
                                  <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value && isValid(field.value) ? field.value : undefined}
                                onSelect={field.onChange}
                                disabled={mutationLoading}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>Schedule when the event becomes visible.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

            </CardContent>

            <CardFooter className="flex flex-col items-end space-y-4 p-4 border-t flex-shrink-0 bg-background sticky bottom-0">
              {submissionPayloadJson && (
                <div className="w-full mb-4 border rounded-md bg-muted p-4 text-xs">
                  <h4 className="text-sm font-semibold mb-2">Submission Payload (Debug):</h4>
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
                  disabled={mutationLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mutationLoading}>
                  {mutationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mutationLoading ? "Saving..." : isEditing ? "Update Event" : "Create Event"}
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


function EventFormSkeleton({ isEditing }: { isEditing: boolean }) {
  return (
    <div className="flex flex-col space-y-6 h-full p-6">
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
          </div>
           <div className="space-y-1.5 flex-1 min-h-[300px]">
               <Skeleton className="h-4 w-1/4 mb-1" />
               <Skeleton className="h-full w-full rounded-md" />
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-1/4 mb-1" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-1.5">
                    <Skeleton className="h-4 w-1/4 mb-1" />
                    <Skeleton className="h-10 w-full" />
                 </div>
           </div>
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
              <div className="space-y-1.5">
                  <Skeleton className="h-4 w-1/6 mb-1" />
                  <Skeleton className="h-10 w-32" />
              </div>
              {/* Tags skeleton */}
              <div className="space-y-1.5">
                 <Skeleton className="h-4 w-1/6 mb-1" />
                 <Skeleton className="h-10 w-full" />
              </div>
              {/* Speakers (placeholder) skeleton */}
              <div className="space-y-1.5">
                 <Skeleton className="h-4 w-1/6 mb-1" />
                 <Skeleton className="h-10 w-full" />
              </div>
               <div className="space-y-1.5">
                   <Skeleton className="h-4 w-1/4 mb-1" />
                   <Skeleton className="h-10 w-full" />
               </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-1/4 mb-1" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-1.5">
                        <Skeleton className="h-4 w-1/4 mb-1" />
                        <Skeleton className="h-10 w-full" />
                     </div>
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
