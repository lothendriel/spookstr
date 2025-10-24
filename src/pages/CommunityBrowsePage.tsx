import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@/hooks/useNostr';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useCommunity, CommunityDefinition } from '@/hooks/useCommunity';
import { Users, Search, Plus, Ghost, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function CommunityBrowsePage() {
  const { nostr } = useNostr();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Query for all community definitions
  const { data: communities, isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const signal = AbortSignal.timeout(5000);
      
      // Query for all community definitions (kind 34550)
      const events = await nostr.query([{
        kinds: [34550],
        limit: 100
      }], { signal });

      return events.map(event => {
        const nameTag = event.tags.find(tag => tag[0] === 'name');
        const descriptionTag = event.tags.find(tag => tag[0] === 'description');
        const imageTag = event.tags.find(tag => tag[0] === 'image');
        const moderators = event.tags
          .filter(tag => tag[0] === 'p' && tag[3] === 'moderator')
          .map(tag => tag[1]);

        return {
          id: event.tags.find(tag => tag[0] === 'd')?.[1] || '',
          name: nameTag?.[1] || '',
          description: descriptionTag?.[1] || '',
          image: imageTag?.[1],
          moderators,
          author: event.pubkey,
          created_at: event.created_at
        } as CommunityDefinition;
      }).filter(community => community.id);
    }
  });

  // Get detailed info for predefined communities
  const communityDetails = PARANORMAL_COMMUNITIES.map(predefined => {
    const community = communities?.find(c => c.id === predefined.id);
    return {
      ...predefined,
      ...(community || {}),
      exists: !!community
    };
  });

  const filteredCommunities = communityDetails.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          community.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || community.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateCommunity = () => {
    navigate('/create-community');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
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

        {/* Search and Filter */}
        <Card className="mb-8 border-lime-500/20 bg-black/40 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lime-500/50" />
                  <Input
                    placeholder="Search communities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-black/20 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 pl-10"
                  />
                </div>
              </div>
              <div className="md:w-64">
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
            </div>
          </CardContent>
        </Card>

        {/* Communities Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                <Skeleton className="h-48 w-full" />
                <CardContent className="pt-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCommunities.map((community) => (
              <CommunityCard 
                key={community.id} 
                community={community} 
                onClick={() => navigate(`/community/${community.id}`)}
              />
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredCommunities.length === 0 && (
          <Card className="border-dashed border-lime-500/30 bg-black/20">
            <CardContent className="py-12 text-center">
              <Ghost className="h-16 w-16 text-lime-500/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-lime-300 mb-2">
                No communities found
              </h3>
              <p className="text-lime-500/60 mb-4">
                Try adjusting your search or create a new community
              </p>
              <Button onClick={handleCreateCommunity} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-6 text-lime-500/60">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>{communities?.length || 0} communities</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Powered by Nostr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CommunityCardProps {
  community: CommunityDefinition & { exists?: boolean };
  onClick: () => void;
}

function CommunityCard({ community, onClick }: CommunityCardProps) {
  const author = useAuthor(community.author);
  const metadata = author.data?.metadata;

  const creatorName = metadata?.name || genUserName(community.author);
  const creatorImage = metadata?.picture;

  return (
    <Card 
      className="border-lime-500/20 bg-black/40 backdrop-blur-sm hover:border-lime-400/40 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-lime-300 group-hover:text-lime-200 transition-colors mb-2">
              {community.name}
            </CardTitle>
            <p className="text-sm text-lime-500/80 line-clamp-2">
              {community.description}
            </p>
          </div>
          {community.image && (
            <div className="w-12 h-12 ml-3 flex-shrink-0">
              <img
                src={community.image}
                alt={community.name}
                className="w-full h-full object-cover rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={creatorImage} alt={creatorName} />
              <AvatarFallback className="text-xs">
                {creatorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xs text-lime-400">
                {creatorName}
              </div>
              <div className="text-xs text-lime-500/60">
                Created {new Date(community.created_at * 1000).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {community.exists ? (
              <Badge variant="default" className="bg-lime-500 text-black">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-lime-500/50 text-lime-400">
                Setup Needed
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {community.moderators?.length || 0} mods
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}