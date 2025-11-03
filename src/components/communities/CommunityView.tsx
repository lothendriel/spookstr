import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCommunity, CommunityDefinition } from '@/hooks/useCommunity';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { MessageCircle, ArrowLeft, Send, Clock, Users, Zap } from 'lucide-react';
import { useNostrCommunities } from '@/modules/communities/useNostrCommunities';
import { useToast } from '@/hooks/useToast';

export function CommunityView() {
  const { communityId, topicId } = useParams<{ communityId: string; topicId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const {
    getCommunityTopics,
    getTopicComments,
    verifyUser,
    publishComment
  } = useNostrCommunities();

  // Fetch community definition using existing hook
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);

  // Get all topics to find the specific topic
  const { data: topics, isLoading: topicsLoading } = getCommunityTopics(communityId, community?.author);

  // Find the specific topic
  const topic = topics?.find(t => t.id === topicId);

  // Get comments for this topic
  const { data: comments, isLoading: commentsLoading } = getTopicComments(topicId);

  // Check NIP-05 verification
  const { data: isNIP05Verified } = verifyUser(user?.pubkey || '');

  const handlePublishComment = async (parentId: string = topicId!, content: string) => {
    if (!user || !community || !topic) {
      toast({
        title: 'Error',
        description: 'Unable to publish comment. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    if (!isNIP05Verified) {
      toast({
        title: 'Verification Required',
        description: 'Please verify your NIP-05 identifier to participate in discussions.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await publishComment.mutateAsync({
        topicId: topic.id,
        topicAuthor: topic.pubkey,
        communityId: community.id,
        communityAuthor: community.author,
        content,
        parentEventId: parentId === topicId ? undefined : parentId
      });

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to publish comment:', error);
    }
  };

  const renderComment = (comment: any, depth: number = 0) => {
    const author = useAuthor(comment.pubkey);
    const metadata = author.data?.metadata;
    const displayName = getDisplayName(metadata, comment.pubkey);
    const profileImage = metadata?.picture;

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-6 border-l border-lime-500/20 pl-4' : ''}`}>
        <Card className="border-lime-500/10 bg-black/20 backdrop-blur-sm mb-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profileImage} alt={displayName} />
                  <AvatarFallback className="text-xs">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-lime-300">{displayName}</div>
                  <div className="text-xs text-lime-500/60">
                    {new Date(comment.created_at * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
              {depth === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-lime-400 hover:text-lime-300"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="whitespace-pre-wrap break-words text-sm text-lime-100/90">
              {comment.content}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-4 space-y-3">
                <Textarea
                  placeholder="Write a reply..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-black/40 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 min-h-[80px]"
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePublishComment(comment.id, newComment)}
                    disabled={!newComment.trim() || publishComment.isPending}
                    className="bg-lime-500 hover:bg-lime-400 text-black"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {publishComment.isPending ? 'Posting...' : 'Reply'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setNewComment('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map((reply: any) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (communityLoading || topicsLoading) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-48 w-full mb-6" />
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!community || !topic) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="py-12">
                <h1 className="text-2xl font-bold mb-4 text-purple-400">Topic not found</h1>
                <p className="text-purple-300 mb-6">The topic you're looking for doesn't exist or has been removed.</p>
                <Button onClick={() => navigate(`/community/${communityId}`)} variant="outline">
                  Back to Community
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/community/${communityId}`)}
            className="mb-6 text-lime-400 hover:text-lime-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {community.name}
          </Button>

          {/* Community Header */}
          <Card className="mb-6 overflow-hidden">
            {community.image && (
              <div className="h-32 bg-gradient-to-r from-purple-900 to-indigo-900 relative">
                <img
                  src={community.image}
                  alt={community.name}
                  className="w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{community.name}</CardTitle>
                  <p className="text-muted-foreground mb-4">{community.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Created by {getDisplayName({ name: community.author }, community.author)}</span>
                    <Badge variant="secondary">{community.moderators.length} moderators</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Topic Content */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {topic.title && (
                    <CardTitle className="text-xl mb-3">{topic.title}</CardTitle>
                  )}
                  <div className="flex items-center space-x-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={useAuthor(topic.pubkey).data?.metadata?.picture} alt={getDisplayName(useAuthor(topic.pubkey).data?.metadata, topic.pubkey)} />
                      <AvatarFallback>
                        {getDisplayName(useAuthor(topic.pubkey).data?.metadata, topic.pubkey).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-lime-300">
                        {getDisplayName(useAuthor(topic.pubkey).data?.metadata, topic.pubkey)}
                      </div>
                      <div className="text-sm text-lime-500/60">
                        {new Date(topic.created_at * 1000).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                {topic.approvalCount > 0 && (
                  <Badge variant="outline" className="border-lime-500/50 text-lime-400">
                    {topic.approvalCount} 👍
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap break-words text-lime-100">
                <NoteContent
                  event={{
                    id: topic.id,
                    pubkey: topic.pubkey,
                    content: topic.content,
                    created_at: topic.created_at,
                    tags: topic.tags,
                    kind: topic.kind,
                    sig: ''
                  }}
                  className="text-base"
                />
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Discussion</span>
                <Badge variant="secondary">{comments?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Comment Form */}
              {user && isNIP05Verified && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Join the discussion..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-black/40 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 min-h-[100px]"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-lime-500/60">
                      Your comment will be posted to the community
                    </div>
                    <Button
                      onClick={() => handlePublishComment(topicId, newComment)}
                      disabled={!newComment.trim() || publishComment.isPending}
                      className="bg-lime-500 hover:bg-lime-400 text-black"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {publishComment.isPending ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              )}

              {!isNIP05Verified && user && (
                <Card className="border-yellow-500/20 bg-yellow-500/10">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        <p className="text-yellow-300 text-sm">
                          <strong>Verify to participate:</strong> Set up a NIP-05 identifier to join discussions.
                        </p>
                      </div>
                      <Button
                        onClick={() => navigate('/profile')}
                        variant="outline"
                        size="sm"
                        className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20"
                      >
                        Verify
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments List */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : comments && comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => renderComment(comment))}
                </div>
              ) : (
                <Card className="border-dashed border-lime-500/30 bg-black/20">
                  <CardContent className="py-8 text-center">
                    <MessageCircle className="h-12 w-12 text-lime-500/40 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-lime-300 mb-2">
                      No comments yet
                    </h3>
                    <p className="text-lime-500/60">
                      Be the first to share your thoughts on this topic!
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}