import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import NotFound from './NotFound';
import Profile from './Profile';
import { PostDetailView } from '@/components/PostDetailView';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
      return <Profile pubkey={data as string} />;

    case 'nprofile':
      return <Profile pubkey={(data as { pubkey: string }).pubkey} />;

    case 'note': {
      const noteId = data as string;
      return <NoteView noteId={noteId} />;
    }

    case 'nevent': {
      const eventData = data as { id: string; author?: string; relays?: string[] };
      return <EventView eventId={eventData.id} />;
    }

    case 'naddr':
      // AI agent should implement addressable event view here
      return <div>Addressable event placeholder</div>;

    default:
      return <NotFound />;
  }
}

// Component to view a note by ID
function NoteView({ noteId }: { noteId: string }) {
  const { nostr } = useNostr();

  const { data: event, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([{ ids: [noteId], limit: 1 }], { signal });
      return events[0] || null;
    },
  });

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
    return <NotFound />;
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

// Component to view an event by ID
function EventView({ eventId }: { eventId: string }) {
  const { nostr } = useNostr();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query([{ ids: [eventId], limit: 1 }], { signal });
      return events[0] || null;
    },
  });

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
    return <NotFound />;
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