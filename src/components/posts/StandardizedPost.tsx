/**
 * Standardized Post Component
 * A clean, optimized post component that uses reusable components and hooks
 * Eliminates code duplication and provides consistent behavior
 */

import { useState, memo, useEffect, useMemo, useCallback } from 'react';
import { NostrEvent } from '@nostrify/nostrify';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AuthorDisplay, RepostAuthorDisplay } from '@/components/author/AuthorDisplay';
import { InteractionButtons } from '@/components/interactions/InteractionButtons';
import { QuoteDialog } from '@/components/dialogs/QuoteDialog';
import { NoteContent } from '@/components/NoteContent';
import { PostSkeleton } from '@/components/ui/LoadingComponents';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { EmptyState } from '@/components/ui/ErrorBoundary';
import { useInView } from 'react-intersection-observer';
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';
import { useBatchPrefetchQuotedEvents } from '@/hooks/useQuotedEvent';
import { useQuoteDialog } from '@/components/dialogs/QuoteDialog';
import { nip19 } from 'nostr-tools';
import { Repeat, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardizedPostProps {
  event: NostrEvent;
  onClick?: () => void;
  showActions?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  isCompact?: boolean;
  className?: string;
  variant?: 'default' | 'card' | 'minimal';
}

export function StandardizedPost({
  event,
  onClick,
  showActions = true,
  showHeader = true,
  showFooter = true,
  isCompact = false,
  className,
  variant = 'default'
}: StandardizedPostProps) {
  // State management
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px',
  });

  const { 
    isOpen: isQuoteDialogOpen, 
    targetEvent, 
    openQuoteDialog, 
    closeQuoteDialog 
  } = useQuoteDialog();

  // Event processing
  const processedEvent = useMemo(() => {
    // Check if this is a repost (kind 6 or 16)
    const isRepost = event.kind === 6 || event.kind === 16;
    let repostedEvent: NostrEvent | null = null;
    let displayEvent = event;

    if (isRepost && event.content) {
      try {
        const parsed = JSON.parse(event.content);
        if (parsed.id && parsed.pubkey && parsed.created_at && parsed.kind !== undefined) {
          repostedEvent = parsed as NostrEvent;
          displayEvent = repostedEvent;
        }
      } catch (e) {
        console.warn('Failed to parse repost content:', e);
      }
    }

    return {
      isRepost,
      repostedEvent,
      displayEvent,
      reposterPubkey: isRepost ? event.pubkey : null,
      originalPubkey: repostedEvent ? repostedEvent.pubkey : event.pubkey
    };
  }, [event]);

  // Prefetch quoted events when post comes into view
  const quotedEventIds = useMemo(() => {
    if (!inView || !processedEvent.displayEvent.content) return [];

    const ids: string[] = [];
    const nostrRegex = /nostr:(note1|nevent1|naddr1)[0-9a-z]+/g;
    let match;

    while ((match = nostrRegex.exec(processedEvent.displayEvent.content)) !== null) {
      const fullMatch = match[0];
      const nostrId = fullMatch.substring(6); // Remove "nostr:" prefix
      ids.push(nostrId);
    }

    return ids;
  }, [inView, processedEvent.displayEvent.content]);

  const { prefetchAll } = useBatchPrefetchQuotedEvents(quotedEventIds);

  useEffect(() => {
    if (inView && quotedEventIds.length > 0) {
      console.log(`📡 Prefetching ${quotedEventIds.length} quoted events for post ${processedEvent.displayEvent.id.slice(0, 8)}`);
      prefetchAll();
    }
  }, [inView, quotedEventIds, prefetchAll]);

  // Interaction data
  const interactionEventId = useMemo(() => {
    return processedEvent.repostedEvent ? processedEvent.repostedEvent.id : event.id;
  }, [processedEvent.repostedEvent?.id, event.id]);

  const {
    data: interactionCounts,
    isLoading: isLoadingCounts,
    error: interactionError
  } = useRealtimeInteractions(interactionEventId);

  const interactionData = useMemo(() => ({
    likeCount: interactionCounts?.likes || 0,
    repostCount: interactionCounts?.reposts || 0,
    commentCount: interactionCounts?.comments || 0,
    zapCount: interactionCounts?.zaps || 0,
    totalSats: 0, // This would come from useZaps hook
    hasLightningAddress: false, // This would come from author metadata
    isLoading: isLoadingCounts,
    error: interactionError
  }), [interactionCounts, isLoadingCounts, interactionError]);

  // Event handlers
  const handleQuote = useCallback(() => {
    openQuoteDialog(processedEvent.displayEvent);
  }, [openQuoteDialog, processedEvent.displayEvent]);

  const handleComment = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  // Loading state
  if (!inView) {
    return (
      <div ref={ref}>
        <PostSkeleton className={cn("border-lime-500/20", className)} />
      </div>
    );
  }

  // Error state
  if (interactionError) {
    return (
      <Card className={cn("border-red-500/20 bg-red-500/5", className)}>
        <CardContent className="p-6 text-center">
          <EmptyState
            icon={<FileText className="h-8 w-8 text-red-500" />}
            title="Error Loading Post"
            description="Unable to load post interactions. Please try again."
          />
        </CardContent>
      </Card>
    );
  }

  // Render based on variant
  if (variant === 'minimal') {
    return (
      <ErrorBoundary>
        <div 
          ref={ref}
          className={cn(
            "p-3 border-b border-lime-500/10 hover:bg-lime-500/5 transition-colors cursor-pointer",
            className
          )}
          onClick={onClick}
        >
          {processedEvent.isRepost && (
            <div className="flex items-center text-xs text-lime-500/60 mb-2">
              <Repeat className="h-3 w-3 mr-1" />
              <span>Reposted</span>
            </div>
          )}
          
          <div className="flex items-start space-x-2">
            <AuthorDisplay
              pubkey={processedEvent.originalPubkey}
              size="sm"
              showTime={true}
              timestamp={processedEvent.displayEvent.created_at}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-lime-100 line-clamp-2">
                <NoteContent event={processedEvent.displayEvent} />
              </div>
              {showActions && (
                <div className="mt-2">
                  <InteractionButtons
                    eventId={interactionEventId}
                    targetPubkey={processedEvent.originalPubkey}
                    likeCount={interactionData.likeCount}
                    commentCount={interactionData.commentCount}
                    zapCount={interactionData.zapCount}
                    onComment={handleComment}
                    onQuote={handleQuote}
                    size="sm"
                    variant="compact"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {processedEvent.displayEvent && (
          <QuoteDialog
            isOpen={isQuoteDialogOpen}
            onClose={closeQuoteDialog}
            targetEvent={processedEvent.displayEvent}
          />
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div ref={ref}>
        <Card
          className={cn(
            "border-lime-500/20 hover:border-lime-500/40 transition-all duration-200 cursor-pointer",
            "bg-black/40 backdrop-blur-sm",
            isCompact && "p-3",
            className
          )}
          onClick={onClick}
        >
          {/* Repost indicator */}
          {processedEvent.isRepost && processedEvent.reposterPubkey && (
            <div className={cn(
              "px-4 pt-3 pb-0",
              isCompact && "px-3 pt-2 pb-0"
            )}>
              <div className="flex items-center text-xs text-lime-500/60">
                <Repeat className="h-3 w-3 mr-1" />
                <RepostAuthorDisplay
                  reposterPubkey={processedEvent.reposterPubkey}
                  pubkey={processedEvent.originalPubkey}
                  size="sm"
                  showAvatar={false}
                  showTime={false}
                  showRepostLabel={false}
                />
              </div>
            </div>
          )}

          {/* Header */}
          {showHeader && (
            <CardHeader className={cn(
              "pb-3",
              isCompact && "pb-2 px-3"
            )}>
              <AuthorDisplay
                pubkey={processedEvent.originalPubkey}
                showTime={true}
                timestamp={processedEvent.displayEvent.created_at}
                size={isCompact ? "sm" : "md"}
              />
            </CardHeader>
          )}

          {/* Content */}
          <CardContent className={cn(
            "pt-0",
            isCompact && "pt-0 px-3 pb-2"
          )}>
            <div className={cn(
              "whitespace-pre-wrap break-words text-lime-100",
              isCompact ? "text-sm" : "text-sm"
            )}>
              <NoteContent event={processedEvent.displayEvent} />
            </div>

            {/* Actions */}
            {showActions && showFooter && (
              <div className={cn(
                "flex items-center justify-between mt-4 pt-3 border-t border-lime-500/20",
                isCompact && "mt-2 pt-2"
              )}>
                {interactionData.isLoading ? (
                  <div className="flex space-x-2">
                    <PostSkeleton className="h-8 w-8" />
                    <PostSkeleton className="h-8 w-8" />
                    <PostSkeleton className="h-8 w-8" />
                    <PostSkeleton className="h-8 w-8" />
                  </div>
                ) : (
                  <InteractionButtons
                    eventId={interactionEventId}
                    targetPubkey={processedEvent.originalPubkey}
                    isLiked={false} // This would come from user interaction state
                    isReposted={false} // This would come from user interaction state
                    likeCount={interactionData.likeCount}
                    repostCount={interactionData.repostCount}
                    commentCount={interactionData.commentCount}
                    zapCount={interactionData.zapCount}
                    totalSats={interactionData.totalSats}
                    hasLightningAddress={interactionData.hasLightningAddress}
                    onComment={handleComment}
                    onQuote={handleQuote}
                    size={isCompact ? "sm" : "md"}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quote Dialog */}
        {processedEvent.displayEvent && (
          <QuoteDialog
            isOpen={isQuoteDialogOpen}
            onClose={closeQuoteDialog}
            targetEvent={processedEvent.displayEvent}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

/**
 * Memoized version for better performance
 */
export const MemoizedStandardizedPost = memo(StandardizedPost);

MemoizedStandardizedPost.displayName = 'MemoizedStandardizedPost';

/**
 * Post component with error boundary built-in
 */
export function SafeStandardizedPost(props: StandardizedPostProps) {
  return (
    <ErrorBoundary
      fallback={
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-6 text-center">
            <EmptyState
              icon={<FileText className="h-8 w-8 text-red-500" />}
              title="Post Error"
              description="This post could not be displayed."
            />
          </CardContent>
        </Card>
      }
    >
      <StandardizedPost {...props} />
    </ErrorBoundary>
  );
}

/**
 * Hook for managing post interactions
 */
export function usePostInteractions(eventId: string) {
  const { data: interactionCounts, isLoading, error } = useRealtimeInteractions(eventId);
  
  return {
    likeCount: interactionCounts?.likes || 0,
    repostCount: interactionCounts?.reposts || 0,
    commentCount: interactionCounts?.comments || 0,
    zapCount: interactionCounts?.zaps || 0,
    isLoading,
    error,
    hasInteractions: (interactionCounts?.likes || 0) > 0 || 
                     (interactionCounts?.reposts || 0) > 0 || 
                     (interactionCounts?.comments || 0) > 0 || 
                     (interactionCounts?.zaps || 0) > 0
  };
}

export default StandardizedPost;