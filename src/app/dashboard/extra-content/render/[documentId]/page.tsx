
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
import { AlertCircle, CalendarIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { FormFormatComponent, MetaFormat } from '@/types/meta-format';
import MediaSelectorDialog from '@/app/dashboard/web-media/_components/media-selector-dialog';
import TipTapEditor from '@/components/ui/tiptap';
import { useCreateMetaDataEntry, useGetMetaDataEntry, useUpdateMetaDataEntry } from '@/lib/queries/meta-data';
import { useCurrentUser } from '@/lib/queries/user';
import type { CreateMetaDataPayload } from '@/types/meta-data';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ArrayFieldRenderer from '../_components/array-field-renderer'; // Corrected import path

// Helper to generate a unique field name for RHF
const getFieldName = (component: FormFormatComponent): string => {
  if (component.id) {
    // Ensure component.id is a valid string or number before using it in template literal
    const idPart = typeof component.id === 'number' || typeof component.id === 'string' ? component.id : Math.random().toString(36).substring(7);
    return `component_${component.__component.replace('dynamic-component.', '')}_${idPart}`;
  }
  const label = component.label || component.__component.split('.').pop() || 'unknown_field';
  return label.toLowerCase().replace(/\s+/g, '_') + `_${Math.random().toString(36).substring(7)}`;
};

// Helper to get appropriate default value for a component type
const getDefaultValueForComponent = (componentType: string, component?: FormFormatComponent) => {
  switch (componentType) {
    case 'dynamic-component.text-field':
      return component?.default || '';
    case 'dynamic-component.number-field':
      return component?.default !== undefined && component.default !== null && component.default !== '' ? Number(component.default) : null;
    case 'dynamic-component.media-field':
      return null; // Default to no media selected (string documentId)
    case 'dynamic-component.enum-field':
      return component?.default || null;
    case 'dynamic-component.date-field':
      return component?.default ? new Date(component.default) : null;
    case 'dynamic-component.boolean-field':
      return component?.default === 'true' || component?.default === true;
    default:
      return null;
  }
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
    let componentDefaultValue = getDefaultValueForComponent(component.__component, component);

    switch (component.__component) {
      case 'dynamic-component.text-field':
        let textSchemaCore = z.string();
        if (component.required) textSchemaCore = textSchemaCore.min(1, { message: `${component.label || 'Field'} is required.` });
        else textSchemaCore = textSchemaCore.optional().nullable();
        if (component.min && typeof component.min === 'number') textSchemaCore = textSchemaCore.min(component.min);
        if (component.max && typeof component.max === 'number') textSchemaCore = textSchemaCore.max(component.max);
        if (component.inputType === 'email') textSchemaCore = textSchemaCore.email({ message: "Invalid email address."});
        
        fieldSchema = component.is_array ? z.array(textSchemaCore).optional().default([]) : textSchemaCore;
        defaultValues[fieldName] = component.is_array ? [] : componentDefaultValue;
        break;
      case 'dynamic-component.number-field':
        let numSchemaCore = z.preprocess(
          (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
          z.number().nullable()
        );
        if (component.required) {
          numSchemaCore = z.preprocess((val) => Number(val), z.number({ required_error: `${component.label || 'Field'} is required.` }));
        }
        if (component.min !== null && component.min !== undefined) (numSchemaCore as z.ZodNumber) = (numSchemaCore as z.ZodNumber).min(component.min);
        if (component.max !== null && component.max !== undefined) (numSchemaCore as z.ZodNumber) = (numSchemaCore as z.ZodNumber).max(component.max);
        
        fieldSchema = component.is_array ? z.array(numSchemaCore).optional().default([]) : numSchemaCore;
        defaultValues[fieldName] = component.is_array ? [] : componentDefaultValue;
        break;
      case 'dynamic-component.media-field':
        let mediaSchemaCore = z.string().nullable(); // Stores string documentId
        if (component.required) mediaSchemaCore = z.string({ required_error: `${component.label || 'Media'} is required.` }).min(1, `${component.label || 'Media'} is required.`);
        
        fieldSchema = component.is_array ? z.array(mediaSchemaCore).optional().default([]) : mediaSchemaCore;
        defaultValues[fieldName] = component.is_array ? [] : null;
        break;
      case 'dynamic-component.enum-field':
        let enumSchemaCore = z.string().optional().nullable();
        if (component.required) enumSchemaCore = z.string().min(1, `${component.label || 'Field'} is required.`);
        if (component.type === 'multi-select') {
            fieldSchema = component.is_array ? z.array(z.array(z.string()).optional().default([])).optional().default([]) : z.array(z.string()).optional().default([]);
            if (component.required && !component.is_array) fieldSchema = z.array(z.string()).nonempty({ message: `${component.label || 'Field'} requires at least one selection.` });
            if (component.required && component.is_array) fieldSchema = z.array(z.array(z.string()).nonempty({ message: `${component.label || 'Field'} item requires at least one selection.` })).nonempty({message: `${component.label || 'Field'} is required.`});

            defaultValues[fieldName] = component.is_array ? [] : (component.default ? component.default.split(',').map(s => s.trim()).filter(Boolean) : []);
        } else {
            fieldSchema = component.is_array ? z.array(enumSchemaCore).optional().default([]) : enumSchemaCore;
            defaultValues[fieldName] = component.is_array ? [] : componentDefaultValue;
        }
        break;
      case 'dynamic-component.date-field':
        let dateSchemaCore = z.date().nullable();
        if (component.required) dateSchemaCore = z.date({ required_error: `${component.label || 'Date'} is required.` });
        
        fieldSchema = component.is_array ? z.array(dateSchemaCore).optional().default([]) : dateSchemaCore;
        defaultValues[fieldName] = component.is_array ? [] : componentDefaultValue;
        break;
      case 'dynamic-component.boolean-field':
        let boolSchemaCore = z.boolean().optional();
        if (component.required) boolSchemaCore = z.boolean({ required_error: `${component.label || 'Field'} is required.`});

        fieldSchema = component.is_array ? z.array(boolSchemaCore).optional().default([]) : boolSchemaCore;
        defaultValues[fieldName] = component.is_array ? [] : componentDefaultValue;
        break;
      default:
        console.warn(`Unsupported component type in MetaFormat: ${component.__component}`);
        fieldSchema = z.any().optional(); // Fallback for unsupported types
        defaultValues[fieldName] = component.is_array ? [] : null;
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
  const action = searchParams.get('action') || 'create'; 
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
    if (metaFormat && (action === 'create' || (action === 'edit' && (metaDataEntry || !metaDataEntryDocumentId || isErrorMetaDataEntry)))) {
      const { schema, defaultValues: generatedDefaults } = generateFormSchemaAndDefaults(metaFormat);
      setFormSchema(schema);
      setFormDefaultValues(generatedDefaults);

      let initialValues = { ...generatedDefaults };

      if (action === 'edit' && metaDataEntry) {
        metaFormat.from_formate?.forEach(component => {
          const fieldName = getFieldName(component);
          const entryValue = metaDataEntry.meta_data?.[fieldName];

          if (entryValue !== undefined) {
            if (component.is_array) {
              initialValues[fieldName] = Array.isArray(entryValue) ? entryValue : (entryValue !== null ? [entryValue] : []);
              if (component.__component === 'dynamic-component.date-field' && Array.isArray(initialValues[fieldName])) {
                  initialValues[fieldName] = initialValues[fieldName].map((dateStr: string | Date) => dateStr ? new Date(dateStr) : null).filter(Boolean);
              }
            } else if (component.__component === 'dynamic-component.date-field' && entryValue) {
              initialValues[fieldName] = new Date(entryValue);
            } else {
              initialValues[fieldName] = entryValue;
            }
          }
        });
        console.log("[RenderExtraContentPage] EDIT Mode: Resetting form with MetaDataEntry values:", initialValues);
      } else if (action === 'create') {
        console.log("[RenderExtraContentPage] CREATE Mode: Resetting form with MetaFormat defaults:", generatedDefaults);
      }
      methods.reset(initialValues);
      setIsFormInitialized(true);
    }
  }, [metaFormat, action, metaDataEntry, metaDataEntryDocumentId, methods, isErrorMetaDataEntry]);


  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = React.useState(false);
  const [currentMediaFieldTarget, setCurrentMediaFieldTarget] = React.useState<string | { fieldName: string; index: number } | null>(null);


  const handleMediaSelect = (selectedMedia: { fileId: string | null; thumbnailUrl: string | null }) => {
    if (!currentMediaFieldTarget || selectedMedia.fileId === null) {
        toast({ variant: "destructive", title: "Error", description: "Media target or selected media document ID missing." });
        setIsMediaSelectorOpen(false);
        return;
    }
    const mediaDocumentId = selectedMedia.fileId; 

    if (typeof currentMediaFieldTarget === 'string') {
      methods.setValue(currentMediaFieldTarget, mediaDocumentId, { shouldValidate: true });
    } else if (typeof currentMediaFieldTarget === 'object' && currentMediaFieldTarget.fieldName && currentMediaFieldTarget.index !== undefined) {
      const { fieldName, index } = currentMediaFieldTarget;
      methods.setValue(`${fieldName}.${index}`, mediaDocumentId, { shouldValidate: true });
    }
    setIsMediaSelectorOpen(false);
    setCurrentMediaFieldTarget(null);
  };
  
  const openMediaSelector = (target: string | { fieldName: string; index: number }) => {
    setCurrentMediaFieldTarget(target);
    setIsMediaSelectorOpen(true);
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
        Object.entries(methods.formState.errors).forEach(([fieldName, error]: [string, any]) => {
            console.error(`Validation Error - ${fieldName}:`, error?.message, 'Field Value:', data[fieldName]);
            if (error?.type === 'invalid_type' && Array.isArray(data[fieldName])) {
              console.error(`  ↳ Error for field '${fieldName}' which is an array. Check individual item errors or array-level validation.`);
            } else if (Array.isArray(error)) { 
               error.forEach((itemError, index) => {
                 if (itemError) {
                   Object.entries(itemError).forEach(([subFieldName, subError] : [string, any]) => {
                     console.error(`  ↳ Validation Error - ${fieldName}[${index}].${subFieldName}:`, subError?.message, 'Item Value:', data[fieldName]?.[index]);
                   });
                 }
               });
            }
        });
        return; 
    }

    if (!currentUser || !currentUser.tenent_id || currentUser.id === undefined) {
      toast({ variant: "destructive", title: "Error", description: "User information is missing." });
      return;
    }

    const processedData = { ...data };
    metaFormat?.from_formate?.forEach(component => {
        const fieldName = getFieldName(component);
        if (component.is_array && !Array.isArray(data[fieldName]) && data[fieldName] !== undefined && data[fieldName] !== null) {
            processedData[fieldName] = [data[fieldName]]; 
        } else if (component.is_array && data[fieldName] === undefined) {
            processedData[fieldName] = [];
        }
         if (component.__component === 'dynamic-component.date-field') {
           if (component.is_array && Array.isArray(processedData[fieldName])) {
             processedData[fieldName] = processedData[fieldName].map((dateVal: string | Date | null) => dateVal instanceof Date ? dateVal.toISOString() : dateVal);
           } else if (processedData[fieldName] instanceof Date) {
             processedData[fieldName] = processedData[fieldName].toISOString();
           }
         }
    });


    if (action === 'create') {
      const payload: CreateMetaDataPayload = {
        tenent_id: currentUser.tenent_id,
        meta_format: metaFormatDocumentId,
        user: currentUser.id,
        meta_data: processedData,
        publishedAt: new Date().toISOString(), 
      };
      console.log("Submitting CREATE payload:", payload);
      createMetaDataMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Success", description: "Data entry created." });
          router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`);
        },
      });
    } else if (action === 'edit' && metaDataEntryDocumentId) {
        const updatePayload: Partial<Omit<CreateMetaDataPayload, 'meta_format' | 'tenent_id'>> = {
            meta_data: processedData,
            user: currentUser.id, 
        };
        console.log("Submitting UPDATE payload:", updatePayload, "for documentId:", metaDataEntryDocumentId);
        updateMetaDataMutation.mutate({ documentId: metaDataEntryDocumentId, payload: updatePayload }, {
            onSuccess: () => {
                toast({ title: "Success", description: "Data entry updated." });
                router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`);
            },
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

                  if (component.is_array) {
                    return (
                      <ArrayFieldRenderer
                        key={fieldName}
                        fieldName={fieldName}
                        componentDefinition={component}
                        control={methods.control}
                        methods={methods}
                        isSubmitting={isSubmitting}
                        openMediaSelector={openMediaSelector}
                        getDefaultValueForComponent={getDefaultValueForComponent}
                      />
                    );
                  }
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
                                  return <Input type={component.inputType === 'email' ? 'email' : 'text'} placeholder={placeholder} {...field} value={field.value ?? ''} disabled={isSubmitting}/>;
                                case 'dynamic-component.number-field':
                                  return <Input type="number" placeholder={placeholder} {...field} value={field.value ?? ''} step={component.type === 'integer' ? '1' : 'any'} disabled={isSubmitting} />;
                                case 'dynamic-component.media-field':
                                  const mediaTypeHint = component.type ? `a ${component.type}` : 'Media';
                                  const currentMediaDocId = field.value as string | null;
                                  return (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => openMediaSelector(fieldName)}
                                        disabled={isSubmitting}
                                      >
                                         <ImageIcon className="mr-2 h-4 w-4" />
                                        {currentMediaDocId ? `Media DocID: ${currentMediaDocId} (Change)` : placeholder || `Select ${mediaTypeHint}`}
                                      </Button>
                                       {currentMediaDocId && <p className="text-xs text-muted-foreground">Document ID: {currentMediaDocId}</p>}
                                    </div>
                                  );
                                case 'dynamic-component.enum-field':
                                  const options = component.Values?.map(v => v.tag_value).filter(Boolean) as string[] || [];
                                  if (component.type === 'multi-select') { 
                                    return (
                                      <div className="space-y-2 p-2 border rounded-md">
                                        {options.map(option => (
                                          <FormItem key={option} className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                              <Switch
                                                checked={(Array.isArray(field.value) ? field.value : []).includes(option)}
                                                onCheckedChange={(checked) => {
                                                  const currentValues = Array.isArray(field.value) ? field.value : [];
                                                  const newValues = checked
                                                    ? [...currentValues, option]
                                                    : currentValues.filter((v: string) => v !== option);
                                                  methods.setValue(fieldName, newValues, {shouldValidate: true});
                                                }}
                                                disabled={isSubmitting}
                                              />
                                            </FormControl>
                                            <FormLabel className="font-normal">{option}</FormLabel>
                                          </FormItem>
                                        ))}
                                      </div>
                                    );
                                  }
                                  return (
                                    <Select onValueChange={field.onChange} value={field.value || component.default || ""} disabled={isSubmitting} >
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
                                          className={cn("w-[280px] justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                          disabled={isSubmitting}
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
                                          disabled={isSubmitting}
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
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        )}
                                      </PopoverContent>
                                    </Popover>
                                  );
                                case 'dynamic-component.boolean-field':
                                  return (
                                    <div className="flex items-center space-x-2 pt-2">
                                      <Switch id={fieldName} checked={field.value || false} onCheckedChange={field.onChange} disabled={isSubmitting} />
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
        onMediaSelect={handleMediaSelect as any} 
        returnType="id" 
      />
    </div>
  );
}
      

    