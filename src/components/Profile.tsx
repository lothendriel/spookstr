import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useFollow } from '@/hooks/useFollow';
import { useOutboxQuery } from '@/hooks/useOutboxQuery';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParanormalPost } from '@/components/ParanormalPost';
import { EditProfileForm } from '@/components/EditProfileForm';
import {
  User,
  UserPlus,
  UserMinus,
  ExternalLink,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Mail,
  Zap,
  Settings,
  Copy,
  Check,
  MessageSquare,
  Ghost,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { genUserName } from '@/lib/genUserName';
import { getDisplayName } from '@/lib/getDisplayName';
import { cn } from '@/lib/utils';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

interface ProfileProps {
  pubkey: string;
}

export function Profile({ pubkey }: ProfileProps) {
  const { toast } = useToast();
  const { user: currentUser } = useCurrentUser();
  const author = useAuthor(pubkey);
  const { mutate: createEvent } = useNostrPublish();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Get user's posts using outbox model
  const { data: userPosts, isLoading: postsLoading } = useOutboxQuery({
    authors: [pubkey],
    kinds: [1, 1111], // Text notes and community posts
    limit: 50,
  });

  // Follow functionality
  const {
    data: followData,
    isLoading: followLoading,
    mutate: toggleFollow
  } = useFollow(pubkey);

  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const isOwnProfile = currentUser?.pubkey === pubkey;
  const isFollowing = followData?.isFollowing;

  const displayName = getDisplayName(metadata, pubkey);
  const userName = genUserName(pubkey);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        description: `${field} copied to clipboard!`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        variant: 'destructive',
        description: 'Failed to copy to clipboard',
      });
    }
  }, [toast]);

  const handleZap = useCallback(() => {
    toast({
      description: 'Zap functionality coming soon!',
    });
  }, [toast]);

  if (author.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <ProfileSkeleton />
      </div>
    );
  }

  if (author.error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-red-500/20">
          <CardContent className="py-8 text-center">
            <Ghost className="h-12 w-12 text-red-500/60 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">Profile Not Found</h2>
            <p className="text-red-500/60">
              Unable to load profile data. The user might not exist or relays may be unavailable.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Header */}
      <Card className="mb-6 bg-black/40 border-lime-500/20">
        {/* Banner */}
        {metadata?.banner && (
          <div className="h-48 overflow-hidden rounded-t-lg">
            <img
              src={metadata.banner}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <Avatar className="h-24 w-24 mb-4 ring-2 ring-lime-500/20">
                <AvatarImage src={metadata?.picture} alt={displayName} />
                <AvatarFallback className="text-xl font-bold bg-lime-500/20 text-lime-400">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <h1 className="text-2xl font-bold text-lime-100 mb-1">
                {displayName}
              </h1>

              {metadata?.display_name && metadata.display_name !== metadata.name && (
                <p className="text-lg text-lime-300 mb-2">
                  {metadata.display_name}
                </p>
              )}

              <p className="text-sm text-lime-500/60 font-mono mb-4">
                @{userName}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {isOwnProfile ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {isEditingProfile ? 'View Profile' : 'Edit Profile'}
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className={cn(
                        "transition-colors",
                        isFollowing
                          ? "bg-lime-500/20 hover:bg-red-500/20 text-lime-400 hover:text-red-400 border border-lime-500/30 hover:border-red-500/30"
                          : "bg-lime-500 hover:bg-lime-400 text-black"
                      )}
                      onClick={() => toggleFollow()}
                      disabled={followLoading}
                    >
                      {followLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : isFollowing ? (
                        <UserMinus className="h-4 w-4 mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
                      onClick={handleZap}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Zap
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="flex-1 space-y-4">
              {/* About */}
              {metadata?.about && (
                <div>
                  <h3 className="text-sm font-semibold text-lime-400 mb-2">About</h3>
                  <p className="text-sm text-lime-100 leading-relaxed whitespace-pre-wrap">
                    {metadata.about}
                  </p>
                </div>
              )}

              {/* Profile Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Website */}
                {metadata?.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon className="h-4 w-4 text-lime-500/60" />
                    <a
                      href={metadata.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lime-400 hover:text-lime-300 transition-colors truncate"
                    >
                      {metadata.website.replace(/^https?:\/\//, '')}
                    </a>
                    <ExternalLink className="h-3 w-3 text-lime-500/40" />
                  </div>
                )}

                {/* NIP-05 */}
                {metadata?.nip05 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="bg-lime-500/10 text-lime-400 border-lime-500/30">
                      <User className="h-3 w-3 mr-1" />
                      NIP-05
                    </Badge>
                    <span className="text-lime-100 truncate">{metadata.nip05}</span>
                  </div>
                )}

                {/* Lightning Address */}
                {(metadata?.lud06 || metadata?.lud16) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4 text-lime-500/60" />
                    <span className="text-lime-100 truncate">
                      {metadata.lud16 || metadata.lud06}
                    </span>
                  </div>
                )}

                {/* Bot Badge */}
                {metadata?.bot && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                      🤖 Bot Account
                    </Badge>
                  </div>
                )}
              </div>

              {/* Copy Pubkey */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-lime-500/60 hover:text-lime-400 hover:bg-lime-500/10 text-xs h-8"
                  onClick={() => handleCopy(pubkey, 'Public Key')}
                >
                  {copiedField === 'Public Key' ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy Public Key
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form (only for own profile) */}
      {isOwnProfile && isEditingProfile && (
        <Card className="mb-6 bg-black/40 border-lime-500/20">
          <CardHeader>
            <h2 className="text-xl font-semibold text-lime-400">Edit Profile</h2>
          </CardHeader>
          <CardContent>
            <EditProfileForm />
          </CardContent>
        </Card>
      )}

      {/* Profile Content Tabs */}
      {!isEditingProfile && (
        <Card className="bg-black/40 border-lime-500/20">
          <Tabs defaultValue="posts" className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2 bg-lime-500/10">
                <TabsTrigger
                  value="posts"
                  className="data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Posts
                </TabsTrigger>
                <TabsTrigger
                  value="about"
                  className="data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-300"
                >
                  <User className="h-4 w-4 mr-2" />
                  About
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="posts" className="space-y-4 mt-0">
                {postsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <PostSkeleton key={i} />
                    ))}
                  </div>
                ) : userPosts && userPosts.length > 0 ? (
                  <div className="space-y-4">
                    {userPosts.map((post) => (
                      <ParanormalPost key={post.id} event={post} />
                    ))}

                    {userPosts.length === 50 && (
                      <div className="text-center pt-4">
                        <p className="text-sm text-lime-500/60">
                          Showing recent 50 posts
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Ghost className="h-12 w-12 text-lime-500/40 mx-auto mb-4" />
                    <p className="text-lime-500/60 mb-2">No posts yet</p>
                    <p className="text-sm text-lime-500/40">
                      {isOwnProfile
                        ? "Share your first paranormal experience!"
                        : "This user hasn't shared any posts yet."
                      }
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="about" className="mt-0">
                <div className="space-y-6">
                  {/* Extended Profile Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-lime-400 border-b border-lime-500/20 pb-2">
                        Basic Information
                      </h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-lime-500/60">Display Name</span>
                          <span className="text-sm text-lime-100">
                            {metadata?.display_name || metadata?.name || 'Not set'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-lime-500/60">Username</span>
                          <span className="text-sm text-lime-100 font-mono">
                            @{userName}
                          </span>
                        </div>

                        {metadata?.nip05 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-lime-500/60">NIP-05</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-lime-500/10 text-lime-400 border-lime-500/30">
                                Verified
                              </Badge>
                              <span className="text-sm text-lime-100">{metadata.nip05}</span>
                            </div>
                          </div>
                        )}

                        {metadata?.bot && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-lime-500/60">Account Type</span>
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                              🤖 Bot Account
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact & Links */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-lime-400 border-b border-lime-500/20 pb-2">
                        Contact & Links
                      </h3>

                      <div className="space-y-3">
                        {metadata?.website && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-lime-500/60">Website</span>
                            <a
                              href={metadata.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-lime-400 hover:text-lime-300 transition-colors"
                            >
                              <span className="truncate max-w-48">
                                {metadata.website.replace(/^https?:\/\//, '')}
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {(metadata?.lud06 || metadata?.lud16) && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-lime-500/60">Lightning</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-lime-100 truncate max-w-48">
                                {metadata.lud16 || metadata.lud06}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-lime-500/60 hover:text-lime-400"
                                onClick={() => handleCopy(metadata.lud16 || metadata.lud06 || '', 'Lightning Address')}
                              >
                                {copiedField === 'Lightning Address' ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Nostr Identifiers */}
                        <div className="pt-2 border-t border-lime-500/10">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-lime-500/60">npub</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-lime-100 font-mono bg-lime-500/10 px-2 py-1 rounded">
                                  {nip19.npubEncode(pubkey).slice(0, 20)}...
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-lime-500/60 hover:text-lime-400"
                                  onClick={() => handleCopy(nip19.npubEncode(pubkey), 'npub')}
                                >
                                  {copiedField === 'npub' ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-lime-500/60">hex</span>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-lime-100 font-mono bg-lime-500/10 px-2 py-1 rounded">
                                  {pubkey.slice(0, 16)}...
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-lime-500/60 hover:text-lime-400"
                                  onClick={() => handleCopy(pubkey, 'Hex Pubkey')}
                                >
                                  {copiedField === 'Hex Pubkey' ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full About Section */}
                  {metadata?.about && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-lime-400 mb-4">About</h3>
                      <div className="prose prose-invert prose-lime max-w-none">
                        <p className="text-lime-100 leading-relaxed whitespace-pre-wrap">
                          {metadata.about}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}

// Skeleton component for loading state
function ProfileSkeleton() {
  return (
    <>
      <Card className="mb-6 bg-black/40 border-lime-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Post skeleton component
function PostSkeleton() {
  return (
    <Card className="bg-lime-500/5 border-lime-500/20">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}