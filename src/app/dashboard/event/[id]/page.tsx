
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
  // TagComponent, // Replaced by OtherTag
  GetTagValuesFunction,
} from "@/types/event";
import type { OtherTag } from "@/types/common"; // Import OtherTag
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
// import { Textarea } from "@/components/ui/textarea"; // TipTap used for description
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon as CalendarIconLucide, Loader2, X, Image as ImageIcon } from "lucide-react"; // Renamed CalendarIcon to avoid conflict
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { useCreateEvent, useGetEvent, useUpdateEvent } from "@/lib/queries/event";
import { useCurrentUser } from "@/lib/queries/user";
import MediaSelectorDialog from "@/app/dashboard/web-media/_components/media-selector-dialog";
import NextImage from "next/image";
import { eventFormSchema } from "@/types/event";
import type { CombinedMediaData, Media } from "@/types/media";

// Helper to get nested tag values safely
const getTagValues: GetTagValuesFunction = (tagField) => {
  if (!tagField || !Array.isArray(tagField)) return [];
  return tagField.map((t) => t.tag_value).filter(Boolean) as string[]; // Use tag_value
};

// Helper to get nested media ID safely
const getMediaId = (mediaField: Media | null | undefined): number | null => { // Use Media type
  return mediaField?.id ?? null;
};

// Helper to get media URL safely
const getMediaUrl = (mediaField: Media | null | undefined): string | null => { // Use Media type
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";
  if (!mediaField || !mediaField.url) return null;
  // Prefer thumbnail from formats if available
  const relativeUrl = mediaField.formats?.thumbnail?.url || mediaField.formats?.small?.url || mediaField.url;
  if (!relativeUrl) return null;
  const fullUrl = relativeUrl.startsWith("http")
    ? relativeUrl
    : `${apiBaseUrl}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  return fullUrl;
};

const defaultFormValues: EventFormValues = {
  title: "",
  description: "<p></p>", // Changed from 'des'
  event_date_time: new Date(),
  category: "",
  location: "",
  location_url: null,
  organizer_name: "",
  poster: null,
  tags: "", // Changed from target_audience
  speakers: "", // Changed from Speakers
  registration_link: null,
  event_status: "Draft",
  publish_date: null,
  tenent_id: '', // Changed from key
};

const mockCategories = ["Conference", "Workshop", "Webinar", "Meetup", "Party"];

export default function EventFormPage() {
  const params = useParams();
  const eventId = params?.id as string | undefined;
  const isEditing = eventId && eventId !== "new";
  const router = useRouter();
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userTenentId = currentUser?.tenent_id; // Use tenent_id

  const [isLoading, setIsLoading] = useState(true);
  const [tagsUI, setTagsUI] = useState<string[]>([]); // For 'tags' field
  const [speakersUI, setSpeakersUI] = useState<string[]>([]); // For 'speakers' field
  const [tagInputTags, setTagInputTags] = useState(""); // Input for 'tags'
  const [tagInputSpeakers, setTagInputSpeakers] = useState(""); // Input for 'speakers'

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
    if (isLoadingUser) return;
    if (!userTenentId && !isEditing) { // Check tenent_id
      console.error("User tenent_id is missing. Cannot create a new event.");
      toast({ variant: "destructive", title: "Error", description: "Cannot create event without user tenent_id." });
      setIsLoading(false);
      return;
    }

    let initialValues = { ...defaultFormValues, tenent_id: userTenentId || '' };

    if (isEditing && eventData) {
      setIsLoading(true);
      if (eventData.tenent_id !== userTenentId) { // Check tenent_id
        console.error("Authorization Error: User tenent_id mismatch.");
        toast({ variant: "destructive", title: "Authorization Error", description: "You cannot edit this event." });
        router.push('/dashboard/event');
        setIsLoading(false);
        return;
      }

      const fetchedTags = getTagValues(eventData.tags);
      const fetchedSpeakers = getTagValues(eventData.speakers);

      setTagsUI(fetchedTags);
      setSpeakersUI(fetchedSpeakers);

      initialValues = {
        ...initialValues,
        title: eventData.title || "",
        description: eventData.description || "<p></p>", // Use description
        event_date_time: eventData.event_date_time ? parseISO(eventData.event_date_time as string) : new Date(),
        category: eventData.category || "",
        location: eventData.location || "",
        location_url: eventData.location_url || null,
        organizer_name: eventData.organizer_name || "",
        poster: getMediaId(eventData.poster),
        tags: fetchedTags.join(", "), // Use tags
        speakers: fetchedSpeakers.join(", "), // Use speakers
        registration_link: eventData.registration_link || null,
        event_status: eventData.event_status || "Draft",
        publish_date: eventData.publish_date ? parseISO(eventData.publish_date as string) : null,
        tenent_id: eventData.tenent_id || userTenentId || '', // Ensure tenent_id
      };
      setPosterPreview(getMediaUrl(eventData.poster));

    } else if (!isEditing) {
        setTagsUI([]);
        setSpeakersUI([]);
        setPosterPreview(null);
        setTagInputTags("");
        setTagInputSpeakers("");
    }

    reset(initialValues);
    setIsLoading(false);
  }, [isEditing, eventData, reset, isLoadingUser, userTenentId, router, toast]);


  const handleTagInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setTagInputState: React.Dispatch<React.SetStateAction<string>>
  ) => {
      setTagInputState(e.target.value);
  };

  const handleTagKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      currentTagsState: string[],
      setTagsUIState: React.Dispatch<React.SetStateAction<string[]>>,
      tagInputState: string,
      setTagInputState: React.Dispatch<React.SetStateAction<string>>,
      rhfFieldName: "tags" | "speakers" // Use correct RHF field names
  ) => {
      if ((e.key === "," || e.key === "Enter") && tagInputState.trim()) {
          e.preventDefault();
          const newTag = tagInputState.trim();
          if (!currentTagsState.includes(newTag)) {
              const updatedTags = [...currentTagsState, newTag];
              setTagsUIState(updatedTags);
              setValue(rhfFieldName, updatedTags.join(", "), { shouldValidate: true });
          }
          setTagInputState("");
      } else if (e.key === "Backspace" && !tagInputState && currentTagsState.length > 0) {
          e.preventDefault();
          const updatedTags = currentTagsState.slice(0, -1);
          setTagsUIState(updatedTags);
          setValue(rhfFieldName, updatedTags.join(", "), { shouldValidate: true });
      }
  };

  const removeTagUI = (
      tagToRemove: string,
      currentTagsState: string[],
      setTagsUIState: React.Dispatch<React.SetStateAction<string[]>>,
      rhfFieldName: "tags" | "speakers" // Use correct RHF field names
  ) => {
      const updatedTags = currentTagsState.filter((tag) => tag !== tagToRemove);
      setTagsUIState(updatedTags);
      setValue(rhfFieldName, updatedTags.join(", "), { shouldValidate: true });
  };


  const openMediaSelector = () => setIsMediaSelectorOpen(true);

  const handleMediaSelect = useCallback(
    (selectedMediaItem: CombinedMediaData) => {
      if (selectedMediaItem && selectedMediaItem.fileId) { // Ensure fileId exists
        const fileId = selectedMediaItem.fileId;
        const previewUrl = selectedMediaItem.thumbnailUrl || selectedMediaItem.fileUrl;
        setValue("poster", fileId, { shouldValidate: true });
        setPosterPreview(previewUrl);
        toast({ title: "Poster Image Selected", description: `Set poster to image ID: ${fileId}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Media selection failed or file ID missing." });
      }
      setIsMediaSelectorOpen(false);
    }, [setValue, toast]
  );

  const removePosterImage = () => {
    setValue("poster", null, { shouldValidate: true });
    setPosterPreview(null);
  };

  const onSubmit: SubmitHandler<EventFormValues> = async (data) => {
    if (!userTenentId) { // Check tenent_id
      toast({ variant: "destructive", title: "Error", description: "User tenent_id is missing." });
      return;
    }

    const transformTagsToPayload = (tagsString: string | undefined): OtherTag[] => {
        return tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean).map(val => ({ tag_value: val })) : []; // Use tag_value
    };

    const payload: CreateEventPayload = {
      ...data,
      tenent_id: userTenentId, // Use tenent_id
      event_date_time: data.event_date_time.toISOString(),
      publish_date: data.publish_date ? data.publish_date.toISOString() : null,
      tags: transformTagsToPayload(data.tags), // Use tags
      speakers: transformTagsToPayload(data.speakers), // Use speakers
      description: data.description, // Map form field
    };
    delete (payload as any).key; // Remove if 'key' was part of form data via spread

    setSubmissionPayloadJson(JSON.stringify(payload, null, 2));

    const mutation = isEditing ? updateMutation : createMutation;
    const options = {
      onSuccess: () => {
        toast({ title: "Success", description: `Event ${isEditing ? "updated" : "created"}.` });
        router.push("/dashboard/event");
      },
      onError: (err: any) => {
        setSubmissionPayloadJson(`Error: ${err.message}\n\n${JSON.stringify(err.response?.data || err, null, 2)}`);
      },
    };

    if (isEditing && eventId) {
      updateMutation.mutate({ id: eventId, event: payload }, options);
    } else {
      createMutation.mutate(payload, options);
    }
  };

  const isPageLoading = isLoading || isLoadingUser || (isEditing && isLoadingEvent);
  const mutationLoading = createMutation.isPending || updateMutation.isPending;

  if (isPageLoading) return <EventFormSkeleton isEditing={!!isEditing} />;

  if (isEditing && isErrorEvent) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-destructive mb-4">Error Loading Event</h1>
        <p>Could not load event data. Please try again.</p>
        <pre className="mt-2 text-xs bg-muted p-2 rounded">{errorEvent?.message}</pre>
      </div>
    );
  }
   if (!userTenentId && !isLoadingUser) { // Check tenent_id
      return (
          <div className="p-6 text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">User Tenent ID Missing</h1>
              <p>Cannot create or edit events without a user tenent_id.</p>
              <Button onClick={() => router.refresh()} className="mt-4">Refresh</Button>
          </div>
      );
  }

  const TagInputComponent = ({
      label,
      tagsUIState,
      setTagsUIState,
      tagInputState,
      setTagInputState,
      rhfFieldName
  }: {
      label: string;
      tagsUIState: string[];
      setTagsUIState: React.Dispatch<React.SetStateAction<string[]>>;
      tagInputState: string;
      setTagInputState: React.Dispatch<React.SetStateAction<string>>;
      rhfFieldName: "tags" | "speakers"; // Use correct RHF names
  }) => (
      <FormField
          control={control}
          name={rhfFieldName}
          render={({ field }) => (
              <FormItem>
                  <FormLabel htmlFor={`${rhfFieldName}-input`}>{label}</FormLabel>
                  <FormControl>
                      <div>
                          <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px]">
                              {tagsUIState.map(tag => (
                                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                      {tag}
                                      <button
                                          type="button"
                                          onClick={() => removeTagUI(tag, tagsUIState, setTagsUIState, rhfFieldName)}
                                          className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring"
                                          disabled={mutationLoading}
                                      >
                                          <X className="h-3 w-3" />
                                      </button>
                                  </Badge>
                              ))}
                              <input
                                  id={`${rhfFieldName}-input`}
                                  type="text"
                                  value={tagInputState}
                                  onChange={(e) => handleTagInputChange(e, setTagInputState)}
                                  onKeyDown={(e) => handleTagKeyDown(e, tagsUIState, setTagsUIState, tagInputState, setTagInputState, rhfFieldName)}
                                  placeholder={tagsUIState.length === 0 ? "Add tags (comma/Enter)..." : ""}
                                  className="flex-1 bg-transparent outline-none text-sm min-w-[150px]"
                                  disabled={mutationLoading}
                              />
                          </div>
                           <input
                             type="hidden"
                             {...field}
                             value={tagsUIState.join(", ")}
                           />
                      </div>
                  </FormControl>
                  <FormDescription>Optional. Add relevant tags.</FormDescription>
                  <FormMessage />
              </FormItem>
          )}
      />
  );


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
                  name="description" // Use 'description'
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-[300px]">
                      <FormLabel htmlFor="content">Description</FormLabel>
                      <FormControl>
                         <TipTapEditor
                              key={eventId || "new-event"}
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
                              {field.value ? (
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
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || mutationLoading}
                            initialFocus
                          />
                           <div className="p-3 border-t border-border">
                               <Label>Time (HH:mm)</Label>
                               <Input
                                  type="time"
                                  value={field.value ? format(field.value, 'HH:mm') : ''}
                                  onChange={(e) => {
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      const newDate = field.value ? new Date(field.value) : new Date();
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={mutationLoading}>
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

                 <TagInputComponent
                     label="Tags" // Changed from Target Audience
                     tagsUIState={tagsUI}
                     setTagsUIState={setTagsUI}
                     tagInputState={tagInputTags}
                     setTagInputState={setTagInputTags}
                     rhfFieldName="tags" // Use 'tags'
                 />
                 <TagInputComponent
                     label="Speakers"
                     tagsUIState={speakersUI}
                     setTagsUIState={setSpeakersUI}
                     tagInputState={tagInputSpeakers}
                     setTagInputState={setTagInputSpeakers}
                     rhfFieldName="speakers" // Use 'speakers'
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
                                  {field.value ? (
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
                                selected={field.value}
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
              <div className="space-y-1.5">
                 <Skeleton className="h-4 w-1/6 mb-1" />
                 <Skeleton className="h-10 w-full" />
              </div>
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
