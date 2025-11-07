import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, BookOpen, Clock, Calendar, Eye, ExternalLink, Share2, Heart, MessageCircle, Repeat2, RadioTower, Quote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { NoteContent } from '@/components/NoteContent';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { useToast } from '@/hooks/useToast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();

  // State for interactions
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);

  // Get real-time interaction counts
  const { data: interactionCounts, isLoading: isLoadingCounts, optimisticUpdate } = useRealtimeInteractions(event.id);

  const likeCount = interactionCounts?.likes || 0;
  const repostCount = interactionCounts?.reposts || 0;
  const commentCount = interactionCounts?.comments || 0;

  // Extract article data from tags
  const articleData = {
    title: event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Article',
    summary: event.tags.find(([name]) => name === 'summary')?.[1] || '',
    image: event.tags.find(([name]) => name === 'image')?.[1] || '',
    publishedAt: event.tags.find(([name]) => name === 'published_at')?.[1],
    url: event.tags.find(([name]) => name === 'url')?.[1],
    dTag: event.tags.find(([name]) => name === 'd')?.[1] || '',
    hashtags: event.tags.filter(([name]) => name === 't').map(([, tag]) => tag)
  };

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
      toast({
        title: "Copied!",
        description: "Article link copied to clipboard",
      });
    }
  };

  const handleAuthorClick = () => {
    const npub = nip19.npubEncode(event.pubkey);
    navigate(`/${npub}`);
  };

  const handleLike = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to like articles",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    optimisticUpdate(7, 1);
    setLiked(true);

    createEvent(
      {
        event: {
          kind: 7,
          content: '+',
          tags: [['e', event.id], ['p', event.pubkey]]
        }
      },
      {
        onError: () => {
          // Revert on error
          optimisticUpdate(7, -1);
          setLiked(false);
          toast({
            title: "Error",
            description: "Failed to like article",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleRepost = (spookstrOnly: boolean = false) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to repost articles",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    optimisticUpdate(6, 1);
    setReposted(true);

    createEvent(
      {
        event: {
          kind: 6,
          content: JSON.stringify(event),
          tags: [['e', event.id], ['p', event.pubkey]]
        },
        options: spookstrOnly ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
      },
      {
        onSuccess: () => {
          if (spookstrOnly) {
            toast({
              title: "Reposted to Spookstr",
              description: "Your repost was published to the Spookstr relay only.",
            });
          } else {
            toast({
              title: "Article reposted",
              description: "The article has been shared with your followers.",
            });
          }
        },
        onError: () => {
          // Revert on error
          optimisticUpdate(6, -1);
          setReposted(false);
          toast({
            title: "Error",
            description: "Failed to repost article",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleQuoteRepost = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to quote articles",
        variant: "destructive",
      });
      return;
    }
    setIsQuoteDialogOpen(true);
  };

  const handleQuoteSubmit = () => {
    if (!user || !quoteContent.trim()) return;

    // Create quote repost with q tag
    createEvent({
      event: {
        kind: 1,
        content: `${quoteContent}\n\nnostr:${nip19.noteEncode(event.id)}`,
        tags: [
          ['q', event.id, '', event.pubkey],
          ['p', event.pubkey]
        ]
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    });

    setQuoteContent('');
    setIsQuoteDialogOpen(false);
    setReposted(true);
    setPostToSpookstr2Only(false); // Reset the checkbox

    toast({
      title: "Quote reposted",
      description: "Your thoughts about this article have been shared.",
    });
  };

  return (
    <>
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
                <div className="markdown-preview text-base">
                  <NoteContent event={event} className="text-base leading-relaxed" />
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
                  onClick={handleLike}
                  disabled={!user}
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                >
                  <Heart className={`h-4 w-4 ${liked ? 'fill-lime-500 text-lime-500' : ''}`} />
                  <span className="text-xs">{isLoadingCounts ? '...' : likeCount}</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!user}
                      className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                    >
                      <Repeat2 className={`h-4 w-4 ${reposted ? 'fill-lime-500 text-lime-500' : ''}`} />
                      <span className="text-xs">{isLoadingCounts ? '...' : repostCount}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => handleRepost(false)}
                      className="flex items-center space-x-2"
                    >
                      <Repeat2 className="h-4 w-4" />
                      <span>Repost</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRepost(true)}
                      className="flex items-center space-x-2"
                    >
                      <RadioTower className="h-4 w-4 text-purple-500" />
                      <span>Repost to Spookstr</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleQuoteRepost}
                      className="flex items-center space-x-2"
                    >
                      <Quote className="h-4 w-4" />
                      <span>Quote Article</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 flex items-center space-x-1 pr-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{isLoadingCounts ? '...' : commentCount}</span>
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

        {/* Comments Section */}
        <CommentsSection
          root={event}
          title="Discussion"
          emptyStateMessage="No comments yet. Share your thoughts on this paranormal article!"
          emptyStateSubtitle="Start the conversation..."
          className="border-lime-500/20 bg-black/40 backdrop-blur-sm"
          limit={100}
        />
      </div>

      {/* Quote Repost Dialog */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsQuoteDialogOpen(false);
          setPostToSpookstr2Only(false); // Reset checkbox when dialog is closed
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quote Article</DialogTitle>
            <DialogDescription>
              Share your thoughts about this article. The original article will be quoted below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What do you think about this article?"
              value={quoteContent}
              onChange={(e) => setQuoteContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="p-3 bg-lime-500/10 rounded-lg border border-lime-500/20 overflow-hidden">
              <p className="text-xs text-lime-500/60 mb-1">Original article:</p>
              <div className="text-sm text-lime-100 line-clamp-3 break-words overflow-hidden">
                {articleData.title}
                {articleData.summary && ` - ${articleData.summary.substring(0, 100)}${articleData.summary.length > 100 ? '...' : ''}`}
              </div>
            </div>

            {/* Spookstr2 Relay Option */}
            <div className="flex items-start space-x-3 p-4 border border-lime-500/20 rounded-lg bg-black/10">
              <div className="flex items-center h-5">
                <Checkbox
                  id="spookstr2-only-quote"
                  checked={postToSpookstr2Only}
                  onCheckedChange={(checked) => setPostToSpookstr2Only(checked as boolean)}
                  className="border-lime-500/50 data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor="spookstr2-only-quote" className="text-sm font-medium text-lime-300 cursor-pointer flex items-center gap-2">
                  <RadioTower className="h-4 w-4" />
                  Post to Spookstr2 Relay Only
                </label>
                <p className="text-xs text-lime-500/60">
                  When checked, your quote will only be published to Spookstr2 relay. Uncheck to publish to all relays.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsQuoteDialogOpen(false);
                setPostToSpookstr2Only(false); // Reset checkbox when canceled
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuoteSubmit}
              disabled={!quoteContent.trim()}
              className="bg-lime-500 hover:bg-lime-600 text-black"
            >
              Quote Article
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

