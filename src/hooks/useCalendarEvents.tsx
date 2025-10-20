import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

export function useCalendarEvents() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['calendar-events'],
    queryFn: async (context) => {
      const signal = AbortSignal.any([context.signal, AbortSignal.timeout(1500)]);
      const events = await nostr.query([
        {
          kinds: [31922, 31923],
          limit: 100
        }
      ], { signal });
      return events;
    }
  });
}