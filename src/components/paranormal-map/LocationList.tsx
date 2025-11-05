import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Clock, User, Image as ImageIcon } from 'lucide-react';
import { ParanormalLocation } from '@/types/paranormal';

interface LocationListProps {
  locations: ParanormalLocation[];
  onLocationSelect: (location: ParanormalLocation) => void;
}

export default function LocationList({ locations, onLocationSelect }: LocationListProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 px-4 pb-4">
        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
            <MapPin className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center text-sm">
              No paranormal locations reported yet.<br />
              Be the first to share your experience!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                onClick={() => onLocationSelect(location)}
                className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-all duration-200 hover:shadow-lg hover:shadow-lime-500/10 border border-gray-600 hover:border-lime-500/50"
              >
                {/* Location Title */}
                <h3 className="font-bold text-lime-400 mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{location.title}</span>
                  </div>
                  {location.media && location.media.length > 0 && (
                    <div className="flex items-center gap-1 text-xs bg-gray-800 px-2 py-1 rounded">
                      <ImageIcon className="w-3 h-3" />
                      {location.media.length}
                    </div>
                  )}
                </h3>

                {/* Description Excerpt */}
                <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                  {truncateText(location.description, 150)}
                </p>

                {/* Location Details */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    {/* Coordinates */}
                    <span className="flex items-center gap-1">
                      <span className="font-mono bg-gray-800 px-2 py-1 rounded">
                        {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}
                      </span>
                    </span>

                    {/* Date */}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(location.timestamp)}
                    </span>
                  </div>

                  {/* User Indicator */}
                  {location.user_pubkey && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">
                        {location.user_pubkey.substring(0, 8)}...
                      </span>
                    </span>
                  )}
                </div>

                {/* Hover Effect Indicator */}
                <div className="mt-2 text-xs text-lime-400 opacity-0 hover:opacity-100 transition-opacity">
                  Click to view details and locate on map
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* List Footer */}
      {locations.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-700 bg-gray-800">
          <p className="text-xs text-gray-400 text-center">
            Showing {locations.length} reported location{locations.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}