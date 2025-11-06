import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { BookOpen, Search, Filter, Plus, TrendingUp, Clock, Eye, PenSquare, Ghost, Users, Zap, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { RelaySelector } from '@/components/RelaySelector';
import { LongFormContent } from '@/components/LongFormContent';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';

// Custom hook for fetching articles
function useArticles() {
  const { nostr } = useNostr();
  const { presetRelays = [] } = useAppContext();

  return useQuery({
    queryKey: ['articles'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);
      
      // Query for published articles (kind 30023) and exclude drafts (kind 30024)
      const events = await nostr.query([
        {
          kinds: [30023],
          limit: 50,
          until: Math.floor(Date.now() / 1000)
        }
      ], { signal });

      // Sort by creation date (newest first)
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Custom hook for fetching user's drafts
function useUserDrafts() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { presetRelays = [] } = useAppContext();

  return useQuery({
    queryKey: ['user-drafts', user?.pubkey],
    queryFn: async (c) => {
      if (!user) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);
      
      // Query for user's drafts (kind 30024)
      const events = await nostr.query([
        {
          kinds: [30024],
          authors: [user.pubkey],
          limit: 20,
          until: Math.floor(Date.now() / 1000)
        }
      ], { signal });

      // Sort by creation date (newest first)
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user,
    staleTime: 30000,
  });
}

export function ArticlesPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { data: articles, isLoading: isLoadingArticles, error: articlesError } = useArticles();
  const { data: drafts, isLoading: isLoadingDrafts } = useUserDrafts();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showDrafts, setShowDrafts] = useState(false);

  // Paranormal categories
  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'ghosts', label: 'Ghosts & Hauntings' },
    { id: 'ufos', label: 'UFOs & Aliens' },
    { id: 'cryptids', label: 'Cryptids' },
    { id: 'supernatural', label: 'Supernatural' },
    { id: 'investigations', label: 'Investigations' },
    { id: 'conspiracy', label: 'Conspiracy' },
  ];

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = showDrafts ? (drafts || []) : (articles || []);

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(article => {
        const title = article.tags.find(([name]) => name === 'title')?.[1] || '';
        const summary = article.tags.find(([name]) => name === 'summary')?.[1] || '';
        const content = article.content || '';
        
        const query = searchQuery.toLowerCase();
        return (
          title.toLowerCase().includes(query) ||
          summary.toLowerCase().includes(query) ||
          content.toLowerCase().includes(query)
        );
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => {
        const hashtags = article.tags.filter(([name]) => name === 't').map(([, tag]) => tag.toLowerCase());
        return hashtags.includes(selectedCategory);
      });
    }

    // Sort articles
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.created_at - a.created_at;
        case 'oldest':
          return a.created_at - b.created_at;
        case 'title':
          const titleA = a.tags.find(([name]) => name === 'title')?.[1] || '';
          const titleB = b.tags.find(([name]) => name === 'title')?.[1] || '';
          return titleA.localeCompare(titleB);
        default:
          return b.created_at - a.created_at;
      }
    });

    return filtered;
  }, [articles, drafts, searchQuery, selectedCategory, sortBy, showDrafts]);

  const handleWriteArticle = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to write articles",
        variant: "destructive",
      });
      return;
    }
    navigate('/write-article');
  };

  const handleEditDraft = (draftId: string) => {
    navigate(`/write-article?draft=${draftId}`);
  };

  const isLoading = isLoadingArticles || (showDrafts && isLoadingDrafts);

  return (
    <div className="min-h-screen">
      <SpookstrHeader />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookOpen className="h-10 w-10 text-lime-400" />
            <h1 className="text-4xl font-bold text-lime-400">Paranormal Articles</h1>
          </div>
          <p className="text-xl text-lime-200/80 max-w-3xl mx-auto mb-8">
            Explore in-depth articles about the supernatural, UFO sightings, ghost encounters, and unexplained phenomena. 
            Share your own paranormal experiences and investigations with the community.
          </p>
          
          <Button
            onClick={handleWriteArticle}
            className="bg-lime-500 hover:bg-lime-400 text-black font-semibold text-lg px-8 py-3"
          >
            <PenSquare className="h-5 w-5 mr-2" />
            Write Article
          </Button>
        </div>

        {/* Search and Filter Section */}
        <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lime-400/60" />
                <Input
                  placeholder="Search articles, titles, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-lime-500/10 border-lime-500/30 text-lime-100 placeholder:text-lime-400/60"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full lg:w-48 bg-lime-500/10 border-lime-500/30 text-lime-100">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-40 bg-lime-500/10 border-lime-500/30 text-lime-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="title">By Title</SelectItem>
                </SelectContent>
              </Select>

              {/* Draft Toggle */}
              {user && (
                <Button
                  variant={showDrafts ? "default" : "outline"}
                  onClick={() => setShowDrafts(!showDrafts)}
                  className={showDrafts 
                    ? "bg-purple-600 hover:bg-purple-700 text-white" 
                    : "border-lime-500/30 text-lime-300 hover:bg-lime-500/10"
                  }
                >
                  {showDrafts ? "View Published" : "View Drafts"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-lime-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-lime-400">
                {showDrafts ? drafts?.length || 0 : articles?.length || 0}
              </div>
              <div className="text-sm text-lime-400/60">
                {showDrafts ? "Drafts" : "Articles"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-lime-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-lime-400">
                {new Set(articles?.map(a => a.pubkey)).size}
              </div>
              <div className="text-sm text-lime-400/60">Authors</div>
            </CardContent>
          </Card>

          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-lime-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-lime-400">
                {categories.length - 1}
              </div>
              <div className="text-sm text-lime-400/60">Categories</div>
            </CardContent>
          </Card>

          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-4 text-center">
              <Eye className="h-8 w-8 text-lime-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-lime-400">24/7</div>
              <div className="text-sm text-lime-400/60">Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="border-lime-500/20 bg-black/40">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : articlesError ? (
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="text-lime-400 text-lg font-semibold">Error Loading Articles</div>
                <div className="text-lime-100/60 mb-4">
                  Unable to load articles from the connected relays.
                </div>
                <RelaySelector className="w-full max-w-sm mx-auto" />
              </div>
            </CardContent>
          </Card>
        ) : filteredArticles.length === 0 ? (
          <Card className="border-lime-500/20 bg-black/40">
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <BookOpen className="h-16 w-16 text-lime-400/60 mx-auto" />
                <div className="text-lime-400 text-lg font-semibold">
                  {showDrafts ? "No Drafts Found" : "No Articles Found"}
                </div>
                <div className="text-lime-100/60 mb-4">
                  {showDrafts 
                    ? "You haven't saved any drafts yet. Start writing your first paranormal article!"
                    : "No articles match your search criteria. Try adjusting your filters or be the first to write about this topic!"
                  }
                </div>
                {showDrafts && (
                  <Button
                    onClick={handleWriteArticle}
                    className="bg-lime-500 hover:bg-lime-400 text-black"
                  >
                    <PenSquare className="h-4 w-4 mr-2" />
                    Start Writing
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <LongFormContent
                key={article.id}
                event={article}
                className="cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                onClick={() => {
                  const dTag = article.tags.find(([name]) => name === 'd')?.[1] || '';
                  const naddr = nip19.naddrEncode({
                    identifier: dTag,
                    pubkey: article.pubkey,
                    kind: article.kind
                  });
                  navigate(`/${naddr}`);
                }}
              />
            ))}
          </div>
        )}

        {/* Draft Management */}
        {showDrafts && user && filteredArticles.length > 0 && (
          <Card className="border-purple-500/20 bg-black/40 mt-8">
            <CardHeader>
              <h3 className="text-lg font-semibold text-purple-300">Your Drafts</h3>
              <p className="text-sm text-purple-200/60">
                Manage your unpublished articles. Click on any draft to continue editing.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArticles.slice(0, 4).map((draft) => {
                  const title = draft.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Draft';
                  const timeAgo = formatDistanceToNow(new Date(draft.created_at * 1000), { addSuffix: true });
                  
                  return (
                    <Card 
                      key={draft.id} 
                      className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer transition-colors"
                      onClick={() => handleEditDraft(draft.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-purple-200 line-clamp-2 flex-1 mr-2">
                            {title}
                          </h4>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                            Draft
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-purple-300/60">
                          <span>Last edited {timeAgo}</span>
                          <PenSquare className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}