import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { BookOpen, ExternalLink, Clock, Calendar, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';

interface LongFormContentProps {
  event: NostrEvent;
  className?: string;
}

export function LongFormContent({ event, className }: LongFormContentProps) {
  const navigate = useNavigate();
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, event.pubkey);

  // Extract article data from tags
  const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Article';
  const summary = event.tags.find(([name]) => name === 'summary')?.[1] || '';
  const image = event.tags.find(([name]) => name === 'image')?.[1] || '';
  const publishedAt = event.tags.find(([name]) => name === 'published_at')?.[1];
  const url = event.tags.find(([name]) => name === 'url')?.[1];
  const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';

  // Extract hashtags
  const hashtags = event.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });
  const publishTime = publishedAt
    ? formatDistanceToNow(new Date(parseInt(publishedAt) * 1000), { addSuffix: true })
    : timeAgo;

  // Extract content preview (first few paragraphs)
  const getContentPreview = () => {
    if (!event.content) return summary;

    // Try to extract first paragraph or first 200 characters
    const paragraphs = event.content.split('\n\n');
    const firstParagraph = paragraphs[0];

    if (firstParagraph.length > 200) {
      return firstParagraph.substring(0, 200) + '...';
    }

    return firstParagraph;
  };

  // Estimate reading time based on content length
  const getReadingTime = () => {
    if (!event.content) return null;
    const wordCount = event.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average 200 words per minute
    return readingTime;
  };

  const readingTime = getReadingTime();
  const contentPreview = getContentPreview();

  const handleReadArticle = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Create naddr (addressable event) identifier for the article
    const naddr = nip19.naddrEncode({
      identifier: dTag,
      pubkey: event.pubkey,
      kind: event.kind
    });

    // Navigate to the article view
    navigate(`/${naddr}`);
  };

  return (
    <Card className={`border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-blue-500/30">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="bg-blue-500/20 text-blue-400">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-blue-300">{displayName}</div>
              <div className="text-xs text-blue-400/70 flex items-center gap-2">
                <span>Article • {publishTime}</span>
                {readingTime && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {readingTime} min read
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="border-blue-500/30 text-blue-300">
            <BookOpen className="h-3 w-3 mr-1" />
            Article
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Article Image */}
        {image && (
          <div className="relative mb-4 rounded-lg overflow-hidden bg-black/40">
            <div className="aspect-video relative">
              <img
                src={image}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Title overlay on image */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="font-bold text-xl text-white mb-2 line-clamp-2 drop-shadow-lg">
                  {title}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Article Info */}
        <div className="space-y-3">
          {/* Title (if no image) */}
          {!image && (
            <div>
              <h3 className="font-bold text-xl text-blue-100 mb-2">{title}</h3>
            </div>
          )}

          {/* Content Preview */}
          {contentPreview && (
            <div className="text-sm text-blue-200/80 leading-relaxed">
              <p className="line-clamp-4">{contentPreview}</p>
            </div>
          )}

          {/* Article Stats */}
          <div className="flex items-center gap-4 text-xs text-blue-300/70">
            {publishedAt && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(parseInt(publishedAt) * 1000).toLocaleDateString()}
              </div>
            )}
            {event.content && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {event.content.split(/\s+/).length} words
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
                  className="text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  #{tag}
                </Badge>
              ))}
              {hashtags.length > 5 && (
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-300/70">
                  +{hashtags.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleReadArticle}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Read Article
            </Button>

            {url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Author Bio (if available) */}
          {metadata?.about && (
            <div className="pt-3 border-t border-blue-500/20">
              <div className="text-xs text-blue-300/70 mb-1">About the author:</div>
              <p className="text-xs text-blue-200/80 line-clamp-2">
                {metadata.about}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}