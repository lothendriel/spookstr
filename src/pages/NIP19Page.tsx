import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import NotFound from './NotFound';

import { PostDetailView } from '@/components/PostDetailView';
import { ArticleView } from '@/components/ArticleView';
import { useMultiRelayEvent } from '@/hooks/useMultiRelayQuery';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Custom hook to fetch events with relay hints
function useEventWithHints(eventId: string, relayHints?: string[]) {
  const { nostr } = useNostr();
  const { presetRelays = [] } = useAppContext();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event-with-hints', eventId, relayHints],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Combine relay hints with preset relays, prioritizing hints
      const prioritizedRelays = [
        ...(relayHints || []),
        ...presetRelays.map(r => r.url)
      ];

      // Add popular fallback relays if not already included
      const fallbackRelays = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band',
        'wss://relay.primal.net',
        'wss://relay.snort.social',
        'wss://nostr.wine',
        'wss://relay.nostr.info'
      ];

      const allRelays = [
        ...prioritizedRelays,
        ...fallbackRelays
      ];

      // Remove duplicates while preserving order (hints first, then presets, then fallbacks)
      const uniqueRelays = [...new Set(allRelays)];

      if (uniqueRelays.length > 0) {
        try {
          // Try relay group first (most efficient for multiple relays)
          const relayGroup = nostr.group(uniqueRelays);
          const events = await relayGroup.query([{ ids: [eventId], limit: 1 }], { signal });
          if (events.length > 0) {
            return events[0];
          }
        } catch (groupError) {
          // Try each relay individually, prioritizing relay hints
          for (const relayUrl of uniqueRelays) {
            try {
              const relay = nostr.relay(relayUrl);
              const events = await relay.query([{ ids: [eventId], limit: 1 }], { signal });
              if (events.length > 0) {
                return events[0];
              }
            } catch (relayError) {
              continue;
            }
          }
        }
      }
      return null;
    },
    enabled: !!eventId,
    staleTime: 60000, // 1 minute
    retry: 0, // Don't retry since we're already trying many relays
  });

  return { data: event, isLoading };
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();
  const { nostr } = useNostr();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">User Profile</h1>
            <p className="text-muted-foreground">Profile view coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">pubkey: {data as string}</p>
          </div>
        </div>
      );

    case 'nprofile':
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">User Profile</h1>
            <p className="text-muted-foreground">Profile view coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">pubkey: {(data as { pubkey: string }).pubkey}</p>
          </div>
        </div>
      );

    case 'note': {
      const noteId = data as string;
      return <NoteView noteId={noteId} />;
    }

    case 'nevent': {
      const eventData = data as { id: string; author?: string; relays?: string[] };
      return <EventView eventId={eventData.id} relayHints={eventData.relays} />;
    }

    case 'naddr': {
      const naddrData = data as { identifier: string; pubkey: string; kind: number; relays?: string[] };
      return <AddressableEventView naddrData={naddrData} />;
    }

    default:
      return <NotFound />;
  }
}

// Component to view a note by ID
function NoteView({ noteId }: { noteId: string }) {
  const { data: event, isLoading } = useMultiRelayEvent(noteId);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="text-lime-400 text-lg font-semibold">Event Not Found</div>
                <div className="text-lime-100/60">
                  The requested note could not be found on any connected relays.
                </div>
                <div className="text-sm text-lime-500/40">
                  Event ID: <code className="bg-lime-500/10 px-2 py-1 rounded">{noteId}</code>
                </div>
                <div className="text-xs text-lime-500/30 mt-4">
                  The event may not exist, be on different relays, or have been deleted.
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />
      <div className="max-w-4xl mx-auto p-4">
        <PostDetailView event={event} onBack={() => window.history.back()} />
      </div>
    </div>
  );
}

// Component to view addressable events (naddr)
function AddressableEventView({ naddrData }: { naddrData: { identifier: string; pubkey: string; kind: number; relays?: string[] } }) {
  const { data: event, isLoading } = useAddressableEvent(naddrData);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="text-lime-400 text-lg font-semibold">Addressable Event Not Found</div>
                <div className="text-lime-100/60">
                  The requested addressable event could not be found on any connected relays.
                </div>
                <div className="text-sm text-lime-500/40 space-y-1">
                  <div>Kind: <code className="bg-lime-500/10 px-2 py-1 rounded">{naddrData.kind}</code></div>
                  <div>Author: <code className="bg-lime-500/10 px-2 py-1 rounded text-xs">{naddrData.pubkey}</code></div>
                  <div>Identifier: <code className="bg-lime-500/10 px-2 py-1 rounded">{naddrData.identifier || '(empty)'}</code></div>
                </div>
                <div className="text-xs text-lime-500/30 mt-4">
                  The event may not exist, be on different relays, or have been deleted.
                  {naddrData.relays && naddrData.relays.length > 0 && (
                    <div className="mt-2">
                      Searched relay hints: {naddrData.relays.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Handle different kinds of addressable events
  const renderEventContent = () => {
    switch (event.kind) {
      case 30023:
        // NIP-23 Long-form Content (articles)
        return <ArticleView event={event} onBack={() => window.history.back()} />;

      case 30402:
        // NIP-15 Marketplace Listing - could use MarketplaceListing component
        return (
          <div className="max-w-4xl mx-auto p-4">
            <PostDetailView event={event} onBack={() => window.history.back()} />
          </div>
        );

      default:
        // Default view for other addressable events
        return (
          <div className="max-w-4xl mx-auto p-4">
            <PostDetailView event={event} onBack={() => window.history.back()} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <SpookstrHeader />
      <main className="px-4 py-8">
        {renderEventContent()}
      </main>
    </div>
  );
}

// Custom hook to fetch addressable events with relay hints
function useAddressableEvent(naddrData: { identifier: string; pubkey: string; kind: number; relays?: string[] }) {
  const { nostr } = useNostr();
  const { presetRelays = [] } = useAppContext();

  const { data: event, isLoading } = useQuery({
    queryKey: ['addressable-event', naddrData.kind, naddrData.pubkey, naddrData.identifier, naddrData.relays],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      // Combine relay hints with preset relays, prioritizing hints
      const prioritizedRelays = [
        ...(naddrData.relays || []),
        ...presetRelays.map(r => r.url)
      ];

      // Add popular fallback relays if not already included
      const fallbackRelays = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band',
        'wss://relay.primal.net',
        'wss://relay.snort.social',
        'wss://nostr.wine',
        'wss://relay.nostr.info'
      ];

      const allRelays = [
        ...prioritizedRelays,
        ...fallbackRelays
      ];

      // Remove duplicates while preserving order (hints first, then presets, then fallbacks)
      const uniqueRelays = [...new Set(allRelays)];

      const filters = [{
        kinds: [naddrData.kind],
        authors: [naddrData.pubkey],
        '#d': [naddrData.identifier],
        limit: 1
      }];

      if (uniqueRelays.length > 0) {
        try {
          // Try relay group first (most efficient for multiple relays)
          const relayGroup = nostr.group(uniqueRelays);
          const events = await relayGroup.query(filters, { signal });
          if (events.length > 0) {
            return events[0];
          }
        } catch (groupError) {
          // Try each relay individually, prioritizing relay hints
          for (const relayUrl of uniqueRelays) {
            try {
              const relay = nostr.relay(relayUrl);
              const events = await relay.query(filters, { signal });
              if (events.length > 0) {
                return events[0];
              }
            } catch (relayError) {
              continue;
            }
          }
        }
      }
      return null;
    },
    enabled: !!(naddrData.kind && naddrData.pubkey),
    staleTime: 60000, // 1 minute
    retry: 0, // Don't retry since we're already trying many relays
  });

  return { data: event, isLoading };
}

// Component to view an event by ID (including relay hints from nevent)
function EventView({ eventId, relayHints }: { eventId: string; relayHints?: string[] }) {
  const { data: event, isLoading } = useEventWithHints(eventId, relayHints);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="text-lime-400 text-lg font-semibold">Event Not Found</div>
                <div className="text-lime-100/60">
                  The requested event could not be found on any connected relays.
                </div>
                <div className="text-sm text-lime-500/40">
                  Event ID: <code className="bg-lime-500/10 px-2 py-1 rounded">{eventId}</code>
                </div>
                <div className="text-xs text-lime-500/30 mt-4">
                  The event may not exist, be on different relays, or have been deleted.
                  {relayHints && relayHints.length > 0 && (
                    <div className="mt-2">
                      Searched relay hints: {relayHints.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />
      <div className="max-w-4xl mx-auto p-4">
        <PostDetailView event={event} onBack={() => window.history.back()} />
      </div>
    </div>
  );
}