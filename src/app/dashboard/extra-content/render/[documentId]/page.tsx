
"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  useForm,
  FormProvider,
  Controller,
  FieldValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetMetaFormat } from "@/lib/queries/meta-format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertCircle,
  CalendarIcon,
  Loader2,
  Image as ImageIcon,
  RefreshCcw,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import type {
  FormFormatComponent,
  MetaFormat,
  DynamicComponentTextField,
  DynamicComponentNumberField,
  DynamicComponentEnumField,
  DynamicComponentDateField,
  DynamicComponentBooleanField,
  DynamicComponentMediaField,
} from "@/types/meta-format";
import MediaSelectorDialog from "@/app/dashboard/web-media/_components/media-selector-dialog";
import TipTapEditor from "@/components/ui/tiptap";
import {
  useCreateMetaDataEntry,
  useGetMetaDataEntry,
  useUpdateMetaDataEntry,
} from "@/lib/queries/meta-data";
import { useCurrentUser } from "@/lib/queries/user";
import type { CreateMetaDataPayload, MetaData } from "@/types/meta-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ArrayFieldRenderer from "@/app/dashboard/extra-content/_components/array-field-renderer";
import type { CombinedMediaData } from "@/types/media";
import { AxiosError } from "axios";

// Helper to generate a unique field name for RHF
const getFieldName = (component: FormFormatComponent): string => {
  if (component.label && component.label.trim() !== "") {
    const slugifiedLabel = component.label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    return slugifiedLabel;
  }
  return `component_${component.__component.replace(
    "dynamic-component.",
    ""
  )}_${component.id}`;
};

const getDefaultValueForComponent = (
  componentType: string,
  component?: FormFormatComponent
): any => {
  switch (componentType) {
    case "dynamic-component.text-field":
      return (component as DynamicComponentTextField | undefined)?.default ?? "";
    case "dynamic-component.number-field":
      const numDefault = (component as DynamicComponentNumberField | undefined)?.default;
      return numDefault !== undefined &&
        numDefault !== null &&
        String(numDefault).trim() !== ""
        ? Number(numDefault)
        : null;
    case "dynamic-component.media-field":
      return null;
    case "dynamic-component.enum-field":
      const enumCompDef = component as DynamicComponentEnumField | undefined;
      if (enumCompDef?.type === "multi-select") {
        return enumCompDef?.default
          ? enumCompDef.default.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
      }
      return enumCompDef?.default ?? null;
    case "dynamic-component.date-field":
      const dateDefault = (component as DynamicComponentDateField | undefined)?.default;
      return dateDefault && String(dateDefault).trim() !== "" ? new Date(dateDefault) : null;
    case "dynamic-component.boolean-field":
      const boolDefaultStr = (component as DynamicComponentBooleanField | undefined)?.default;
      return boolDefaultStr === "true" ? true : boolDefaultStr === "false" ? false : false;
    default:
      if (component && component.__component) {
        console.warn(`getDefaultValueForComponent: Unknown component type encountered: ${component.__component}`);
      } else if (componentType) {
        console.warn(`getDefaultValueForComponent: Unknown component type string: ${componentType}`);
      }
      return null;
  }
};

const generateFormSchemaAndDefaults = (
  metaFormat: MetaFormat | null | undefined
) => {
  let schemaShape: Record<string, z.ZodTypeAny> = {
    handle: z
      .string()
      .min(1, { message: "Handle is required." })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: "Handle must be lowercase alphanumeric with hyphens.",
      }),
  };
  let defaultValues: Record<string, any> = {
    handle: "",
  };

  if (!metaFormat?.from_formate) {
    return { schema: z.object(schemaShape), defaultValues };
  }

  metaFormat.from_formate.forEach((component: FormFormatComponent) => {
    if (!component || !component.__component) {
      console.warn("Skipping an invalid component in metaFormat.from_formate:", component);
      return;
    }

    const fieldName = getFieldName(component);
    let baseSchema: z.ZodTypeAny;
    let componentDefaultValue = getDefaultValueForComponent(
      component.__component,
      component
    );

    switch (component.__component) {
      case "dynamic-component.text-field":
        {
          const comp = component as DynamicComponentTextField;
          let currentTextSchema: z.ZodString = z.string({
            required_error: comp.required ? `${comp.label || "Field"} is required.` : undefined,
            invalid_type_error: `${comp.label || "Field"} must be a string.`
          });

          const isMinLengthRequired = comp.required && (comp.min === undefined || comp.min === null || comp.min < 1);
          const effectiveMin = isMinLengthRequired ? 1 : comp.min;

          if (effectiveMin !== null && effectiveMin !== undefined && effectiveMin > 0) {
            currentTextSchema = currentTextSchema.min(effectiveMin, { message: `${comp.label || "Field"} must be at least ${effectiveMin} ${isMinLengthRequired && effectiveMin === 1 ? "character" : "characters"}${isMinLengthRequired ? "." : "."}` });
          }
          
          if (comp.max !== null && comp.max !== undefined) {
            currentTextSchema = currentTextSchema.max(comp.max, { message: `${comp.label || "Field"} must be at most ${comp.max} characters.` });
          }
           if (comp.inputType === "email") {
            currentTextSchema = currentTextSchema.email({ message: "Invalid email address." });
          }
          
          if (comp.required) {
            baseSchema = currentTextSchema;
            componentDefaultValue = comp.default ?? "";
          } else {
            baseSchema = currentTextSchema.optional().nullable();
            componentDefaultValue = comp.default ?? null;
          }
        }
        break;
      case "dynamic-component.number-field":
        {
          const comp = component as DynamicComponentNumberField;
          let coreNumberSchema = z.preprocess(
            (val) => {
              if (val === "" || val === null || val === undefined) return comp.required ? undefined : null;
              const num = Number(val);
              return isNaN(num) ? val : num;
            },
            z.number({
              invalid_type_error: `${comp.label || "Value"} must be a valid number.`,
              required_error: comp.required ? `${comp.label || "Number"} is required.` : undefined
            })
          ) as z.ZodNumber | z.ZodNullable<z.ZodNumber>;


          if (comp.min !== null && comp.min !== undefined) {
            coreNumberSchema = coreNumberSchema.min(comp.min, { message: `${comp.label || "Number"} must be at least ${comp.min}.` });
          }
          if (comp.max !== null && comp.max !== undefined) {
            coreNumberSchema = coreNumberSchema.max(comp.max, { message: `${comp.label || "Number"} must be at most ${comp.max}.` });
          }
          
          if (comp.required) {
            baseSchema = coreNumberSchema as z.ZodNumber; 
          } else {
            baseSchema = coreNumberSchema.nullable().optional();
          }
          
          componentDefaultValue =
            comp.default !== undefined &&
            comp.default !== null &&
            String(comp.default).trim() !== "" 
              ? Number(comp.default)
              : (comp.required ? undefined : null);
        }
        break;
      case "dynamic-component.media-field":
        const mediaComp = component as DynamicComponentMediaField;
        if (mediaComp.required) {
          baseSchema = z
            .number({
              required_error: `${mediaComp.label || "Media"} is required.`,
              invalid_type_error: `${mediaComp.label || "Media"} must be a number (ID).`
            })
            .positive(`${mediaComp.label || "Media"} ID must be positive.`);
        } else {
          baseSchema = z.number().positive().nullable().optional();
        }
        componentDefaultValue = null;
        break;
      case "dynamic-component.enum-field":
        {
          const comp = component as DynamicComponentEnumField;
          const enumOptions =
            (comp.Values?.map((v) => v.tag_value).filter(
              Boolean
            ) as string[]) || [];
          
          let currentEnumSchema: z.ZodTypeAny;

          if (comp.type === "multi-select") {
            currentEnumSchema = z.array(z.string()); // For multi-select, allow any array of strings
            if (comp.required) {
              currentEnumSchema = (currentEnumSchema as z.ZodArray<z.ZodString>).nonempty({
                message: `${
                  comp.label || "Field"
                } requires at least one selection.`,
              });
            }
            componentDefaultValue = comp.default
              ? comp.default
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];
          } else { // Single select
            currentEnumSchema = z.string(); // Allow any string for single select
            if (comp.required) {
              currentEnumSchema = (currentEnumSchema as z.ZodString)
                .min(1, `${comp.label || "Field"} is required.`);
            }
            componentDefaultValue = comp.default ?? null;
          }
          
          if (comp.required) {
            baseSchema = currentEnumSchema;
          } else {
            baseSchema = currentEnumSchema.optional().nullable();
          }
        }
        break;
      case "dynamic-component.date-field":
        const dateComp = component as DynamicComponentDateField;
        const datePreprocess = z.preprocess((arg) => {
          if (!arg || String(arg).trim() === "") return dateComp.required ? undefined : null;
          if (arg instanceof Date) return arg;
          const date = parseISO(String(arg));
          return isValid(date) ? date : String(arg);
        }, z.date({
             required_error: dateComp.required ? `${dateComp.label || "Date"} is required.` : undefined,
             invalid_type_error: `${dateComp.label || "Date"} must be a valid date.`
           })
        );

        if (dateComp.required) {
          baseSchema = datePreprocess;
        } else {
          baseSchema = datePreprocess.nullable().optional();
        }
        componentDefaultValue = dateComp.default && String(dateComp.default).trim() !== ""
          ? new Date(dateComp.default)
          : (dateComp.required ? undefined : null);
        break;
      case "dynamic-component.boolean-field":
        const boolComp = component as DynamicComponentBooleanField;
        let boolBaseSchema = z.boolean({
            required_error: boolComp.required ? `${boolComp.label || "Field"} is required.` : undefined,
            invalid_type_error: `${boolComp.label || "Field"} must be a boolean.`
        });
        
        if (boolComp.required) {
            baseSchema = boolBaseSchema;
        } else {
            baseSchema = boolBaseSchema.optional().nullable();
        }
        const boolDefaultStr = boolComp.default;
        componentDefaultValue = boolDefaultStr === "true" ? true : boolDefaultStr === "false" ? false : (boolComp.required ? false : null);
        break;
      default:
        const _exhaustiveCheck: never = component; 
        baseSchema = z.any().optional();
        componentDefaultValue = null;
    }

    if (component.is_array) {
      const itemElementSchema: z.ZodTypeAny = baseSchema;
      let fieldArraySchema: z.ZodTypeAny;

      if (component.required) { // Array itself must not be empty
        const nonEmptyArraySchema = z.array(itemElementSchema).nonempty({ message: `${component.label || "List"} cannot be empty.` });
        fieldArraySchema = nonEmptyArraySchema;
        defaultValues[fieldName] = [componentDefaultValue];
      } else { // Array can be empty or not present
        const optionalArraySchema = z.array(itemElementSchema).optional().default([]);
        fieldArraySchema = optionalArraySchema;
        defaultValues[fieldName] = [];
      }
      schemaShape[fieldName] = fieldArraySchema;
    } else {
      schemaShape[fieldName] = baseSchema;
      defaultValues[fieldName] = componentDefaultValue;
    }
  });

  return { schema: z.object(schemaShape), defaultValues };
};

const generateRandomHandle = (length = 12) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  if (result.length > 0 && !/^[a-z]/.test(result)) {
    result = 'h' + result.substring(1);
  } else if (result.length === 0 && length > 0) {
    result = 'h' + Array(length - 1).fill(0).map(() => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
  }
  return result;
};

export default function RenderExtraContentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const metaFormatDocumentId = params.documentId as string;
  const action = searchParams.get("action") || "create";
  const metaDataEntryDocumentIdParam = searchParams.get("entry");

  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const {
    data: metaFormat,
    isLoading: isLoadingMetaFormat,
    isError: isErrorMetaFormat,
    error: errorMetaFormat,
  } = useGetMetaFormat(metaFormatDocumentId);

  const {
    data: metaDataEntry,
    isLoading: isLoadingMetaDataEntry,
    isError: isErrorMetaDataEntry,
    error: errorMetaDataEntry,
  } = useGetMetaDataEntry(
    action === "edit" ? metaDataEntryDocumentIdParam : null
  );

  const createMetaDataMutation = useCreateMetaDataEntry();
  const updateMetaDataMutation = useUpdateMetaDataEntry();

  const [formSchema, setFormSchema] = React.useState<
    z.ZodObject<any, any, any>
  >(z.object({ handle: z.string().min(1) }));
  const [formDefaultValues, setFormDefaultValues] = React.useState<FieldValues>(
    { handle: "" }
  );
  const [isFormInitialized, setIsFormInitialized] = React.useState(false);

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaultValues,
    mode: "onSubmit",
  });

  React.useEffect(() => {
    if (metaFormat && !isLoadingMetaFormat && !isFormInitialized) {
      if (
        action === "create" ||
        (action === "edit" &&
          (metaDataEntry !== undefined || isErrorMetaDataEntry))
      ) {
        const { schema, defaultValues: generatedDefaults } =
          generateFormSchemaAndDefaults(metaFormat);
        setFormSchema(schema);

        let initialValues = { ...generatedDefaults };

        if (action === "edit" && metaDataEntry && !isLoadingMetaDataEntry) {
          initialValues.handle = metaDataEntry.handle || "";
          metaFormat.from_formate?.forEach((component) => {
             if (!component || !component.__component) return;
            const fieldName = getFieldName(component);
            let entryValue = metaDataEntry.meta_data?.[fieldName];

            if (entryValue !== undefined && entryValue !== null) {
              if (component.is_array) {
                initialValues[fieldName] = Array.isArray(entryValue)
                  ? entryValue
                  : entryValue === null || entryValue === undefined ? [] : [entryValue];
                if (
                  component.__component === "dynamic-component.date-field" &&
                  Array.isArray(initialValues[fieldName])
                ) {
                  initialValues[fieldName] = initialValues[fieldName]
                    .map((dateStr: string | Date) => {
                      if (!dateStr) return null;
                      const parsedDate = parseISO(String(dateStr));
                      return isValid(parsedDate) ? parsedDate : null;
                    })
                    .filter((d: Date | null) => d !== null);
                } else if (
                  component.__component === "dynamic-component.media-field" &&
                  Array.isArray(initialValues[fieldName])
                ) {
                  initialValues[fieldName] = initialValues[fieldName]
                    .map((val: any) => {
                      const idVal =
                        typeof val === "number"
                          ? val
                          : typeof val === "string" && !isNaN(Number(val))
                          ? Number(val)
                          : null;
                      if (idVal === null && val !== null) {
                        console.warn(
                          `[RenderExtraContentPage Edit] Media field array item has unexpected type:`,
                          val,
                          `for field ${fieldName}. Setting to null.`
                        );
                      }
                      return idVal;
                    })
                    .filter((v: number | null) => v !== null);
                }
              } else if (
                component.__component === "dynamic-component.date-field" &&
                entryValue
              ) {
                const parsedDate = parseISO(String(entryValue));
                initialValues[fieldName] = isValid(parsedDate)
                  ? parsedDate
                  : null;
              } else if (
                component.__component === "dynamic-component.media-field"
              ) {
                if (typeof entryValue === "number") {
                  initialValues[fieldName] = Number(entryValue);
                } else if (
                  typeof entryValue === "string" &&
                  !isNaN(Number(entryValue))
                ) {
                  initialValues[fieldName] = Number(entryValue);
                } else {
                  console.warn(
                    `[RenderExtraContentPage Edit] Media field has unexpected non-numeric type:`,
                    entryValue,
                    `for field ${fieldName}. Setting to null.`
                  );
                  initialValues[fieldName] = null;
                }
              } else {
                initialValues[fieldName] = entryValue;
              }
            } else if (component.is_array) {
              initialValues[fieldName] = [];
            }
          });
        }
        methods.reset(initialValues);
        setFormDefaultValues(initialValues);
        setIsFormInitialized(true);
      }
    }
  }, [
    metaFormat,
    isLoadingMetaFormat,
    action,
    metaDataEntry,
    isLoadingMetaDataEntry,
    metaDataEntryDocumentIdParam,
    methods,
    isErrorMetaDataEntry,
    isFormInitialized,
  ]);

  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = React.useState(false);
  const [currentMediaFieldTarget, setCurrentMediaFieldTarget] = React.useState<
    string | { fieldName: string; index: number } | null
  >(null);
  const [currentMediaFieldDefinition, setCurrentMediaFieldDefinition] =
    React.useState<FormFormatComponent | null>(null);

  const handleMediaSelect = (selectedMedia: CombinedMediaData) => {
    const mediaIdToSet = selectedMedia.fileId;

    console.log(
      "[RenderExtraContentPage] handleMediaSelect. Target:",
      currentMediaFieldTarget,
      "Selected Media (numeric ID):",
      mediaIdToSet
    );

    if (!currentMediaFieldTarget) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Media target field is not set.",
      });
      setIsMediaSelectorOpen(false);
      return;
    }
    if (mediaIdToSet === null || mediaIdToSet === undefined) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected media item is invalid or has no file ID.",
      });
      setIsMediaSelectorOpen(false);
      return;
    }
    if (typeof mediaIdToSet !== "number") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Media ID from selector is not a number.",
      });
      setIsMediaSelectorOpen(false);
      return;
    }

    if (typeof currentMediaFieldTarget === "string") {
      methods.setValue(currentMediaFieldTarget, mediaIdToSet, {
        shouldValidate: true,
      });
    } else if (
      typeof currentMediaFieldTarget === "object" &&
      currentMediaFieldTarget.fieldName &&
      currentMediaFieldTarget.index !== undefined
    ) {
      const { fieldName, index } = currentMediaFieldTarget;
      methods.setValue(`${fieldName}.${index}`, mediaIdToSet, {
        shouldValidate: true,
      });
    }
    setIsMediaSelectorOpen(false);
    setCurrentMediaFieldTarget(null);
    setCurrentMediaFieldDefinition(null);
  };

  const openMediaSelector = (
    target: string | { fieldName: string; index: number },
    componentDef: FormFormatComponent
  ) => {
    setCurrentMediaFieldTarget(target);
    setCurrentMediaFieldDefinition(componentDef as FormFormatComponent);
    setIsMediaSelectorOpen(true);
  };

 const commonErrorHandling = (error: Error, submittedHandle: string) => {
    const errorMessageString = error.message || "";

    if (errorMessageString.startsWith("DUPLICATE_HANDLE_ERROR:")) {
        const handleInErrorMatch = errorMessageString.match(/'([^']+)'/);
        const handleInError = handleInErrorMatch ? handleInErrorMatch[1] : submittedHandle;

        if (handleInError === submittedHandle) {
            methods.setError("handle", {
                type: "manual",
                message: "This handle is already taken. Please choose a different one.",
            });
        } else {
             toast({
                variant: "destructive",
                title: "Duplicate Entry",
                description: "A similar entry already exists. Please check your inputs.",
            });
        }
    } else {
        toast({
            variant: "destructive",
            title: "Submission Error",
            description: errorMessageString || (action === "create" ? "Failed to create data entry." : "Failed to update data entry."),
        });
    }
    console.error("MetaData submission error on client:", error.message);
};


  const onSubmit = (data: FieldValues) => {
    console.log("Dynamic Form onSubmit triggered. Action:", action);
    console.log(
      "Raw Form Data before processing:",
      JSON.stringify(data, null, 2)
    );
    console.log(
      "Form Errors:",
      JSON.stringify(methods.formState.errors, null, 2)
    );

    if (
      !currentUser ||
      !currentUser.tenent_id ||
      currentUser.id === undefined
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User information is missing.",
      });
      return;
    }

    let currentSubmitHandle = data.handle;
    if (!currentSubmitHandle || String(currentSubmitHandle).trim() === "") {
      currentSubmitHandle = generateRandomHandle();
      methods.setValue("handle", currentSubmitHandle, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }

    const { handle, ...dynamicData } = data;

    const processedData = { ...dynamicData };
    metaFormat?.from_formate?.forEach((component) => {
       if (!component || !component.__component) return;
      const fieldName = getFieldName(component);
      if (
        component.is_array &&
        (processedData[fieldName] === undefined ||
          processedData[fieldName] === null)
      ) {
        processedData[fieldName] = [];
      }
      if (component.__component === "dynamic-component.date-field") {
        if (component.is_array && Array.isArray(processedData[fieldName])) {
          processedData[fieldName] = processedData[fieldName].map(
            (dateVal: string | Date | null) =>
              dateVal instanceof Date ? dateVal.toISOString() : dateVal
          );
        } else if (processedData[fieldName] instanceof Date) {
          processedData[fieldName] = processedData[fieldName].toISOString();
        }
      }
    });
    console.log(
      "Processed Form Data (meta_data part):",
      JSON.stringify(processedData, null, 2)
    );

    if (action === "create") {
      const payload: CreateMetaDataPayload = {
        tenent_id: currentUser.tenent_id,
        meta_format: metaFormatDocumentId,
        user: currentUser.id,
        meta_data: processedData,
        publishedAt: new Date().toISOString(),
        handle: currentSubmitHandle,
      };
      console.log("Create MetaData Payload:", JSON.stringify(payload, null, 2));
      createMetaDataMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Success", description: "Data entry created." });
          router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`);
        },
        onError: (error: Error) => commonErrorHandling(error, payload.handle),
      });
    } else if (action === "edit" && metaDataEntryDocumentIdParam) {
      const updatePayload: Partial<
        Omit<CreateMetaDataPayload, "meta_format" | "tenent_id" | "user">
      > & { handle: string } = {
        meta_data: processedData,
        handle: currentSubmitHandle,
      };
      console.log(
        "Update MetaData Payload (for entry " +
          metaDataEntryDocumentIdParam +
          "):",
        JSON.stringify(updatePayload, null, 2)
      );
      updateMetaDataMutation.mutate(
        {
          documentId: metaDataEntryDocumentIdParam,
          payload: updatePayload as any,
        },
        {
          onSuccess: () => {
            toast({ title: "Success", description: "Data entry updated." });
            router.push(
              `/dashboard/extra-content/data/${metaFormatDocumentId}`
            );
          },
          onError: (error: Error) =>
            commonErrorHandling(error, updatePayload.handle),
        }
      );
    }
  };

  const isLoadingPage =
    isLoadingUser ||
    isLoadingMetaFormat ||
    (action === "edit" && isLoadingMetaDataEntry) ||
    (!isFormInitialized && !isErrorMetaFormat);
  const isErrorPage =
    isErrorMetaFormat || (action === "edit" && isErrorMetaDataEntry);
  const pageError =
    errorMetaFormat || (action === "edit" ? errorMetaDataEntry : null);
  const isSubmitting =
    createMetaDataMutation.isPending ||
    updateMetaDataMutation.isPending ||
    methods.formState.isSubmitting;

  if (isLoadingPage) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              {" "}
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-28" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isErrorPage) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {(pageError as Error)?.message ||
              "Could not load required data for the form."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!metaFormat) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTitle>Extra Content Definition Not Found</AlertTitle>
          <AlertDescription>
            The requested extra content definition (ID: {metaFormatDocumentId})
            could not be found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  if (
    action === "edit" &&
    !metaDataEntry &&
    !isLoadingMetaDataEntry &&
    metaDataEntryDocumentIdParam
  ) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error: Data Entry Not Found</AlertTitle>
          <AlertDescription>
            The specific data entry you are trying to edit (ID:{" "}
            {metaDataEntryDocumentIdParam}) could not be found.
          </AlertDescription>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </Alert>
      </div>
    );
  }

  const getExpectedMediaTypesForField = (
    componentDef: FormFormatComponent
  ): string[] => {
    const mediaComponent = componentDef as DynamicComponentMediaField;
    if (mediaComponent.__component === "dynamic-component.media-field" && mediaComponent.type) {
        switch (mediaComponent.type) {
          case "image":
            return ["image"];
          case "video":
            return ["video"];
          case "pdf":
            return ["application/pdf"];
          case "media":
          case "other":
          default:
            return [];
        }
    }
    return [];
  };

  const getCurrentSelectionIds = (
    fieldName: string,
    isArrayField: boolean,
    itemIndex?: number
  ): (number | null)[] => {
    const formValues = methods.getValues();
    let value;
    if (isArrayField && itemIndex !== undefined) {
      value = formValues[fieldName]?.[itemIndex];
    } else {
      value = formValues[fieldName];
    }
    return Array.isArray(value)
      ? value.map((v) =>
          typeof v === "number"
            ? v
            : typeof v === "string" && !isNaN(Number(v))
            ? Number(v)
            : null
        )
      : typeof value === "number"
      ? [value]
      : typeof value === "string" && !isNaN(Number(value))
      ? [Number(value)]
      : [];
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Button
        variant="outline"
        onClick={() =>
          router.push(`/dashboard/extra-content/data/${metaFormatDocumentId}`)
        }
      >
        &larr; Back to Entries for {metaFormat.name || "this Extra Content"}
      </Button>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {action === "edit"
                  ? `Edit Entry for: ${metaFormat.name}`
                  : `New Entry for: ${metaFormat.name}`}
              </CardTitle>
              {metaFormat.description && (
                <CardDescription>{metaFormat.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={methods.control}
                name="handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Handle <span className="text-destructive">*</span>
                    </FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          placeholder="e.g., my-unique-page-handle"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newHandle = generateRandomHandle();
                          methods.setValue("handle", newHandle, {
                            shouldValidate: true,
                          });
                        }}
                        disabled={isSubmitting}
                        aria-label="Generate random handle"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      Unique identifier for this entry (for SEO/routing).
                      Lowercase alphanumeric and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {metaFormat.from_formate && metaFormat.from_formate.length > 0 ? (
                metaFormat.from_formate.map(
                  (component: FormFormatComponent) => {
                    if (!component || !component.__component) return null; // Guard against invalid component data
                    const fieldName = getFieldName(component);
                    const label = component.label || fieldName;
                    const placeholder = component.placeholder || "";
                    const isRequired = component.required || false;

                    if (component.is_array) {
                      return (
                        <ArrayFieldRenderer
                          key={fieldName}
                          fieldName={fieldName as any}
                          componentDefinition={component as FormFormatComponent}
                          control={methods.control}
                          methods={methods}
                          isSubmitting={isSubmitting}
                          openMediaSelector={(target, fieldComponentDef) =>
                            openMediaSelector(target, fieldComponentDef)
                          }
                          getDefaultValueForComponent={
                            getDefaultValueForComponent
                          }
                        />
                      );
                    }

                    return (
                      <FormField
                        key={fieldName}
                        control={methods.control}
                        name={fieldName as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {label}{" "}
                              {isRequired && (
                                <span className="text-destructive">*</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              {(() => {
                                const currentComponent = component as FormFormatComponent;
                                switch (currentComponent.__component) {
                                  case "dynamic-component.text-field":
                                    const textComp =
                                      currentComponent as DynamicComponentTextField;
                                    if (textComp.inputType === "tip-tap") {
                                      return (
                                        <TipTapEditor
                                          key={`${fieldName}-${action}-${
                                            metaDataEntry?.documentId || "new"
                                          }`}
                                          content={
                                            field.value ||
                                            textComp.default ||
                                            ""
                                          }
                                          onContentChange={(html) =>
                                            methods.setValue(
                                              fieldName as any,
                                              html,
                                              { shouldValidate: true }
                                            )
                                          }
                                          className="min-h-[200px]"
                                        />
                                      );
                                    }
                                    return (
                                      <Input
                                        type={
                                          textComp.inputType === "email"
                                            ? "email"
                                            : "text"
                                        }
                                        placeholder={placeholder}
                                        {...field}
                                        value={field.value ?? ""}
                                        disabled={isSubmitting}
                                      />
                                    );
                                  case "dynamic-component.number-field":
                                    const numComp =
                                      currentComponent as DynamicComponentNumberField;
                                    return (
                                      <Input
                                        type="number"
                                        placeholder={placeholder}
                                        {...field}
                                        value={field.value ?? ""}
                                        step={
                                          numComp.type === "integer"
                                            ? "1"
                                            : "any"
                                        }
                                        disabled={isSubmitting}
                                      />
                                    );
                                  case "dynamic-component.media-field":
                                    const currentMediaId =
                                      typeof field.value === "number"
                                        ? field.value
                                        : null;
                                    return (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() =>
                                            openMediaSelector(
                                              fieldName,
                                              currentComponent as FormFormatComponent
                                            )
                                          }
                                          disabled={isSubmitting}
                                        >
                                          <ImageIcon className="mr-2 h-4 w-4" />
                                          {currentMediaId
                                            ? `ID: ${currentMediaId} (Change)`
                                            : placeholder || `Select Media`}
                                        </Button>
                                        {currentMediaId && (
                                          <p className="text-xs text-muted-foreground">
                                            ID: {currentMediaId}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  case "dynamic-component.enum-field":
                                    const enumComp =
                                      currentComponent as DynamicComponentEnumField;
                                    const options =
                                      (enumComp.Values?.map(
                                        (v) => v.tag_value
                                      ).filter(Boolean) as string[]) || [];
                                    if (enumComp.type === "multi-select") {
                                      return (
                                        <div className="space-y-2 p-2 border rounded-md">
                                          {options.map((option) => (
                                            <FormItem
                                              key={option}
                                              className="flex flex-row items-center space-x-3 space-y-0"
                                            >
                                              <FormControl>
                                                <Switch
                                                  checked={(Array.isArray(
                                                    field.value
                                                  )
                                                    ? field.value
                                                    : []
                                                  ).includes(option)}
                                                  onCheckedChange={(
                                                    checked
                                                  ) => {
                                                    const currentValues =
                                                      Array.isArray(field.value)
                                                        ? field.value
                                                        : [];
                                                    const newValues = checked
                                                      ? [
                                                          ...currentValues,
                                                          option,
                                                        ]
                                                      : currentValues.filter(
                                                          (v: string) =>
                                                            v !== option
                                                        );
                                                    methods.setValue(
                                                      fieldName as any,
                                                      newValues,
                                                      { shouldValidate: true }
                                                    );
                                                  }}
                                                  disabled={isSubmitting}
                                                />
                                              </FormControl>
                                              <FormLabel className="font-normal">
                                                {option}
                                              </FormLabel>
                                            </FormItem>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return (
                                      <Select
                                        onValueChange={field.onChange}
                                        value={
                                          field.value || enumComp.default || ""
                                        }
                                        disabled={isSubmitting}
                                      >
                                        <SelectTrigger>
                                          <SelectValue
                                            placeholder={
                                              placeholder || "Select an option"
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {options.map((option) => (
                                            <SelectItem
                                              key={option}
                                              value={option}
                                            >
                                              {option}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    );
                                  case "dynamic-component.date-field":
                                    const dateComp =
                                      currentComponent as DynamicComponentDateField;
                                    const dateValue = field.value
                                      ? typeof field.value === "string"
                                        ? parseISO(field.value)
                                        : field.value
                                      : null;
                                    return (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant={"outline"}
                                            className={cn(
                                              "w-full md:w-[280px] justify-start text-left font-normal",
                                              !dateValue &&
                                                "text-muted-foreground"
                                            )}
                                            disabled={isSubmitting}
                                          >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateValue && isValid(dateValue) ? (
                                              format(
                                                dateValue,
                                                dateComp.type === "time"
                                                  ? "HH:mm"
                                                  : dateComp.type ===
                                                      "data&time" ||
                                                    dateComp.type === "datetime"
                                                  ? "PPP HH:mm"
                                                  : "PPP"
                                              )
                                            ) : (
                                              <span>
                                                {placeholder || "Pick a date"}
                                              </span>
                                            )}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                          <Calendar
                                            mode="single"
                                            selected={
                                              dateValue && isValid(dateValue)
                                                ? dateValue
                                                : undefined
                                            }
                                            onSelect={(date) =>
                                              field.onChange(date || null)
                                            }
                                            initialFocus
                                            disabled={isSubmitting}
                                          />
                                          {(dateComp.type === "time" ||
                                            dateComp.type === "data&time" ||
                                            dateComp.type === "datetime") && (
                                            <div className="p-3 border-t border-border">
                                              <FormLabel>
                                                Time (HH:mm)
                                              </FormLabel>
                                              <Input
                                                type="time"
                                                value={
                                                  dateValue &&
                                                  isValid(dateValue)
                                                    ? format(dateValue, "HH:mm")
                                                    : ""
                                                }
                                                onChange={(e) => {
                                                  const [hours, minutes] =
                                                    e.target.value
                                                      .split(":")
                                                      .map(Number);
                                                  const newDate =
                                                    dateValue &&
                                                    isValid(dateValue)
                                                      ? new Date(dateValue)
                                                      : new Date();
                                                  if (
                                                    isNaN(newDate.getTime())
                                                  ) {
                                                    const todayWithTime =
                                                      new Date();
                                                    todayWithTime.setHours(
                                                      hours,
                                                      minutes,
                                                      0,
                                                      0
                                                    );
                                                    field.onChange(
                                                      todayWithTime
                                                    );
                                                  } else {
                                                    newDate.setHours(
                                                      hours,
                                                      minutes
                                                    );
                                                    field.onChange(newDate);
                                                  }
                                                }}
                                                disabled={isSubmitting}
                                              />
                                            </div>
                                          )}
                                        </PopoverContent>
                                      </Popover>
                                    );
                                  case "dynamic-component.boolean-field":
                                    const boolCompCurrent = currentComponent as DynamicComponentBooleanField;
                                    return (
                                      <div className="flex items-center space-x-2 pt-2">
                                        <Switch
                                          id={fieldName}
                                          checked={field.value || false}
                                          onCheckedChange={field.onChange}
                                          disabled={isSubmitting}
                                        />
                                        <FormLabel
                                          htmlFor={fieldName}
                                          className="text-sm font-normal"
                                        >
                                          {placeholder || (boolCompCurrent.label || 'Enable')}
                                        </FormLabel>
                                      </div>
                                    );
                                  default:
                                    const _exhaustiveCheck: never = currentComponent;
                                    return (
                                      <Input
                                        placeholder={`Unsupported component: ${(currentComponent as any).__component}`}
                                        {...field}
                                        value={field.value ?? ""}
                                        disabled
                                      />
                                    );
                                }
                              })()}
                            </FormControl>
                            {component.description && (
                              <FormDescription>
                                {component.description}
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    );
                  }
                )
              ) : (
                <p className="text-muted-foreground">
                  No form fields defined for this Extra Content format.
                </p>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {action === "edit" ? "Update Entry" : "Create Entry"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </FormProvider>

      <MediaSelectorDialog
        isOpen={isMediaSelectorOpen}
        onOpenChange={setIsMediaSelectorOpen}
        onMediaSelect={handleMediaSelect}
        returnType="id"
        expectedMediaTypes={
          currentMediaFieldDefinition
            ? getExpectedMediaTypesForField(currentMediaFieldDefinition)
            : []
        }
        currentSelectionIds={
          currentMediaFieldTarget && currentMediaFieldDefinition
            ? getCurrentSelectionIds(
                typeof currentMediaFieldTarget === "string"
                  ? currentMediaFieldTarget
                  : currentMediaFieldTarget.fieldName,
                !!(currentMediaFieldDefinition as FormFormatComponent).is_array, 
                typeof currentMediaFieldTarget !== "string"
                  ? currentMediaFieldTarget.index
                  : undefined
              )
            : []
        }
      />
    </div>
  );
}
    

    