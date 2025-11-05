import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ParanormalLocation } from '@/types/paranormal';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface ParanormalMapProps {
  locations: ParanormalLocation[];
  onLocationSelect: (location: ParanormalLocation) => void;
  selectedLocation: ParanormalLocation | null;
}

export default function ParanormalMap({ locations, onLocationSelect, selectedLocation }: ParanormalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4); // Center of USA

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    locations.forEach(location => {
      const isSelected = selectedLocation?.id === location.id;

      // Create custom ghostly icon
      const ghostIcon = L.divIcon({
        className: 'custom-ghost-marker',
        html: `
          <div class="relative">
            <div class="w-8 h-8 bg-lime-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${isSelected ? 'animate-pulse' : ''}"
                 style="box-shadow: 0 0 15px rgba(163, 230, 53, 0.8);">
              <span class="text-white text-xs font-bold">👻</span>
            </div>
            ${isSelected ? '<div class="absolute inset-0 w-8 h-8 bg-lime-400 rounded-full animate-ping opacity-30"></div>' : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([location.latitude, location.longitude], {
        icon: ghostIcon,
      })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="text-gray-800">
            <h3 class="font-bold text-lg mb-2">${location.title}</h3>
            <p class="text-sm mb-2">${location.description.substring(0, 100)}${location.description.length > 100 ? '...' : ''}</p>
            <button
              onclick="window.selectLocation && window.selectLocation('${location.id}')"
              class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              View Details
            </button>
          </div>
        `);

      marker.on('click', () => {
        onLocationSelect(location);
        // Center map on selected location
        mapInstanceRef.current?.setView([location.latitude, location.longitude], 12, {
          animate: true,
          duration: 1,
        });
      });

      markersRef.current.push(marker);
    });

    // Make selectLocation available globally for popup buttons
    (window as any).selectLocation = (locationId: string) => {
      const location = locations.find(loc => loc.id === locationId);
      if (location) {
        onLocationSelect(location);
      }
    };

  }, [locations, onLocationSelect, selectedLocation]);

  // Center map when selected location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return;

    mapInstanceRef.current.setView([selectedLocation.latitude, selectedLocation.longitude], 12, {
      animate: true,
      duration: 1,
    });
  }, [selectedLocation]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-[600px] rounded-lg overflow-hidden"
        style={{ minHeight: '600px' }}
      />

      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 bg-gray-800 bg-opacity-90 rounded-lg p-3 text-xs text-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-lime-500 rounded-full"></div>
          <span>Paranormal Locations</span>
        </div>
        <div className="text-gray-400">
          {locations.length} location{locations.length !== 1 ? 's' : ''} reported
        </div>
      </div>
    </div>
  );
}