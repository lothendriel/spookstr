import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { NoteContent } from '@/components/NoteContent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCommunity } from '@/hooks/useCommunity';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import {
  Shield,
  ArrowLeft,
  Check,
  X,
  Settings,
  Users,
  MessageSquare,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Save,
  Clock,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { useNostrCommunities } from '@/modules/communities/useNostrCommunities';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';

interface ModerationAction {
  id: string;
  moderator: string;
  action: 'approve' | 'deny' | 'edit' | 'add_moderator' | 'remove_moderator';
  targetId: string;
  targetType: 'post' | 'comment' | 'community' | 'user';
  timestamp: number;
  details?: string;
}

export function ModeratorPanel() {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: createEvent } = useNostrPublish();

  // Community editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    image: '',
    rules: ''
  });
  const [newModeratorNpub, setNewModeratorNpub] = useState('');

  const {
    getCommunities,
    getCommunityTopics,
    moderatePost,
    verifyUser
  } = useNostrCommunities();

  // Fetch community data
  const { data: community, isLoading: communityLoading } = useCommunity(communityId);
  const { data: communities } = getCommunities;

  // Get all topics (approved and pending) for moderation
  const { data: allTopics, isLoading: topicsLoading } = getCommunityTopics(communityId, community?.author);

  // Mock moderation log - in real implementation this would come from Nostr events
  const [moderationLog, setModerationLog] = useState<ModerationAction[]>([]);

  // Check if current user is authorized to moderate
  const isAuthorized = user && community && (
    user.pubkey === community.author ||
    community.moderators.includes(user.pubkey)
  );

  // Initialize edit form when community loads
  useEffect(() => {
    if (community) {
      setEditForm({
        name: community.name,
        description: community.description,
        image: community.image || '',
        rules: '' // Rules would come from community metadata
      });
    }
  }, [community]);

  const handleApprovePost = async (topic: any) => {
    if (!community) return;

    try {
      // Add to moderation log immediately for better UX
      const action: ModerationAction = {
        id: Date.now().toString(),
        moderator: user!.pubkey,
        action: 'approve',
        targetId: topic.id,
        targetType: 'post',
        timestamp: Date.now(),
        details: topic.title || topic.content.substring(0, 50) + '...'
      };
      setModerationLog(prev => [action, ...prev]);

      await moderatePost.mutateAsync({
        communityId: community.id,
        communityAuthor: community.author,
        postId: topic.id,
        postAuthor: topic.pubkey,
        postKind: topic.kind,
        postEvent: topic,
        action: 'approve'
      });

    } catch (error) {
      console.error('Failed to approve post:', error);
      // Remove from log if failed
      setModerationLog(prev => prev.filter(log => log.targetId !== topic.id));
    }
  };

  const handleDenyPost = async (topic: any) => {
    if (!community) return;

    try {
      // Add to moderation log immediately for better UX
      const action: ModerationAction = {
        id: Date.now().toString(),
        moderator: user!.pubkey,
        action: 'deny',
        targetId: topic.id,
        targetType: 'post',
        timestamp: Date.now(),
        details: topic.title || topic.content.substring(0, 50) + '...'
      };
      setModerationLog(prev => [action, ...prev]);

      await moderatePost.mutateAsync({
        communityId: community.id,
        communityAuthor: community.author,
        postId: topic.id,
        postAuthor: topic.pubkey,
        postKind: topic.kind,
        postEvent: topic,
        action: 'deny'
      });

    } catch (error) {
      console.error('Failed to deny post:', error);
      // Remove from log if failed
      setModerationLog(prev => prev.filter(log => log.targetId !== topic.id));
    }
  };

  const handleSaveCommunitySettings = async () => {
    if (!user || !community) return;

    try {
      // Create updated community definition event
      const tags = [
        ['d', community.id],
        ['name', editForm.name],
        ['description', editForm.description],
        ['K', '34550'],
        ['k', '34550'],
      ];

      if (editForm.image) {
        tags.push(['image', editForm.image]);
      }

      if (editForm.rules) {
        tags.push(['rules', editForm.rules]);
      }

      // Add moderators
      community.moderators.forEach(moderator => {
        tags.push(['p', moderator, '', 'moderator']);
      });

      createEvent({
        kind: 34550,
        content: '',
        tags
      });

      setIsEditing(false);

      toast({
        title: 'Community updated',
        description: 'Community settings have been saved successfully.',
      });

      // Add to moderation log
      const action: ModerationAction = {
        id: Date.now().toString(),
        moderator: user.pubkey,
        action: 'edit',
        targetId: community.id,
        targetType: 'community',
        timestamp: Date.now(),
        details: 'Updated community settings'
      };
      setModerationLog(prev => [action, ...prev]);

    } catch (error) {
      toast({
        title: 'Failed to update',
        description: 'Could not save community settings. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddModerator = async () => {
    if (!user || !community || !newModeratorNpub.trim()) return;

    try {
      let pubkey: string;

      if (newModeratorNpub.startsWith('npub1')) {
        const decoded = nip19.decode(newModeratorNpub);
        if (decoded.type !== 'npub') {
          throw new Error('Invalid npub format');
        }
        pubkey = decoded.data;
      } else {
        pubkey = newModeratorNpub;
      }

      // Verify the user exists and has NIP-05
      const { data: isVerified } = await verifyUser(pubkey);
      if (!isVerified) {
        toast({
          title: 'User not verified',
          description: 'The user must have NIP-05 verification to become a moderator.',
          variant: 'destructive',
        });
        return;
      }

      const updatedModerators = [...community.moderators, pubkey];

      // Create updated community definition with new moderator
      const tags = [
        ['d', community.id],
        ['name', community.name],
        ['description', community.description],
        ['K', '34550'],
        ['k', '34550'],
      ];

      if (community.image) {
        tags.push(['image', community.image]);
      }

      // Add all moderators
      updatedModerators.forEach(moderator => {
        tags.push(['p', moderator, '', 'moderator']);
      });

      createEvent({
        kind: 34550,
        content: '',
        tags
      });

      setNewModeratorNpub('');

      toast({
        title: 'Moderator added',
        description: 'New moderator has been added successfully.',
      });

      // Add to moderation log
      const action: ModerationAction = {
        id: Date.now().toString(),
        moderator: user.pubkey,
        action: 'add_moderator',
        targetId: pubkey,
        targetType: 'user',
        timestamp: Date.now(),
        details: getDisplayName({}, pubkey)
      };
      setModerationLog(prev => [action, ...prev]);

    } catch (error) {
      toast({
        title: 'Failed to add moderator',
        description: 'Could not add moderator. Please check the npub and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveModerator = async (moderatorPubkey: string) => {
    if (!user || !community || moderatorPubkey === community.author) return;

    try {
      const updatedModerators = community.moderators.filter(m => m !== moderatorPubkey);

      // Create updated community definition without this moderator
      const tags = [
        ['d', community.id],
        ['name', community.name],
        ['description', community.description],
        ['K', '34550'],
        ['k', '34550'],
      ];

      if (community.image) {
        tags.push(['image', community.image]);
      }

      // Add remaining moderators
      updatedModerators.forEach(moderator => {
        tags.push(['p', moderator, '', 'moderator']);
      });

      createEvent({
        kind: 34550,
        content: '',
        tags
      });

      toast({
        title: 'Moderator removed',
        description: 'Moderator has been removed successfully.',
      });

      // Add to moderation log
      const action: ModerationAction = {
        id: Date.now().toString(),
        moderator: user.pubkey,
        action: 'remove_moderator',
        targetId: moderatorPubkey,
        targetType: 'user',
        timestamp: Date.now(),
        details: getDisplayName({}, moderatorPubkey)
      };
      setModerationLog(prev => [action, ...prev]);

    } catch (error) {
      toast({
        title: 'Failed to remove moderator',
        description: 'Could not remove moderator. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="py-12">
                <h1 className="text-2xl font-bold mb-4 text-purple-400">Login Required</h1>
                <p className="text-purple-300 mb-6">Please log in to access moderation tools.</p>
                <Button onClick={() => navigate('/')} variant="outline">
                  Back to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (communityLoading || topicsLoading) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-6xl mx-auto">
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

  if (!community || !isAuthorized) {
    return (
      <div className="min-h-screen">
        <SpookstrHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="border-red-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="py-12">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4 text-red-400">Access Denied</h1>
                <p className="text-red-300 mb-6">
                  You are not authorized to moderate this community. Only the community creator and appointed moderators can access this panel.
                </p>
                <div className="space-x-3">
                  <Button onClick={() => navigate(`/community/${communityId}`)} variant="outline">
                    Back to Community
                  </Button>
                  <Button onClick={() => navigate('/communities')} variant="outline">
                    Browse Communities
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Separate topics into approved and pending
  const pendingTopics = allTopics?.filter(topic => !topic.approved) || [];
  const approvedTopics = allTopics?.filter(topic => topic.approved) || [];

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/community/${communityId}`)}
                className="text-lime-400 hover:text-lime-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Community
              </Button>
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-lime-400" />
                <div>
                  <h1 className="text-2xl font-bold text-lime-400">Moderator Panel</h1>
                  <p className="text-lime-300">{community.name}</p>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="border-lime-500/50 text-lime-400">
              {user.pubkey === community.author ? 'Creator' : 'Moderator'}
            </Badge>
          </div>

          {/* Moderation Tabs */}
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className="bg-black/40 border border-lime-500/20">
              <TabsTrigger value="posts" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                <MessageSquare className="h-4 w-4 mr-2" />
                Posts ({pendingTopics.length} pending)
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="moderators" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                <Users className="h-4 w-4 mr-2" />
                Moderators ({community.moderators.length})
              </TabsTrigger>
              <TabsTrigger value="log" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                <Clock className="h-4 w-4 mr-2" />
                Activity Log
              </TabsTrigger>
            </TabsList>

            {/* Posts Moderation */}
            <TabsContent value="posts" className="space-y-6">
              {/* Pending Posts */}
              <Card className="border-yellow-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-yellow-300 flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Pending Approval ({pendingTopics.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingTopics.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-yellow-500/40 mx-auto mb-3" />
                      <p className="text-yellow-300">No posts pending approval</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingTopics.map((topic) => (
                        <PostModerationCard
                          key={topic.id}
                          topic={topic}
                          onApprove={() => handleApprovePost(topic)}
                          onDeny={() => handleDenyPost(topic)}
                          isProcessing={moderatePost.isPending}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approved Posts */}
              <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lime-300 flex items-center space-x-2">
                    <Check className="h-5 w-5" />
                    <span>Approved Posts ({approvedTopics.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {approvedTopics.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-lime-500/40 mx-auto mb-3" />
                      <p className="text-lime-300">No approved posts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {approvedTopics.slice(0, 10).map((topic) => (
                        <ApprovedPostCard key={topic.id} topic={topic} />
                      ))}
                      {approvedTopics.length > 10 && (
                        <div className="text-center text-lime-500/60">
                          ... and {approvedTopics.length - 10} more approved posts
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Community Settings */}
            <TabsContent value="settings" className="space-y-6">
              <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lime-300">Community Settings</CardTitle>
                    <div className="space-x-2">
                      {isEditing ? (
                        <>
                          <Button
                            onClick={handleSaveCommunitySettings}
                            className="bg-lime-500 hover:bg-lime-400 text-black"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setEditForm({
                                name: community.name,
                                description: community.description,
                                image: community.image || '',
                                rules: ''
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          className="border-lime-500/50 text-lime-300"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Settings
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-lime-300">Community Name</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-black/20 border-lime-500/30 text-lime-100"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-lime-300">Description</Label>
                        <Textarea
                          id="description"
                          value={editForm.description}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-black/20 border-lime-500/30 text-lime-100 min-h-[100px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="image" className="text-lime-300">Banner Image URL</Label>
                        <Input
                          id="image"
                          value={editForm.image}
                          onChange={(e) => setEditForm(prev => ({ ...prev, image: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-black/20 border-lime-500/30 text-lime-100"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="rules" className="text-lime-300">Community Rules</Label>
                        <Textarea
                          id="rules"
                          value={editForm.rules}
                          onChange={(e) => setEditForm(prev => ({ ...prev, rules: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-black/20 border-lime-500/30 text-lime-100 min-h-[150px]"
                          placeholder="1. Be respectful to other members&#10;2. Stay on topic&#10;3. No spam or self-promotion&#10;..."
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Moderators Management */}
            <TabsContent value="moderators" className="space-y-6">
              <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lime-300">Moderator Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add New Moderator */}
                  <div className="space-y-3">
                    <Label htmlFor="newModerator" className="text-lime-300">Add New Moderator</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="newModerator"
                        placeholder="npub1... or hex pubkey"
                        value={newModeratorNpub}
                        onChange={(e) => setNewModeratorNpub(e.target.value)}
                        className="bg-black/20 border-lime-500/30 text-lime-100"
                      />
                      <Button
                        onClick={handleAddModerator}
                        disabled={!newModeratorNpub.trim()}
                        className="bg-lime-500 hover:bg-lime-400 text-black"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-lime-500/60">
                      New moderators must have NIP-05 verification to be added.
                    </p>
                  </div>

                  {/* Current Moderators */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-lime-300">Current Moderators</h3>
                    <div className="space-y-3">
                      {/* Community Creator */}
                      <ModeratorCard
                        pubkey={community.author}
                        isCreator={true}
                        onRemove={() => {}}
                        canRemove={false}
                      />

                      {/* Other Moderators */}
                      {community.moderators
                        .filter(mod => mod !== community.author)
                        .map((moderator) => (
                          <ModeratorCard
                            key={moderator}
                            pubkey={moderator}
                            isCreator={false}
                            onRemove={() => handleRemoveModerator(moderator)}
                            canRemove={user.pubkey === community.author}
                          />
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Log */}
            <TabsContent value="log" className="space-y-6">
              <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lime-300">Moderation Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {moderationLog.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-lime-500/40 mx-auto mb-3" />
                      <p className="text-lime-300">No moderation actions recorded</p>
                      <p className="text-lime-500/60 text-sm">Actions will appear here as you moderate content</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {moderationLog.map((action) => (
                        <LogEntryCard key={action.id} action={action} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// Supporting Components

interface PostModerationCardProps {
  topic: any;
  onApprove: () => void;
  onDeny: () => void;
  isProcessing: boolean;
}

function PostModerationCard({ topic, onApprove, onDeny, isProcessing }: PostModerationCardProps) {
  const author = useAuthor(topic.pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, topic.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card className={`border-yellow-500/20 backdrop-blur-sm transition-all duration-300 ${isProcessing ? 'bg-yellow-500/10 opacity-75' : 'bg-yellow-500/5'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-yellow-200">{displayName}</span>
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                  {isProcessing ? 'Processing...' : 'Pending'}
                </Badge>
              </div>
              <div className="text-xs text-yellow-500/80">
                {new Date(topic.created_at * 1000).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className={`bg-green-600 hover:bg-green-500 text-white transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-3 w-3 mr-1 border-2 border-white border-t-transparent rounded-full" />
                  Processing
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDeny}
              disabled={isProcessing}
              className={`border-red-500/50 text-red-400 hover:bg-red-500/20 transition-all ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin h-3 w-3 mr-1 border-2 border-red-400 border-t-transparent rounded-full" />
                  Processing
                </>
              ) : (
                <>
                  <X className="h-3 w-3 mr-1" />
                  Deny
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {topic.title && (
          <h3 className="font-semibold text-yellow-100 mb-2">{topic.title}</h3>
        )}
        <div className={`whitespace-pre-wrap break-words text-sm line-clamp-4 ${isProcessing ? 'text-yellow-100/60' : 'text-yellow-100/90'}`}>
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
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface ApprovedPostCardProps {
  topic: any;
}

function ApprovedPostCard({ topic }: ApprovedPostCardProps) {
  const author = useAuthor(topic.pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, topic.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card className="border-lime-500/10 bg-lime-500/5 backdrop-blur-sm">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-lime-200 truncate">{displayName}</span>
                <Badge variant="outline" className="border-lime-500/50 text-lime-400 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              </div>
              <div className="text-xs text-lime-500/60">
                {topic.title || topic.content.substring(0, 50) + (topic.content.length > 50 ? '...' : '')}
              </div>
            </div>
          </div>
          <div className="text-xs text-lime-500/60">
            {topic.approvalCount} 👍
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModeratorCardProps {
  pubkey: string;
  isCreator: boolean;
  onRemove: () => void;
  canRemove: boolean;
}

function ModeratorCard({ pubkey, isCreator, onRemove, canRemove }: ModeratorCardProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card className="border-lime-500/20 bg-black/20 backdrop-blur-sm">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-lime-200">{displayName}</span>
                <Badge variant={isCreator ? "default" : "secondary"} className={isCreator ? "bg-lime-500 text-black" : ""}>
                  {isCreator ? 'Creator' : 'Moderator'}
                </Badge>
              </div>
              <div className="text-xs text-lime-500/60 font-mono">
                {pubkey.substring(0, 16)}...
              </div>
            </div>
          </div>
          {!isCreator && canRemove && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              <UserX className="h-3 w-3 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LogEntryCardProps {
  action: ModerationAction;
}

function LogEntryCard({ action }: LogEntryCardProps) {
  const moderator = useAuthor(action.moderator);
  const moderatorMetadata = moderator.data?.metadata;
  const moderatorName = getDisplayName(moderatorMetadata, action.moderator);

  const getActionIcon = () => {
    switch (action.action) {
      case 'approve':
        return <Check className="h-4 w-4 text-green-400" />;
      case 'deny':
        return <X className="h-4 w-4 text-red-400" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-blue-400" />;
      case 'add_moderator':
        return <UserCheck className="h-4 w-4 text-lime-400" />;
      case 'remove_moderator':
        return <UserX className="h-4 w-4 text-orange-400" />;
      default:
        return <Eye className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActionText = () => {
    switch (action.action) {
      case 'approve':
        return 'Approved post';
      case 'deny':
        return 'Denied post';
      case 'edit':
        return 'Updated community settings';
      case 'add_moderator':
        return 'Added moderator';
      case 'remove_moderator':
        return 'Removed moderator';
      default:
        return 'Unknown action';
    }
  };

  return (
    <Card className="border-lime-500/10 bg-black/20 backdrop-blur-sm">
      <CardContent className="py-3">
        <div className="flex items-center space-x-3">
          {getActionIcon()}
          <div className="flex-1">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-lime-200">{moderatorName}</span>
              <span className="text-lime-500/60">{getActionText()}</span>
              {action.details && (
                <span className="text-lime-400">"{action.details}"</span>
              )}
            </div>
            <div className="text-xs text-lime-500/60">
              {new Date(action.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}