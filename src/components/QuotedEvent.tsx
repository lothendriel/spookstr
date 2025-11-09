import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useQuotedEvent } from '@/hooks/useQuotedEvent';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink } from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);

  // Parse NIP-19 identifier to determine to type and data
  const parsedEvent = useMemo(() => {
    try {
      const decoded = nip19.decode(eventId);
      return {
        type: decoded.type,
        data: decoded.data,
        success: true
      };
    } catch (error) {
      console.error('🔍 QuotedEvent: Failed to parse NIP-19 identifier:', error);
      return {
        type: null,
        data: null,
        success: false
      };
    }
  }, [eventId]);

  // Build appropriate filters based on event type
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

  const { data: quotedEvents, isLoading, error, refetch } = useQuotedEvent(
    eventId,
    {
      enabled: !!eventId && parsedEvent.success && filters.length > 0,
      staleTime: 120000, // 2 minutes - longer cache for quoted content
      retry: 2, // More retries for better reliability
    }
  );

  // Extract the first event from the array (useRelayEvent returns arrays)
  const quotedEvent = quotedEvents && quotedEvents.length > 0 ? quotedEvents[0] : null;

  // Enhanced debug logging
  console.log('🔍 QuotedEvent Debug:', {
    eventId: eventId.substring(0, 20) + '...',
    parsedEventSuccess: parsedEvent.success,
    parsedEventType: parsedEvent.type,
    filters: filters.map(f => ({
      kinds: f.kinds,
      ids: f.ids?.map(id => id.substring(0, 8) + '...'),
      authors: f.authors?.map(pk => pk.substring(0, 8) + '...'),
      '#d': f['#d']
    })),
    quotedEventsCount: quotedEvents?.length || 0,
    quotedEvents: quotedEvents?.map(e => ({
      id: e.id.substring(0, 8) + '...',
      kind: e.kind,
      hasContent: !!e.content,
      contentLength: e.content?.length || 0
    })),
    quotedEvent: quotedEvent ? {
      id: quotedEvent.id.substring(0, 8) + '...',
      kind: quotedEvent.kind,
      hasContent: !!quotedEvent.content,
      contentLength: quotedEvent.content?.length || 0
    } : null,
    isLoading,
    error: error?.message,
    errorType: error?.name
  });

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
      <Card className={`border-orange-500/20 bg-orange-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center space-y-3">
            <div className="text-orange-400/80 text-sm font-medium">
              Having trouble finding this quoted post
            </div>
            <div className="text-xs text-orange-500/60">
              Error: {error.message || 'Network error'}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  refetch();
                }}
                className="text-xs border-orange-500/30 hover:bg-orange-500/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry Search
              </Button>
              <a
                href={`https://njump.me/nostr:${eventId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 hover:underline inline-flex items-center justify-center"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View on Nostr
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quotedEvent || !quotedEvent.id) {
    return (
      <Card className={`border-red-500/20 bg-red-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center space-y-3">
            <div className="text-red-400/80 text-sm font-medium">
              Quoted post not found
            </div>
            <div className="text-xs text-red-500/60">
              Searched multiple relays and strategies
              {retryCount > 0 && ` (${retryCount} retry${retryCount > 1 ? 's' : ''})`}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRetryCount(prev => prev + 1);
                  refetch();
                }}
                className="text-xs border-red-500/30 hover:bg-red-500/10"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Try Again
              </Button>
              <a
                href={`https://njump.me/nostr:${eventId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-400 hover:text-red-300 hover:underline inline-flex items-center justify-center"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View on Nostr
              </a>
            </div>
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

// Dynamic renderer that chooses to appropriate component based on event kind
function DynamicEventRenderer({ event, className, originalEventId }: QuotedEventContentProps) {
  // Validate event before rendering
  if (!event || !event.kind) {
    return (
      <Card className={`border-red-500/20 bg-red-500/5 ${className}`}>
        <CardContent className="p-3 text-center">
          <div className="text-red-300 text-sm">
            Invalid event data
          </div>
        </CardContent>
      </Card>
    );
  }

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
  // Validate event before processing
  if (!event || !event.pubkey) {
    return (
      <Card className={`border-red-500/20 bg-red-500/5 ${className}`}>
        <CardContent className="p-3 text-center">
          <div className="text-red-300 text-sm">
            Invalid quoted event data
          </div>
        </CardContent>
      </Card>
    );
  }

  const author = useAuthor(event.pubkey);
  const navigate = useNavigate();
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, event.pubkey);
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Use original nip19 identifier if available, otherwise create appropriate format
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