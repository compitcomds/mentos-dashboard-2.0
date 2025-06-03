
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
import { CalendarIcon, ImageIcon, PlusCircle, Trash2, ArrowUp, ArrowDown, GripVertical, Loader2 } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { FormFormatComponent, DynamicComponentTextField, DynamicComponentNumberField, DynamicComponentEnumField, DynamicComponentDateField, DynamicComponentBooleanField, DynamicComponentMediaField } from '@/types/meta-format';
import TipTapEditor from '@/components/ui/tiptap';
import MediaRenderer from '@/app/dashboard/extra-content/data/_components/media-renderer'; 
import { useGetMediaFileDetailsById } from '@/lib/queries/media'; 

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ArrayFieldRendererProps<TFieldValues extends FieldValues = FieldValues> {
  fieldName: FieldPath<TFieldValues>;
  componentDefinition: FormFormatComponent;
  control: Control<TFieldValues>;
  methods: UseFormReturn<TFieldValues>;
  isSubmitting: boolean;
  openMediaSelector: (target: string | { fieldName: string; index: number }, componentDef: FormFormatComponent) => void;
  getDefaultValueForComponent: (componentType: string, component?: FormFormatComponent) => any;
}

// Internal component to display media details for an array item
function MediaArrayItemDisplay({ mediaId }: { mediaId: number }) {
  const { data: mediaDetails, isLoading, isError } = useGetMediaFileDetailsById(mediaId);

  if (isLoading) {
    return <div className="flex items-center text-xs text-muted-foreground"><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Loading media...</div>;
  }
  if (isError || !mediaDetails) {
    return <p className="text-xs text-destructive">Error loading media (ID: {mediaId}) or media not found.</p>;
  }

  return (
    <div className="space-y-2 mt-2 border p-2 rounded-md bg-background">
      <MediaRenderer mediaId={mediaId} className="max-h-24 object-contain" />
      <p className="text-xs font-semibold truncate" title={mediaDetails.name}>Name: {mediaDetails.name}</p>
      <p className="text-xs text-muted-foreground">Type: {mediaDetails.mime}</p>
      <p className="text-xs text-muted-foreground">ID: {mediaId}</p>
    </div>
  );
}


// SortableItem sub-component
function SortableItem<TFieldValues extends FieldValues = FieldValues>({
  id, // This 'id' is from RHF useFieldArray, used by dnd-kit
  index,
  fieldName,
  componentDefinition,
  control,
  methods,
  isSubmitting,
  openMediaSelector,
  remove,
  move,
  totalItems,
}: {
  id: string;
  index: number;
  fieldName: FieldPath<TFieldValues>;
  componentDefinition: FormFormatComponent;
  control: Control<TFieldValues>;
  methods: UseFormReturn<TFieldValues>;
  isSubmitting: boolean;
  openMediaSelector: (target: string | { fieldName: string; index: number }, componentDef: FormFormatComponent) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  totalItems: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const label = componentDefinition.label || fieldName;
  const placeholder = componentDefinition.placeholder || '';
  const itemFieldName = `${fieldName}.${index}` as FieldPath<TFieldValues>;


  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-4 bg-muted/50 relative mb-3"
    >
      <div className="flex items-start">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 mr-2 flex-shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={`Drag to reorder ${label} item ${index + 1}`}
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-grow">
          <FormField
            control={control}
            name={itemFieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">{label} Item {index + 1}</FormLabel>
                <FormControl>
                  {(() => {
                    const currentComponentDef = componentDefinition; 
                    switch (currentComponentDef.__component) {
                        case 'dynamic-component.text-field':
                          const textComp = currentComponentDef as DynamicComponentTextField;
                          if (textComp.inputType === 'tip-tap') {
                            return (
                              <TipTapEditor
                                content={field.value || textComp.default || ''}
                                onContentChange={(html) => methods.setValue(itemFieldName, html, { shouldValidate: true })}
                                className="min-h-[100px]"
                              />
                            );
                          }
                          return <Input type={textComp.inputType === 'email' ? 'email' : 'text'} placeholder={placeholder} {...field} value={field.value ?? ''} disabled={isSubmitting} />;
                        case 'dynamic-component.number-field':
                          const numComp = currentComponentDef as DynamicComponentNumberField;
                          return <Input type="number" placeholder={placeholder} {...field} value={field.value ?? ''} step={numComp.type === 'integer' ? '1' : 'any'} disabled={isSubmitting} />;
                        case 'dynamic-component.media-field':
                           const currentMediaId: number | null = typeof field.value === 'number' ? field.value : null;
                           const mediaFieldComp = currentComponentDef as DynamicComponentMediaField;
                          return (
                            <div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openMediaSelector({ fieldName: fieldName as string, index }, mediaFieldComp)}
                                disabled={isSubmitting}
                              >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                {currentMediaId ? `Change Media (ID: ${currentMediaId})` : placeholder || `Select Media`}
                              </Button>
                              {currentMediaId && (
                                <MediaArrayItemDisplay mediaId={currentMediaId} />
                              )}
                            </div>
                          );
                        case 'dynamic-component.enum-field':
                          const enumComp = currentComponentDef as DynamicComponentEnumField;
                          const options = enumComp.Values?.map(v => v.tag_value).filter(Boolean) as string[] || [];
                          if (enumComp.type === 'multi-select') {
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
                                          methods.setValue(itemFieldName, newValues as any, { shouldValidate: true });
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
                            <Select onValueChange={field.onChange} value={field.value || enumComp.default || ""} disabled={isSubmitting}>
                              <SelectTrigger><SelectValue placeholder={placeholder || 'Select an option'} /></SelectTrigger>
                              <SelectContent>
                                {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          );
                        case 'dynamic-component.date-field':
                          const dateComp = currentComponentDef as DynamicComponentDateField;
                          const dateValue = field.value ? (typeof field.value === 'string' ? parseISO(field.value) : field.value) : null;
                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant={"outline"}
                                  className={cn("w-full md:w-[240px] justify-start text-left font-normal", !dateValue && "text-muted-foreground")}
                                  disabled={isSubmitting}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dateValue && isValid(dateValue) ? format(dateValue, (dateComp.type === 'time' ? 'HH:mm' : dateComp.type === 'data&time' || dateComp.type === 'datetime' ? 'PPP HH:mm' : 'PPP')) : <span>{placeholder || 'Pick a date'}</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={dateValue && isValid(dateValue) ? dateValue : undefined}
                                  onSelect={(date) => field.onChange(date || null)}
                                  initialFocus
                                  disabled={isSubmitting}
                                />
                                {(dateComp.type === 'time' || dateComp.type === 'data&time' || dateComp.type === 'datetime') && (
                                    <div className="p-3 border-t border-border">
                                        <FormLabel>Time (HH:mm)</FormLabel>
                                        <Input
                                            type="time"
                                            value={dateValue && isValid(dateValue) ? format(dateValue, 'HH:mm') : ''}
                                            onChange={(e) => {
                                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                                let newDate = dateValue && isValid(dateValue) ? new Date(dateValue) : new Date();
                                                if (isNaN(newDate.getTime())) { 
                                                    newDate = new Date();
                                                }
                                                newDate.setHours(hours, minutes, 0, 0);
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
                           const boolFieldComp = currentComponentDef as DynamicComponentBooleanField;
                          return (
                            <div className="flex items-center space-x-2 pt-2">
                              <Switch id={itemFieldName} checked={field.value || false} onCheckedChange={field.onChange} disabled={isSubmitting} />
                              <FormLabel htmlFor={itemFieldName} className="text-sm font-normal">{placeholder || (boolFieldComp.label || 'Enable')}</FormLabel>
                            </div>
                          );
                      default:
                        const _exhaustiveCheck: never = currentComponentDef; 
                        return <Input placeholder={`Unsupported: ${(currentComponentDef as any).__component}`} {...field} value={field.value ?? ''} disabled />;
                    }
                  })()}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col space-y-1 ml-2 flex-shrink-0">
           <Button
             type="button"
             variant="ghost"
             size="icon"
             onClick={() => move(index, index - 1)}
             disabled={isSubmitting || index === 0}
             className="h-7 w-7 text-muted-foreground hover:text-foreground"
             aria-label={`Move ${label} item ${index + 1} up`}
           >
             <ArrowUp className="h-4 w-4" />
           </Button>
           <Button
             type="button"
             variant="ghost"
             size="icon"
             onClick={() => move(index, index + 1)}
             disabled={isSubmitting || index === totalItems - 1}
             className="h-7 w-7 text-muted-foreground hover:text-foreground"
             aria-label={`Move ${label} item ${index + 1} down`}
           >
             <ArrowDown className="h-4 w-4" />
           </Button>
           <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            disabled={isSubmitting}
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label={`Remove ${label} item ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
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
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: fieldName,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((item) => item.id === active.id);
      const newIndex = fields.findIndex((item) => item.id === over.id);
      move(oldIndex, newIndex);
    }
  }

  const label = componentDefinition.label || fieldName;
  const isRequired = componentDefinition.required || false;

  return (
    <FormItem>
      <FormLabel>{label} {isRequired && <span className="text-destructive">*</span>} (Multiple entries allowed)</FormLabel>
      <div className="space-y-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                index={index}
                fieldName={fieldName}
                componentDefinition={componentDefinition} 
                control={control}
                methods={methods}
                isSubmitting={isSubmitting}
                openMediaSelector={openMediaSelector}
                remove={remove}
                move={move}
                totalItems={fields.length}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (componentDefinition && componentDefinition.__component) {
                 append(getDefaultValueForComponent(componentDefinition.__component, componentDefinition) as any);
            } else {
                console.error("Cannot append field: componentDefinition or __component is missing", componentDefinition);
            }
          }}
          disabled={isSubmitting}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add {componentDefinition.label || 'Item'}
        </Button>
      </div>
      {componentDefinition.description && <FormDescription className="mt-2">{componentDefinition.description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}

