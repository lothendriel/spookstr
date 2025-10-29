import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { Play, Users, Calendar, ExternalLink, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';

interface LiveStreamEventProps {
  event: NostrEvent;
  className?: string;
  showPlayer?: boolean;
}

export function LiveStreamEvent({ event, className, showPlayer = false }: LiveStreamEventProps) {
  const [isPlayerOpen, setIsPlayerOpen] = useState(showPlayer);
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, event.pubkey);

  // Extract stream data from tags
  const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Stream';
  const summary = event.tags.find(([name]) => name === 'summary')?.[1] || '';
  const image = event.tags.find(([name]) => name === 'image')?.[1] || '';
  const thumb = event.tags.find(([name]) => name === 'thumb')?.[1] || image;
  const status = event.tags.find(([name]) => name === 'status')?.[1] || 'unknown';
  const starts = event.tags.find(([name]) => name === 'starts')?.[1];
  const ends = event.tags.find(([name]) => name === 'ends')?.[1];
  const streaming = event.tags.find(([name]) => name === 'streaming')?.[1];
  const recording = event.tags.find(([name]) => name === 'recording')?.[1];
  const service = event.tags.find(([name]) => name === 'service')?.[1];
  const altLink = event.tags.find(([name]) => name === 'alt')?.[1];
  const currentParticipants = event.tags.find(([name]) => name === 'current_participants')?.[1];
  const totalParticipants = event.tags.find(([name]) => name === 'total_participants')?.[1];

  // Extract hashtags
  const hashtags = event.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

  // Extract participants (p tags with roles)
  const participants = event.tags
    .filter(([name]) => name === 'p')
    .map(([, pubkey, relay, role]) => ({ pubkey, relay, role: role || 'Participant' }));

  // Determine stream URL (prefer recording if ended, otherwise streaming URL)
  const streamUrl = status === 'ended' && recording ? recording : streaming;

  // Format timestamps
  const startTime = starts ? new Date(parseInt(starts) * 1000) : null;
  const endTime = ends ? new Date(parseInt(ends) * 1000) : null;

  // Get status styling
  const getStatusBadge = () => {
    switch (status) {
      case 'live':
        return (
          <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
            <Radio className="h-3 w-3 mr-1" />
            LIVE
          </Badge>
        );
      case 'planned':
        return (
          <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700">
            <Calendar className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case 'ended':
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-400">
            Ended
          </Badge>
        );
      default:
        return null;
    }
  };

  // Extract streaming service info
  const getStreamingPlatform = () => {
    if (service?.includes('streamstr.net')) return 'Streamstr';
    if (altLink?.includes('zap.stream')) return 'Zap.Stream';
    if (streaming?.includes('youtube.com')) return 'YouTube';
    if (streaming?.includes('twitch.tv')) return 'Twitch';
    return 'Stream';
  };

  const handleWatchClick = () => {
    if (streamUrl && status === 'live') {
      // For live streams, try to show embedded player
      setIsPlayerOpen(!isPlayerOpen);
    } else if (altLink) {
      // For ended streams or external links, open in new tab
      window.open(altLink, '_blank', 'noopener,noreferrer');
    } else if (streamUrl) {
      window.open(streamUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className={`border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-purple-500/30">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="bg-purple-500/20 text-purple-400">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-purple-300">{displayName}</div>
              <div className="text-xs text-purple-400/70">
                {getStreamingPlatform()} • {startTime && formatDistanceToNow(startTime, { addSuffix: true })}
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Thumbnail/Video Player */}
        <div className="relative mb-4 rounded-lg overflow-hidden bg-black/40">
          {isPlayerOpen && streamUrl && status === 'live' ? (
            <div className="aspect-video">
              {streamUrl.includes('.m3u8') ? (
                // HLS Stream
                <video
                  className="w-full h-full"
                  controls
                  autoPlay
                  playsInline
                  src={streamUrl}
                  poster={thumb}
                >
                  <source src={streamUrl} type="application/x-mpegURL" />
                  Your browser does not support HLS video.
                </video>
              ) : (
                // Regular video
                <video
                  className="w-full h-full"
                  controls
                  autoPlay
                  playsInline
                  src={streamUrl}
                  poster={thumb}
                >
                  Your browser does not support this video format.
                </video>
              )}
            </div>
          ) : (
            <div className="aspect-video relative group cursor-pointer" onClick={handleWatchClick}>
              {thumb ? (
                <img
                  src={thumb}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-800/50 to-pink-800/50 flex items-center justify-center">
                  <Play className="h-16 w-16 text-white/70" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <div className="bg-white/90 rounded-full p-4 group-hover:scale-110 transition-transform">
                  <Play className="h-8 w-8 text-black fill-black" />
                </div>
              </div>

              {/* Duration badge for recorded streams */}
              {status === 'ended' && startTime && endTime && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))}m
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stream Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-bold text-lg text-purple-100 mb-1">{title}</h3>
            {summary && (
              <p className="text-sm text-purple-200/80 line-clamp-2">{summary}</p>
            )}
          </div>

          {/* Stream Stats */}
          <div className="flex items-center gap-4 text-xs text-purple-300/70">
            {currentParticipants && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {currentParticipants} watching
              </div>
            )}
            {totalParticipants && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {totalParticipants} total
              </div>
            )}
            {startTime && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {startTime.toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                >
                  #{tag}
                </Badge>
              ))}
              {hashtags.length > 5 && (
                <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-300/70">
                  +{hashtags.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleWatchClick}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              {status === 'live' ? 'Watch Live' : status === 'ended' ? 'Watch Recording' : 'View Stream'}
            </Button>
            
            {altLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(altLink, '_blank', 'noopener,noreferrer')}
                className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Participants */}
          {participants.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-purple-300/70 hover:text-purple-300">
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {participants.slice(0, 10).map(({ pubkey, role }) => (
                  <ParticipantItem key={pubkey} pubkey={pubkey} role={role} />
                ))}
                {participants.length > 10 && (
                  <div className="text-xs text-purple-300/50">
                    +{participants.length - 10} more participants
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Embedded Player Toggle for Live Streams */}
        {status === 'live' && streamUrl && (
          <div className="mt-3 pt-3 border-t border-purple-500/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlayerOpen(!isPlayerOpen)}
              className="text-purple-300/70 hover:text-purple-300"
            >
              {isPlayerOpen ? 'Hide Player' : 'Show Embedded Player'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper component for participant display
function ParticipantItem({ pubkey, role }: { pubkey: string; role: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, pubkey);

  return (
    <div className="flex items-center gap-2 text-xs">
      <Avatar className="h-4 w-4">
        <AvatarImage src={metadata?.picture} alt={displayName} />
        <AvatarFallback className="bg-purple-500/20 text-purple-400 text-[8px]">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-purple-200">{displayName}</span>
      <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-500/30 text-purple-300/70">
        {role}
      </Badge>
    </div>
  );
}