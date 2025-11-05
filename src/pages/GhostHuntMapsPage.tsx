import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { GhostHuntMap } from '@/components/GhostHuntMap';
import { LocationDetail } from '@/components/LocationDetail';
import { AddLocationForm } from '@/components/AddLocationForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Ghost,
  MapPin,
  Plus,
  ArrowLeft,
  Layers,
  Eye,
  Calendar,
  Star
} from 'lucide-react';
import { ParanormalLocation } from '@/hooks/useParanormalLocations';

const GhostHuntMapsPage = () => {
  useSeoMeta({
    title: 'Ghost Hunt Maps - Spookstr',
    description: 'Explore paranormal activity locations worldwide. Share and discover haunted places, UFO sightings, and mysterious phenomena.',
  });

  const [selectedLocation, setSelectedLocation] = useState<ParanormalLocation | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const handleLocationSelect = (location: ParanormalLocation) => {
    setSelectedLocation(location);
  };

  const handleBackToMap = () => {
    setSelectedLocation(null);
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    // The map will automatically refresh and show the new location
  };

  if (selectedLocation) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <LocationDetail
            locationId={selectedLocation.id}
            onBack={handleBackToMap}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Ghost className="h-8 w-8 text-lime-400" />
                <div>
                  <h1 className="text-3xl font-bold text-lime-400">
                    Ghost Hunt Maps
                  </h1>
                  <p className="text-lime-500/60">
                    Discover and share paranormal activity locations worldwide
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className={viewMode === 'map' ? 'bg-lime-500 text-black' : 'border-lime-500/50 text-lime-400 hover:bg-lime-500/10'}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Map View
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-lime-500 text-black' : 'border-lime-500/50 text-lime-400 hover:bg-lime-500/10'}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  List View
                </Button>
              </div>

              {/* Add Location Button */}
              <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogTrigger asChild>
                  <Button className="bg-lime-500 hover:bg-lime-600 text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Report Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Ghost className="h-6 w-6 text-lime-400" />
                      Report Paranormal Location
                    </DialogTitle>
                  </DialogHeader>
                  <AddLocationForm
                    onSuccess={handleAddSuccess}
                    onCancel={() => setShowAddForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        {viewMode === 'map' ? (
          <div className="h-[calc(100vh-120px)]">
            <GhostHuntMap onLocationSelect={handleLocationSelect} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto p-6">
            <ListView onLocationSelect={handleLocationSelect} />
          </div>
        )}
      </main>

      {/* Quick Stats Footer */}
      <div className="border-t border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-lime-400" />
                <span className="text-lime-100">Explore locations reported by investigators worldwide</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-lime-400" />
                <span className="text-lime-100">Historical and recent paranormal encounters</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-lime-400" />
              <span className="text-lime-100">Evidence-based paranormal research</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ListView Component
function ListView({ onLocationSelect }: { onLocationSelect: (location: ParanormalLocation) => void }) {
  const { data: locations, isLoading } = useParanormalLocations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-lime-500/20">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-6 bg-lime-500/20 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-lime-500/20 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-lime-500/20 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <Card className="border-lime-500/20">
        <CardContent className="py-12 text-center">
          <Ghost className="h-16 w-16 text-lime-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-lime-400 mb-2">
            No Paranormal Locations Yet
          </h3>
          <p className="text-lime-500/60 mb-4">
            Be the first to report a paranormal encounter location!
          </p>
        </CardContent>
      </Card>
    );
  }

  const categoryIcons = {
    ghosts: '👻',
    ufos: '👽',
    cryptids: '🦸',
    supernatural: '🔮',
    unexplained: '❓',
    urban_legends: '🏚️',
  };

  const evidenceColors = {
    none: 'bg-gray-500',
    low: 'bg-yellow-500',
    medium: 'bg-orange-500',
    high: 'bg-red-500',
  };

  return (
    <div className="space-y-4">
      {locations.map((location) => (
        <Card
          key={location.id}
          className="border-lime-500/20 hover:border-lime-500/40 transition-colors cursor-pointer"
          onClick={() => onLocationSelect(location)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">
                    {categoryIcons[location.category as keyof typeof categoryIcons]}
                  </span>
                  <h3 className="text-lg font-semibold text-lime-100">
                    {location.title}
                  </h3>
                </div>

                <p className="text-lime-500/60 mb-3">{location.location}</p>

                <p className="text-lime-100 mb-3 line-clamp-2">
                  {location.content}
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {categoryIcons[location.category as keyof typeof categoryIcons]} {location.category.replace('_', ' ')}
                  </Badge>

                  {location.encounterType && (
                    <Badge variant="secondary" className="text-xs">
                      {location.encounterType}
                    </Badge>
                  )}

                  {location.evidenceLevel && (
                    <Badge
                      variant="secondary"
                      className={cn('text-xs', evidenceColors[location.evidenceLevel])}
                    >
                      Evidence: {location.evidenceLevel}
                    </Badge>
                  )}

                  {location.images && location.images.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      📷 {location.images.length} image{location.images.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>

              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2 rotate-180" />
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default GhostHuntMapsPage;