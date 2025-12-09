import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, ExternalLink, X, Image as ImageIcon } from 'lucide-react';
import { ParanormalLocation } from '@/types/paranormal';
import { useState } from 'react';

interface LocationDetailsProps {
  location: ParanormalLocation;
  onClose: () => void;
}

export default function LocationDetails({ location, onClose }: LocationDetailsProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);

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

  const getCategoryEmoji = (category?: string) => {
    const emojiMap: Record<string, string> = {
      ghost: '👻',
      haunting: '🏚️',
      poltergeist: '💥',
      ufo: '🛸',
      cryptid: '🦎',
      orb: '⭕',
      evp: '🎙️',
      shadow: '🌑',
      other: '❓',
    };
    return category ? emojiMap[category] || '❓' : '👻';
  };

  const getCategoryLabel = (category?: string) => {
    const labelMap: Record<string, string> = {
      ghost: 'Ghost / Apparition',
      haunting: 'Haunting',
      poltergeist: 'Poltergeist',
      ufo: 'UFO / UAP',
      cryptid: 'Cryptid',
      orb: 'Orbs / Light Phenomena',
      evp: 'EVP / Audio Phenomena',
      shadow: 'Shadow Figure',
      other: 'Other',
    };
    return category ? labelMap[category] || 'Paranormal' : 'Paranormal';
  };

  return (
    <>
      {/* Fullscreen Media Viewer */}
      {selectedMediaIndex !== null && location.media && (
        <Dialog open={true} onOpenChange={(open) => !open && setSelectedMediaIndex(null)}>
          <DialogContent className="bg-black/95 border-gray-700 max-w-6xl max-h-[95vh] p-0 z-[100000]">
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedMediaIndex(null)}
                className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              >
                <X className="w-6 h-6" />
              </Button>

              {/* Navigation buttons */}
              {location.media.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedMediaIndex(prev => prev! > 0 ? prev! - 1 : location.media!.length - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  >
                    ←
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedMediaIndex(prev => prev! < location.media!.length - 1 ? prev! + 1 : 0)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  >
                    →
                  </Button>
                </>
              )}

              {/* Media Content */}
              <div className="max-w-full max-h-full">
                {location.media[selectedMediaIndex].match(/\.(mp4|webm|mov)$/i) ? (
                  <video
                    src={location.media[selectedMediaIndex]}
                    controls
                    autoPlay
                    className="max-w-full max-h-[85vh] rounded-lg"
                  />
                ) : (
                  <img
                    src={location.media[selectedMediaIndex]}
                    alt={`${location.title} - ${selectedMediaIndex + 1}`}
                    className="max-w-full max-h-[85vh] rounded-lg object-contain"
                  />
                )}
              </div>

              {/* Media counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-sm">
                {selectedMediaIndex + 1} / {location.media.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Location Details Dialog */}
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-gray-800 border-gray-700 text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto z-[99999] shadow-2xl border-2 border-lime-500/50">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle className="space-y-3">
            <div className="flex items-center justify-between gap-4">
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
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-lime-500/20 text-lime-300 border-lime-500/50">
                {getCategoryEmoji(location.category)} {getCategoryLabel(location.category)}
              </Badge>
              {location.locationName && (
                <span className="text-sm text-gray-400">
                  📍 {location.locationName}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Media Gallery */}
          {location.media && location.media.length > 0 && (
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-lime-300 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Photos & Videos ({location.media.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {location.media.map((url, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedMediaIndex(index)}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-600 hover:border-lime-500 transition-colors group"
                    >
                      {url.match(/\.(mp4|webm|mov)$/i) ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`${location.title} - ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
                        {url.match(/\.(mp4|webm|mov)$/i) ? '▶ Video' : '🖼️ Image'}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
    </>
  );
}