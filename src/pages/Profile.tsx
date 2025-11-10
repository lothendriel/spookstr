import { useSeoMeta } from '@unhead/react';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { useAuthor } from '@/hooks/useAuthor';
import { useFollow } from '@/hooks/useFollow';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useOutboxInfiniteQuery } from '@/hooks/useOutboxQuery';
import { useProfileDiscovery } from '@/hooks/useContextualRelayDiscovery';
import { useUserBadges } from '@/hooks/useBadges';
import { SmartRelayDiscoveryIndicator } from '@/components/RelayDiscoveryIndicator';
import { getDisplayName } from '@/lib/getDisplayName';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ParanormalPost } from '@/components/ParanormalPost';
import { InfiniteScrollLoader, InfiniteScrollSkeleton } from '@/components/ui/InfiniteScrollLoader';
import { NostrBadgeGrid, NostrBadgeSkeleton } from '@/components/NostrBadge';
import { BadgeImageDebug } from '@/components/BadgeImageDebug';
import { Ghost, ArrowLeft, ExternalLink, Zap as ZapIcon, UserPlus, UserMinus, Copy, Check, MessageSquare, Edit, Shield, Bot, Award, Star, Crown, Sparkles, Medal } from 'lucide-react';
import { useState, useMemo } from 'react';
import { PostDetailView } from '@/components/PostDetailView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { EditProfileForm } from '@/components/EditProfileForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { NostrEvent } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';

interface ProfileProps {
  pubkey: string;
}

export default function Profile({ pubkey }: ProfileProps) {
  const author = useAuthor(pubkey);
  const { user } = useCurrentUser();
  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [showBadges, setShowBadges] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch NIP-58 badges for this user
  const { userBadges, isLoading: isLoadingNostrBadges } = useUserBadges(pubkey);

  // Allow proper loading state to work
  const forceNotLoading = false;

  // Demo badges for testing and fallback
  const demoBadges = useMemo(() => {
    console.log('🎪 Creating demo badges (always show for testing)');
    return [
      {
        profileBadge: {
          badgeDefinition: '30009:demo:spookstr-fan',
          badgeAward: 'demo-award-1'
        },
        definition: {
          identifier: 'spookstr-fan',
          name: 'Spookstr Fan',
          description: 'Active member of the Spookstr community',
          image: 'https://nostr.build/i/111e07f4a3332bfdcd719396a3427d740717f48bdc7df1e45a2ff47fed40b2ba.jpg',
          thumbs: [],
          pubkey: 'demo'
        },
        award: {
          id: 'demo-award-1',
          badgeDefinition: '30009:demo:spookstr-fan',
          awardedTo: pubkey,
          awardedBy: 'demo'
        }
      },
      {
        profileBadge: {
          badgeDefinition: '30009:demo:early-adopter',
          badgeAward: 'demo-award-2'
        },
        definition: {
          identifier: 'early-adopter',
          name: 'Early Adopter',
          description: 'One of the first users of Spookstr',
          image: '',
          thumbs: [],
          pubkey: 'demo'
        },
        award: {
          id: 'demo-award-2',
          badgeDefinition: '30009:demo:early-adopter',
          awardedTo: pubkey,
          awardedBy: 'demo'
        }
      }
    ];
  }, [pubkey]);

  // Use actual Nostr NIP-58 badges if available, fall back to demo badges only if needed
  const displayBadges = (userBadges && userBadges.length > 0) ? userBadges : demoBadges;

  // Debug: Always log badge state
  console.log('🎯 Badge debug:', {
    userBadges: userBadges?.length || 0,
    isLoadingNostrBadges,
    pubkey: pubkey.slice(0, 8) + '...',
    displayBadges: displayBadges.length
  });

  // Use profile discovery for enhanced relay discovery with visual indicators
  const {
    events: discoveredEvents,
    isLoading: isDiscovering,
    stats: discoveryStats
  } = useProfileDiscovery(pubkey);

  const { isFollowing, follow, unfollow, isPending } = useFollow(pubkey);

  const isOwnProfile = user?.pubkey === pubkey;
  const npub = nip19.npubEncode(pubkey);

  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, pubkey);

  // Determine UI badges based on metadata (system-generated badges)
  const uiBadges = useMemo(() => {
    const badges = [];

    if (metadata?.nip05) {
      badges.push({
        id: 'verified',
        icon: Shield,
        label: 'Verified',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30'
      });
    }

    if (metadata?.bot) {
      badges.push({
        id: 'bot',
        icon: Bot,
        label: 'Bot',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30'
      });
    }

    if (metadata?.lud16 || metadata?.lud06) {
      badges.push({
        id: 'lightning',
        icon: ZapIcon,
        label: 'Lightning',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30'
      });
    }

    // Add special badges based on display name or other criteria
    if (metadata?.display_name || metadata?.name) {
      const name = (metadata.display_name || metadata.name || '').toLowerCase();
      if (name.includes('admin') || name.includes('mod')) {
        badges.push({
          id: 'moderator',
          icon: Crown,
          label: 'Moderator',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30'
        });
      }
    }

    // Early adopter badge (could be based on account creation date)
    badges.push({
      id: 'spookstr',
      icon: Sparkles,
      label: 'Spookstr',
      color: 'text-lime-400',
      bgColor: 'bg-lime-500/10',
      borderColor: 'border-lime-500/30'
    });

    return badges;
  }, [metadata]);

  useSeoMeta({
    title: `${displayName} - Spookstr`,
    description: metadata?.about || `View ${displayName}'s profile on Spookstr`,
  });

  const handleCopyPubkey = async () => {
    try {
      await navigator.clipboard.writeText(npub);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy public key:', error);
    }
  };

  const handleFollowToggle = async () => {
    if (isFollowing(pubkey)) {
      await unfollow(pubkey);
    } else {
      await follow(pubkey);
    }
  };

  // Fetch user's posts using infinite outbox model
  // Include kind 1 (notes), kind 6 (reposts), and kind 16 (generic reposts)
  const {
    data: postsData,
    fetchNextPage: fetchNextPosts,
    hasNextPage: hasNextPosts,
    isFetchingNextPage: isFetchingNextPosts,
    isLoading: isLoadingPosts
  } = useOutboxInfiniteQuery({
    authorPubkey: pubkey,
    filters: [{ kinds: [1, 6, 16], authors: [pubkey] }],
    enabled: !!pubkey,
    staleTime: 30000,
    limit: 30
  });

  // Flatten and process posts to filter out replies (only for kind 1)
  // Keep all reposts (kind 6 and 16) regardless of tags
  const allPosts = useMemo(() => {
    if (!postsData?.pages) return [];
    const seen = new Set();
    return postsData.pages.flat().filter(event => {
      // Skip duplicates
      if (event.id && seen.has(event.id)) return false;
      seen.add(event.id);

      // Keep all reposts
      if (event.kind === 6 || event.kind === 16) return true;
      // For kind 1, filter out replies (events with 'e' tags)
      return event.kind === 1 && !event.tags.some(([tagName]) => tagName === 'e');
    });
  }, [postsData]);

  // Set up infinite scroll for posts
  const postsLoadMoreRef = useInfiniteScroll({
    hasNextPage: !!hasNextPosts,
    isFetchingNextPage: isFetchingNextPosts,
    fetchNextPage: fetchNextPosts,
    threshold: 0.8,
    rootMargin: '200px'
  }).loadMoreRef;

  // Fetch user's replies using infinite outbox model
  const {
    data: repliesData,
    fetchNextPage: fetchNextReplies,
    hasNextPage: hasNextReplies,
    isFetchingNextPage: isFetchingNextReplies,
    isLoading: isLoadingReplies
  } = useOutboxInfiniteQuery({
    authorPubkey: pubkey,
    filters: [{ kinds: [1], authors: [pubkey] }],
    enabled: !!pubkey,
    staleTime: 30000,
    limit: 30
  });

  // Flatten and process replies to filter for only reply events
  const allReplies = useMemo(() => {
    if (!repliesData?.pages) return [];
    const seen = new Set();
    return repliesData.pages.flat().filter(event => {
      // Skip duplicates
      if (event.id && seen.has(event.id)) return false;
      seen.add(event.id);

      // Only include events with 'e' tags (replies)
      return event.tags.some(([tagName]) => tagName === 'e');
    });
  }, [repliesData]);

  // Set up infinite scroll for replies
  const repliesLoadMoreRef = useInfiniteScroll({
    hasNextPage: !!hasNextReplies,
    isFetchingNextPage: isFetchingNextReplies,
    fetchNextPage: fetchNextReplies,
    threshold: 0.8,
    rootMargin: '200px'
  }).loadMoreRef;

  if (selectedPost) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <PostDetailView
            event={selectedPost}
            onBack={() => setSelectedPost(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button
          onClick={() => window.history.back()}
          variant="ghost"
          className="mb-6 text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        {author.isLoading ? (
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm mb-6">
            <CardContent className="p-6">
              {/* Banner */}
              <div className="relative -mx-6 -mt-6 mb-6 h-48 overflow-hidden rounded-t-lg">
                {metadata?.banner && (
                  <>
                    <img
                      src={metadata.banner}
                      alt="Profile banner"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                  </>
                )}
                {!metadata?.banner && (
                  <div className="w-full h-full bg-gradient-to-br from-lime-500/10 to-purple-500/10" />
                )}

                {/* Relay Discovery Indicator inside banner */}
                <div className="absolute top-4 right-4 z-10">
                  <SmartRelayDiscoveryIndicator
                    context="profile"
                    eventsFound={discoveredEvents.length}
                    hintsUsed={discoveryStats?.hintsUsed || false}
                    isLoading={isDiscovering || author.isLoading}
                  />
                </div>
              </div>

              <div className="flex items-start gap-6">
                {/* Avatar */}
                <Avatar className="h-24 w-24 border-4 border-lime-500/30">
                  <AvatarImage src={metadata?.picture} alt={displayName} />
                  <AvatarFallback className="bg-lime-500/20 text-lime-400 text-2xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-lime-400 truncate">
                          {metadata?.display_name || displayName}
                        </h1>
                        {metadata?.nip05 && (
                          <span className="text-lime-500">✓</span>
                        )}
                      </div>

                      {/* NIP-58 badge toggle - show when there are badges or demo badges */}
                      {(userBadges.length > 0 || demoBadges.length > 0) && (
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-lime-400" />
                          <span className="text-xs text-lime-400">
                            {userBadges.length > 0 ? 'NIP-58 Badges' : 'Demo Badges'}
                          </span>
                          <Switch
                            checked={showBadges}
                            onCheckedChange={setShowBadges}
                            size="sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      {isOwnProfile && (
                        <Dialog open={isEditing} onOpenChange={setIsEditing}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Profile</DialogTitle>
                              <DialogDescription>
                                Update your profile information. All fields are optional - only fill in what you want to share.
                              </DialogDescription>
                            </DialogHeader>
                            <EditProfileForm onSuccess={() => setIsEditing(false)} />
                          </DialogContent>
                        </Dialog>
                      )}

                      {!isOwnProfile && user && (
                        <Button
                          onClick={handleFollowToggle}
                          disabled={isPending}
                          variant={isFollowing(pubkey) ? "outline" : "default"}
                          size="sm"
                          className={`
                            ${isFollowing(pubkey)
                              ? "border-lime-500 text-lime-400 hover:bg-lime-500/10"
                              : "bg-lime-500 hover:bg-lime-600 text-black"
                            }
                          `}
                        >
                          {isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                          ) : isFollowing(pubkey) ? (
                            <>
                              <UserMinus className="h-4 w-4 mr-1" />
                              Unfollow
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Follow
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        onClick={handleCopyPubkey}
                        variant="outline"
                        size="sm"
                        className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy Key
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* UI Badges (System-generated) - always shown regardless of showBadges toggle */}
                  {uiBadges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uiBadges.map((badge) => (
                        <Badge
                          key={badge.id}
                          variant="outline"
                          className={`${badge.bgColor} ${badge.borderColor} border ${badge.color} text-xs px-2 py-1 h-8 flex items-center gap-1`}
                        >
                          <badge.icon className="h-4 w-4" />
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* NIP-58 Badges (Awarded badges) */}
                  <div className="mb-3">
                    {showBadges && (
                      <>
                        {(isLoadingNostrBadges && !forceNotLoading) ? (
                          <div className="flex gap-2 mb-3">
                            <NostrBadgeSkeleton size="sm" />
                            <NostrBadgeSkeleton size="sm" />
                            <NostrBadgeSkeleton size="sm" />
                            <span className="text-xs text-lime-500/50">Loading NIP-58 badges...</span>
                          </div>
                        ) : displayBadges.length > 0 ? (
                          <div>
                            {displayBadges === demoBadges && userBadges.length === 0 && (
                                <div className="text-xs text-lime-500/50 italic mb-2">
                                  Using demo badges - no actual badges found
                                </div>
                              )}
                            <NostrBadgeGrid
                              badges={displayBadges}
                              size="sm"
                              maxBadges={12}
                              className="grid grid-cols-auto-fit gap-[1px]"
                            />

                            {/* Temporary Debug Component */}
                            <div className="mt-4">
                              <BadgeImageDebug badges={displayBadges} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-lime-500/50 italic">
                            No NIP-58 badges found
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* NIP-05 Identifier */}
                  {metadata?.nip05 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-blue-400" />
                      <p className="text-sm text-lime-500/70">{metadata.nip05}</p>
                    </div>
                  )}

                  {/* About/Bio */}
                  {metadata?.about && (
                    <div className="mb-4">
                      <p className="text-lime-100 whitespace-pre-wrap break-words">{metadata.about}</p>
                    </div>
                  )}

                  {/* Comprehensive Metadata Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Website */}
                    {metadata?.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-lime-400" />
                        <a
                          href={metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-lime-400 hover:text-lime-300 truncate"
                        >
                          {metadata.website}
                        </a>
                      </div>
                    )}

                    {/* Lightning Addresses */}
                    {metadata?.lud16 && (
                      <div className="flex items-center gap-2">
                        <ZapIcon className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-lime-500/70">{metadata.lud16}</span>
                      </div>
                    )}

                    {metadata?.lud06 && !metadata?.lud16 && (
                      <div className="flex items-center gap-2">
                        <ZapIcon className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-lime-500/70">{metadata.lud06}</span>
                      </div>
                    )}

                    {/* Bot Status */}
                    {metadata?.bot && (
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-400" />
                        <span className="text-sm text-purple-400">Bot Account</span>
                      </div>
                    )}

                    {/* Display Name (if different from name) */}
                    {metadata?.display_name && metadata.display_name !== metadata.name && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-orange-400" />
                        <span className="text-sm text-orange-400">Display: {metadata.display_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Public Key */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-lime-500/50">Public Key:</span>
                    <span className="text-xs text-lime-500/70 font-mono">{npub}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Badge Test Component removed */}

        {/* Posts and Replies Tabs */}
        <div className="mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-lime-500/10 border border-lime-500/20">
              <TabsTrigger value="posts" className="data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300">
                Posts
              </TabsTrigger>
              <TabsTrigger value="replies" className="data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300">
                Replies
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab Content */}
            <TabsContent value="posts" className="mt-6">
              <div className="space-y-4">
                {isLoadingPosts && !postsData && (
                  <InfiniteScrollSkeleton count={3} />
                )}

                {!isLoadingPosts && allPosts.length === 0 && (
                  <Card className="border-dashed border-lime-500/20 bg-black/20">
                    <CardContent className="p-12 text-center">
                      <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-lime-400 mb-2">
                        No Posts Yet
                      </h3>
                      <p className="text-lime-500/60">
                        This user hasn't shared any paranormal experiences yet
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isLoadingPosts && allPosts.length > 0 && (
                  <div className="space-y-4">
                    {allPosts.map((post) => (
                      <ParanormalPost
                        key={post.id}
                        event={post}
                        onClick={() => setSelectedPost(post)}
                        showActions={true}
                      />
                    ))}

                    {/* Infinite scroll loader for posts */}
                    <InfiniteScrollLoader
                      ref={postsLoadMoreRef}
                      isLoading={isFetchingNextPosts}
                      hasMore={!!hasNextPosts}
                      loader={<InfiniteScrollSkeleton count={2} />}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Replies Tab Content */}
            <TabsContent value="replies" className="mt-6">
              <div className="space-y-4">
                {isLoadingReplies && !repliesData && (
                  <InfiniteScrollSkeleton count={3} />
                )}

                {!isLoadingReplies && allReplies.length === 0 && (
                  <Card className="border-dashed border-lime-500/20 bg-black/20">
                    <CardContent className="p-12 text-center">
                      <MessageSquare className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-lime-400 mb-2">
                        No Replies Yet
                      </h3>
                      <p className="text-lime-500/60">
                        This user hasn't replied to any posts yet
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isLoadingReplies && allReplies.length > 0 && (
                  <div className="space-y-4">
                    {allReplies.map((reply) => (
                      <ParanormalPost
                        key={reply.id}
                        event={reply}
                        onClick={() => setSelectedPost(reply)}
                        showActions={true}
                      />
                    ))}

                    {/* Infinite scroll loader for replies */}
                    <InfiniteScrollLoader
                      ref={repliesLoadMoreRef}
                      isLoading={isFetchingNextReplies}
                      hasMore={!!hasNextReplies}
                      loader={<InfiniteScrollSkeleton count={2} />}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
