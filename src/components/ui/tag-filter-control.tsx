
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
  predefinedTags?: string[];
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
        if (!selectedTags.includes(newTag)) {
          onTagSelectionChange([...selectedTags, newTag]);
        }
         toast({ title: "Tag Exists", description: `"${newTag}" is already available and has been selected.` });
      } else {
        onAddNewTag(newTag); 
        // Also select the newly added tag immediately if not already handled by parent
        if (!selectedTags.includes(newTag)) {
          onTagSelectionChange([...selectedTags, newTag]);
        }
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
    // Changed from space-y-3 to flex flex-nowrap for horizontal layout inside scroll container
    <div className="flex items-center gap-2"> 
      <div className="flex flex-nowrap gap-1.5 py-1 items-center"> {/* Container for tags */}
        {sortedAvailableTags.map((tag) => (
          <Button
            key={tag}
            type="button"
            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
            size="sm" // Keep size sm for tags
            onClick={() => handleTagClick(tag)}
            disabled={isLoading}
            className={cn(
              "h-auto px-2 py-0.5 text-xs rounded-full flex-shrink-0", // Added flex-shrink-0
              selectedTags.includes(tag) && "bg-primary text-primary-foreground hover:bg-primary/90",
              !selectedTags.includes(tag) && "hover:bg-accent"
            )}
          >
            <Tag className="mr-1 h-3 w-3" />
            {tag}
            {selectedTags.includes(tag) && <X className="ml-1 h-3 w-3" />}
          </Button>
        ))}
        {allAvailableTags.length === 0 && <p className="text-xs text-muted-foreground flex-shrink-0">No tags available.</p>}
      </div>
      {/* Input and Add button could be styled to be more compact or hidden on very small screens if needed */}
      <div className="flex items-center gap-1 pl-2 border-l ml-1 flex-shrink-0"> {/* Add new tag section */}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="New tag"
          className="h-8 text-xs w-24" // Made input smaller
          disabled={isLoading}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleAddCustomTag}
          disabled={isLoading || !inputValue.trim()}
          className="h-8 px-2" // Made button smaller
        >
          <PlusCircle className="h-3.5 w-3.5" />
           <span className="sr-only">Add Tag</span>
        </Button>
      </div>
    </div>
  );
}
