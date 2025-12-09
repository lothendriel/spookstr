import { useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { ParanormalLocation } from '@/types/paranormal';
import { encode as encodeGeohash } from 'ngeohash';

const PARANORMAL_LOCATION_KIND = 32921;

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

    const timestamp = Math.floor(Date.now() / 1000);
    const locationData: ParanormalLocation = {
      ...data,
      timestamp,
      user_pubkey: user.pubkey,
    };

    // Generate geohash for privacy-preserving location (precision 6 ≈ ±610m)
    const geohash = encodeGeohash(data.latitude, data.longitude, 6);

    // Build tags array
    const tags: string[][] = [
      ['d', `location-${timestamp}-${Math.random().toString(36).substring(2, 9)}`],
      ['title', data.title],
      ['g', geohash],
      ['lat', data.latitude.toString()],
      ['lon', data.longitude.toString()],
      ['t', 'paranormal'],
      ['published_at', timestamp.toString()],
      ['alt', `Paranormal location pin: ${data.title}`],
    ];

    // Add category tags if provided
    if (data.category) {
      tags.push(['t', data.category]);
    }

    // Add location name if provided
    if (data.locationName) {
      tags.push(['location', data.locationName]);
    }

    // Add image tags if media is provided
    if (data.media && data.media.length > 0) {
      data.media.forEach((url) => {
        tags.push(['image', url]);
      });
    }

    const event = {
      kind: PARANORMAL_LOCATION_KIND,
      content: data.description,
      tags,
      created_at: timestamp,
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

      const signal = AbortSignal.timeout(8000);
      const filters = [{ kinds: [PARANORMAL_LOCATION_KIND], limit: 200 }];

      console.log('🗺️ Query filters:', filters);

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
        created_at: e.created_at,
        tags: e.tags
      })));

      const locations: ParanormalLocation[] = [];

      for (const event of events) {
        try {
          // Extract data from tags
          const getTag = (name: string): string | undefined => {
            return event.tags.find((t: string[]) => t[0] === name)?.[1];
          };

          const getAllTags = (name: string): string[] => {
            return event.tags.filter((t: string[]) => t[0] === name).map((t: string[]) => t[1]);
          };

          const title = getTag('title');
          const lat = getTag('lat');
          const lon = getTag('lon');
          const publishedAt = getTag('published_at');
          const description = event.content;

          // Validate required fields
          if (!title || !lat || !lon || !publishedAt || !description) {
            console.warn('Skipping event missing required tags or content:', event.id);
            continue;
          }

          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);
          const timestamp = parseInt(publishedAt);

          // Validate numeric conversions
          if (isNaN(latitude) || isNaN(longitude) || isNaN(timestamp)) {
            console.warn('Skipping event with invalid numeric values:', event.id);
            continue;
          }

          // Extract optional fields
          const locationName = getTag('location');
          const geohash = getTag('g');
          const categories = getAllTags('t').filter(t => t !== 'paranormal');
          const category = categories.length > 0 ? categories[0] : undefined;
          const mediaUrls = getAllTags('image');

          // Build location object
          const location: ParanormalLocation = {
            id: event.id,
            title,
            description,
            latitude,
            longitude,
            timestamp,
            user_pubkey: event.pubkey,
            category,
            locationName,
            geohash,
            media: mediaUrls.length > 0 ? mediaUrls : undefined,
          };

          locations.push(location);
        } catch (error) {
          console.warn('Failed to parse paranormal location event:', error);
          console.warn('Event that failed to parse:', event.id);
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