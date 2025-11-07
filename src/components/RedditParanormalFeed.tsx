import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, MessageCircle } from 'lucide-react';

interface RedditPost {
  id: string;
  title: string;
  url: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  author: string;
  permalink: string;
  subreddit: string;
}

// List of paranormal-related subreddits to fetch from
const PARANORMAL_SUBREDDITS = [
  'Paranormal',
  'Ghosts',
  'Thetruthishere',
  'Glitch_in_the_Matrix',
  'HighStrangeness',
  'UFOs',
  'aliens',
  'Cryptozoology',
  'Missing411',
  'BackwoodsCreepy',
  'CreepyEncounters',
  'Humanoidencounters',
];

export function RedditParanormalFeed() {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRedditPosts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Randomly select 3-4 subreddits to fetch from
        const shuffledSubs = PARANORMAL_SUBREDDITS.slice().sort(() => Math.random() - 0.5);
        const selectedSubs = shuffledSubs.slice(0, 4);

        // Fetch posts from each selected subreddit
        const fetchPromises = selectedSubs.map(async (subreddit) => {
          try {
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`);
            const data = await response.json();
            return data.data.children.map((child: any) => ({
              ...child.data,
              subreddit,
            }));
          } catch (err) {
            console.error(`Failed to fetch from r/${subreddit}:`, err);
            return [];
          }
        });

        // Wait for all fetches to complete
        const results = await Promise.all(fetchPromises);

        // Flatten and combine all posts
        const allPosts = results.flat();

        // Shuffle and select 3 posts
        const shuffled = allPosts.slice().sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        const redditPosts = selected.map((post: any) => {
          return {
            id: post.id,
            title: post.title,
            url: post.url,
            selftext: post.selftext || '',
            score: post.score,
            num_comments: post.num_comments,
            created_utc: post.created_utc,
            author: post.author,
            permalink: `https://www.reddit.com${post.permalink}`,
            subreddit: post.subreddit,
          };
        });

        setPosts(redditPosts);
      } catch (err) {
        console.error('Failed to fetch Reddit posts:', err);
        setError('Failed to load Reddit posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRedditPosts();
  }, []);

  const handleRefresh = () => {
    const fetchRedditPosts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Randomly select 3-4 subreddits to fetch from
        const shuffledSubs = PARANORMAL_SUBREDDITS.slice().sort(() => Math.random() - 0.5);
        const selectedSubs = shuffledSubs.slice(0, 4);

        // Fetch posts from each selected subreddit
        const fetchPromises = selectedSubs.map(async (subreddit) => {
          try {
            const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`);
            const data = await response.json();
            return data.data.children.map((child: any) => ({
              ...child.data,
              subreddit,
            }));
          } catch (err) {
            console.error(`Failed to fetch from r/${subreddit}:`, err);
            return [];
          }
        });

        // Wait for all fetches to complete
        const results = await Promise.all(fetchPromises);

        // Flatten and combine all posts
        const allPosts = results.flat();

        // Shuffle and select 3 posts
        const shuffled = allPosts.slice().sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        const redditPosts = selected.map((post: any) => {
          return {
            id: post.id,
            title: post.title,
            url: post.url,
            selftext: post.selftext || '',
            score: post.score,
            num_comments: post.num_comments,
            created_utc: post.created_utc,
            author: post.author,
            permalink: `https://www.reddit.com${post.permalink}`,
            subreddit: post.subreddit,
          };
        });

        setPosts(redditPosts);
      } catch (err) {
        console.error('Failed to fetch Reddit posts:', err);
        setError('Failed to load Reddit posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRedditPosts();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  if (isLoading) {
    return (
      <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Popular on Reddit</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lime-400 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Popular on Reddit</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-lime-500/60 mb-2">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lime-400 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Popular on Reddit</span>
        </CardTitle>
        <p className="text-sm text-lime-500/60">
          Top posts from paranormal subreddits
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="space-y-2 overflow-hidden">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-100 hover:text-lime-300 transition-colors font-medium leading-tight break-words whitespace-normal w-full"
            >
              {post.title}
            </a>

            {post.selftext && (
              <p className="text-sm text-lime-500/80 leading-relaxed break-words whitespace-normal w-full">
                {truncateText(post.selftext, 120)}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-lime-500/60 flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <TrendingUp className="h-3 w-3" />
                  {post.score}
                </span>
                <span className="flex items-center space-x-1">
                  <MessageCircle className="h-3 w-3" />
                  {post.num_comments}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lime-400/80">r/{post.subreddit}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.created_utc)}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-lime-500/20">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Refresh Posts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}