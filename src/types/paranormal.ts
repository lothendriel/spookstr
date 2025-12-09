export interface ParanormalLocation {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  user_pubkey?: string;
  timestamp: number;
  id?: string; // Nostr event ID
  media?: string[]; // URLs to uploaded images/videos
  category?: string; // Paranormal category (ghost, ufo, cryptid, etc.)
  locationName?: string; // Human-readable location name
  geohash?: string; // Geohash for approximate location
}