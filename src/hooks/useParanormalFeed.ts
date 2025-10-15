import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

const PARANORMAL_TAGS = [
  'paranormal',
  'cryptids', 
  'bigfoot',
  'ufo',
  'ufos',
  'supernatural',
  'ghosts',
  'aliens',
  'conspiracy',
  'unexplained',
  'mysterious',
  'occult',
  'haunted',
  'sightings',
  'extraterrestrial'
];

export function useParanormalFeed() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['paranormal-feed'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query for notes with paranormal tags
      const events = await nostr.query([{
        kinds: [1],
        '#t': PARANORMAL_TAGS,
        limit: 50,
      }], { signal });

      return events;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
}

export function useParanormalReplies(noteId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['paranormal-replies', noteId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query([{
        kinds: [1],
        '#e': [noteId],
        limit: 100,
      }], { signal });

      return events;
    },
    enabled: !!noteId,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });
}