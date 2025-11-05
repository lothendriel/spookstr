import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent } from '@nostrify/nostrify';

export interface ParanormalLocation {
  id: string;
  title: string;
  content: string;
  location: string;
  geohash: string;
  category: string;
  encounterType?: string;
  encounterDate?: string;
  evidenceLevel?: 'none' | 'low' | 'medium' | 'high';
  images?: string[];
  author: string;
  createdAt: number;
  coordinates?: { lat: number; lng: number };
}

function validateParanormalLocationEvent(event: NostrEvent): boolean {
  // Check required tags
  const d = event.tags.find(([name]) => name === 'd')?.[1];
  const title = event.tags.find(([name]) => name === 'title')?.[1];
  const location = event.tags.find(([name]) => name === 'location')?.[1];
  const geohash = event.tags.find(([name]) => name === 'g')?.[1];
  const category = event.tags.find(([name]) => name === 't')?.[1];

  // All required fields must be present
  if (!d || !title || !location || !geohash || !category) {
    return false;
  }

  // Validate geohash format (basic check)
  if (!/^[a-zA-Z0-9]+$/.test(geohash)) {
    return false;
  }

  return true;
}

function parseParanormalLocationEvent(event: NostrEvent): ParanormalLocation | null {
  if (!validateParanormalLocationEvent(event)) {
    return null;
  }

  const d = event.tags.find(([name]) => name === 'd')?.[1] || '';
  const title = event.tags.find(([name]) => name === 'title')?.[1] || '';
  const location = event.tags.find(([name]) => name === 'location')?.[1] || '';
  const geohash = event.tags.find(([name]) => name === 'g')?.[1] || '';
  const category = event.tags.find(([name]) => name === 't')?.[1] || '';
  const encounterType = event.tags.find(([name]) => name === 'encounter_type')?.[1];
  const encounterDate = event.tags.find(([name]) => name === 'encounter_date')?.[1];
  const evidenceLevel = event.tags.find(([name]) => name === 'evidence_level')?.[1] as 'none' | 'low' | 'medium' | 'high' | undefined;
  
  const images = event.tags
    .filter(([name]) => name === 'image')
    .map(([, url]) => url);

  // Convert geohash to approximate coordinates (simplified conversion)
  // For production use, consider using a proper geohash library
  const coordinates = geohashToCoordinates(geohash);

  return {
    id: event.id,
    title,
    content: event.content,
    location,
    geohash,
    category,
    encounterType,
    encounterDate,
    evidenceLevel,
    images,
    author: event.pubkey,
    createdAt: event.created_at,
    coordinates,
  };
}

// Simplified geohash to coordinates conversion
// This is a basic approximation - for production, use a proper geohash library
function geohashToCoordinates(geohash: string): { lat: number; lng: number } {
  // This is a very rough approximation for demo purposes
  // In production, use a proper geohash decoding library
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let lat = 0;
  let lng = 0;
  
  // Simple conversion that gives us a rough center point
  // This is not accurate but works for basic positioning
  const hash = geohash.toLowerCase();
  for (let i = 0; i < Math.min(hash.length, 12); i++) {
    const char = hash[i];
    const idx = base32.indexOf(char);
    if (idx === -1) continue;
    
    // Alternate between longitude and latitude bits
    if (i % 2 === 0) {
      lng += (idx & 16) ? 90 / Math.pow(2, Math.floor(i / 2) + 1) : -90 / Math.pow(2, Math.floor(i / 2) + 1);
      lng += (idx & 8) ? 45 / Math.pow(2, Math.floor(i / 2) + 1) : -45 / Math.pow(2, Math.floor(i / 2) + 1);
      lng += (idx & 4) ? 22.5 / Math.pow(2, Math.floor(i / 2) + 1) : -22.5 / Math.pow(2, Math.floor(i / 2) + 1);
      lng += (idx & 2) ? 11.25 / Math.pow(2, Math.floor(i / 2) + 1) : -11.25 / Math.pow(2, Math.floor(i / 2) + 1);
      lng += (idx & 1) ? 5.625 / Math.pow(2, Math.floor(i / 2) + 1) : -5.625 / Math.pow(2, Math.floor(i / 2) + 1);
    } else {
      lat += (idx & 16) ? 45 / Math.pow(2, Math.floor(i / 2) + 1) : -45 / Math.pow(2, Math.floor(i / 2) + 1);
      lat += (idx & 8) ? 22.5 / Math.pow(2, Math.floor(i / 2) + 1) : -22.5 / Math.pow(2, Math.floor(i / 2) + 1);
      lat += (idx & 4) ? 11.25 / Math.pow(2, Math.floor(i / 2) + 1) : -11.25 / Math.pow(2, Math.floor(i / 2) + 1);
      lat += (idx & 2) ? 5.625 / Math.pow(2, Math.floor(i / 2) + 1) : -5.625 / Math.pow(2, Math.floor(i / 2) + 1);
      lat += (idx & 1) ? 2.8125 / Math.pow(2, Math.floor(i / 2) + 1) : -2.8125 / Math.pow(2, Math.floor(i / 2) + 1);
    }
  }
  
  return { lat, lng };
}

export function useParanormalLocations(category?: string, geohash?: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['paranormal-locations', category, geohash],
    queryFn: async ({ signal }) => {
      const filters: any[] = [{ kinds: [7479] }];
      
      if (category) {
        filters[0]['#t'] = [category];
      }
      
      if (geohash) {
        filters[0]['#g'] = [geohash];
      }

      const events = await nostr.query(filters, { signal });
      
      const locations = events
        .map(parseParanormalLocationEvent)
        .filter((location): location is ParanormalLocation => location !== null);

      return locations;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useParanormalLocation(locationId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['paranormal-location', locationId],
    queryFn: async ({ signal }) => {
      const events = await nostr.query([{ kinds: [7479], ids: [locationId] }], { signal });
      
      if (events.length === 0) {
        return null;
      }

      return parseParanormalLocationEvent(events[0]);
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}