import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { ParanormalLocation } from '@/types/paranormal';

const PARANORMAL_LOCATION_KIND = 7277;

export function useNostrHandler() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();

  const publishSubmission = async (data: Omit<ParanormalLocation, 'timestamp' | 'id'>) => {
    if (!user) {
      throw new Error('User must be logged in to submit locations');
    }

    const locationData: ParanormalLocation = {
      ...data,
      timestamp: Math.floor(Date.now() / 1000),
      user_pubkey: user.pubkey,
    };

    const event = {
      kind: PARANORMAL_LOCATION_KIND,
      content: JSON.stringify(locationData),
      tags: [
        ['t', 'paranormal'],
        ['t', 'location'],
        ['alt', 'Paranormal location submission'],
      ],
    };

    try {
      const result = await publishEvent(event);
      return { success: true, eventId: result?.id, data: locationData };
    } catch (error) {
      console.error('Failed to publish paranormal location:', error);
      throw error;
    }
  };

  const fetchSubmissions = useCallback(async (): Promise<ParanormalLocation[]> => {
    try {
      console.log('Fetching paranormal locations...');
      
      // Try to get events with a shorter timeout
      const signal = AbortSignal.timeout(3000);
      const events = await nostr.query(
        [{ kinds: [PARANORMAL_LOCATION_KIND], limit: 100 }],
        { signal }
      );

      console.log('Received events:', events.length);

      const locations: ParanormalLocation[] = [];

      for (const event of events) {
        try {
          const locationData = JSON.parse(event.content);
          if (locationData && typeof locationData === 'object') {
            locations.push({
              ...locationData,
              id: event.id,
            });
          }
        } catch (error) {
          console.warn('Failed to parse paranormal location data:', error);
        }
      }

      console.log('Parsed locations:', locations.length);
      // Sort by timestamp (newest first)
      return locations.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to fetch paranormal locations:', error);
      // Return empty array on error to prevent hanging
      return [];
    }
  }, [nostr]);

  return {
    publishSubmission,
    fetchSubmissions,
  };
}