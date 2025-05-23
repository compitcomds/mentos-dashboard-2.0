
'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider, Controller, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetMetaFormat } from '@/lib/queries/meta-format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertCircle, CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { FormFormatComponent, MetaFormat } from '@/types/meta-format';
import MediaSelectorDialog from '@/app/dashboard/web-media/_components/media-selector-dialog';
import TipTapEditor from '@/components/ui/tiptap';
import { useCreateMetaDataEntry, useGetMetaDataEntry, useUpdateMetaDataEntry } from '@/lib/queries/meta-data';
import { useCurrentUser } from '@/lib/queries/user';
import type { CreateMetaDataPayload } from '@/types/meta-data';
import { useToast } from '@/hooks/use-toast';


// Helper to generate a unique field name for RHF
const getFieldName = (component: FormFormatComponent): string => {
  if (component.id) {
    // Use a prefix to avoid conflicts if component.id is not unique enough across different component types
    return `component_${component.__component.replace('dynamic-component.', '')}_${component.id}`;
  }
  // Fallback if id is not present (should ideally always be there for DZ components)
  const label = component.label || component.__component.split('.').pop() || 'unknown_field';
  return label.toLowerCase().replace(/\s+/g, '_') + `_${Math.random().toString(36).substring(7)}`;
};


// Function to generate Zod schema and default values dynamically
const generateFormSchemaAndDefaults = (metaFormat: MetaFormat | null | undefined) => {
  if (!metaFormat?.from_formate) {
    return { schema: z.object({}), defaultValues: {} };
  }

  let schemaShape: Record<string, z.ZodTypeAny> = {};
  let defaultValues: Record<string, any> = {};

  metaFormat.from_formate.forEach(component => {
    const fieldName = getFieldName(component);
    let fieldSchema: z.ZodTypeAny;

    switch (component.__component) {
      case 'dynamic-component.text-field':
        fieldSchema = z.string();
        if (component.required) {
          fieldSchema = fieldSchema.min(1, { message: `${component.label || 'Field'} is required.` });
        } else {
          fieldSchema = fieldSchema.optional().nullable();
        }
        if (component.min && typeof component.min === 'number') fieldSchema = fieldSchema.min(component.min);
        if (component.max && typeof component.max === 'number') fieldSchema = fieldSchema.max(component.max);
        if (component.inputType === 'email') fieldSchema = fieldSchema.email({ message: "Invalid email address."});
        defaultValues[fieldName] = component.default || '';
        break;
      case 'dynamic-component.number-field':
        fieldSchema = z.preprocess(
          (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
          z.number().nullable()
        );
        if (component.required) {
          fieldSchema = z.preprocess((val) => Number(val), z.number({ required_error: `${component.label || 'Field'} is required.` }));
        }
        if (component.min !== null && component.min !== undefined) (fieldSchema as z.ZodNumber) = (fieldSchema as z.ZodNumber).min(component.min);
        if (component.max !== null && component.max !== undefined) (fieldSchema as z.ZodNumber) = (fieldSchema as z.ZodNumber).max(component.max);
        defaultValues[fieldName] = component.default !== undefined && component.default !== null && component.default !== '' ? Number(component.default) : null;
        break;
      case 'dynamic-component.media-field':
        fieldSchema = z.number().nullable();
        if (component.required) {
          fieldSchema = z.number({ required_error: `${component.label || 'Media'} is required.` });
        }
        defaultValues[fieldName] = null;
        break;
      case 'dynamic-component.enum-field':
        const options = component.Values?.map(v => v.tag_value).filter(Boolean) as string[] || [];
         if (component.type === 'multi-select') {
           fieldSchema = z.array(z.string()).optional();
           if (component.required) fieldSchema = z.array(z.string()).nonempty({ message: `${component.label || 'Field'} is required.` });
           defaultValues[fieldName] = component.default ? component.default.split(',') : [];
         } else {
           fieldSchema = z.string().optional().nullable();
           if (component.required) fieldSchema = z.string().min(1, `${component.label || 'Field'} is required.`);
           defaultValues[fieldName] = component.default || null;
         }
        break;
      case 'dynamic-component.date-field':
        fieldSchema = z.date().nullable();
        if (component.required) {
          fieldSchema = z.date({ required_error: `${component.label || 'Date'} is required.` });
        }
        defaultValues[fieldName] = component.default ? new Date(component.default) : null;
        break;
      case 'dynamic-component.boolean-field':
        fieldSchema = z.boolean().optional();
        defaultValues[fieldName] = component.default === 'true';
        break;
      default:
        console.warn(`Unsupported component type in MetaFormat: ${component.__component}`);
        fieldSchema = z.any().optional();
        defaultValues[fieldName] = null;
    }
    schemaShape[fieldName] = fieldSchema;
  });

  return { schema: z.object(schemaShape), defaultValues };
};


export default function RenderExtraContentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const metaFormatDocumentId = params.documentId as string;
  const action = searchParams.get('action') || 'create'; // 'create' or 'edit'
  const metaDataEntryDocumentId = searchParams.get('entry');

  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const { data: metaFormat, isLoading: isLoadingMetaFormat, isError: isErrorMetaFormat, error: errorMetaFormat } = useGetMetaFormat(metaFormatDocumentId);
  
  const { data: metaDataEntry, isLoading: isLoadingMetaDataEntry, isError: isErrorMetaDataEntry, error: errorMetaDataEntry } = useGetMetaDataEntry(
    action === 'edit' && metaDataEntryDocumentId ? metaDataEntryDocumentId : null
  );

  const createMetaDataMutation = useCreateMetaDataEntry();
  const updateMetaDataMutation = useUpdateMetaDataEntry();


  const [formSchema, setFormSchema] = React.useState<z.ZodObject<any, any, any>>(z.object({}));
  const [formDefaultValues, setFormDefaultValues] = React.useState<FieldValues>({});
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaultValues,
    mode: "onSubmit",
  });

  React.useEffect(() => {
    if (metaFormat) {
      const { schema, defaultValues: generatedDefaults } = generateFormSchemaAndDefaults(metaFormat);
      setFormSchema(schema);
      setFormDefaultValues(generatedDefaults); // Store generated defaults

      // Initialize or re-initialize the form
      if (action === 'edit' && metaDataEntry) {
        // Merge MetaFormat defaults with existing meta_data for editing
        // This ensures all fields from the MetaFormat are present in the form,
        // even if they weren't in the saved meta_data.
        const combinedEditValues = { ...generatedDefaults, ...metaDataEntry.meta_data };
        console.log("[RenderExtraContentPage] EDIT Mode: Resetting form with combined MetaDataEntry values:", combinedEditValues);
        methods.reset(combinedEditValues);
      } else if (action === 'create') {
        console.log("[RenderExtraContentPage] CREATE Mode: Resetting form with MetaFormat defaults:", generatedDefaults);
        methods.reset(generatedDefaults);
      }
      setIsFormInitialized(true);
    }
  }, [metaFormat, action, metaDataEntry, methods]);


  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = React.useState(false);
  const [currentMediaFieldTarget, setCurrentMediaFieldTarget] = React.useState<string | null>(null);

  const handleMediaSelect = (selectedMedia: { fileId: number | null; thumbnailUrl: string | null }) => {
    if (currentMediaFieldTarget && selectedMedia.fileId !== null) {
      methods.setValue(currentMediaFieldTarget, selectedMedia.fileId, { shouldValidate: true });
    }
    setIsMediaSelectorOpen(false);
    setCurrentMediaFieldTarget(null);
  };

  const onSubmit = (data: FieldValues) => {
    console.log("Dynamic Form onSubmit triggered. Action:", action);
    console.log("Form Data:", data);
    console.log("Form Errors:", methods.formState.errors);

    if (Object.keys(methods.formState.errors).length > 0) {
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please check the form for errors and ensure all required fields are filled.",
        });
        // Optionally log each error
        Object.entries(methods.formState.errors).forEach(([fieldName, error]) => {
            console.error(`Validation Error - ${fieldName}:`, error?.message);
        });
        return; // Prevent further execution if there are errors
    }

    if (!currentUser || !currentUser.tenent_id || currentUser.id === undefined) {
      toast({ variant: "destructive", title: "Error", description: "User information is missing." });
      return;
    }

    if (action === 'create') {
      const payload: CreateMetaDataPayload = {
        tenent_id: currentUser.tenent_id,
        meta_format: metaFormatDocumentId, // documentId of the MetaFormat
        user: currentUser.id,
        meta_data: data,
        publishedAt: new Date().toISOString(), // Or null for draft
      };
      console.log("Submitting CREATE payload:", payload);
      createMetaDataMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Success", description: "Data entry created." });
          router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`);
        },
        // onError is handled by the hook
      });
    } else if (action === 'edit' && metaDataEntryDocumentId) {
        const updatePayload: Partial<Omit<CreateMetaDataPayload, 'meta_format' | 'tenent_id'>> = {
            meta_data: data,
            user: currentUser.id, // Update user if needed
            // publishedAt can be updated if your logic requires it
        };
        console.log("Submitting UPDATE payload:", updatePayload, "for documentId:", metaDataEntryDocumentId);
        updateMetaDataMutation.mutate({ documentId: metaDataEntryDocumentId, payload: updatePayload }, {
            onSuccess: () => {
                toast({ title: "Success", description: "Data entry updated." });
                router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`);
            },
             // onError is handled by the hook
        });
    }
  };

  const isLoading = isLoadingUser || isLoadingMetaFormat || (action === 'edit' && isLoadingMetaDataEntry) || (!isFormInitialized && !isErrorMetaFormat);
  const isError = isErrorMetaFormat || (action === 'edit' && isErrorMetaDataEntry);
  const error = errorMetaFormat || (action === 'edit' ? errorMetaDataEntry : null);

  const isSubmitting = createMetaDataMutation.isPending || updateMetaDataMutation.isPending || methods.formState.isSubmitting;


  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
          <CardContent className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-28" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{(error as Error)?.message || 'Could not load required data for the form.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!metaFormat) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Extra Content Format Not Found</AlertTitle>
          <AlertDescription>The requested extra content format definition could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }
   if (action === 'edit' && !metaDataEntry && !isLoadingMetaDataEntry && metaDataEntryDocumentId) {
     return (
       <div className="p-6">
         <Alert variant="destructive">
           <AlertTitle>Error: Data Entry Not Found</AlertTitle>
           <AlertDescription>
             The specific data entry you are trying to edit (ID: {metaDataEntryDocumentId}) could not be found.
             It may have been deleted or you may not have permission to access it.
           </AlertDescription>
           <Button variant="outline" onClick={() => router.back()} className="mt-4">
            Go Back
           </Button>
         </Alert>
       </div>
     );
   }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="outline" onClick={() => router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`)}>
        &larr; Back to Entries for {metaFormat.name}
      </Button>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{action === 'edit' ? `Edit Entry for: ${metaFormat.name}` : `New Entry for: ${metaFormat.name}`}</CardTitle>
              {metaFormat.description && <CardDescription>{metaFormat.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-6">
              {metaFormat.from_formate && metaFormat.from_formate.length > 0 ? (
                metaFormat.from_formate.map((component) => {
                  const fieldName = getFieldName(component);
                  const label = component.label || fieldName;
                  const placeholder = component.placeholder || '';
                  const isRequired = component.required || false;

                  return (
                    <FormField
                      key={fieldName}
                      control={methods.control}
                      name={fieldName}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label} {isRequired && <span className="text-destructive">*</span>}</FormLabel>
                          <FormControl>
                            {(() => {
                              switch (component.__component) {
                                case 'dynamic-component.text-field':
                                  if (component.inputType === 'tip-tap') {
                                    return (
                                      <TipTapEditor
                                        content={field.value || component.default || ''}
                                        onContentChange={(html) => methods.setValue(fieldName, html, {shouldValidate: true})}
                                        className="min-h-[200px]"
                                      />
                                    );
                                  }
                                  return <Input type={component.inputType === 'email' ? 'email' : 'text'} placeholder={placeholder} {...field} value={field.value ?? ''} />;
                                case 'dynamic-component.number-field':
                                  return <Input type="number" placeholder={placeholder} {...field} value={field.value ?? ''} step={component.type === 'integer' ? '1' : 'any'} />;
                                case 'dynamic-component.media-field':
                                  return (
                                    <div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setCurrentMediaFieldTarget(fieldName);
                                          setIsMediaSelectorOpen(true);
                                        }}
                                      >
                                        {field.value ? `Media ID: ${field.value} (Change)` : placeholder || 'Select Media'}
                                      </Button>
                                      {field.value && <p className="text-xs text-muted-foreground mt-1">Selected Media ID: {field.value}</p>}
                                    </div>
                                  );
                                case 'dynamic-component.enum-field':
                                  const options = component.Values?.map(v => v.tag_value).filter(Boolean) as string[] || [];
                                  if (component.type === 'multi-select') {
                                    return (
                                      <div className="space-y-2">
                                        {options.map(option => (
                                          <FormItem key={option} className="flex flex-row items-start space-x-3 space-y-0">
                                            <FormControl>
                                              <Switch
                                                checked={(field.value || []).includes(option)}
                                                onCheckedChange={(checked) => {
                                                  const currentValues = field.value || [];
                                                  if (checked) {
                                                    methods.setValue(fieldName, [...currentValues, option], {shouldValidate: true});
                                                  } else {
                                                    methods.setValue(fieldName, currentValues.filter((v: string) => v !== option), {shouldValidate: true});
                                                  }
                                                }}
                                              />
                                            </FormControl>
                                            <FormLabel className="font-normal">{option}</FormLabel>
                                          </FormItem>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return (
                                    <Select onValueChange={field.onChange} value={field.value || component.default || undefined} >
                                      <SelectTrigger><SelectValue placeholder={placeholder || 'Select an option'} /></SelectTrigger>
                                      <SelectContent>
                                        {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  );
                                case 'dynamic-component.date-field':
                                  return (
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant={"outline"}
                                          className={`w-[240px] justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {field.value ? format(new Date(field.value), (component.type === 'time' ? 'HH:mm' : component.type === 'data&time' || component.type === 'datetime' ? 'PPP HH:mm' : 'PPP')) : <span>{placeholder || 'Pick a date'}</span>}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={field.value ? new Date(field.value) : undefined}
                                          onSelect={field.onChange}
                                          initialFocus
                                        />
                                         {(component.type === 'time' || component.type === 'data&time' || component.type === 'datetime') && (
                                            <div className="p-3 border-t border-border">
                                                <FormLabel>Time (HH:mm)</FormLabel>
                                                <Input
                                                    type="time"
                                                    value={field.value ? format(new Date(field.value), 'HH:mm') : ''}
                                                    onChange={(e) => {
                                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                                        const newDate = field.value ? new Date(field.value) : new Date();
                                                        newDate.setHours(hours, minutes);
                                                        field.onChange(newDate);
                                                    }}
                                                />
                                            </div>
                                        )}
                                      </PopoverContent>
                                    </Popover>
                                  );
                                case 'dynamic-component.boolean-field':
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <Switch id={fieldName} checked={field.value || false} onCheckedChange={field.onChange} />
                                      <FormLabel htmlFor={fieldName} className="text-sm font-normal">{placeholder || 'Enable'}</FormLabel>
                                    </div>
                                  );
                                default:
                                  return <Input placeholder={`Unsupported component: ${component.__component}`} {...field} value={field.value ?? ''} disabled />;
                              }
                            })()}
                          </FormControl>
                          {component.description && <FormDescription>{component.description}</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })
              ) : (
                <p className="text-muted-foreground">No form fields defined for this Extra Content format.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {action === 'edit' ? 'Update Entry' : 'Create Entry'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>

      <MediaSelectorDialog
        isOpen={isMediaSelectorOpen}
        onOpenChange={setIsMediaSelectorOpen}
        onMediaSelect={handleMediaSelect as any} // Cast as any if type signature is complex
        returnType="id" // Assuming 'id' returns { fileId, thumbnailUrl }
      />
    </div>
  );
}
