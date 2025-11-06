import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Category {
  value: string;
  label: string;
}

interface CategoriesSelectorProps {
  selected: string[];
  onChange: (categories: string[]) => void;
  options: Category[];
  maxSelection?: number;
}

export function CategoriesSelector({
  selected,
  onChange,
  options,
  maxSelection = 5
}: CategoriesSelectorProps) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      // Remove from selection
      onChange(selected.filter(item => item !== value));
    } else {
      // Add to selection if under max limit
      if (selected.length < maxSelection) {
        onChange([...selected, value]);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {selected.length === 0 ? (
          <span className="text-sm text-lime-500/60 italic">No categories selected</span>
        ) : (
          selected.map(value => {
            const category = options.find(option => option.value === value);
            return (
              <Badge 
                key={value} 
                variant="outline"
                className="border-lime-500/40 text-lime-300 bg-lime-500/10 hover:bg-lime-500/20 cursor-pointer"
                onClick={() => handleToggle(value)}
              >
                {category?.label || value}
                <span className="ml-1 text-lime-400">×</span>
              </Badge>
            );
          })
        )}
      </div>

      <div className="text-xs text-lime-500/60 mb-2">
        {selected.length}/{maxSelection} categories selected
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map(option => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`category-${option.value}`}
              checked={selected.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
              disabled={!selected.includes(option.value) && selected.length >= maxSelection}
              className="border-lime-500/60 data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
            />
            <Label
              htmlFor={`category-${option.value}`}
              className={`text-sm cursor-pointer ${selected.includes(option.value) ? 'text-lime-300' : 'text-lime-200/70'}`}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}</function_results>

Let's check if we have the getTagValue helper function in the lib directory, and create it if not:

<function_calls>
<invoke name="shell">
<parameter name="command">find src/lib -name "*nostr*"