import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { SpookstrHeader } from '@/components/SpookstrHeader';
import { LongFormContent } from '@/components/LongFormContent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Search, 
  TrendingUp, 
  Clock, 
  FileEdit,
  Ghost
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

export default function ArticlesBrowse() {
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch published articles
  const { data: articles, isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles', 'published'],
    queryFn: async () => {
      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [{
          kinds: [30023],
          '#t': ['paranormal'],
          limit: 100
        }],
        { signal }
      );

      return events.sort((a, b) => {
        const aPublishedAt = a.tags.find(([name]) => name === 'published_at')?.[1];
        const bPublishedAt = b.tags.find(([name]) => name === 'published_at')?.[1];
        
        const aTime = aPublishedAt ? parseInt(aPublishedAt) : a.created_at;
        const bTime = bPublishedAt ? parseInt(bPublishedAt) : b.created_at;
        
        return bTime - aTime;
      });
    },
  });

  // Fetch user's drafts
  const { data: drafts, isLoading: isLoadingDrafts } = useQuery({
    queryKey: ['drafts', user?.pubkey],
    queryFn: async () => {
      if (!user) return [];

      const signal = AbortSignal.timeout(5000);
      const events = await nostr.query(
        [{
          kinds: [30024],
          authors: [user.pubkey],
          limit: 50
        }],
        { signal }
      );

      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user,
  });

  // Extract all unique tags from articles
  const allTags = articles?.reduce((acc: string[], article: NostrEvent) => {
    const articleTags = article.tags
      .filter(([name]) => name === 't')
      .map(([, tag]) => tag);
    
    articleTags.forEach(tag => {
      if (!acc.includes(tag)) {
        acc.push(tag);
      }
    });
    
    return acc;
  }, []) || [];

  // Filter articles based on search and tag
  const filteredArticles = articles?.filter((article: NostrEvent) => {
    const title = article.tags.find(([name]) => name === 'title')?.[1] || '';
    const summary = article.tags.find(([name]) => name === 'summary')?.[1] || '';
    const content = article.content || '';
    const tags = article.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        title.toLowerCase().includes(query) ||
        summary.toLowerCase().includes(query) ||
        content.toLowerCase().includes(query) ||
        tags.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }

    // Filter by selected tag
    if (selectedTag && !tags.includes(selectedTag)) {
      return false;
    }

    return true;
  });

  // Get trending tags (most used)
  const trendingTags = allTags
    .map(tag => ({
      tag,
      count: articles?.filter(article => 
        article.tags.some(([name, value]) => name === 't' && value === tag)
      ).length || 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-black">
      <SpookstrHeader />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-10 w-10 text-lime-400" />
              <div>
                <h1 className="text-3xl font-bold text-lime-300">Paranormal Articles</h1>
                <p className="text-lime-400/70">
                  In-depth investigations, encounters, and research from the paranormal community
                </p>
              </div>
            </div>

            {user && (
              <Button
                onClick={() => navigate('/articles/write')}
                className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Write Article
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lime-400/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, topics, tags..."
              className="pl-10 bg-black/60 border-lime-500/30 text-lime-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Tags */}
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-lime-400" />
                  <h3 className="font-semibold text-lime-300">Trending Topics</h3>
                </div>
                
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left ${!selectedTag ? 'bg-lime-500/20 text-lime-300' : 'text-lime-400/70 hover:text-lime-300'}`}
                    onClick={() => setSelectedTag(null)}
                  >
                    All Topics
                  </Button>
                  
                  {trendingTags.map(({ tag, count }) => (
                    <Button
                      key={tag}
                      variant="ghost"
                      className={`w-full justify-between text-left ${selectedTag === tag ? 'bg-lime-500/20 text-lime-300' : 'text-lime-400/70 hover:text-lime-300'}`}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    >
                      <span>#{tag}</span>
                      <Badge variant="outline" className="border-lime-500/30 text-lime-400/70">
                        {count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Categories */}
            <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Ghost className="h-4 w-4 text-lime-400" />
                  <h3 className="font-semibold text-lime-300">Categories</h3>
                </div>
                
                <div className="space-y-2">
                  {['ghost', 'ufo', 'cryptid', 'haunted', 'investigation', 'evidence'].map((category) => (
                    <Button
                      key={category}
                      variant="ghost"
                      className={`w-full justify-start text-left ${selectedTag === category ? 'bg-lime-500/20 text-lime-300' : 'text-lime-400/70 hover:text-lime-300'}`}
                      onClick={() => setSelectedTag(category === selectedTag ? null : category)}
                    >
                      #{category}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Published Articles
                </TabsTrigger>
                {user && (
                  <TabsTrigger value="drafts" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    My Drafts
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {isLoadingArticles ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <Skeleton className="h-6 w-3/4 bg-lime-500/10" />
                            <Skeleton className="h-4 w-full bg-lime-500/10" />
                            <Skeleton className="h-4 w-5/6 bg-lime-500/10" />
                            <Skeleton className="h-32 w-full bg-lime-500/10" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredArticles && filteredArticles.length > 0 ? (
                  <div className="space-y-6">
                    {filteredArticles.map((article: NostrEvent) => (
                      <LongFormContent key={article.id} event={article} />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-lime-500/20 bg-black/40 backdrop-blur-sm">
                    <CardContent className="py-12 text-center">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 text-lime-400/40" />
                      <h3 className="text-xl font-semibold text-lime-300 mb-2">
                        {searchQuery || selectedTag ? 'No articles found' : 'No articles yet'}
                      </h3>
                      <p className="text-lime-400/70 mb-6">
                        {searchQuery || selectedTag 
                          ? 'Try adjusting your search or filters' 
                          : 'Be the first to share your paranormal investigations'}
                      </p>
                      {user && (
                        <Button
                          onClick={() => navigate('/articles/write')}
                          className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
                        >
                          <FileEdit className="h-4 w-4 mr-2" />
                          Write First Article
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {user && (
                <TabsContent value="drafts" className="mt-0">
                  {isLoadingDrafts ? (
                    <div className="space-y-6">
                      {[1, 2].map((i) => (
                        <Card key={i} className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <Skeleton className="h-6 w-2/3 bg-lime-500/10" />
                              <Skeleton className="h-4 w-full bg-lime-500/10" />
                              <Skeleton className="h-4 w-4/5 bg-lime-500/10" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : drafts && drafts.length > 0 ? (
                    <div className="space-y-4">
                      {drafts.map((draft: NostrEvent) => {
                        const title = draft.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Draft';
                        const summary = draft.tags.find(([name]) => name === 'summary')?.[1] || '';
                        const dTag = draft.tags.find(([name]) => name === 'd')?.[1] || '';
                        const wordCount = draft.content.split(/\s+/).length;

                        return (
                          <Card 
                            key={draft.id}
                            className="border-lime-500/20 bg-black/40 backdrop-blur-sm hover:bg-lime-500/5 transition-colors cursor-pointer"
                            onClick={() => navigate(`/articles/draft/${dTag}`)}
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold text-lime-300">{title}</h3>
                                    <Badge variant="outline" className="border-yellow-500/30 text-yellow-300">
                                      Draft
                                    </Badge>
                                  </div>
                                  {summary && (
                                    <p className="text-sm text-lime-400/70 mb-3 line-clamp-2">{summary}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-xs text-lime-400/60">
                                    <span>
                                      Last edited {new Date(draft.created_at * 1000).toLocaleDateString()}
                                    </span>
                                    <span>•</span>
                                    <span>{wordCount} words</span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-lime-400 hover:text-lime-300"
                                >
                                  <FileEdit className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="border-dashed border-lime-500/20 bg-black/40 backdrop-blur-sm">
                      <CardContent className="py-12 text-center">
                        <Clock className="h-16 w-16 mx-auto mb-4 text-lime-400/40" />
                        <h3 className="text-xl font-semibold text-lime-300 mb-2">No drafts yet</h3>
                        <p className="text-lime-400/70 mb-6">
                          Start writing an article and save it as a draft
                        </p>
                        <Button
                          onClick={() => navigate('/articles/write')}
                          className="bg-lime-500 hover:bg-lime-400 text-black font-semibold"
                        >
                          <FileEdit className="h-4 w-4 mr-2" />
                          Create Draft
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
