
'use client';

import * as React from 'react';
import { useController, type Control, type UseFormSetValue, type FieldValues, type Path } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { FormDescription, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input'; // Re-import Input
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TagInputFieldProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  setValue: UseFormSetValue<TFieldValues>;
  label: string;
  disabled?: boolean;
  description?: string;
  maxTags?: number;
}

export default function TagInputField<TFieldValues extends FieldValues>({
  name,
  control,
  setValue,
  label,
  disabled = false,
  description,
  maxTags = 15, // Default max tags
}: TagInputFieldProps<TFieldValues>) {
  const { toast } = useToast();
  const { field, fieldState } = useController({ name, control });

  const [tagsUI, setTagsUI] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');

  // Initialize tagsUI from RHF value when component mounts or field value changes
  React.useEffect(() => {
    if (typeof field.value === 'string') {
      const initialTags = field.value.split(',').map(tag => tag.trim()).filter(Boolean);
      setTagsUI(initialTags);
    } else if (field.value === null || field.value === undefined) {
      setTagsUI([]);
    }
  }, [field.value]);

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === ',' || e.key === 'Enter') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!tagsUI.includes(newTag) && tagsUI.length < maxTags) {
        const updatedTags = [...tagsUI, newTag];
        setTagsUI(updatedTags);
        setValue(name, updatedTags.join(', ') as any, { shouldValidate: true, shouldDirty: true });
      } else if (tagsUI.length >= maxTags) {
        toast({
          variant: 'destructive',
          title: 'Tag Limit Reached',
          description: `Maximum ${maxTags} tags allowed for ${label}.`,
        });
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tagsUI.length > 0) {
      e.preventDefault();
      const updatedTags = tagsUI.slice(0, -1);
      setTagsUI(updatedTags);
      setValue(name, updatedTags.join(', ') as any, { shouldValidate: true, shouldDirty: true });
    }
  };

  const removeTagUI = (tagToRemove: string) => {
    const updatedTags = tagsUI.filter((tag) => tag !== tagToRemove);
    setTagsUI(updatedTags);
    setValue(name, updatedTags.join(', ') as any, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <FormItem>
      <FormLabel htmlFor={`${name}-input`}>{label}</FormLabel>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 p-2 border border-input rounded-md min-h-[40px]",
          disabled && "cursor-not-allowed opacity-50 bg-muted"
        )}
      >
        {tagsUI.map((tag, index) => (
          <Badge key={`${name}-${tag}-${index}`} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => !disabled && removeTagUI(tag)}
              className="ml-1 rounded-full outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed"
              disabled={disabled}
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          id={`${name}-input`}
          type="text"
          value={tagInput}
          onChange={handleTagInputChange}
          onKeyDown={handleTagKeyDown}
          placeholder={tagsUI.length === 0 ? "Add (comma/Enter)..." : ""}
          className="flex-1 bg-transparent outline-none text-sm min-w-[150px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 shadow-none"
          disabled={disabled || tagsUI.length >= maxTags}
          ref={field.ref} // Ensure RHF can focus on the input if needed
        />
      </div>
      {description && <FormDescription>{description}</FormDescription>}
      {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
    </FormItem>
  );
}
