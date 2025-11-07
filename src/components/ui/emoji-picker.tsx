import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function EmojiPickerButton({
  onEmojiSelect,
  disabled = false,
  className,
  variant = "ghost",
  size = "sm",
  children
}: EmojiPickerButtonProps) {
  const [open, setOpen] = React.useState(false);
  const { theme } = useTheme();

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("h-8 w-8 p-0 hover:bg-accent", className)}
          disabled={disabled}
        >
          {children || <Smile className="h-4 w-4" />}
          <span className="sr-only">Add emoji</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-0" 
        align="end"
        side="top"
        sideOffset={8}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
          autoFocusSearch={false}
          lazyLoadEmojis={true}
        />
      </PopoverContent>
    </Popover>
  );
}