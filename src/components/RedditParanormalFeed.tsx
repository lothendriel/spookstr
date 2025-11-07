import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RedditPost {
  id: string;
  title: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  subreddit: string;
  author: string;
}

export function RedditParanormalFeed() {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRedditPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch from multiple paranormal subreddits
        const subreddits = ['Paranormal', 'Ghosts', 'UFOs', 'HighStrangeness', 'Thetruthishere'];
        const allPosts: RedditPost[] = [];

        for (const subreddit of subreddits) {
          try {
            const response = await fetch(
              `https://www.reddit.com/r/${subreddit}/hot.json?limit=5&t=day`,
              {
                headers: {
                  'User-Agent': 'Spookstr:1.0.0 (by /u/spookstr_bot)',
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              const subredditPosts = data.data.children.map((child: any) => ({
                id: child.data.id,
                title: child.data.title,
                url: `https://reddit.com${child.data.permalink}`,
                score: child.data.score,
                num_comments: child.data.num_comments,
                created_utc: child.data.created_utc,
                permalink: child.data.permalink,
                subreddit: child.data.subreddit,
                author: child.data.author,
              }));
              allPosts.push(...subredditPosts);
            }
          } catch (err) {
            console.warn(`Failed to fetch from r/${subreddit}:`, err);
          }
        }

        // Sort by score and take top posts
        const topPosts = allPosts
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);

        setPosts(topPosts);
      } catch (err) {
        console.error('Error fetching Reddit posts:', err);
        setError('Failed to load Reddit posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRedditPosts();

    // Refresh every 10 minutes
    const interval = setInterval(fetchRedditPosts, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)}h ago`;
    } else {
      return `${Math.floor(diff / 86400)}d ago`;
    }
  };

  const truncateTitle = (title: string, maxLength: number = 80) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength).trim() + '...';
  };

  if (error) {
    return (
      <Card className="bg-lime-500/5 border-lime-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-lime-400 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Reddit Paranormal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-lime-500/60 mb-3">{error}</p>
            <Button
              size="sm"
              variant="outline"
              className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
              onClick={() => window.open('https://reddit.com/r/paranormal', '_blank')}
            >
              Visit r/Paranormal
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-lime-500/5 border-lime-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-lime-400 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Reddit Paranormal
        </CardTitle>
        <p className="text-xs text-lime-500/60 mt-1">
          Latest from paranormal subreddits
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-lime-500/10 rounded mb-2" />
                <div className="flex gap-2">
                  <div className="h-3 w-12 bg-lime-500/10 rounded" />
                  <div className="h-3 w-16 bg-lime-500/10 rounded" />
                  <div className="h-3 w-14 bg-lime-500/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                className="group cursor-pointer p-3 rounded-lg bg-lime-500/5 hover:bg-lime-500/10 transition-colors border border-lime-500/10 hover:border-lime-500/20"
                onClick={() => window.open(post.url, '_blank')}
              >
                <h4 className="text-sm font-medium text-lime-100 leading-tight mb-2 group-hover:text-lime-50 transition-colors">
                  {truncateTitle(post.title)}
                </h4>
                <div className="flex items-center gap-3 text-xs text-lime-500/60">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{post.score}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{post.num_comments}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(post.created_utc)}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-lime-500/40">
                    r/{post.subreddit}
                  </span>
                  <ExternalLink className="h-3 w-3 text-lime-500/40 group-hover:text-lime-500/60 transition-colors" />
                </div>
              </div>
            ))}

            {/* View More Button */}
            <div className="pt-2 border-t border-lime-500/10">
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-lime-400 hover:text-lime-300 hover:bg-lime-500/10"
                onClick={() => window.open('https://reddit.com/r/paranormal+ghosts+ufos+highstrangeness+thetruthishere', '_blank')}
              >
                View More on Reddit
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-lime-500/60 mb-3">
              No posts found
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-lime-500/30 text-lime-400 hover:bg-lime-500/10"
              onClick={() => window.open('https://reddit.com/r/paranormal', '_blank')}
            >
              Visit r/Paranormal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}