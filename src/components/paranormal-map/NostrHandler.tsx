import { useEffect } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useAppContext } from '@/hooks/useAppContext';
import { ParanormalLocation } from '@/types/paranormal';

const PARANORMAL_LOCATION_KIND = 7277;

export function useNostrHandler() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { relayUrl } = useAppContext();

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

  const fetchSubmissions = async (): Promise<ParanormalLocation[]> => {
    try {
      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [{ kinds: [PARANORMAL_LOCATION_KIND], limit: 100 }],
        { signal }
      );

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

      // Sort by timestamp (newest first)
      return locations.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to fetch paranormal locations:', error);
      return [];
    }
  };

  return {
    publishSubmission,
    fetchSubmissions,
  };
}