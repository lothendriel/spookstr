import { useState } from 'react';
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
import { usePendingPosts, useApprovedPosts } from '@/hooks/useCommunityModeration';
import { CommunityDefinition } from '@/hooks/useCommunity';
import { Shield, CheckCircle, XCircle, MessageSquare, Clock, Eye } from 'lucide-react';
import { NostrEvent } from '@nostrify/nostrify';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteContent } from '@/components/NoteContent';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface ModerationPanelProps {
  community: CommunityDefinition;
}

export function ModerationPanel({ community }: ModerationPanelProps) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: pendingPosts, isLoading: loadingPending, refetch: refetchPending } = usePendingPosts(community.id, community.author);
  const { data: approvedPosts, isLoading: loadingApproved, refetch: refetchApproved } = useApprovedPosts(community.id, community.author);
  const { mutateAsync: createEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();

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
    if (!selectedPost || !actionType) return;

    if (actionType === 'approve') {
      try {
        // Create approval event (kind 4550) according to NIP-72
        const communityTag = `34550:${community.author}:${community.id}`;
        const postKindTag = selectedPost.tags.find(tag => tag[0] === 'k')?.[1] || '1111';

        console.log('🔐 Creating approval event for:', selectedPost.id);
        console.log('📋 Approval event details:', {
          kind: 4550,
          communityTag,
          postId: selectedPost.id,
          postAuthor: selectedPost.pubkey,
          postKind: postKindTag
        });

        await createEvent({
          event: {
            kind: 4550,
            content: JSON.stringify(selectedPost), // Include the full approved event
            tags: [
              ['a', communityTag], // Community reference
              ['e', selectedPost.id], // Post being approved
              ['p', selectedPost.pubkey], // Post author (for notifications)
              ['k', postKindTag] // Original post kind
            ],
            created_at: Math.floor(Date.now() / 1000)
          }
        });

        console.log('✅ Approval event created successfully');

        toast({
          title: 'Post Approved',
          description: 'The post has been approved and is now visible to the community.',
        });

        // Invalidate queries to force refetch with fresh data
        setTimeout(async () => {
          console.log('🔄 Force invalidating and refetching moderation data...');

          // Invalidate the cache first
          await queryClient.invalidateQueries({
            queryKey: ['pending-posts', community.id, community.author]
          });
          await queryClient.invalidateQueries({
            queryKey: ['approved-posts', community.id, community.author]
          });

          // Then force refetch
          await Promise.all([refetchPending(), refetchApproved()]);
          console.log('🔄 Cache invalidation and refetch completed');
        }, 1500); // Wait 1.5 seconds for the approval to propagate

        setSelectedPost(null);
        setActionType(null);
      } catch (error) {
        console.error('❌ Approval failed:', error);
        toast({
          title: 'Approval Failed',
          description: 'Failed to approve post. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      // For deny, we just don't create an approval event
      // The post remains invisible to users who only see approved content
      toast({
        title: 'Post Denied',
        description: 'The post has been denied and will remain hidden from the community.',
      });

      // No need to wait for denial since no event is created
      await refetchPending();
      setSelectedPost(null);
      setActionType(null);
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
