import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, User, ExternalLink, X } from 'lucide-react';
import { ParanormalLocation } from '@/types/paranormal';

interface LocationDetailsProps {
  location: ParanormalLocation;
  onClose: () => void;
}

export default function LocationDetails({ location, onClose }: LocationDetailsProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openInMaps = () => {
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    window.open(url, '_blank');
  };

  const formatPubkey = (pubkey: string) => {
    return `${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 8)}`;
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-lime-400">
              <MapPin className="w-5 h-5" />
              <span className="text-xl font-bold">{location.title}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description */}
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-lime-300 mb-3">Experience Details</h3>
              <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                {location.description}
              </div>
            </CardContent>
          </Card>

          {/* Location Information */}
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-lime-300 mb-3">Location Information</h3>

              <div className="grid gap-4">
                {/* Coordinates */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Coordinates:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-800 px-3 py-1 rounded text-sm text-lime-400 font-mono">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openInMaps}
                      className="border-gray-600 text-gray-300 hover:bg-gray-600"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Maps
                    </Button>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4" />
                    Reported:
                  </span>
                  <span className="text-gray-200">
                    {formatDate(location.timestamp)}
                  </span>
                </div>

                {/* User Pubkey */}
                {location.user_pubkey && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-gray-300">
                      <User className="w-4 h-4" />
                      Submitted by:
                    </span>
                    <code className="bg-gray-800 px-3 py-1 rounded text-sm text-yellow-400 font-mono">
                      {formatPubkey(location.user_pubkey)}
                    </code>
                  </div>
                )}

                {/* Event ID */}
                {location.id && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Event ID:</span>
                    <code className="bg-gray-800 px-3 py-1 rounded text-xs text-gray-400 font-mono max-w-[200px] truncate">
                      {location.id}
                    </code>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-lime-500 hover:text-lime-400"
            >
              Close
            </Button>
            <Button
              onClick={openInMaps}
              className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-semibold"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Maps
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}