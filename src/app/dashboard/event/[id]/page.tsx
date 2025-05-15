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
  TagComponent,
  GetTagValuesFunction,
} from "@/types/event";
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
import { Textarea } from "@/components/ui/textarea"; // Use for description if not using Tiptap
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, X, Image as ImageIcon, PlusCircle, Calendar as CalendarIconLucide } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { useCreateEvent, useGetEvent, useUpdateEvent } from "@/lib/queries/event";
import { useCurrentUser } from "@/lib/queries/user";
import MediaSelectorDialog from "@/app/dashboard/web-media/_components/media-selector-dialog";
import NextImage from "next/image";
import { eventFormSchema } from "@/types/event";
import type { CombinedMediaData } from "@/types/media"; // Import CombinedMediaData

// Helper to get nested tag values safely
const getTagValues: GetTagValuesFunction = (tagField) => {
  if (!tagField || !Array.isArray(tagField)) return [];
  return tagField.map((t) => t.value).filter(Boolean);
};

// Helper to get nested media ID safely
const getMediaId = (mediaField: any): number | null => {
  return mediaField?.id ?? null; // Return the ID or null
};

// Helper to get media URL safely
const getMediaUrl = (mediaField: any): string | null => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL_no_api || "";
  if (!mediaField || !mediaField.url) return null;
  const relativeUrl = mediaField.formats?.thumbnail?.url || mediaField.url; // Prefer thumbnail
  if (!relativeUrl) return null;
  const fullUrl = relativeUrl.startsWith("http")
    ? relativeUrl
    : `${apiBaseUrl}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
  return fullUrl;
};

// Manually define default values
const defaultFormValues: EventFormValues = {
  title: "",
  des: "<p></p>",
  event_date_time: new Date(), // Use current date as default for picker
  category: "",
  location: "",
  location_url: null,
  organizer_name: "",
  poster: null,
  target_audience: "", // Keep as comma-separated string for RHF
  Speakers: "",       // Keep as comma-separated string for RHF
  registration_link: null,
  event_status: "Draft", // Default status to Draft
  publish_date: null, // Default publish date to null (optional)
  key: '', // Will be set from user data
};

// Mock data (replace later)
const mockCategories = ["Conference", "Workshop", "Webinar", "Meetup", "Party"];

export default function EventFormPage() {
  const params = useParams();
  const eventId = params?.id as string | undefined;
  const isEditing = eventId && eventId !== "new";
  const router = useRouter();
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const userKey = currentUser?.key;

  const [isLoading, setIsLoading] = useState(true);
  // Separate state for managing the UI representation of tags
  const [targetAudienceTags, setTargetAudienceTags] = useState<string[]>([]);
  const [speakersTags, setSpeakersTags] = useState<string[]>([]);
  // Separate state for the input field values
  const [tagInputTarget, setTagInputTarget] = useState("");
  const [tagInputSpeakers, setTagInputSpeakers] = useState("");

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

  const { control, handleSubmit, reset, setValue, watch } = form;

  // Fetch and populate form data
  useEffect(() => {
    if (isLoadingUser) return;
    if (!userKey && !isEditing) {
      console.error("User key is missing. Cannot create a new event.");
      toast({ variant: "destructive", title: "Error", description: "Cannot create event without user key." });
      setIsLoading(false);
      return;
    }

    let initialValues = { ...defaultFormValues, key: userKey || '' }; // Use empty string as fallback for key if needed

    if (isEditing && eventData) {
      setIsLoading(true);
      if (eventData.key !== userKey) {
        console.error("Authorization Error: User key mismatch.");
        toast({ variant: "destructive", title: "Authorization Error", description: "You cannot edit this event." });
        router.push('/dashboard/event');
        setIsLoading(false);
        return;
      }

      // Get tags from the fetched data
      const fetchedTargetTags = getTagValues(eventData.target_audience);
      const fetchedSpeakersTags = getTagValues(eventData.Speakers);

      // Set the UI state for tags
      setTargetAudienceTags(fetchedTargetTags);
      setSpeakersTags(fetchedSpeakersTags);

      initialValues = {
        ...initialValues,
        title: eventData.title || "",
        des: eventData.des || "<p></p>",
        // Parse ISO string to Date object
        event_date_time: eventData.event_date_time ? parseISO(eventData.event_date_time) : new Date(),
        category: eventData.category || "",
        location: eventData.location || "",
        location_url: eventData.location_url || null,
        organizer_name: eventData.organizer_name || "",
        poster: getMediaId(eventData.poster),
        // Set the RHF value as a comma-separated string
        target_audience: fetchedTargetTags.join(", "),
        Speakers: fetchedSpeakersTags.join(", "),
        registration_link: eventData.registration_link || null,
        event_status: eventData.event_status || "Draft",
        publish_date: eventData.publish_date ? parseISO(eventData.publish_date) : null, // Parse or keep null
        key: eventData.key || userKey || '', // Ensure key is populated
      };
      setPosterPreview(getMediaUrl(eventData.poster));

    } else if (!isEditing) {
        // Reset tags and preview for new form
        setTargetAudienceTags([]);
        setSpeakersTags([]);
        setPosterPreview(null);
        setTagInputTarget(""); // Clear input fields
        setTagInputSpeakers("");
    }

    reset(initialValues); // Reset the form with initial values
    setIsLoading(false);
  }, [isEditing, eventData, reset, isLoadingUser, userKey, router, toast]);


  // Generic handler for input changes - UPDATES LOCAL STATE ONLY
  const handleTagInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setTagInputState: React.Dispatch<React.SetStateAction<string>>
  ) => {
      setTagInputState(e.target.value); // Update the specific input's state directly
  };

  // Generic handler for keydown events (Enter, Comma, Backspace)
  const handleTagKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      currentTags: string[],
      setTagsState: React.Dispatch<React.SetStateAction<string[]>>,
      tagInput: string, // Use the current input state
      setTagInputState: React.Dispatch<React.SetStateAction<string>>,
      fieldName: "target_audience" | "Speakers"
  ) => {
      if ((e.key === "," || e.key === "Enter") && tagInput.trim()) {
          e.preventDefault();
          const newTag = tagInput.trim();
          if (!currentTags.includes(newTag)) {
              const updatedTags = [...currentTags, newTag];
              setTagsState(updatedTags); // Update UI state
              setValue(fieldName, updatedTags.join(", "), { shouldValidate: true }); // Update RHF value
          }
          setTagInputState(""); // Clear the local input field state
      } else if (e.key === "Backspace" && !tagInput && currentTags.length > 0) {
          e.preventDefault();
          const updatedTags = currentTags.slice(0, -1);
          setTagsState(updatedTags); // Update UI state
          setValue(fieldName, updatedTags.join(", "), { shouldValidate: true }); // Update RHF value
      }
      // Allow normal character input, which will trigger onChange handled by handleTagInputChange
  };

  // Generic handler for removing a tag
  const removeTag = (
      tagToRemove: string,
      currentTags: string[],
      setTagsState: React.Dispatch<React.SetStateAction<string[]>>,
      fieldName: "target_audience" | "Speakers"
  ) => {
      const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
      setTagsState(updatedTags); // Update UI state
      setValue(fieldName, updatedTags.join(", "), { shouldValidate: true }); // Update RHF value
  };


  // Media Selection
  const openMediaSelector = () => setIsMediaSelectorOpen(true);

  const handleMediaSelect = useCallback(
    (selectedMedia: CombinedMediaData) => { // Use CombinedMediaData type
      if (selectedMedia && selectedMedia.webMediaId) {
        const fileId = selectedMedia.fileId; // Use fileId for relation
        const previewUrl = selectedMedia.thumbnailUrl || selectedMedia.fileUrl;
        setValue("poster", fileId, { shouldValidate: true });
        setPosterPreview(previewUrl);
        toast({ title: "Poster Image Selected", description: `Set poster to image ID: ${fileId}` });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Media selection failed." });
      }
      setIsMediaSelectorOpen(false);
    }, [setValue, toast]
  );

  const removePosterImage = () => {
    setValue("poster", null, { shouldValidate: true });
    setPosterPreview(null);
  };

  // Form Submission
  const onSubmit: SubmitHandler<EventFormValues> = async (data) => {
    if (!userKey) {
      toast({ variant: "destructive", title: "Error", description: "User key is missing." });
      return;
    }

    const transformTags = (tagsString: string | undefined): TagComponent[] => {
        return tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean).map(val => ({ value: val })) : [];
    };

    // Ensure dates are correctly formatted *before* sending
    const payload: CreateEventPayload = {
      ...data,
      key: userKey,
      // Convert Date objects to ISO strings for API
      event_date_time: data.event_date_time.toISOString(),
      publish_date: data.publish_date ? data.publish_date.toISOString() : null,
      // Transform comma-separated strings back to arrays of TagComponent
      target_audience: transformTags(data.target_audience),
      Speakers: transformTags(data.Speakers),
    };


    console.log("Submitting payload:", JSON.stringify(payload, null, 2));
    setSubmissionPayloadJson(JSON.stringify(payload, null, 2));

    const mutation = isEditing ? updateMutation : createMutation;
    const options = {
      onSuccess: () => {
        toast({ title: "Success", description: `Event ${isEditing ? "updated" : "created"}.` });
        router.push("/dashboard/event");
      },
      onError: (err: any) => {
        console.error("Event submission error:", err);
        setSubmissionPayloadJson(`Error: ${err.message}\n\n${JSON.stringify(err.response?.data || err, null, 2)}`);
        // Error toast is handled globally in the mutation hook
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
   if (!userKey && !isLoadingUser) {
      return (
          <div className="p-6 text-center">
              <h1 className="text-2xl font-bold text-destructive mb-4">User Key Missing</h1>
              <p>Cannot create or edit events without a user key.</p>
              <Button onClick={() => router.refresh()} className="mt-4">Refresh</Button>
          </div>
      );
  }

  // Component for rendering tag input fields - Refactored
  const TagInputComponent = ({
      label,
      tags, // UI state (array of strings)
      setTagsState, // Function to update UI state
      tagInput, // Input field state (string)
      setTagInputState, // Function to update input field state
      fieldName // RHF field name ("target_audience" or "Speakers")
  }: {
      label: string;
      tags: string[];
      setTagsState: React.Dispatch<React.SetStateAction<string[]>>;
      tagInput: string;
      setTagInputState: React.Dispatch<React.SetStateAction<string>>;
      fieldName: "target_audience" | "Speakers";
  }) => (
      <FormField
          control={control}
          name={fieldName} // RHF field name
          render={({ field }) => ( // Use field from render prop to bind hidden input
              <FormItem>
                  <FormLabel htmlFor={`${fieldName}-input`}>{label}</FormLabel>
                  <FormControl>
                      <div>
                          <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px]">
                              {tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                      {tag}
                                      <button
                                          type="button"
                                          onClick={() => removeTag(tag, tags, setTagsState, fieldName)}
                                          className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring"
                                          disabled={mutationLoading}
                                      >
                                          <X className="h-3 w-3" />
                                      </button>
                                  </Badge>
                              ))}
                              {/* Input field binds directly to local state, not RHF field */}
                              <input
                                  id={`${fieldName}-input`}
                                  type="text"
                                  value={tagInput} // Bind to the dedicated local input state
                                  onChange={(e) => handleTagInputChange(e, setTagInputState)} // Update local input state only
                                  onKeyDown={(e) => handleTagKeyDown(e, tags, setTagsState, tagInput, setTagInputState, fieldName)} // Handle key events using local state
                                  placeholder={tags.length === 0 ? "Add tags (comma/Enter)..." : ""}
                                  className="flex-1 bg-transparent outline-none text-sm min-w-[150px]"
                                  disabled={mutationLoading}
                              />
                          </div>
                          {/* Hidden input bound to RHF using field from render prop */}
                           {/* This input ensures RHF value (comma-separated string) stays synced */}
                           <input
                             type="hidden"
                             {...field} // Spread field props (value, onChange, etc.) from RHF
                             value={tags.join(", ")} // Value is derived from the UI state (tags array)
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
              {/* Basic Info */}
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
                  name="des"
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col min-h-[300px]"> {/* Ensure it takes space */}
                      <FormLabel htmlFor="content">Description</FormLabel>
                      <FormControl>
                         <TipTapEditor
                              key={eventId || "new-event"} // Re-mount editor when ID changes
                              content={field.value || "<p></p>"} // Use field value
                              onContentChange={field.onChange} // Update field value
                              className="flex-1 min-h-full border border-input rounded-md" // Styling
                          />
                      </FormControl>
                      <FormDescription>Optional. Describe your event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              {/* Date, Time, Location */}
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
                                format(field.value, "PPP HH:mm") // Show date and time
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
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || mutationLoading} // Disable past dates
                            initialFocus
                          />
                           {/* Basic Time Input - Consider a dedicated time picker component for better UX */}
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


               {/* Organizer & Poster */}
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

                {/* Tags - Target Audience & Speakers */}
                 {/* Use TagInputComponent, passing the correct state and handlers */}
                 <TagInputComponent
                     label="Target Audience"
                     tags={targetAudienceTags}
                     setTagsState={setTargetAudienceTags}
                     tagInput={tagInputTarget}
                     setTagInputState={setTagInputTarget}
                     fieldName="target_audience"
                 />
                 <TagInputComponent
                     label="Speakers"
                     tags={speakersTags}
                     setTagsState={setSpeakersTags}
                     tagInput={tagInputSpeakers}
                     setTagInputState={setTagInputSpeakers}
                     fieldName="Speakers"
                 />


                {/* Links & Status */}
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
                                    format(field.value, "PPP") // Only date needed
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
                                // Allow past dates for editing, maybe disable for new if needed
                                // disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || mutationLoading}
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

      {/* Media Selector Dialog */}
      <MediaSelectorDialog
        isOpen={isMediaSelectorOpen}
        onOpenChange={setIsMediaSelectorOpen}
        onMediaSelect={handleMediaSelect}
        returnType="id" // Return ID for the poster field
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
          {/* Title */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/4 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>
           {/* Description */}
           <div className="space-y-1.5 flex-1 min-h-[300px]">
               <Skeleton className="h-4 w-1/4 mb-1" />
               <Skeleton className="h-full w-full rounded-md" />
           </div>
           {/* Date/Time & Category */}
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
           {/* Location & URL */}
            <div className="space-y-1.5">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-1.5">
                 <Skeleton className="h-4 w-1/4 mb-1" />
                 <Skeleton className="h-10 w-full" />
             </div>
             {/* Organizer & Poster */}
             <div className="space-y-1.5">
                <Skeleton className="h-4 w-1/4 mb-1" />
                <Skeleton className="h-10 w-full" />
             </div>
              <div className="space-y-1.5">
                  <Skeleton className="h-4 w-1/6 mb-1" />
                  <Skeleton className="h-10 w-32" />
              </div>
              {/* Tags */}
              <div className="space-y-1.5">
                 <Skeleton className="h-4 w-1/6 mb-1" />
                 <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                 <Skeleton className="h-4 w-1/6 mb-1" />
                 <Skeleton className="h-10 w-full" />
              </div>
               {/* Registration Link */}
               <div className="space-y-1.5">
                   <Skeleton className="h-4 w-1/4 mb-1" />
                   <Skeleton className="h-10 w-full" />
               </div>
                {/* Status & Publish Date */}
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
