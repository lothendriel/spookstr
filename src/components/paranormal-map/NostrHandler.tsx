import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { ParanormalLocation } from '@/types/paranormal';

const PARANORMAL_LOCATION_KIND = 30023;

export function useNostrHandler() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();

  console.log('🔌 Nostr handler initialized:', {
    nostrAvailable: !!nostr,
    nostrType: typeof nostr,
    nostrMethods: nostr ? Object.getOwnPropertyNames(nostr).filter(name => typeof nostr[name] === 'function') : [],
    userAvailable: !!user,
    userPubkey: user?.pubkey?.substring(0, 16) + '...',
    publishEventAvailable: typeof publishEvent === 'function'
  });

  const publishSubmission = async (data: Omit<ParanormalLocation, 'timestamp' | 'id'>) => {
    if (!user) {
      throw new Error('User must be logged in to submit locations');
    }

    if (!nostr) {
      throw new Error('Nostr connection not available');
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
        ['d', `paranormal-location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`],
        ['t', 'paranormal'],
        ['t', 'location'],
        ['alt', 'Paranormal location submission - Long-form content'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    };

    try {
      console.log('🗺️ Publishing paranormal location event:', event);
      console.log('🗺️ User pubkey:', user.pubkey);
      console.log('🗺️ Event being sent to publishEvent:', JSON.stringify(event, null, 2));

      // Fix: Pass object with event property to match hook's expected input
      const result = await publishEvent({ event });
      console.log('🗺️ Publish result:', result);
      console.log('🗺️ Result type:', typeof result);
      console.log('🗺️ Result keys:', result ? Object.keys(result) : 'null/undefined');

      return { success: true, eventId: result?.id, data: locationData };
    } catch (error) {
      console.error('🗺️ Failed to publish paranormal location:', error);
      console.error('🗺️ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack available',
        name: error instanceof Error ? error.name : 'Unknown',
        error: error
      });

      // Re-throw with more descriptive error message
      if (error instanceof Error) {
        throw new Error(`Failed to publish paranormal location: ${error.message}`);
      } else {
        throw new Error('Failed to publish paranormal location: Unknown error occurred');
      }
    }
  };

  const fetchSubmissions = useCallback(async (): Promise<ParanormalLocation[]> => {
    try {
      console.log('🗺️ Fetching paranormal locations...');

      // Check if nostr object is available
      if (!nostr) {
        console.error('🗺️ Nostr object not available');
        throw new Error('Nostr connection not available');
      }

      console.log('🗺️ Nostr object available, making query...');

      // Remove since parameter to get ALL events, not just recent ones
      const signal = AbortSignal.timeout(8000);
      const filters = [{ kinds: [PARANORMAL_LOCATION_KIND], limit: 100 }];

      console.log('🗺️ Query filters:', filters);
      console.log('🗺️ About to call nostr.query...');
      console.log('🗺️ Nostr query method available:', typeof nostr.query);

      let events: any[] = [];
      try {
        events = await nostr.query(filters, { signal });
        console.log('🗺️ Query completed successfully');
      } catch (queryError) {
        console.error('🗺️ Query failed:', queryError);
        throw queryError;
      }

      console.log('🗺️ Query completed, received events:', events.length);
      console.log('🗺️ First 3 events (if any):', events.slice(0, 3).map(e => ({
        id: e.id,
        kind: e.kind,
        content: e.content.substring(0, 50) + '...',
        created_at: e.created_at
      })));

      console.log('Received events:', events.length);

      const locations: ParanormalLocation[] = [];

      for (const event of events) {
        try {
          // Skip if content is empty or not a string
          if (!event.content || typeof event.content !== 'string') {
            console.warn('Skipping event with invalid content:', event.id);
            continue;
          }

          // Check if content looks like JSON (starts with {)
          if (!event.content.trim().startsWith('{')) {
            console.warn('Skipping event with non-JSON content:', event.id);
            continue;
          }

          const locationData = JSON.parse(event.content);

          // Validate required fields
          if (!locationData || typeof locationData !== 'object') {
            console.warn('Skipping event with invalid parsed data:', event.id);
            continue;
          }

          // Validate required fields exist
          const requiredFields = ['title', 'description', 'latitude', 'longitude', 'timestamp'];
          const hasAllFields = requiredFields.every(field => field in locationData);

          if (!hasAllFields) {
            console.warn('Skipping event missing required fields:', event.id);
            continue;
          }

          // Validate data types
          if (
            typeof locationData.title !== 'string' ||
            typeof locationData.description !== 'string' ||
            typeof locationData.latitude !== 'number' ||
            typeof locationData.longitude !== 'number' ||
            typeof locationData.timestamp !== 'number'
          ) {
            console.warn('Skipping event with invalid field types:', event.id);
            continue;
          }

          // All validation passed, add to locations
          locations.push({
            ...locationData,
            id: event.id,
          });
        } catch (error) {
          console.warn('Failed to parse paranormal location data:', error);
          console.warn('Event content that failed to parse:', events.find(e => e.id === event.id)?.content?.substring(0, 100) + '...');
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