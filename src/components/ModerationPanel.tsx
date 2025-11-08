import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { usePendingPosts, useApprovedPosts, useModerationActions } from '@/hooks/useCommunityModeration';
import { useModerationPersistence } from '@/hooks/useModerationPersistence';
import { debugModerationLocalStorage, debugLocalStorageAvailability, debugPendingPostsFiltering } from '@/hooks/useModerationDebug';
import { useCommunity, CommunityDefinition } from '@/hooks/useCommunity';
import { Shield, CheckCircle, XCircle, MessageSquare, Clock, Eye, Bug } from 'lucide-react';
import { NostrEvent } from '@nostrify/nostrify';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface ModerationPanelProps {
  communityId: string;
}

export function ModerationPanel({ communityId }: ModerationPanelProps) {
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);

  // Show loading state while fetching community data
  if (communityLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-purple-400">Loading moderation panel...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show error if community not found
  if (!community) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
            <Card className="border-red-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="py-12">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-red-400 mb-4">Community Not Found</h1>
                  <p className="text-red-300">The community you're trying to moderate doesn't exist.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: pendingPosts, isLoading: loadingPending, refetch: refetchPending } = usePendingPosts(community.id, community.author);
  const { data: approvedPosts, isLoading: loadingApproved, refetch: refetchApproved } = useApprovedPosts(community.id, community.author);
  const { data: moderationActions, refetch: refetchActions } = useModerationActions(community.id, community.author);
  const { mutateAsync: createEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();
  const {
    saveModerationDecision,
    applyOptimisticUpdates,
    invalidateModerationQueries,
    cleanupOldModerationDecisions
  } = useModerationPersistence();

  // Clean up old local moderation decisions on component mount
  useEffect(() => {
    const cleanedCount = cleanupOldModerationDecisions(7); // Clean up decisions older than 7 days
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old moderation decisions on component mount`);
    }
  }, [cleanupOldModerationDecisions]);

  // Debug: Log current localStorage state for this community
  useEffect(() => {
    if (!community) return;

    console.log(`🔍 Debug: Checking localStorage for community ${community.id}`);
    const moderationKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`moderation-${community.id}-`)) {
        moderationKeys.push(key);
        console.log(`📱 Found moderation key: ${key}`);
        console.log(`   Value: ${localStorage.getItem(key)}`);
      }
    }
    console.log(`📱 Total moderation keys found: ${moderationKeys.length}`);
  }, [community?.id]);

  const [selectedPost, setSelectedPost] = useState<NostrEvent | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'deny' | null>(null);

  const isOwner = user?.pubkey === community.author;
  const isModerator = isOwner || community.moderators.includes(user?.pubkey || '');

  if (!isModerator) {
    return (
      <Card className="border-red-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-red-500/60 mx-auto mb-4" />
          <p className="text-red-400">You don't have permission to moderate this community.</p>
        </CardContent>
      </Card>
    );
  }

  const handleApprove = (event: NostrEvent) => {
    setSelectedPost(event);
    setActionType('approve');
  };

  const handleDeny = (event: NostrEvent) => {
    setSelectedPost(event);
    setActionType('deny');
  };

  const confirmAction = async () => {
    if (!selectedPost || !actionType || !user) return;

    console.log(`🚀 Starting ${actionType} action for post:`, selectedPost.id.slice(0, 8) + '...');
    console.log(`👤 Moderator: ${user.pubkey.slice(0, 8)}...`);
    console.log(`🏠 Community: ${community.id}`);

    const communityTag = `34550:${community.author}:${community.id}`;
    const postKindTag = selectedPost.tags.find(tag => tag[0] === 'k')?.[1] || '1111';

    try {
      // Create moderation decision object for local persistence
      const moderationDecision = {
        action: actionType,
        eventId: selectedPost.id,
        eventPubkey: selectedPost.pubkey,
        moderator: user.pubkey,
        timestamp: Math.floor(Date.now() / 1000),
        communityId: community.id,
        communityAuthor: community.author
      };

      console.log(`📋 Created moderation decision:`, moderationDecision);

      // Save to localStorage first for immediate persistence
      console.log(`💾 Saving to localStorage...`);
      saveModerationDecision(moderationDecision);

      // Verify it was saved
      const savedKey = `moderation-${community.id}-${selectedPost.id}`;
      const savedValue = localStorage.getItem(savedKey);
      console.log(`✅ Verification - saved value exists: ${!!savedValue}`);
      if (savedValue) {
        console.log(`✅ Verification - saved value: ${savedValue}`);
      }

      // Apply optimistic updates to the UI
      console.log(`⚡ Applying optimistic updates...`);
      applyOptimisticUpdates(moderationDecision, selectedPost);

      if (actionType === 'approve') {
        console.log('🔐 Creating approval event for:', selectedPost.id);

        // Enhanced approval event with better metadata for persistence
        const approvalMetadata = {
          approvedEvent: {
            id: selectedPost.id,
            pubkey: selectedPost.pubkey,
            kind: selectedPost.kind,
            created_at: selectedPost.created_at,
            content: selectedPost.content,
            tags: selectedPost.tags
          },
          moderation: {
            action: 'approve',
            moderator: user.pubkey,
            timestamp: moderationDecision.timestamp,
            communityId: community.id,
            communityAuthor: community.author,
            reason: 'Approved by moderator'
          }
        };

        // Create approval event (kind 4550) according to NIP-72 with enhanced metadata
        await createEvent({
          event: {
            kind: 4550,
            content: JSON.stringify(approvalMetadata),
            tags: [
              ['a', communityTag],
              ['e', selectedPost.id],
              ['p', selectedPost.pubkey],
              ['k', postKindTag],
              ['moderator', user.pubkey],
              ['action', 'approve'],
              ['timestamp', moderationDecision.timestamp.toString()]
            ],
            created_at: moderationDecision.timestamp
          }
        });

        console.log('✅ Approval event created successfully');

        toast({
          title: 'Post Approved',
          description: 'The post has been approved and is now visible to the community.',
        });
      } else {
        console.log('❌ Creating denial event for:', selectedPost.id);

        // Enhanced denial event with better metadata for persistence
        const denialMetadata = {
          deniedEvent: {
            id: selectedPost.id,
            pubkey: selectedPost.pubkey,
            kind: selectedPost.kind,
            created_at: selectedPost.created_at,
            content: selectedPost.content,
            tags: selectedPost.tags
          },
          moderation: {
            action: 'deny',
            moderator: user.pubkey,
            timestamp: moderationDecision.timestamp,
            communityId: community.id,
            communityAuthor: community.author,
            reason: 'Denied by moderator'
          }
        };

        // Create denial event (kind 4551) with enhanced metadata
        await createEvent({
          event: {
            kind: 4551,
            content: JSON.stringify(denialMetadata),
            tags: [
              ['a', communityTag],
              ['e', selectedPost.id],
              ['p', selectedPost.pubkey],
              ['k', postKindTag],
              ['moderator', user.pubkey],
              ['action', 'deny'],
              ['timestamp', moderationDecision.timestamp.toString()]
            ],
            created_at: moderationDecision.timestamp
          }
        });

        console.log('❌ Denial event created successfully');

        toast({
          title: 'Post Denied',
          description: 'The post has been denied and removed from the community.',
        });
      }

      // Trigger background refresh to sync with remote events
      setTimeout(async () => {
        console.log('🔄 Triggering background refresh for all moderation data...');

        await invalidateModerationQueries(community.id, community.author);
        await Promise.all([refetchPending(), refetchApproved(), refetchActions()]);

        console.log('🔄 Background refresh completed');
      }, 2000); // Reduced to 2 seconds since we have local persistence

      setSelectedPost(null);
      setActionType(null);
    } catch (error) {
      console.error(`❌ ${actionType} failed:`, error);
      console.error('Error details:', error.message, error.stack);
      toast({
        title: `${actionType === 'approve' ? 'Approval' : 'Denial'} Failed`,
        description: `Failed to ${actionType} post. Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const cancelAction = () => {
    setSelectedPost(null);
    setActionType(null);
  };

  return (
    <>
      <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-purple-400 flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Moderation Panel</span>
            {!isOwner && (
              <Badge variant="secondary">Moderator</Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Debug Section */}
          <div className="mb-4 p-3 border border-yellow-500/30 rounded-lg bg-yellow-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Bug className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-600">Debug Tools</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => debugLocalStorageAvailability()}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/20"
                >
                  Test Storage
                </Button>
                <Button
                  onClick={() => debugModerationLocalStorage()}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/20"
                >
                  Show Moderation Data
                </Button>
                <Button
                  onClick={() => {
                    if (pendingPosts) {
                      debugPendingPostsFiltering(pendingPosts.map(p => p.event), community.id, community.author);
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/20"
                >
                  Debug Filtering
                </Button>
              </div>
            </div>
            <p className="text-xs text-yellow-600/80">
              Use these tools to debug moderation persistence issues. Check browser console for detailed output.
            </p>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/40">
              <TabsTrigger value="pending" className="data-[state=active]:bg-purple-500/20">
                <Clock className="h-4 w-4 mr-2" />
                Pending ({pendingPosts?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="approved" className="data-[state=active]:bg-green-500/20">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approved ({approvedPosts?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-3">
              {loadingPending ? (
                <LoadingSkeleton />
              ) : pendingPosts && pendingPosts.length > 0 ? (
                pendingPosts.map(({ event, isReply }) => (
                  <ModerationPostCard
                    key={event.id}
                    event={event}
                    isReply={isReply}
                    onApprove={() => handleApprove(event)}
                    onDeny={() => handleDeny(event)}
                    isProcessing={isPublishing}
                    status="pending"
                  />
                ))
              ) : (
                <div className="text-center py-12 text-purple-400/60">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending posts to moderate</p>
                  <p className="text-sm mt-1">All caught up!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4 space-y-3">
              {loadingApproved ? (
                <LoadingSkeleton />
              ) : approvedPosts && approvedPosts.length > 0 ? (
                approvedPosts.map(({ event, isReply }) => (
                  <ModerationPostCard
                    key={event.id}
                    event={event}
                    isReply={isReply}
                    status="approved"
                  />
                ))
              ) : (
                <div className="text-center py-12 text-purple-400/60">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No approved posts yet</p>
                  <p className="text-sm mt-1">Approve posts from the pending tab</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedPost && !!actionType} onOpenChange={cancelAction}>
        <AlertDialogContent className="bg-black/95 border-purple-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-purple-300">
              {actionType === 'approve' ? 'Approve Post?' : 'Deny Post?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-purple-400/80">
              {actionType === 'approve'
                ? 'This will make the post visible to all community members.'
                : 'This will keep the post hidden from the community. It will remain in the pending queue.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-purple-500/30">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isPublishing}
              className={actionType === 'approve'
                ? 'bg-green-500 hover:bg-green-400 text-black'
                : 'bg-red-500 hover:bg-red-400 text-black'}
            >
              {isPublishing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Deny'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface ModerationPostCardProps {
  event: NostrEvent;
  isReply: boolean;
  onApprove?: () => void;
  onDeny?: () => void;
  isProcessing?: boolean;
  status: 'pending' | 'approved';
}

function ModerationPostCard({ event, isReply, onApprove, onDeny, isProcessing, status }: ModerationPostCardProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  return (
    <Card className="border-purple-500/20 bg-black/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Author Info */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profileImage} alt={displayName} />
                <AvatarFallback className="text-xs bg-purple-500/20">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-sm text-purple-200">
                  {displayName}
                </div>
                <div className="text-xs text-purple-500/60 flex items-center gap-2">
                  <span>{timeAgo}</span>
                  {isReply && (
                    <>
                      <span>•</span>
                      <MessageSquare className="h-3 w-3" />
                      <span>Reply</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Badge
              variant={status === 'approved' ? 'default' : 'secondary'}
              className={status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
            >
              {status === 'approved' ? 'Approved' : 'Pending'}
            </Badge>
          </div>

          {/* Post Content */}
          <div className="pl-13 space-y-2">
            <div className="text-sm text-purple-100 whitespace-pre-wrap break-words">
              <NoteContent event={event} />
            </div>

            {/* Action Buttons (only for pending) */}
            {status === 'pending' && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={onApprove}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-green-500 hover:bg-green-400 text-black font-semibold"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={onDeny}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Deny
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-purple-500/20 bg-black/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-16 w-full mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
