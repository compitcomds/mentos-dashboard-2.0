
'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, PlusCircle, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TagFilterControlProps {
  allAvailableTags: string[];
  selectedTags: string[];
  onTagSelectionChange: (newSelectedTags: string[]) => void;
  onAddNewTag: (newTag: string) => void;
  isLoading?: boolean;
  predefinedTags?: string[]; // To visually differentiate if needed, or for specific logic
}

export function TagFilterControl({
  allAvailableTags,
  selectedTags,
  onTagSelectionChange,
  onAddNewTag,
  isLoading = false,
  predefinedTags = [],
}: TagFilterControlProps) {
  const [inputValue, setInputValue] = React.useState('');
  const { toast } = useToast();

  const handleTagClick = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onTagSelectionChange(newSelectedTags);
  };

  const handleAddCustomTag = () => {
    const newTag = inputValue.trim().toLowerCase();
    if (newTag) {
      if (allAvailableTags.includes(newTag)) {
        // If tag already exists, just select it if not already selected
        if (!selectedTags.includes(newTag)) {
          onTagSelectionChange([...selectedTags, newTag]);
        }
         toast({ title: "Tag Exists", description: `"${newTag}" is already available and has been selected.` });
      } else {
        onAddNewTag(newTag); // Parent will handle adding to available and selecting
      }
      setInputValue('');
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCustomTag();
    }
  };

  const sortedAvailableTags = React.useMemo(() => {
    return [...allAvailableTags].sort((a, b) => {
        const aIsPredefined = predefinedTags.includes(a);
        const bIsPredefined = predefinedTags.includes(b);
        if (aIsPredefined && !bIsPredefined) return -1;
        if (!aIsPredefined && bIsPredefined) return 1;
        return a.localeCompare(b);
    });
  }, [allAvailableTags, predefinedTags]);


  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sortedAvailableTags.map((tag) => (
          <Button
            key={tag}
            type="button"
            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTagClick(tag)}
            disabled={isLoading}
            className={cn(
              "h-auto px-2.5 py-1 text-xs rounded-full",
              selectedTags.includes(tag) && "bg-primary text-primary-foreground hover:bg-primary/90",
              !selectedTags.includes(tag) && "hover:bg-accent"
            )}
          >
            <Tag className="mr-1.5 h-3 w-3" />
            {tag}
            {selectedTags.includes(tag) && <X className="ml-1.5 h-3 w-3" />}
          </Button>
        ))}
        {allAvailableTags.length === 0 && <p className="text-xs text-muted-foreground">No tags available. Add some!</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Add new tag..."
          className="h-9 text-xs flex-grow"
          disabled={isLoading}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddCustomTag}
          disabled={isLoading || !inputValue.trim()}
          className="h-9 px-3"
        >
          <PlusCircle className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">Add</span>
        </Button>
      </div>
    </div>
  );
}
