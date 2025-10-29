import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useMultiRelayEvent } from '@/hooks/useMultiRelayQuery';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { NostrEvent } from '@nostrify/nostrify';

interface QuotedEventProps {
  eventId: string;
  className?: string;
}

/** Renders a quoted Nostr event by fetching and displaying its content */
export function QuotedEvent({ eventId, className }: QuotedEventProps) {
  const { nostr } = useNostr();

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

  // For naddr (addressable events), use a different query
  const { data: quotedEvent, isLoading, error } = useQuery({
    queryKey: ['quoted-event', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      if (!parsedEvent.success || !parsedEvent.data) {
        throw new Error('Invalid event identifier');
      }

      if (parsedEvent.type === 'note') {
        // Simple event ID
        const events = await nostr.query([{ ids: [parsedEvent.data as string], limit: 1 }], { signal });
        return events[0] || null;
      } else if (parsedEvent.type === 'nevent') {
        // Event with optional relay hints
        const eventData = parsedEvent.data as { id: string; author?: string; relays?: string[] };
        const events = await nostr.query([{ ids: [eventData.id], limit: 1 }], { signal });
        return events[0] || null;
      } else if (parsedEvent.type === 'naddr') {
        // Addressable event
        const naddr = parsedEvent.data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
        const events = await nostr.query([{
          kinds: [naddr.kind],
          authors: [naddr.pubkey],
          '#d': [naddr.identifier],
          limit: 1
        }], { signal });
        return events[0] || null;
      }

      throw new Error('Unsupported event type');
    },
    enabled: !!eventId && parsedEvent.success,
    staleTime: 60000, // 1 minute
    retry: 1
  });

  if (isLoading) {
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-start space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.log('QuotedEvent: Error fetching event:', error);
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center text-lime-500/60 text-sm">
            Unable to load quoted post
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!quotedEvent) {
    console.log('QuotedEvent: No event found for ID:', actualEventId);
    return (
      <Card className={`border-lime-500/20 bg-lime-500/5 ${className}`}>
        <CardContent className="p-3">
          <div className="text-center">
            <div className="text-lime-500/60 text-sm mb-1">
              Quoted post not found
            </div>
            <a
              href={`https://njump.me/nostr:${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-lime-400 hover:text-lime-300 hover:underline"
            >
              View on Nostr →
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <QuotedEventContent event={quotedEvent} className={className} originalEventId={eventId} />;
}

interface QuotedEventContentProps {
  event: NostrEvent;
  className?: string;
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