import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, BookOpen, Clock, Calendar, Eye, ExternalLink, Share2, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { NoteContent } from '@/components/NoteContent';
import type { NostrEvent } from '@nostrify/nostrify';

interface ArticleViewProps {
  event: NostrEvent;
  onBack?: () => void;
  className?: string;
}

export function ArticleView({ event, onBack, className }: ArticleViewProps) {
  const navigate = useNavigate();
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, event.pubkey);

  // Extract article data from tags
  const articleData = useMemo(() => {
    const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Article';
    const summary = event.tags.find(([name]) => name === 'summary')?.[1] || '';
    const image = event.tags.find(([name]) => name === 'image')?.[1] || '';
    const publishedAt = event.tags.find(([name]) => name === 'published_at')?.[1];
    const url = event.tags.find(([name]) => name === 'url')?.[1];
    const dTag = event.tags.find(([name]) => name === 'd')?.[1] || '';
    
    // Extract hashtags
    const hashtags = event.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

    return {
      title,
      summary,
      image,
      publishedAt,
      url,
      dTag,
      hashtags
    };
  }, [event.tags]);

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });
  const publishTime = articleData.publishedAt 
    ? formatDistanceToNow(new Date(parseInt(articleData.publishedAt) * 1000), { addSuffix: true })
    : timeAgo;

  // Calculate reading time based on content length
  const readingTime = useMemo(() => {
    if (!event.content) return null;
    const wordCount = event.content.split(/\s+/).length;
    return Math.ceil(wordCount / 200); // Average 200 words per minute
  }, [event.content]);

  const handleShare = async () => {
    const naddr = nip19.naddrEncode({
      identifier: articleData.dTag,
      pubkey: event.pubkey,
      kind: event.kind
    });
    
    const shareUrl = `${window.location.origin}/${naddr}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: articleData.title,
          text: articleData.summary,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      // You could show a toast notification here
    }
  };

  const handleAuthorClick = () => {
    const npub = nip19.npubEncode(event.pubkey);
    navigate(`/${npub}`);
  };

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={onBack || (() => navigate(-1))}
          className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          
          {articleData.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(articleData.url, '_blank', 'noopener,noreferrer')}
              className="border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
        {/* Article Header */}
        <CardHeader className="pb-4">
          {/* Article Meta */}
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="border-blue-500/30 text-blue-300">
              <BookOpen className="h-3 w-3 mr-1" />
              Article
            </Badge>
            
            <div className="text-xs text-lime-400/70 flex items-center gap-4">
              {articleData.publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(parseInt(articleData.publishedAt) * 1000).toLocaleDateString()}
                </div>
              )}
              {readingTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {readingTime} min read
                </div>
              )}
              {event.content && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {event.content.split(/\s+/).length} words
                </div>
              )}
            </div>
          </div>

          {/* Article Title */}
          <h1 className="text-3xl font-bold text-lime-100 mb-4 leading-tight">
            {articleData.title}
          </h1>

          {/* Article Summary */}
          {articleData.summary && (
            <p className="text-lg text-lime-200/80 leading-relaxed mb-4">
              {articleData.summary}
            </p>
          )}

          {/* Author Info */}
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-lime-500/5 rounded-lg p-2 -ml-2 transition-colors"
              onClick={handleAuthorClick}
            >
              <Avatar className="h-12 w-12 border-2 border-lime-500/30">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback className="bg-lime-500/20 text-lime-400">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-lime-300 hover:text-lime-200">
                  {displayName}
                </div>
                <div className="text-sm text-lime-400/70">
                  Published {publishTime}
                </div>
              </div>
            </div>

            {/* Hashtags */}
            {articleData.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {articleData.hashtags.slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs border-lime-500/30 text-lime-300 hover:bg-lime-500/10 cursor-pointer"
                    onClick={() => navigate(`/t/${tag}`)}
                  >
                    #{tag}
                  </Badge>
                ))}
                {articleData.hashtags.length > 4 && (
                  <Badge variant="outline" className="text-xs border-lime-500/30 text-lime-300/70">
                    +{articleData.hashtags.length - 4} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Featured Image */}
          {articleData.image && (
            <div className="relative mb-8 rounded-lg overflow-hidden bg-black/40">
              <div className="aspect-video relative">
                <img
                  src={articleData.image}
                  alt={articleData.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>
            </div>
          )}

          {/* Article Content */}
          <div className="space-y-6">
            {event.content ? (
              <div className="prose prose-lime prose-invert max-w-none">
                <div className="text-lime-100 leading-relaxed text-base">
                  <NoteContent event={event} className="text-base leading-relaxed" />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-lime-400/60">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>This article appears to be empty or the content could not be loaded.</p>
              </div>
            )}
          </div>

          <Separator className="my-8 bg-lime-500/20" />

          {/* Author Bio */}
          {metadata?.about && (
            <div className="bg-lime-500/5 rounded-lg p-6 border border-lime-500/20">
              <div className="flex items-start space-x-4">
                <Avatar className="h-16 w-16 border-2 border-lime-500/30">
                  <AvatarImage src={metadata?.picture} alt={displayName} />
                  <AvatarFallback className="bg-lime-500/20 text-lime-400 text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lime-300 text-lg">About {displayName}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAuthorClick}
                      className="border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
                    >
                      View Profile
                    </Button>
                  </div>
                  <p className="text-lime-200/80 leading-relaxed">
                    {metadata.about}
                  </p>
                  {metadata.website && (
                    <a
                      href={metadata.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-lime-400 hover:text-lime-300 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {metadata.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Article Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-lime-500/20">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
              >
                <Heart className="h-4 w-4 mr-2" />
                Like
              </Button>
              <Button
                variant="ghost"  
                size="sm"
                className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
              >
                <Repeat2 className="h-4 w-4 mr-2" />
                Repost
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Article
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}