import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import LocationSubmitForm from '@/components/paranormal-map/LocationSubmitForm';
import ParanormalMapComponent from '@/components/paranormal-map/ParanormalMap';
import LocationList from '@/components/paranormal-map/LocationList';
import LocationDetails from '@/components/paranormal-map/LocationDetails';
import { useNostrHandler } from '@/components/paranormal-map/NostrHandler';
import { ParanormalLocation } from '@/types/paranormal';

export default function ParanormalMapPage() {
  const [selectedLocation, setSelectedLocation] = useState<ParanormalLocation | null>(null);
  const [locations, setLocations] = useState<ParanormalLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchSubmissions } = useNostrHandler();

  const handleLocationSelect = (location: ParanormalLocation) => {
    setSelectedLocation(location);
  };

  const handleCloseDetails = () => {
    setSelectedLocation(null);
  };

  const handleNewLocation = (location: ParanormalLocation) => {
    setLocations(prev => [location, ...prev]);
  };

  // Fetch existing locations on component mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const loadLocations = async () => {
      try {
        console.log('Starting to load locations...');
        setIsLoading(true);

        // Force loading to complete after 10 seconds regardless of network issues
        timeoutId = setTimeout(() => {
          console.log('Loading timeout - showing empty state');
          setIsLoading(false);
        }, 10000);

        const existingLocations = await fetchSubmissions();
        console.log('Loaded locations:', existingLocations.length);

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        setLocations(existingLocations);
      } catch (error) {
        console.error('Failed to load paranormal locations:', error);
        setLocations([]); // Ensure we have empty array on error
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    loadLocations();

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchSubmissions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading paranormal locations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-blue-400 mb-2">🕯️ Paranormal Map</h1>
          <p className="text-gray-400">Explore and share paranormal locations worldwide</p>
        </div>

        {/* Submission Form */}
        <div className="mb-6">
          <LocationSubmitForm onLocationSubmit={handleNewLocation} />
        </div>

        <Separator className="mb-6 bg-gray-700" />

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="order-2 lg:order-1">
            <Card className="bg-gray-800 border-gray-700 p-0 overflow-hidden">
              <ParanormalMapComponent
                locations={locations}
                onLocationSelect={handleLocationSelect}
                selectedLocation={selectedLocation}
              />
            </Card>
          </div>

          {/* Location List */}
          <div className="order-1 lg:order-2">
            <Card className="bg-gray-800 border-gray-700 h-[600px] overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-blue-400">📍 Reported Locations</h2>
              </div>
              <LocationList
                locations={locations}
                onLocationSelect={handleLocationSelect}
              />
            </Card>
          </div>
        </div>

        {/* Location Details Modal/Side Panel */}
        {selectedLocation && (
          <LocationDetails
            location={selectedLocation}
            onClose={handleCloseDetails}
          />
        )}
      </div>
    </div>
  );
}