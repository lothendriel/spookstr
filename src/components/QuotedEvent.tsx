import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useRobustQuotedEvent } from '@/hooks/useRobustQuotedEvent';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';
import { LiveStreamEvent } from '@/components/LiveStreamEvent';
import { MarketplaceListing } from '@/components/MarketplaceListing';
import { LongFormContent } from '@/components/LongFormContent';

interface QuotedEventProps {
  eventId: string;
  className?: string;
}

/** Renders a quoted Nostr event by fetching and displaying its content with relay hints */
export function QuotedEvent({ eventId, className }: QuotedEventProps) {
  // Parse the NIP-19 identifier to determine the type and data
  const parsedEvent = useMemo(() => {
    try {
      const decoded = nip19.decode(eventId);
      return {
        type: decoded.type,
        data: decoded.data,
        success: true
      };
    } catch {
      return {
        type: null,
        data: null,
        success: false
      };
    }
  }, [eventId]);

  // Build appropriate filters based on the event type
  const filters = useMemo(() => {
    if (!parsedEvent.success || !parsedEvent.data) {
      return [];
    }

    if (parsedEvent.type === 'note') {
      // Simple event ID
      return [{ ids: [parsedEvent.data as string], limit: 1 }];
    } else if (parsedEvent.type === 'nevent') {
      // Event with optional relay hints
      const eventData = parsedEvent.data as { id: string; author?: string; relays?: string[] };
      return [{ ids: [eventData.id], limit: 1 }];
    } else if (parsedEvent.type === 'naddr') {
      // Addressable event
      const naddr = parsedEvent.data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
      return [{
        kinds: [naddr.kind],
        authors: [naddr.pubkey],
        '#d': [naddr.identifier],
        limit: 1
      }];
    }

    return [];
  }, [parsedEvent]);

  const { data: quotedEvent, isLoading, error } = useRobustQuotedEvent(
    eventId,
    {
      enabled: !!eventId && parsedEvent.success && filters.length > 0,
      staleTime: 120000, // 2 minutes - longer cache for quoted content
      retry: 2, // More retries for better reliability
    }
  );

  if (isLoading) {
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-lime-500 border-t-transparent rounded-full" />
            <div className="text-lime-500/60 text-sm">
              Searching for quoted post...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center space-y-2">
            <div className="text-lime-500/60 text-sm">
              Having trouble finding this quoted post
            </div>
            <div className="text-xs text-lime-500/40">
              Trying multiple relay sources...
            </div>
            <a
              href={`https://njump.me/nostr:${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lime-400 hover:text-lime-300 hover:underline block"
            >
              View on Nostr →
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quotedEvent) {
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center space-y-2">
            <div className="text-lime-500/60 text-sm">
              Quoted post not found
            </div>
            <div className="text-xs text-lime-500/40">
              Searched multiple relays and strategies
            </div>
            <a
              href={`https://njump.me/nostr:${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lime-400 hover:text-lime-300 hover:underline block"
            >
              View on Nostr →
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <DynamicEventRenderer event={quotedEvent} className={className} originalEventId={eventId} />;
}

interface QuotedEventContentProps {
  event: NostrEvent;
  className?: string;
  originalEventId?: string;
}

// Dynamic renderer that chooses the appropriate component based on event kind
function DynamicEventRenderer({ event, className, originalEventId }: QuotedEventContentProps) {
  // Handle different event kinds with specialized renderers
  switch (event.kind) {
    case 30311:
      // NIP-53 Live Streaming Event
      return <LiveStreamEvent event={event} className={className} />;

    case 30312:
      // NIP-53 Meeting Space - could add specialized renderer
      return <QuotedEventContent event={event} className={className} originalEventId={originalEventId} />;

    case 30313:
      // NIP-53 Meeting Room Event - could add specialized renderer
      return <QuotedEventContent event={event} className={className} originalEventId={originalEventId} />;

    case 30023:
      // NIP-23 Long-form Content (articles)
      return <LongFormContent event={event} className={className} />;

    case 30402:
      // NIP-15 Marketplace Listing
      return <MarketplaceListing event={event} className={className} />;

    default:
      // Default to standard event content renderer
      return <QuotedEventContent event={event} className={className} originalEventId={originalEventId} />;
  }
}

function QuotedEventContent({ event, className, originalEventId }: QuotedEventContentProps) {
  const author = useAuthor(event.pubkey);
  const navigate = useNavigate();
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Use the original nip19 identifier if available, otherwise create appropriate format
    if (originalEventId) {
      navigate(`/${originalEventId}`);
    } else {
      // For addressable events (kind 30000+), create naddr format
      if (event.kind >= 30000 && event.kind < 40000) {
        const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';
        const naddr = nip19.naddrEncode({
          identifier: dTag,
          pubkey: event.pubkey,
          kind: event.kind
        });
        navigate(`/${naddr}`);
      } else {
        // For regular events, use note1 format
        const noteId = nip19.noteEncode(event.id);
        navigate(`/${noteId}`);
      }
    }
  };

  return (
    <Card
      className={`border-lime-500/20 bg-lime-500/5 hover:border-lime-500/30 transition-colors cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start space-x-2 mb-2">
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={metadata?.picture} alt={displayName} />
            <AvatarFallback className="text-xs bg-lime-500/20 text-lime-400">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1">
              <span className="font-medium text-lime-400 text-sm truncate">
                {displayName}
              </span>
              <span className="text-lime-500/60 text-xs">•</span>
              <span className="text-lime-500/60 text-xs">{timeAgo}</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-lime-100 line-clamp-3">
          <NoteContent event={event} />
        </div>
      </CardContent>
    </Card>
  );
}