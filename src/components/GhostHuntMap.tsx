import { useState, useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ParanormalLocation, useParanormalLocations } from '@/hooks/useParanormalLocations';
import { useAuthor } from '@/hooks/useAuthor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Ghost, MapPin, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons = {
  ghosts: '👻',
  ufos: '👽',
  cryptids: '🦸',
  supernatural: '🔮',
  unexplained: '❓',
  urban_legends: '🏚️',
};

const evidenceColors = {
  none: 'text-gray-400',
  low: 'text-yellow-400',
  medium: 'text-orange-400',
  high: 'text-red-400',
};

interface GhostHuntMapProps {
  className?: string;
  onLocationSelect?: (location: ParanormalLocation) => void;
}

export function GhostHuntMap({ className, onLocationSelect }: GhostHuntMapProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<ParanormalLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]); // Center of USA
  const [mapZoom, setMapZoom] = useState(4);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const { data: locations, isLoading, error, refetch } = useParanormalLocations(
    selectedCategory === 'all' ? undefined : selectedCategory
  );

  const filteredLocations = locations?.filter(location =>
    location.coordinates &&
    (selectedCategory === 'all' || location.category === selectedCategory)
  ) || [];

  // Initialize map
  useEffect(() => {
    const initializeMap = () => {
      const mapContainer = document.getElementById('ghost-hunt-map');
      if (!mapContainer || mapRef.current) return;

      try {
        mapRef.current = L.map('ghost-hunt-map', {
          center: mapCenter,
          zoom: mapZoom,
          zoomControl: true,
        });

        // Add dark theme tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current);
      } catch (error) {
        console.error('Failed to initialize map:', error);
      }
    };

    // Try to initialize immediately
    initializeMap();

    // If container not found, try again after DOM is ready
    if (!mapRef.current) {
      const timer = setTimeout(initializeMap, 100);
      return () => clearTimeout(timer);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map view when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, mapZoom);
    }
  }, [mapCenter, mapZoom]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    filteredLocations.forEach((location) => {
      if (!location.coordinates) return;

      const emoji = categoryIcons[location.category as keyof typeof categoryIcons] || '📍';
      const colorClass = location.evidenceLevel ?
        evidenceColors[location.evidenceLevel as keyof typeof evidenceColors] : 'text-gray-400';

      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="${cn('text-2xl', colorClass)}">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([location.coordinates.lat, location.coordinates.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-sm">${location.title}</h3>
              <span class="text-lg">${emoji}</span>
            </div>
            <p class="text-xs text-gray-300">${location.location}</p>
            ${location.encounterType ? `<span class="inline-block bg-lime-500/20 text-lime-100 px-2 py-1 rounded text-xs">${location.encounterType}</span>` : ''}
            ${location.evidenceLevel ? `<span class="inline-block ${colorClass.replace('text', 'bg').replace('400', '500/20')} text-lime-100 px-2 py-1 rounded text-xs">Evidence: ${location.evidenceLevel}</span>` : ''}
            <button class="w-full bg-lime-500 hover:bg-lime-400 text-black px-3 py-1 rounded text-xs mt-2" onclick="window.viewLocationDetails('${location.id}')">View Details</button>
          </div>
        `);

      markersRef.current.push(marker);
    });

    // Add global function for popup buttons
    (window as any).viewLocationDetails = (locationId: string) => {
      const location = filteredLocations.find(loc => loc.id === locationId);
      if (location) {
        handleLocationClick(location);
      }
    };

    return () => {
      delete (window as any).viewLocationDetails;
    };
  }, [filteredLocations]);

  // Update map view when center or zoom changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, mapZoom);
    }
  }, [mapCenter, mapZoom]);

  const handleLocationClick = (location: ParanormalLocation) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
    if (location.coordinates) {
      setMapCenter([location.coordinates.lat, location.coordinates.lng]);
      setMapZoom(12);
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setMapZoom(10);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className={cn('w-full h-full', className)}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        <Card className="w-64">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="ghosts">👻 Ghosts & Spirits</SelectItem>
                <SelectItem value="ufos">👽 UFOs & Aliens</SelectItem>
                <SelectItem value="cryptids">🦸 Cryptids</SelectItem>
                <SelectItem value="supernatural">🔮 Supernatural</SelectItem>
                <SelectItem value="unexplained">❓ Unexplained</SelectItem>
                <SelectItem value="urban_legends">🏚️ Urban Legends</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleUseMyLocation}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Use My Location
            </Button>

            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              <RotateCcw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Location Stats */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Card className="w-48">
          <CardContent className="pt-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-lime-400">
                {filteredLocations.length}
              </div>
              <div className="text-sm text-lime-500/60">
                Paranormal Locations
              </div>
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="mt-2">
                  {categoryIcons[selectedCategory as keyof typeof categoryIcons]} {selectedCategory}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Container */}
      <div className="w-full h-full rounded-lg overflow-hidden border border-lime-500/20 relative">
        {/* Always render map container */}
        <div
          id="ghost-hunt-map"
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="text-center space-y-4">
              <Ghost className="h-12 w-12 text-lime-400 mx-auto animate-pulse" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="text-center space-y-4">
              <Ghost className="h-12 w-12 text-lime-400 mx-auto" />
              <p className="text-lime-400">Unable to load paranormal locations</p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}