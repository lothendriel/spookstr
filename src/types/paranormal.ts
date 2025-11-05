export interface ParanormalLocation {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  user_pubkey?: string;
  timestamp: number;
  id?: string; // Nostr event ID
  media?: string[]; // URLs to uploaded images/videos
}