import { z } from "zod";
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
import { isValid, parseISO } from "date-fns";

export const getFieldName = (component: FormFormatComponent): string => {
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

export const getDefaultValueForComponent = (
  componentType: string,
  component?: FormFormatComponent
): any => {
  if (!component) return null;

  switch (componentType) {
    case "dynamic-component.text-field":
      return (
        (component as DynamicComponentTextField | undefined)?.default ?? ""
      );
    case "dynamic-component.number-field":
      const numCompDef = component as DynamicComponentNumberField | undefined;
      const numDefault = numCompDef?.default;
      return numDefault !== undefined &&
        numDefault !== null &&
        String(numDefault).trim() !== ""
        ? Number(numDefault)
        : numCompDef?.required
        ? undefined
        : null;
    case "dynamic-component.media-field":
      return null; // Media fields typically don't have a 'default value' in the same way as text/number
    case "dynamic-component.enum-field":
      const enumCompDef = component as DynamicComponentEnumField | undefined;
      if (enumCompDef?.type === "multi-select") {
        return enumCompDef?.default
          ? enumCompDef.default
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      }
      return enumCompDef?.default ?? null;
    case "dynamic-component.date-field":
      const dateCompDef = component as DynamicComponentDateField | undefined;
      const dateDefault = dateCompDef?.default;
      return dateDefault && String(dateDefault).trim() !== ""
        ? new Date(dateDefault)
        : dateCompDef?.required
        ? undefined
        : null;
    case "dynamic-component.boolean-field":
      const boolCompDef = component as DynamicComponentBooleanField | undefined;
      const boolDefaultStr = boolCompDef?.default;
      return boolDefaultStr === "true"
        ? true
        : boolDefaultStr === "false"
        ? false
        : boolCompDef?.required
        ? false
        : null;
    default:
      if (component && component.__component) {
        console.warn(
          `getDefaultValueForComponent: Unknown component type encountered: ${component.__component}`
        );
      } else if (componentType) {
        console.warn(
          `getDefaultValueForComponent: Unknown component type string: ${componentType}`
        );
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

  metaFormat.from_formate.forEach((component) => {
    if (!component || !component.__component) {
      console.warn(
        "Skipping an invalid component in metaFormat.from_formate:",
        component
      );
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
          let currentTextSchema = z.string({
            required_error: comp.required
              ? `${comp.label || "Field"} is required.`
              : undefined,
            invalid_type_error: `${comp.label || "Field"} must be a string.`,
          });

          const isMinLengthRequired =
            comp.required &&
            (comp.min === undefined || comp.min === null || comp.min < 1);
          const effectiveMin = isMinLengthRequired ? 1 : comp.min;

          if (
            effectiveMin !== null &&
            effectiveMin !== undefined &&
            effectiveMin > 0
          ) {
            currentTextSchema = currentTextSchema.min(effectiveMin, {
              message: `${
                comp.label || "Field"
              } must be at least ${effectiveMin} ${
                isMinLengthRequired && effectiveMin === 1
                  ? "character"
                  : "characters"
              }${isMinLengthRequired ? "." : "."}`,
            });
          }

          if (comp.max !== null && comp.max !== undefined) {
            currentTextSchema = currentTextSchema.max(comp.max, {
              message: `${comp.label || "Field"} must be at most ${
                comp.max
              } characters.`,
            });
          }
          if (comp.inputType === "email") {
            currentTextSchema = currentTextSchema.email({
              message: "Invalid email address.",
            });
          }

          if (comp.required) {
            baseSchema = currentTextSchema;
            // Default value already set by getDefaultValueForComponent
          } else {
            baseSchema = currentTextSchema.optional().nullable();
            // Default value already set by getDefaultValueForComponent
          }
        }
        break;
      case "dynamic-component.number-field": {
        const comp = component as DynamicComponentNumberField;

        // 1. Start with the core z.number() and apply validations
        let numSchemaInstance = z.number({
          invalid_type_error: `${
            comp.label || "Value"
          } must be a valid number.`,
          // required_error is best handled if preprocess returns undefined for required fields
        });

        if (comp.min !== null && comp.min !== undefined) {
          numSchemaInstance = numSchemaInstance.min(comp.min, {
            message: `${comp.label || "Number"} must be at least ${comp.min}.`,
          });
        }
        if (comp.max !== null && comp.max !== undefined) {
          numSchemaInstance = numSchemaInstance.max(comp.max, {
            message: `${comp.label || "Number"} must be at most ${comp.max}.`,
          });
        }

        // 2. This schema will be wrapped by preprocess. It's either the validated ZodNumber or an optional/nullable version.
        let schemaReadyForPreprocess: z.ZodTypeAny;

        if (comp.required) {
          schemaReadyForPreprocess = numSchemaInstance; // This is a ZodNumber (with validations)
          // componentDefaultValue already handled by getDefaultValueForComponent
        } else {
          schemaReadyForPreprocess = numSchemaInstance.nullable().optional(); // Correct: this is ZodOptional<ZodNullable<ZodNumber>>
          // componentDefaultValue already handled by getDefaultValueForComponent
        }

        // 3. Preprocess the validated and optionally nullable/optional schema
        baseSchema = z.preprocess((val) => {
          const isEmpty = val === "" || val === null || val === undefined;
          if (isEmpty) {
            // For required: undefined triggers Zod's required check on the inner schema if it's not optional
            // For optional: null is the appropriate "empty" value
            return comp.required ? undefined : null;
          }
          const num = Number(val);
          // If not a number, return the original string `val` to let `z.number()`'s `invalid_type_error` catch it.
          return isNaN(num) ? val : num;
        }, schemaReadyForPreprocess);
        break;
      }
      case "dynamic-component.media-field":
        const mediaComp = component as DynamicComponentMediaField;
        if (mediaComp.required) {
          baseSchema = z
            .number({
              required_error: `${mediaComp.label || "Media"} is required.`,
              invalid_type_error: `${
                mediaComp.label || "Media"
              } must be a number (ID).`,
            })
            .positive(`${mediaComp.label || "Media"} ID must be positive.`);
        } else {
          baseSchema = z.number().positive().nullable().optional();
        }
        // componentDefaultValue already handled by getDefaultValueForComponent
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
            currentEnumSchema = z.array(z.string());
            if (comp.required) {
              currentEnumSchema = (
                currentEnumSchema as z.ZodArray<z.ZodString>
              ).nonempty({
                message: `${
                  comp.label || "Field"
                } requires at least one selection.`,
              });
            }
            // componentDefaultValue already handled by getDefaultValueForComponent
          } else {
            currentEnumSchema = z.string();
            if (comp.required) {
              currentEnumSchema = (currentEnumSchema as z.ZodString).min(
                1,
                `${comp.label || "Field"} is required.`
              );
            }
            // componentDefaultValue already handled by getDefaultValueForComponent
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
        const datePreprocess = z.preprocess(
          (arg) => {
            if (!arg || String(arg).trim() === "")
              return dateComp.required ? undefined : null;
            if (arg instanceof Date) return arg;
            const date = parseISO(String(arg));
            return isValid(date) ? date : String(arg); // Return original string if not valid for Zod to catch type error
          },
          z.date({
            required_error: dateComp.required
              ? `${dateComp.label || "Date"} is required.`
              : undefined,
            invalid_type_error: `${
              dateComp.label || "Date"
            } must be a valid date.`,
          })
        );

        if (dateComp.required) {
          baseSchema = datePreprocess;
        } else {
          baseSchema = datePreprocess.nullable().optional();
        }
        // componentDefaultValue already handled by getDefaultValueForComponent
        break;
      case "dynamic-component.boolean-field":
        const boolComp = component as DynamicComponentBooleanField;
        let boolBaseSchema = z.boolean({
          required_error: boolComp.required
            ? `${boolComp.label || "Field"} is required.`
            : undefined,
          invalid_type_error: `${boolComp.label || "Field"} must be a boolean.`,
        });

        if (boolComp.required) {
          baseSchema = boolBaseSchema;
        } else {
          baseSchema = boolBaseSchema.optional().nullable();
        }
        // componentDefaultValue already handled by getDefaultValueForComponent
        break;
      default:
        const _exhaustiveCheck: never = component;
        baseSchema = z.any().optional();
      // componentDefaultValue already handled by getDefaultValueForComponent (returns null)
    }

    if (component.is_array) {
      const itemElementSchema: z.ZodTypeAny = baseSchema;
      let fieldArraySchema: z.ZodTypeAny;

      if (component.required) {
        const nonEmptyArraySchema = z.array(itemElementSchema).nonempty({
          message: `${component.label || "List"} cannot be empty.`,
        });
        fieldArraySchema = nonEmptyArraySchema as z.ZodTypeAny;
        defaultValues[fieldName] = [componentDefaultValue].filter(
          (v) => v !== undefined
        ); // Ensure no undefined in array if required
      } else {
        const optionalArraySchema = z
          .array(itemElementSchema)
          .optional()
          .default([]);
        fieldArraySchema = optionalArraySchema as z.ZodTypeAny;
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

export default generateFormSchemaAndDefaults;
