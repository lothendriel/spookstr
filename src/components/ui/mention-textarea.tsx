import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

export interface MentionTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onMentionSelect?: (user: any) => void;
  showEmojiPicker?: boolean;
}

export interface MentionData {
  pubkey: string;
  displayName: string;
  nprofile: string;
}

const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ className, onMentionSelect, showEmojiPicker = false, ...props }, ref) => {
    // Simplified version - just a textarea for now
    // TODO: Add mention and emoji functionality back when useUserSearch is available
    return (
      <Textarea
        className={cn(className)}
        ref={ref}
        {...props}
      />
    );
  }
);

MentionTextarea.displayName = "MentionTextarea";

export { MentionTextarea };