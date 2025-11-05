import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import LocationSubmitForm from '@/components/paranormal-map/LocationSubmitForm';
import ParanormalMap from '@/components/paranormal-map/ParanormalMap';
import LocationList from '@/components/paranormal-map/LocationList';
import LocationDetails from '@/components/paranormal-map/LocationDetails';
import { useNostrHandler } from '@/components/paranormal-map/NostrHandler';
import { RefreshCw } from 'lucide-react';
import { ParanormalLocation } from '@/types/paranormal';

export default function ParanormalMapPage() {
  console.log('🗺️ ParanormalMapPage component mounting...');
  const [selectedLocation, setSelectedLocation] = useState<ParanormalLocation | null>(null);
  const [locations, setLocations] = useState<ParanormalLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { fetchSubmissions } = useNostrHandler();
  console.log('🗺️ fetchSubmissions function:', typeof fetchSubmissions);

  const handleLocationSelect = (location: ParanormalLocation) => {
    setSelectedLocation(location);
  };

  const handleCloseDetails = () => {
    setSelectedLocation(null);
  };

  const handleNewLocation = (location: ParanormalLocation) => {
    setLocations(prev => [location, ...prev]);
  };

  const handleRefreshLocations = async () => {
    try {
      console.log('🗺️ Manual refresh triggered...');
      const refreshedLocations = await fetchSubmissions();
      console.log('🗺️ Refreshed locations:', refreshedLocations.length);
      setLocations(refreshedLocations);
    } catch (error) {
      console.error('🗺️ Failed to refresh locations:', error);
    }
  };

  // Fetch existing locations on component mount
  useEffect(() => {
    console.log('🗺️ useEffect running for ParanormalMapPage...');
    let timeoutId: NodeJS.Timeout;

    const loadLocations = async () => {
      try {
        console.log('🗺️ Starting to load locations...');
        setIsLoading(true);

        // Force loading to complete after 10 seconds regardless of network issues
        timeoutId = setTimeout(() => {
          console.log('🗺️ Loading timeout - showing empty state');
          setIsLoading(false);
        }, 10000);

        const existingLocations = await fetchSubmissions();
        console.log('🗺️ Loaded locations:', existingLocations.length);

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);

        setLocations(existingLocations);
      } catch (error) {
        console.error('🗺️ Failed to load paranormal locations:', error);
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
      <div className="min-h-screen bg-background text-foreground p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading paranormal locations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SpookstrHeader />
      <div className="max-w-7xl mx-auto p-4">
        {/* Page Header */}
        <div className="mb-6 text-center pt-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-lime-400 mb-2 tracking-wider">🕯️ Paranormal Map</h1>
            <Button
              onClick={handleRefreshLocations}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-lime-500 hover:text-lime-400"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Locations
            </Button>
          </div>
          <p className="text-muted-foreground">Explore and share paranormal locations worldwide</p>
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
              <ParanormalMap
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
                <h2 className="text-xl font-semibold text-lime-400">📍 Reported Locations</h2>
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