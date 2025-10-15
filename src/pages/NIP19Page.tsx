import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useAuthor } from '@/hooks/useAuthor';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NoteContent } from '@/components/NoteContent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MessageCircle, Zap } from 'lucide-react';
import { ZapDialog } from '@/components/ZapDialog';
import { genUserName } from '@/lib/genUserName';
import NotFound from './NotFound';
import type { NostrEvent } from '@nostrify/nostrify';

interface NIP19PageProps {
  onBack?: () => void;
}

export function NIP19Page({ onBack }: NIP19PageProps) {
  const { nip19: identifier } = useParams<{ nip19: string }>();
  const { nostr } = useNostr();
  const [decoded, setDecoded] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) {
      setError('No identifier provided');
      return;
    }

    try {
      const result = nip19.decode(identifier);
      setDecoded(result);
      setError(null);
    } catch (err) {
      console.error('Failed to decode NIP-19 identifier:', err);
      setError('Invalid Nostr identifier');
    }
  }, [identifier]);

  if (error) {
    return <NotFound />;
  }

  if (!decoded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
        <div className="max-w-4xl mx-auto">
          <div className="border border-lime-500/20 rounded-lg p-8 bg-black/40">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
    case 'nprofile':
      return <ProfileView pubkey={type === 'npub' ? data : data.pubkey} onBack={onBack} />;

    case 'note':
      return <NoteView noteId={data} onBack={onBack} />;

    case 'nevent':
      return <EventView eventId={data.id} relays={data.relays} author={data.author} onBack={onBack} />;

    case 'naddr':
      return <AddressableView
        kind={data.kind}
        pubkey={data.pubkey}
        identifier={data.identifier}
        relays={data.relays}
        onBack={onBack}
      />;

    default:
      return <NotFound />;
  }
}

// Profile View Component
function ProfileView({ pubkey, onBack }: { pubkey: string; onBack?: () => void }) {
  const author = useAuthor(pubkey);
  const { data: events, isLoading } = useQuery({
    queryKey: ['profile-events', pubkey],
    queryFn: async (c) => {
      const { nostr } = await import('@/hooks/useNostr');
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const events = await nostr().query([{
        kinds: [1],
        authors: [pubkey],
        limit: 20,
      }], { signal });

      return events;
    },
    enabled: !!pubkey,
  });

  if (author.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
        <div className="max-w-4xl mx-auto">
          <div className="border border-lime-500/20 rounded-lg p-8 bg-black/40">
            <div className="space-y-4">
              <Skeleton className="h-32 w-32 rounded-full mx-auto" />
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!author.data) {
    return <NotFound />;
  }

  const metadata = author.data.metadata;
  const displayName = metadata?.name || genUserName(pubkey);
  const postCount = events?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4 text-lime-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback className="text-2xl bg-lime-500/20 text-lime-400">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl text-lime-400">{displayName}</CardTitle>
                {metadata?.display_name && metadata.display_name !== displayName && (
                  <p className="text-lime-500/60">{metadata.display_name}</p>
                )}
                {metadata?.about && (
                  <p className="text-lime-100 mt-2 max-w-2xl">{metadata.about}</p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-lime-400">{postCount}</div>
                <div className="text-sm text-lime-500/60">Posts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-lime-400">0</div>
                <div className="text-sm text-lime-500/60">Following</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-lime-400">0</div>
                <div className="text-sm text-lime-500/60">Followers</div>
              </div>
            </div>

            {/* Links */}
            {(metadata?.website || metadata?.nip05) && (
              <div className="space-y-2">
                {metadata.website && (
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lime-400 hover:text-lime-300 block"
                  >
                    {metadata.website}
                  </a>
                )}
                {metadata.nip05 && (
                  <div className="text-lime-500/60">
                    ✅ {metadata.nip05}
                  </div>
                )}
              </div>
            )}

            {/* Recent Posts */}
            {events && events.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-lime-400">Recent Posts</h3>
                <div className="space-y-3">
                  {events.slice(0, 5).map((event) => (
                    <Card key={event.id} className="border-lime-500/10 bg-black/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-lime-500/60 mb-2">
                          {new Date(event.created_at * 1000).toLocaleDateString()}
                        </div>
                        <NoteContent event={event} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Note View Component
function NoteView({ noteId, onBack }: { noteId: string; onBack?: () => void }) {
  const { data: event, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async (c) => {
      const { nostr } = await import('@/hooks/useNostr');
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr().query([{
        kinds: [1],
        ids: [noteId],
        limit: 1,
      }], { signal });

      return events[0];
    },
    enabled: !!noteId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
        <div className="max-w-4xl mx-auto">
          <div className="border border-lime-500/20 rounded-lg p-8 bg-black/40">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return <NotFound />;
  }

  return <EventView event={event} onBack={onBack} />;
}

// Event View Component
function EventView({ event, eventId, relays, author, onBack }: {
  event?: NostrEvent;
  eventId?: string;
  relays?: string[];
  author?: string;
  onBack?: () => void;
}) {
  const { data: fullEvent, isLoading } = useQuery({
    queryKey: ['event', eventId || event?.id],
    queryFn: async (c) => {
      if (event) return event;

      const { nostr } = await import('@/hooks/useNostr');
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr().query([{
        kinds: [1],
        ids: [eventId!],
        limit: 1,
      }], { signal });

      return events[0];
    },
    enabled: !!(event || eventId),
  });

  if (isLoading || !fullEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
        <div className="max-w-4xl mx-auto">
          <div className="border border-lime-500/20 rounded-lg p-8 bg-black/40">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const authorData = useAuthor(fullEvent.pubkey);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
      <div className="max-w-4xl mx-auto">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-4 text-lime-400">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}

        <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={authorData.data?.metadata?.picture} />
                <AvatarFallback className="bg-lime-500/20 text-lime-400">
                  {(authorData.data?.metadata?.name || genUserName(fullEvent.pubkey)).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {authorData.data?.metadata?.name || genUserName(fullEvent.pubkey)}
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-lime-500/60">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(fullEvent.created_at * 1000).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap break-words text-lime-100">
              <NoteContent event={fullEvent} />
            </div>

            {/* Tags */}
            {fullEvent.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {fullEvent.tags
                  .filter(tag => tag[0] === 't')
                  .map((tag, index) => (
                    <Badge key={index} variant="outline" className="border-lime-500/50 text-lime-400">
                      #{tag[1]}
                    </Badge>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-lime-500/20">
              <div className="flex items-center space-x-4 text-lime-500/60">
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>0</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4" />
                  <span>0</span>
                </div>
              </div>

              <ZapDialog target={fullEvent}>
                <Button variant="outline" size="sm" className="border-lime-500/50 text-lime-400">
                  <Zap className="h-4 w-4 mr-2" />
                  Zap
                </Button>
              </ZapDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Addressable Event View Component
function AddressableView({
  kind,
  pubkey,
  identifier,
  relays,
  onBack
}: {
  kind: number;
  pubkey: string;
  identifier: string;
  relays?: string[];
  onBack?: () => void;
}) {
  const { data: event, isLoading } = useQuery({
    queryKey: ['addressable', kind, pubkey, identifier],
    queryFn: async (c) => {
      const { nostr } = await import('@/hooks/useNostr');
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr().query([{
        kinds: [kind],
        authors: [pubkey],
        '#d': [identifier],
        limit: 1,
      }], { signal });

      return events[0];
    },
    enabled: !!(kind && pubkey && identifier),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-green-950/20 to-black p-4">
        <div className="max-w-4xl mx-auto">
          <div className="border border-lime-500/20 rounded-lg p-8 bg-black/40">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return <NotFound />;
  }

  return <EventView event={event} onBack={onBack} />;
}