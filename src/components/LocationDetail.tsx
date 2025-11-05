import { useState } from 'react';
import { ParanormalLocation, useParanormalLocation } from '@/hooks/useParanormalLocations';
import { useAuthor } from '@/hooks/useAuthor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MediaDisplay } from '@/components/MediaDisplay';
import { NoteContent } from '@/components/NoteContent';
import { ZapButton } from '@/components/ZapButton';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Eye, 
  Image as ImageIcon, 
  Star,
  Share2,
  Ghost,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface LocationDetailProps {
  locationId: string;
  onBack?: () => void;
  className?: string;
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

const evidenceLabels = {
  none: 'No Evidence',
  low: 'Low Evidence',
  medium: 'Medium Evidence',
  high: 'High Evidence',
};

export function LocationDetail({ locationId, onBack, className }: LocationDetailProps) {
  const { data: location, isLoading, error } = useParanormalLocation(locationId);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (isLoading) {
    return (
      <div className={cn('max-w-4xl mx-auto p-6 space-y-6', className)}>
        <div className="space-y-4">
          <div className="h-8 bg-lime-500/20 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-lime-500/20 rounded animate-pulse" />
          <div className="h-32 bg-lime-500/20 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-lime-500/20 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className={cn('max-w-4xl mx-auto p-6', className)}>
        <Card className="border-lime-500/20">
          <CardContent className="py-12 text-center">
            <Ghost className="h-16 w-16 text-lime-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-lime-400 mb-2">
              Location Not Found
            </h3>
            <p className="text-lime-500/60 mb-4">
              This paranormal location couldn't be found or may have been removed.
            </p>
            {onBack && (
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Map
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const author = useAuthor(location.author);
  const metadata = author.data?.metadata;

  return (
    <div className={cn('max-w-4xl mx-auto p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {categoryIcons[location.category as keyof typeof categoryIcons]}
            </span>
            <h1 className="text-2xl font-bold text-lime-400">
              {location.title}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <ZapButton event={location as any} size="sm" />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Location Info Card */}
          <Card className="border-lime-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-lime-400" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-lime-500/60" />
                <span className="text-lime-100">{location.location}</span>
              </div>
              
              {location.encounterType && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-lime-500/60" />
                  <span className="text-lime-100">Type: {location.encounterType}</span>
                </div>
              )}
              
              {location.encounterDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-lime-500/60" />
                  <span className="text-lime-100">
                    Encountered: {new Date(location.encounterDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-lime-500/60" />
                <span className="text-lime-100">
                  Reported {formatDistanceToNow(new Date(location.createdAt * 1000), { addSuffix: true })}
                </span>
              </div>
              
              {location.evidenceLevel && (
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', evidenceColors[location.evidenceLevel])} />
                  <span className="text-lime-100">
                    Evidence: {evidenceLabels[location.evidenceLevel]}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description Card */}
          <Card className="border-lime-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Encounter Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert max-w-none">
                <NoteContent event={location as any} className="text-lime-100" />
              </div>
            </CardContent>
          </Card>

          {/* Evidence Gallery */}
          {location.images && location.images.length > 0 && (
            <Card className="border-lime-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-lime-400" />
                  Evidence Gallery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <MediaDisplay
                      url={location.images[selectedImageIndex]}
                      alt={`Evidence for ${location.title}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Thumbnail Strip */}
                  {location.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {location.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={cn(
                            'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                            index === selectedImageIndex
                              ? 'border-lime-400 scale-105'
                              : 'border-lime-500/20 hover:border-lime-500/40'
                          )}
                        >
                          <MediaDisplay
                            url={image}
                            alt={`Evidence thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Author & Actions */}
        <div className="space-y-6">
          {/* Author Card */}
          <Card className="border-lime-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Reported By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={metadata?.picture} alt={metadata?.name} />
                  <AvatarFallback className="bg-lime-500/20 text-lime-400">
                    {metadata?.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-lime-100 truncate">
                    {metadata?.name || location.author.slice(0, 8) + '...'}
                  </div>
                  <div className="text-sm text-lime-500/60 truncate">
                    {metadata?.about || 'Paranormal investigator'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Badge */}
          <Card className="border-lime-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant="secondary" 
                className="text-sm px-3 py-1"
              >
                <span className="mr-2">
                  {categoryIcons[location.category as keyof typeof categoryIcons]}
                </span>
                {location.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-lime-500/20">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline">
                <Star className="h-4 w-4 mr-2" />
                Save Location
              </Button>
              <Button className="w-full" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share Report
              </Button>
              <ZapButton 
                event={location as any} 
                className="w-full"
                variant="default"
              >
                <ZapButton.Icon className="mr-2" />
                Zap Support
              </ZapButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}