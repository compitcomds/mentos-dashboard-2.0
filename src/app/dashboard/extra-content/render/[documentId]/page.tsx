
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
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

// Helper to generate a unique field name for RHF
const getFieldName = (component: FormFormatComponent): string => {
  if (component.id) {
    return `component_${component.id}`;
  }
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
        if (component.min) fieldSchema = fieldSchema.min(component.min);
        if (component.max) fieldSchema = fieldSchema.max(component.max);
        if (component.inputType === 'email') fieldSchema = fieldSchema.email();
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
        defaultValues[fieldName] = component.default !== undefined ? Number(component.default) : null;
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
          if (component.required) fieldSchema = z.array(z.string()).nonempty(`${component.label || 'Field'} is required.`);
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
        fieldSchema = z.any().optional();
        defaultValues[fieldName] = null;
    }
    schemaShape[fieldName] = fieldSchema;
  });

  return { schema: z.object(schemaShape), defaultValues };
};


export default function RenderExtraContentPage() { // Renamed component
  const router = useRouter();
  const params = useParams();
  const documentId = params.documentId as string;

  const { data: metaFormat, isLoading, isError, error } = useGetMetaFormat(documentId);

  const [formSchema, setFormSchema] = React.useState<z.ZodObject<any, any, any>>(z.object({}));
  const [formDefaultValues, setFormDefaultValues] = React.useState<FieldValues>({});
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaultValues,
    mode: "onSubmit",
  });
  
  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = methods;


  React.useEffect(() => {
    if (metaFormat) {
      const { schema, defaultValues } = generateFormSchemaAndDefaults(metaFormat);
      setFormSchema(schema);
      setFormDefaultValues(defaultValues);
      reset(defaultValues);
      setIsFormInitialized(true);
    }
  }, [metaFormat, reset]);


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
    console.log("Dynamic Form Submitted Data:", data);
  };

  if (isLoading || (!isFormInitialized && !isError)) {
    return (
      <div className="p-6">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Card>
          <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-24" /></CardFooter>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Extra Content Format</AlertTitle> {/* Renamed */}
          <AlertDescription>{error?.message || 'Could not load the extra content format data.'}</AlertDescription> {/* Renamed */}
        </Alert>
      </div>
    );
  }

  if (!metaFormat) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Extra Content Format Not Found</AlertTitle> {/* Renamed */}
          <AlertDescription>The requested extra content format could not be found or you do not have permission to view it.</AlertDescription> {/* Renamed */}
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button variant="outline" onClick={() => router.back()}>
        &larr; Back to Content Management {/* Renamed */}
      </Button>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>{metaFormat.name || 'Dynamic Form'}</CardTitle>
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
                      control={control}
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
                                        onContentChange={field.onChange}
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
                                                    field.onChange([...currentValues, option]);
                                                  } else {
                                                    field.onChange(currentValues.filter((v: string) => v !== option));
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value || component.default}>
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
                                          className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
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
                <p className="text-muted-foreground">No form fields defined for this extra content format.</p> /* Renamed */
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Dynamic Form
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
