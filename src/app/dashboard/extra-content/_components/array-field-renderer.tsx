
// src/app/dashboard/extra-content/_components/array-field-renderer.tsx
'use client';

import * as React from 'react';
import { useFieldArray, Controller, useFormContext, type Control, type UseFormReturn, type FieldValues, type FieldPath } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ImageIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { FormFormatComponent } from '@/types/meta-format';
import TipTapEditor from '@/components/ui/tiptap';

interface ArrayFieldRendererProps<TFieldValues extends FieldValues = FieldValues> {
  fieldName: FieldPath<TFieldValues>;
  componentDefinition: FormFormatComponent;
  control: Control<TFieldValues>;
  methods: UseFormReturn<TFieldValues>; // Pass full methods for setValue, getValues etc.
  isSubmitting: boolean;
  openMediaSelector: (target: string | { fieldName: string; index: number }) => void;
  getDefaultValueForComponent: (componentType: string, component?: FormFormatComponent) => any;
}

export default function ArrayFieldRenderer<TFieldValues extends FieldValues = FieldValues>({
  fieldName,
  componentDefinition,
  control,
  methods,
  isSubmitting,
  openMediaSelector,
  getDefaultValueForComponent,
}: ArrayFieldRendererProps<TFieldValues>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  });

  const label = componentDefinition.label || fieldName;
  const isRequired = componentDefinition.required || false;

  return (
    <FormItem>
      <FormLabel>{label} {isRequired && <span className="text-destructive">*</span>} (Multiple entries allowed)</FormLabel>
      <div className="space-y-3">
        {fields.map((item, index) => (
          <Card key={item.id} className="p-4 bg-muted/50 relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              disabled={isSubmitting}
              className="absolute top-2 right-2 h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label={`Remove ${label} item ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <FormField
              control={control}
              name={`${fieldName}.${index}` as any} // RHF expects dot notation for array item paths
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormLabel className="sr-only">{label} Item {index + 1}</FormLabel>
                  <FormControl>
                    {(() => {
                      const placeholder = componentDefinition.placeholder || '';
                      switch (componentDefinition.__component) {
                        case 'dynamic-component.text-field':
                          if (componentDefinition.inputType === 'tip-tap') {
                            return (
                              <TipTapEditor
                                content={field.value || componentDefinition.default || ''}
                                onContentChange={(html) => methods.setValue(`${fieldName}.${index}` as any, html, { shouldValidate: true })}
                                className="min-h-[150px]"
                              />
                            );
                          }
                          return <Input type={componentDefinition.inputType === 'email' ? 'email' : 'text'} placeholder={placeholder} {...field} value={field.value ?? ''} disabled={isSubmitting} />;
                        case 'dynamic-component.number-field':
                          return <Input type="number" placeholder={placeholder} {...field} value={field.value ?? ''} step={componentDefinition.type === 'integer' ? '1' : 'any'} disabled={isSubmitting} />;
                        case 'dynamic-component.media-field':
                           const currentMediaDocId = field.value as string | null;
                           const mediaTypeHint = componentDefinition.type ? `a ${componentDefinition.type}` : 'Media';
                          return (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openMediaSelector({ fieldName, index })}
                                disabled={isSubmitting}
                              >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                {currentMediaDocId ? `Media DocID: ${currentMediaDocId} (Change)` : placeholder || `Select ${mediaTypeHint}`}
                              </Button>
                              {currentMediaDocId && <p className="text-xs text-muted-foreground">Document ID: {currentMediaDocId}</p>}
                            </div>
                          );
                        case 'dynamic-component.enum-field':
                          const options = componentDefinition.Values?.map(v => v.tag_value).filter(Boolean) as string[] || [];
                          if (componentDefinition.type === 'multi-select') {
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
                                          methods.setValue(`${fieldName}.${index}` as any, newValues, { shouldValidate: true });
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
                            <Select onValueChange={field.onChange} value={field.value || componentDefinition.default || ""} disabled={isSubmitting}>
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
                                  {field.value ? format(new Date(field.value), (componentDefinition.type === 'time' ? 'HH:mm' : componentDefinition.type === 'data&time' || componentDefinition.type === 'datetime' ? 'PPP HH:mm' : 'PPP')) : <span>{placeholder || 'Pick a date'}</span>}
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
                                {(componentDefinition.type === 'time' || componentDefinition.type === 'data&time' || componentDefinition.type === 'datetime') && (
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
                              <Switch id={`${fieldName}.${index}`} checked={field.value || false} onCheckedChange={field.onChange} disabled={isSubmitting} />
                              <FormLabel htmlFor={`${fieldName}.${index}`} className="text-sm font-normal">{placeholder || 'Enable'}</FormLabel>
                            </div>
                          );
                        default:
                          return <Input placeholder={`Unsupported component: ${componentDefinition.__component}`} {...field} value={field.value ?? ''} disabled />;
                      }
                    })()}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(getDefaultValueForComponent(componentDefinition.__component, componentDefinition))}
          disabled={isSubmitting}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add {componentDefinition.label || 'Item'}
        </Button>
      </div>
      {componentDefinition.description && <FormDescription>{componentDefinition.description}</FormDescription>}
      <FormMessage /> 
    </FormItem>
  );
}

