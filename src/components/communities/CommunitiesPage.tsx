import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { Users, Search, Plus, Ghost, Zap, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import { useNostrCommunities } from '@/modules/communities/useNostrCommunities';

const PARANORMAL_COMMUNITIES = [
  { id: 'spookstr', name: 'Spookstr', description: 'Main paranormal community for all supernatural experiences' },
  { id: 'ghosts', name: 'Ghosts', description: 'Share your ghost stories and haunted location experiences' },
  { id: 'ufos', name: 'UFOs & Aliens', description: 'UFO sightings, alien encounters, and extraterrestrial phenomena' },
  { id: 'cryptids', name: 'Cryptids', description: 'Bigfoot, Loch Ness Monster, and other mysterious creatures' },
  { id: 'supernatural', name: 'Supernatural', description: 'General supernatural discussions and unexplained events' },
  { id: 'occult', name: 'Occult', description: 'Magic, rituals, and esoteric knowledge' },
  { id: 'haunted', name: 'Haunted Places', description: 'Discussion of haunted locations and paranormal hotspots' },
  { id: 'mysteries', name: 'Unexplained Mysteries', description: 'Conspiracy theories and unexplained phenomena' }
];

export function CommunitiesPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'mostActive' | 'trending'>('newest');

  const {
    getCommunities,
    getCommunityTopics,
    verifyUser
  } = useNostrCommunities();

  const { data: communities, isLoading: communitiesLoading } = getCommunities;

  // Get detailed info for predefined communities
  const communityDetails = PARANORMAL_COMMUNITIES.map(predefined => {
    const community = communities?.find(c => c.id === predefined.id);
    return {
      ...predefined,
      ...(community || {}),
      exists: !!community,
      author: community?.author || ''
    };
  });

  const filteredCommunities = communityDetails.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          community.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || community.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get topics for all communities to show in main feed
  const { data: allTopics, isLoading: topicsLoading } = useQuery({
    queryKey: ['all-community-topics', communities],
    queryFn: async () => {
      if (!communities || communities.length === 0) return [];

      const topicsPromises = communities.map(async (community) => {
        const { data: topics } = await getCommunityTopics(community.id, community.author);
        return topics?.map(topic => ({ ...topic, community })) || [];
      });

      const allTopics = await Promise.all(topicsPromises);
      return allTopics.flat().sort((a, b) => {
        switch (sortBy) {
          case 'mostActive':
            return (b.approvalCount || 0) - (a.approvalCount || 0);
          case 'trending':
            // Simple trending logic: newer posts with more approvals
            const aScore = a.approvalCount * 1000 + a.created_at;
            const bScore = b.approvalCount * 1000 + b.created_at;
            return bScore - aScore;
          case 'newest':
          default:
            return b.created_at - a.created_at;
        }
      }).slice(0, 50); // Limit to 50 topics for performance
    },
    enabled: !!communities && communities.length > 0,
    refetchInterval: 30000
  });

  const handleCreateCommunity = () => {
    navigate('/create-community');
  };

  const handleTopicClick = (communityId: string, topicId: string) => {
    navigate(`/community/${communityId}/topic/${topicId}`);
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
                <p className="text-purple-300 mb-6">Please log in to access the Communities section.</p>
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

  // Check NIP-05 verification
  const { data: isNIP05Verified } = verifyUser(user.pubkey);

  return (
    <div className="min-h-screen">
      <SpookstrHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {/* NIP-05 Verification Banner */}
          {!isNIP05Verified && (
            <Card className="mb-6 border-yellow-500/20 bg-yellow-500/10 backdrop-blur-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <p className="text-yellow-300">
                      <strong>Verify to participate:</strong> Set up a NIP-05 identifier in your profile to post and interact with communities.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/profile')}
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20"
                  >
                    Verify Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Ghost className="h-10 w-10 text-lime-400 mr-3" />
              <h1 className="text-4xl font-bold text-lime-400">Paranormal Communities</h1>
            </div>
            <p className="text-xl text-lime-300 mb-6">
              Discover communities dedicated to different aspects of the paranormal and supernatural
            </p>
            <Button onClick={handleCreateCommunity} className="bg-lime-500 hover:bg-lime-400 text-black">
              <Plus className="h-4 w-4 mr-2" />
              Create New Community
            </Button>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Communities List (Left Sidebar) */}
            <div className="lg:col-span-1">
              <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-lime-300">Communities</CardTitle>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lime-500/50" />
                      <Input
                        placeholder="Search communities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-black/20 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 pl-10"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-black/20 border border-lime-500/30 text-lime-100 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500"
                    >
                      <option value="all">All Categories</option>
                      {PARANORMAL_COMMUNITIES.map(community => (
                        <option key={community.id} value={community.id}>
                          {community.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  {communitiesLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCommunities.map((community) => (
                        <CommunityCard
                          key={community.id}
                          community={community}
                          onClick={() => {
                            if (community.exists) {
                              navigate(`/community/${community.id}`);
                            } else {
                              if (user) {
                                navigate(`/create-community/${community.id}`);
                              } else {
                                toast({
                                  title: 'Login Required',
                                  description: 'Please log in to create a community.',
                                  variant: 'destructive',
                                });
                              }
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Topics Feed (Main Content) */}
            <div className="lg:col-span-2">
              <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-lime-300">Community Topics</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={sortBy === 'newest' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('newest')}
                        className={sortBy === 'newest' ? 'bg-lime-500 text-black' : ''}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Newest
                      </Button>
                      <Button
                        variant={sortBy === 'mostActive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('mostActive')}
                        className={sortBy === 'mostActive' ? 'bg-lime-500 text-black' : ''}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Active
                      </Button>
                      <Button
                        variant={sortBy === 'trending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSortBy('trending')}
                        className={sortBy === 'trending' ? 'bg-lime-500 text-black' : ''}
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Trending
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {topicsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                      ))}
                    </div>
                  ) : allTopics && allTopics.length > 0 ? (
                    <div className="space-y-4">
                      {allTopics.map((topic) => (
                        <TopicCard
                          key={topic.id}
                          topic={topic}
                          onClick={() => handleTopicClick(topic.community.id, topic.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed border-lime-500/30 bg-black/20">
                      <CardContent className="py-12 text-center">
                        <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-lime-300 mb-2">
                          No topics found
                        </h3>
                        <p className="text-lime-500/60 mb-4">
                          Be the first to start a discussion in one of our communities!
                        </p>
                        <Button onClick={handleCreateCommunity} variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Community
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-6 text-lime-500/60">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>{communities?.length || 0} communities</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>{allTopics?.length || 0} topics</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Powered by Nostr</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface CommunityCardProps {
  community: any;
  onClick: () => void;
}

function CommunityCard({ community, onClick }: CommunityCardProps) {
  const author = useAuthor(community.author);
  const metadata = author.data?.metadata;

  const creatorName = metadata?.name || (community.author ? getDisplayName(metadata, community.author) : 'Unknown Creator');
  const creatorImage = metadata?.picture;

  return (
    <Card
      className={`border-lime-500/20 bg-black/40 backdrop-blur-sm hover:border-lime-400/40 transition-all cursor-pointer group ${!community.exists ? 'border-dashed' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-lime-300 group-hover:text-lime-200 transition-colors mb-1">
              {community.name}
            </h3>
            <p className="text-xs text-lime-500/80 line-clamp-2">
              {community.description}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-3">
            {community.exists ? (
              <Badge variant="default" className="bg-lime-500 text-black">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-lime-500/50 text-lime-400">
                Setup
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={creatorImage} alt={creatorName} />
              <AvatarFallback className="text-xs">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs text-lime-400">
              {creatorName}
            </div>
          </div>
          <div className="text-xs text-lime-500/60">
            {community.moderators?.length || 0} mods
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TopicCardProps {
  topic: any;
  onClick: () => void;
}

function TopicCard({ topic, onClick }: TopicCardProps) {
  const author = useAuthor(topic.pubkey);
  const metadata = author.data?.metadata;

  const displayName = getDisplayName(metadata, topic.pubkey);
  const profileImage = metadata?.picture;

  return (
    <Card
      className="border-lime-500/20 bg-black/40 backdrop-blur-sm hover:border-lime-400/40 transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profileImage} alt={displayName} />
              <AvatarFallback className="text-xs">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-lime-300">{displayName}</span>
                <Badge variant="secondary" className="text-xs">
                  {topic.community?.name || 'Community'}
                </Badge>
                {topic.approvalCount > 0 && (
                  <Badge variant="outline" className="text-xs border-lime-500/50 text-lime-400">
                    {topic.approvalCount} 👍
                  </Badge>
                )}
              </div>
              <div className="text-xs text-lime-500/60">
                {new Date(topic.created_at * 1000).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {topic.title && (
          <h3 className="font-semibold text-lime-200 mb-2">{topic.title}</h3>
        )}
        <p className="text-sm text-lime-100/90 line-clamp-3 mb-3">
          {topic.content}
        </p>
        <div className="flex items-center justify-between text-xs text-lime-500/60">
          <span>Click to view discussion</span>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-3 w-3" />
            <span>Join discussion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}