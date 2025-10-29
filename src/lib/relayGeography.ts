/**
 * Geographic Relay Selection System
 * 
 * Selects optimal relays based on user location:
 * - User geolocation detection
 * - Relay location mapping
 * - Distance-based optimization
 * - Regional relay preferences
 */

import { devLogger } from './devLogger';

const geoLogger = devLogger.scope('relay-geo');

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

export interface RelayLocationInfo {
  url: string;
  location: GeographicLocation;
  provider: string;
  regions: string[]; // Regions this relay serves well
  distanceFromUser?: number; // km
  estimatedLatency?: number; // ms based on distance
}

export interface GeographicPreferences {
  preferredRegions: string[];
  maxDistance: number; // km
  latencyWeight: number; // 0-1, how much to weight latency vs distance
  diversityFactor: number; // 0-1, how much geographic diversity to maintain
}

// Known relay locations (can be expanded with a relay directory service)
const KNOWN_RELAY_LOCATIONS: Record<string, RelayLocationInfo> = {
  // North America
  'wss://relay.damus.io': {
    url: 'wss://relay.damus.io',
    location: { latitude: 37.7749, longitude: -122.4194, country: 'US', region: 'North America', city: 'San Francisco' },
    provider: 'Damus',
    regions: ['North America', 'US-West']
  },
  'wss://relay.primal.net': {
    url: 'wss://relay.primal.net',
    location: { latitude: 40.7128, longitude: -74.0060, country: 'US', region: 'North America', city: 'New York' },
    provider: 'Primal',
    regions: ['North America', 'US-East']
  },
  'wss://nos.lol': {
    url: 'wss://nos.lol',
    location: { latitude: 43.6532, longitude: -79.3832, country: 'CA', region: 'North America', city: 'Toronto' },
    provider: 'nos.lol',
    regions: ['North America', 'Canada']
  },
  
  // Europe
  'wss://relay.nostr.band': {
    url: 'wss://relay.nostr.band',
    location: { latitude: 52.5200, longitude: 13.4050, country: 'DE', region: 'Europe', city: 'Berlin' },
    provider: 'Nostr.band',
    regions: ['Europe', 'EU-Central']
  },
  'wss://nostr.wine': {
    url: 'wss://nostr.wine',
    location: { latitude: 48.8566, longitude: 2.3522, country: 'FR', region: 'Europe', city: 'Paris' },
    provider: 'Nostr.wine',
    regions: ['Europe', 'EU-West']
  },
  'wss://relay.snort.social': {
    url: 'wss://relay.snort.social',
    location: { latitude: 51.5074, longitude: -0.1278, country: 'GB', region: 'Europe', city: 'London' },
    provider: 'Snort',
    regions: ['Europe', 'UK']
  },

  // Asia Pacific
  'wss://relay.nostr.wirednet.jp': {
    url: 'wss://relay.nostr.wirednet.jp',
    location: { latitude: 35.6762, longitude: 139.6503, country: 'JP', region: 'Asia Pacific', city: 'Tokyo' },
    provider: 'Wirednet',
    regions: ['Asia Pacific', 'Japan']
  },
  'wss://nostr.zbd.gg': {
    url: 'wss://nostr.zbd.gg',
    location: { latitude: 1.3521, longitude: 103.8198, country: 'SG', region: 'Asia Pacific', city: 'Singapore' },
    provider: 'ZBD',
    regions: ['Asia Pacific', 'Southeast Asia']
  },

  // South America
  'wss://nostr.mom': {
    url: 'wss://nostr.mom',
    location: { latitude: -23.5505, longitude: -46.6333, country: 'BR', region: 'South America', city: 'São Paulo' },
    provider: 'Nostr.mom',
    regions: ['South America', 'Brazil']
  },

  // Oceania
  'wss://relay.australis.tech': {
    url: 'wss://relay.australis.tech',
    location: { latitude: -33.8688, longitude: 151.2093, country: 'AU', region: 'Oceania', city: 'Sydney' },
    provider: 'Australis',
    regions: ['Oceania', 'Australia']
  },

  // Spookstr relays
  'wss://spookstr2.nostr1.com': {
    url: 'wss://spookstr2.nostr1.com',
    location: { latitude: 40.7128, longitude: -74.0060, country: 'US', region: 'North America', city: 'New York' },
    provider: 'Spookstr',
    regions: ['North America', 'US-East', 'Paranormal']
  }
};

const DEFAULT_GEO_PREFERENCES: GeographicPreferences = {
  preferredRegions: [],
  maxDistance: 10000, // 10,000 km
  latencyWeight: 0.7, // Prefer lower latency
  diversityFactor: 0.3, // Some geographic diversity
};

class GeographicRelaySelector {
  private userLocation: GeographicLocation | null = null;
  private preferences: GeographicPreferences = DEFAULT_GEO_PREFERENCES;
  private relayLocations = new Map<string, RelayLocationInfo>();
  private locationCache = new Map<string, RelayLocationInfo>();

  constructor() {
    // Initialize with known relay locations
    for (const [url, info] of Object.entries(KNOWN_RELAY_LOCATIONS)) {
      this.relayLocations.set(url, info);
    }
  }

  /**
   * Get user's location using various methods
   */
  async getUserLocation(): Promise<GeographicLocation | null> {
    if (this.userLocation) {
      return this.userLocation;
    }

    try {
      // Try browser geolocation first (most accurate)
      const browserLocation = await this.getBrowserLocation();
      if (browserLocation) {
        this.userLocation = browserLocation;
        geoLogger.info('Got user location from browser', { 
          country: browserLocation.country,
          region: browserLocation.region 
        });
        return browserLocation;
      }

      // Fallback to IP-based geolocation
      const ipLocation = await this.getIPLocation();
      if (ipLocation) {
        this.userLocation = ipLocation;
        geoLogger.info('Got user location from IP', { 
          country: ipLocation.country,
          region: ipLocation.region 
        });
        return ipLocation;
      }

      // Fallback to timezone-based estimation
      const timezoneLocation = this.getTimezoneLocation();
      if (timezoneLocation) {
        this.userLocation = timezoneLocation;
        geoLogger.info('Got user location from timezone', { 
          timezone: timezoneLocation.timezone,
          region: timezoneLocation.region 
        });
        return timezoneLocation;
      }

    } catch (error) {
      geoLogger.error('Failed to get user location', error);
    }

    return null;
  }

  /**
   * Get location from browser geolocation API
   */
  private async getBrowserLocation(): Promise<GeographicLocation | null> {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve) => {
      const options = {
        enableHighAccuracy: false, // Faster, less battery
        timeout: 10000, // 10 seconds
        maximumAge: 3600000 // Accept 1-hour old location
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Try to get additional location info via reverse geocoding
          try {
            const locationInfo = await this.reverseGeocode(latitude, longitude);
            resolve({
              latitude,
              longitude,
              ...locationInfo
            });
          } catch {
            resolve({ latitude, longitude });
          }
        },
        (error) => {
          geoLogger.debug('Browser geolocation failed', error.message);
          resolve(null);
        },
        options
      );
    });
  }

  /**
   * Get location from IP address
   */
  private async getIPLocation(): Promise<GeographicLocation | null> {
    try {
      // Use a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error('IP geolocation service unavailable');
      }

      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          country: data.country_code,
          region: data.continent_code,
          city: data.city,
          timezone: data.timezone
        };
      }
    } catch (error) {
      geoLogger.debug('IP geolocation failed', error);
    }

    return null;
  }

  /**
   * Estimate location from timezone
   */
  private getTimezoneLocation(): GeographicLocation | null {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Basic timezone to region mapping
    const timezoneRegions: Record<string, Partial<GeographicLocation>> = {
      'America/New_York': { latitude: 40.7128, longitude: -74.0060, country: 'US', region: 'North America' },
      'America/Los_Angeles': { latitude: 34.0522, longitude: -118.2437, country: 'US', region: 'North America' },
      'America/Chicago': { latitude: 41.8781, longitude: -87.6298, country: 'US', region: 'North America' },
      'America/Denver': { latitude: 39.7392, longitude: -104.9903, country: 'US', region: 'North America' },
      'Europe/London': { latitude: 51.5074, longitude: -0.1278, country: 'GB', region: 'Europe' },
      'Europe/Paris': { latitude: 48.8566, longitude: 2.3522, country: 'FR', region: 'Europe' },
      'Europe/Berlin': { latitude: 52.5200, longitude: 13.4050, country: 'DE', region: 'Europe' },
      'Asia/Tokyo': { latitude: 35.6762, longitude: 139.6503, country: 'JP', region: 'Asia Pacific' },
      'Asia/Shanghai': { latitude: 31.2304, longitude: 121.4737, country: 'CN', region: 'Asia Pacific' },
      'Asia/Singapore': { latitude: 1.3521, longitude: 103.8198, country: 'SG', region: 'Asia Pacific' },
      'Australia/Sydney': { latitude: -33.8688, longitude: 151.2093, country: 'AU', region: 'Oceania' },
    };

    const locationInfo = timezoneRegions[timezone];
    if (locationInfo) {
      return {
        timezone,
        ...locationInfo
      } as GeographicLocation;
    }

    return null;
  }

  /**
   * Reverse geocode coordinates to get location details
   */
  private async reverseGeocode(lat: number, lng: number): Promise<Partial<GeographicLocation>> {
    try {
      // Use a free reverse geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          country: data.countryCode,
          region: data.continent,
          city: data.city || data.locality,
        };
      }
    } catch (error) {
      geoLogger.debug('Reverse geocoding failed', error);
    }

    return {};
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.degToRad(lat2 - lat1);
    const dLng = this.degToRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.degToRad(lat1)) * Math.cos(this.degToRad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Estimate latency based on distance
   */
  private estimateLatency(distance: number): number {
    // Rough estimation: ~0.1ms per km for fiber optic + processing overhead
    const baseLatency = 20; // Base processing latency
    const distanceLatency = distance * 0.1;
    const networkOverhead = 30; // Additional network overhead
    
    return Math.round(baseLatency + distanceLatency + networkOverhead);
  }

  /**
   * Select optimal relays based on geographic criteria
   */
  async selectOptimalRelays(
    availableRelays: string[],
    count: number = 3,
    preferences?: Partial<GeographicPreferences>
  ): Promise<RelayLocationInfo[]> {
    const userLocation = await this.getUserLocation();
    const currentPrefs = { ...this.preferences, ...preferences };

    geoLogger.info('Selecting optimal relays', {
      availableCount: availableRelays.length,
      requestedCount: count,
      hasUserLocation: !!userLocation
    });

    // If no user location, fall back to default selection
    if (!userLocation) {
      return this.selectDefaultRelays(availableRelays, count);
    }

    // Calculate distances and estimated latencies for all relays
    const relayScores = availableRelays
      .map(url => this.getRelayLocationInfo(url))
      .filter(info => info !== null)
      .map(info => {
        const distance = this.calculateDistance(
          userLocation.latitude, userLocation.longitude,
          info!.location.latitude, info!.location.longitude
        );
        
        const estimatedLatency = this.estimateLatency(distance);

        return {
          ...info!,
          distanceFromUser: distance,
          estimatedLatency
        };
      })
      .filter(info => info.distanceFromUser! <= currentPrefs.maxDistance);

    // Score relays based on multiple factors
    const scoredRelays = relayScores.map(relay => {
      let score = 0;

      // Distance score (closer is better)
      const maxDistance = Math.max(...relayScores.map(r => r.distanceFromUser!));
      const distanceScore = maxDistance > 0 ? 
        (maxDistance - relay.distanceFromUser!) / maxDistance : 1;
      score += distanceScore * (1 - currentPrefs.latencyWeight) * 100;

      // Latency score (lower is better)
      const maxLatency = Math.max(...relayScores.map(r => r.estimatedLatency!));
      const latencyScore = maxLatency > 0 ? 
        (maxLatency - relay.estimatedLatency!) / maxLatency : 1;
      score += latencyScore * currentPrefs.latencyWeight * 100;

      // Preferred region bonus
      if (currentPrefs.preferredRegions.some(region => 
        relay.regions.includes(region) || relay.location.region === region)) {
        score += 20;
      }

      // Same country bonus
      if (relay.location.country === userLocation.country) {
        score += 15;
      }

      return { ...relay, score };
    });

    // Sort by score
    scoredRelays.sort((a, b) => b.score - a.score);

    // Select top relays with diversity consideration
    const selectedRelays: typeof scoredRelays = [];
    const usedRegions = new Set<string>();

    for (const relay of scoredRelays) {
      if (selectedRelays.length >= count) break;

      // Always add the first (highest scoring) relay
      if (selectedRelays.length === 0) {
        selectedRelays.push(relay);
        relay.regions.forEach(region => usedRegions.add(region));
        continue;
      }

      // For subsequent relays, consider diversity
      const hasNewRegion = relay.regions.some(region => !usedRegions.has(region));
      const diversityBonus = hasNewRegion ? currentPrefs.diversityFactor * 20 : 0;
      
      // Add diversity bonus to score for comparison
      const adjustedScore = relay.score + diversityBonus;
      
      // Add if it's still competitive with diversity bonus
      if (selectedRelays.length < count && 
          (adjustedScore >= selectedRelays[selectedRelays.length - 1].score * 0.8 || hasNewRegion)) {
        selectedRelays.push(relay);
        relay.regions.forEach(region => usedRegions.add(region));
      }
    }

    geoLogger.info('Selected optimal relays', {
      selected: selectedRelays.map(r => ({
        url: r.url,
        distance: Math.round(r.distanceFromUser!),
        latency: r.estimatedLatency,
        score: Math.round(r.score)
      }))
    });

    return selectedRelays;
  }

  /**
   * Select default relays when no location is available
   */
  private selectDefaultRelays(availableRelays: string[], count: number): RelayLocationInfo[] {
    // Prioritize well-known, geographically diverse relays
    const priorityOrder = [
      'wss://relay.damus.io',      // US West
      'wss://relay.nostr.band',    // Europe
      'wss://relay.primal.net',    // US East
      'wss://nostr.wine',          // Europe
      'wss://nos.lol',             // Canada
      'wss://relay.snort.social',  // UK
      'wss://spookstr2.nostr1.com' // Spookstr relay
    ];

    const selected: RelayLocationInfo[] = [];
    
    for (const url of priorityOrder) {
      if (selected.length >= count) break;
      
      if (availableRelays.includes(url)) {
        const info = this.getRelayLocationInfo(url);
        if (info) {
          selected.push(info);
        }
      }
    }

    // Fill remaining slots with any available relays
    for (const url of availableRelays) {
      if (selected.length >= count) break;
      
      if (!selected.some(r => r.url === url)) {
        const info = this.getRelayLocationInfo(url);
        if (info) {
          selected.push(info);
        }
      }
    }

    geoLogger.info('Selected default relays', {
      selected: selected.map(r => r.url)
    });

    return selected.slice(0, count);
  }

  /**
   * Get location info for a relay
   */
  getRelayLocationInfo(relayUrl: string): RelayLocationInfo | null {
    return this.relayLocations.get(relayUrl) || null;
  }

  /**
   * Add relay location information
   */
  addRelayLocation(relayUrl: string, info: RelayLocationInfo): void {
    this.relayLocations.set(relayUrl, info);
    geoLogger.debug(`Added location info for ${relayUrl}`, {
      country: info.location.country,
      region: info.location.region
    });
  }

  /**
   * Update geographic preferences
   */
  updatePreferences(preferences: Partial<GeographicPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    geoLogger.info('Updated geographic preferences', this.preferences);
  }

  /**
   * Get current user location
   */
  getCurrentUserLocation(): GeographicLocation | null {
    return this.userLocation;
  }

  /**
   * Clear cached location (force re-detection)
   */
  clearLocationCache(): void {
    this.userLocation = null;
    this.locationCache.clear();
    geoLogger.info('Cleared location cache');
  }

  /**
   * Get all known relay locations
   */
  getAllKnownRelayLocations(): RelayLocationInfo[] {
    return Array.from(this.relayLocations.values());
  }

  /**
   * Find relays in a specific region
   */
  getRelaysInRegion(region: string): RelayLocationInfo[] {
    return Array.from(this.relayLocations.values())
      .filter(info => 
        info.regions.includes(region) || 
        info.location.region === region ||
        info.location.country === region
      );
  }
}

// Create singleton instance
export const geoRelaySelector = new GeographicRelaySelector();

/**
 * React hook for geographic relay selection
 */
export function useGeographicRelay(availableRelays: string[], count: number = 3) {
  const [optimalRelays, setOptimalRelays] = useState<RelayLocationInfo[]>([]);
  const [userLocation, setUserLocation] = useState<GeographicLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const selectRelays = async () => {
      setIsLoading(true);
      try {
        const location = await geoRelaySelector.getUserLocation();
        setUserLocation(location);
        
        const selected = await geoRelaySelector.selectOptimalRelays(
          availableRelays, 
          count
        );
        setOptimalRelays(selected);
      } catch (error) {
        geoLogger.error('Failed to select geographic relays', error);
        // Fallback to available relays without geographic optimization
        const fallback = availableRelays.slice(0, count).map(url => ({
          url,
          location: { latitude: 0, longitude: 0 },
          provider: 'Unknown',
          regions: []
        }));
        setOptimalRelays(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    if (availableRelays.length > 0) {
      selectRelays();
    }
  }, [availableRelays, count]);

  return {
    optimalRelays,
    userLocation,
    isLoading,
    selector: geoRelaySelector
  };
}