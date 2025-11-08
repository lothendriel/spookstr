/**
 * Standardized quote dialog for Nostr events
 * Consolidates quote repost functionality across the application
 */

import { useState } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { RadioTower, Quote } from 'lucide-react';
import { QuoteDialogProps } from '@/types/components';
import { NoteContent } from '@/components/NoteContent';
import { Loading } from '@/components/ui/LoadingComponents';
import { cn } from '@/lib/utils';

export function QuoteDialog({
  isOpen,
  onClose,
  targetEvent,
  onQuote,
  isSubmitting = false,
  spookstrOnly = false,
  onSpookstrOnlyChange,
  className
}: QuoteDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const [quoteContent, setQuoteContent] = useState('');
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);
  const [internalSpookstrOnly, setInternalSpookstrOnly] = useState(spookstrOnly);

  const isDialogSubmitting = isSubmitting || isInternalSubmitting;

  const handleQuoteSubmit = async () => {
    if (!user || !quoteContent.trim() || isDialogSubmitting) return;

    setIsInternalSubmitting(true);

    try {
      // Extract tags from original event, excluding 'e', 'p', 'q', 'imeta', and 'client' tags
      const originalTags = targetEvent.tags.filter(([tagName]) =>
        !['e', 'p', 'q', 'imeta', 'client'].includes(tagName)
      );

      // Create quote repost with q tag and inherited tags
      const eventData = {
        kind: 1,
        content: `${quoteContent}\n\nnostr:${nip19.noteEncode(targetEvent.id)}`,
        tags: [
          ['q', targetEvent.id, '', targetEvent.pubkey],
          ['p', targetEvent.pubkey],
          ...originalTags
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Call external handler if provided
      if (onQuote) {
        await onQuote(quoteContent, internalSpookstrOnly);
      } else {
        // Default publish behavior
        createEvent({
          event: eventData,
          options: internalSpookstrOnly ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
        }, {
          onSuccess: () => {
            toast({
              title: "Quote posted!",
              description: internalSpookstrOnly 
                ? "Your quote was published to Spookstr relay only." 
                : "Your quote was published successfully.",
            });
            handleClose();
          },
          onError: () => {
            toast({
              title: "Quote failed",
              description: "Failed to publish quote",
              variant: "destructive",
            });
          }
        });
      }
    } catch (error) {
      console.error('Quote submission error:', error);
      toast({
        title: "Quote failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsInternalSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuoteContent('');
    setInternalSpookstrOnly(false);
    setIsInternalSubmitting(false);
    onClose();
  };

  const handleSpookstrOnlyChange = (checked: boolean) => {
    setInternalSpookstrOnly(checked);
    onSpookstrOnlyChange?.(checked);
  };

  // Handle external spookstrOnly prop changes
  useState(() => {
    setInternalSpookstrOnly(spookstrOnly);
  });

  const contentPreview = targetEvent.content.substring(0, 150);
  const hasContentOverflow = targetEvent.content.length > 150;

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className={cn(
        "sm:max-w-md overflow-hidden",
        "border-lime-500/20 bg-black/90 backdrop-blur-sm",
        className
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-lime-400">
            <Quote className="h-5 w-5" />
            <span>Quote Repost</span>
          </DialogTitle>
          <DialogDescription className="text-lime-300/70">
            Add your thoughts about this post. The original post will be quoted below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quote input */}
          <div className="space-y-2">
            <label htmlFor="quote-content" className="text-sm font-medium text-lime-300">
              Your thoughts
            </label>
            <Textarea
              id="quote-content"
              placeholder="What do you think about this post?"
              value={quoteContent}
              onChange={(e) => setQuoteContent(e.target.value)}
              className={cn(
                "min-h-[120px] resize-none",
                "border-lime-500/30 bg-lime-500/5 focus:border-lime-400",
                "text-lime-100 placeholder-lime-500/50",
                "focus:ring-lime-500/20"
              )}
              disabled={isDialogSubmitting}
              maxLength={2800} // Nostr content limit
            />
            <div className="flex justify-between text-xs text-lime-500/60">
              <span>Add your comment above the original post</span>
              <span>{quoteContent.length}/2800</span>
            </div>
          </div>

          {/* Original post preview */}
          <Card className="border-lime-500/20 bg-lime-500/5">
            <CardContent className="p-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-lime-500/80 flex items-center">
                  <Quote className="h-3 w-3 mr-1" />
                  Original post:
                </p>
                <div className="text-sm text-lime-100">
                  <NoteContent 
                    event={targetEvent} 
                    className="line-clamp-3 break-words" 
                  />
                </div>
                {hasContentOverflow && (
                  <p className="text-xs text-lime-500/60 italic">
                    ...and {targetEvent.content.length - 150} more characters
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spookstr2 Relay Option */}
          <Card className="border-lime-500/20 bg-black/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="flex items-center h-5 pt-0.5">
                  <Checkbox
                    id="spookstr2-only-quote"
                    checked={internalSpookstrOnly}
                    onCheckedChange={handleSpookstrOnlyChange}
                    className={cn(
                      "border-lime-500/50 data-[state=checked]:bg-lime-500",
                      "data-[state=checked]:border-lime-500",
                      "data-[state=checked]:text-black"
                    )}
                    disabled={isDialogSubmitting}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label 
                    htmlFor="spookstr2-only-quote" 
                    className={cn(
                      "text-sm font-medium text-lime-300 cursor-pointer",
                      "flex items-center gap-2 hover:text-lime-200 transition-colors"
                    )}
                  >
                    <RadioTower className="h-4 w-4 text-purple-500" />
                    Post to Spookstr2 Relay Only
                  </label>
                  <p className="text-xs text-lime-500/60 leading-relaxed">
                    When checked, your quote repost will only be published to Spookstr2 relay. 
                    Uncheck to publish to all configured relays.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDialogSubmitting}
            className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleQuoteSubmit}
            disabled={!quoteContent.trim() || isDialogSubmitting}
            className={cn(
              "bg-lime-500 hover:bg-lime-600 text-black",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isDialogSubmitting ? (
              <div className="flex items-center space-x-2">
                <Loading variant="spinner" size="sm" />
                <span>Posting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Quote className="h-4 w-4" />
                <span>Quote Repost</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing quote dialog state
 */
export function useQuoteDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [targetEvent, setTargetEvent] = useState<NostrEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spookstrOnly, setSpookstrOnly] = useState(false);

  const openQuoteDialog = (event: NostrEvent) => {
    setTargetEvent(event);
    setIsOpen(true);
  };

  const closeQuoteDialog = () => {
    setIsOpen(false);
    setTargetEvent(null);
    setIsSubmitting(false);
    setSpookstrOnly(false);
  };

  return {
    isOpen,
    targetEvent,
    isSubmitting,
    spookstrOnly,
    setSpookstrOnly,
    openQuoteDialog,
    closeQuoteDialog,
    setIsSubmitting
  };
}

/**
 * Higher-order component for quote dialog functionality
 */
interface WithQuoteDialogProps {
  onQuoteRequest?: (event: NostrEvent) => void;
}

export function withQuoteDialog<P extends WithQuoteDialogProps>(
  Component: React.ComponentType<P>
) {
  return function WithQuoteDialogComponent(props: P) {
    const { 
      isOpen, 
      targetEvent, 
      isSubmitting, 
      spookstrOnly, 
      setSpookstrOnly, 
      openQuoteDialog, 
      closeQuoteDialog, 
      setIsSubmitting 
    } = useQuoteDialog();

    const handleQuoteRequest = (event: NostrEvent) => {
      if (props.onQuoteRequest) {
        props.onQuoteRequest(event);
      } else {
        openQuoteDialog(event);
      }
    };

    const handleQuoteSubmit = async (content: string, spookstrOnly: boolean) => {
      setIsSubmitting(true);
      // Here you would typically call a callback or handle the quote submission
      // For now, we'll just simulate it
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSubmitting(false);
      closeQuoteDialog();
    };

    return (
      <>
        <Component 
          {...props} 
          onQuoteRequest={handleQuoteRequest}
        />
        
        {targetEvent && (
          <QuoteDialog
            isOpen={isOpen}
            onClose={closeQuoteDialog}
            targetEvent={targetEvent}
            onQuote={handleQuoteSubmit}
            isSubmitting={isSubmitting}
            spookstrOnly={spookstrOnly}
            onSpookstrOnlyChange={setSpookstrOnly}
          />
        )}
      </>
    );
  };
}

export default QuoteDialog;