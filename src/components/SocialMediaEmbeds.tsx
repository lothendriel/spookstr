import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle, ThumbsUp, Share2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TwitterEmbedProps {
  url: string;
  username: string;
  statusId: string;
  className?: string;
}

export function TwitterEmbed({ url, username, statusId, className }: TwitterEmbedProps) {
  // Twitter's oEmbed API endpoint
  const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&dnt=true&theme=light`;

  const [embedData, setEmbedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const fetchEmbedData = async () => {
      try {
        setIsLoading(true);
        setDebugInfo(`Starting fetch for: ${url}`);

        // Try multiple approaches to get Twitter data
        let data = null;
        let lastError = null;

        // Approach 1: Direct oEmbed API (might fail due to CORS)
        try {
          setDebugInfo(prev => prev + `\nTrying direct oEmbed API...`);
          const response = await fetch(oEmbedUrl);
          setDebugInfo(prev => prev + `\nDirect response status: ${response.status}`);

          if (response.ok) {
            data = await response.json();
            setDebugInfo(prev => prev + `\n✅ Direct API success!`);
            console.log('Twitter embed data (direct):', data);
          } else {
            const errorText = await response.text();
            setDebugInfo(prev => prev + `\n❌ Direct API failed: ${errorText.substring(0, 200)}`);
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (err) {
          lastError = err;
          setDebugInfo(prev => prev + `\n❌ Direct approach failed: ${err instanceof Error ? err.message : 'Unknown error'}`);

          // Approach 2: Try with CORS proxy
          try {
            setDebugInfo(prev => prev + `\nTrying CORS proxy...`);
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oEmbedUrl)}`;
            const proxyResponse = await fetch(proxyUrl);
            setDebugInfo(prev => prev + `\nProxy response status: ${proxyResponse.status}`);

            if (proxyResponse.ok) {
              const proxyData = await proxyResponse.json();
              setDebugInfo(prev => prev + `\nGot proxy response, parsing...`);
              const parsedData = JSON.parse(proxyData.contents);
              data = parsedData;
              setDebugInfo(prev => prev + `\n✅ Proxy API success!`);
              console.log('Twitter embed data (proxy):', parsedData);
            } else {
              throw new Error(`Proxy HTTP ${proxyResponse.status}`);
            }
          } catch (proxyErr) {
            lastError = proxyErr;
            setDebugInfo(prev => prev + `\n❌ Proxy approach failed: ${proxyErr instanceof Error ? proxyErr.message : 'Unknown error'}`);

            // Approach 3: Create minimal embed data from URL
            setDebugInfo(prev => prev + `\nCreating fallback embed data...`);
            data = {
              author_name: `@${username}`,
              author_url: `https://twitter.com/${username}`,
              url: url,
              title: `Tweet by @${username}`,
              html: `<blockquote class="twitter-tweet">Tweet by @${username}<br>Status ID: ${statusId}</blockquote>`
            };
            setDebugInfo(prev => prev + `\n✅ Created fallback data`);
          }
        }

        setEmbedData(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load Twitter post: ${errorMessage}`);
        console.warn('Twitter embed error:', err);
        setDebugInfo(prev => prev + `\n❌ Final error: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbedData();
  }, [url, username, statusId]);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-sky-500/5 border-sky-500/20 overflow-hidden cursor-pointer", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-sky-500/20 rounded w-24 mb-2" />
                <div className="h-3 bg-sky-500/10 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-sky-500/10 rounded" />
              <div className="h-3 bg-sky-500/10 rounded w-5/6" />
              <div className="h-3 bg-sky-500/10 rounded w-4/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn("bg-sky-500/5 border-sky-500/20 overflow-hidden cursor-pointer hover:border-sky-500/40 transition-all duration-200", className)}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sky-100 truncate">
                  Twitter Post by @{username}
                </p>
                <p className="text-xs text-sky-500/60">
                  Status ID: {statusId}
                </p>
                <p className="text-xs text-sky-500/40 truncate">
                  {url}
                </p>
                {process.env.NODE_ENV === 'development' && debugInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-sky-500/40 cursor-pointer">Debug Info</summary>
                    <pre className="text-xs text-sky-500/30 mt-1 whitespace-pre-wrap break-all">
                      {debugInfo}
                    </pre>
                  </details>
                )}
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
              <ExternalLink className="h-4 w-4 text-sky-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("bg-sky-500/5 border-sky-500/20 overflow-hidden cursor-pointer hover:border-sky-500/40 transition-all duration-200 group", className)}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* Twitter Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-sky-500/20 rounded-full flex items-center justify-center">
            <span className="text-sky-500 font-semibold text-sm">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-sky-100">
              {embedData.author_name || `@${username}`}
            </p>
            <p className="text-xs text-sky-500/60">
              {embedData.author_url ? new URL(embedData.author_url).hostname : 'twitter.com'}
            </p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/60 text-white hover:bg-black/80">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tweet Content */}
        <div className="mb-3">
          <div
            className="text-sm text-sky-50 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: embedData.html }}
          />
        </div>

        {/* Tweet Media (if any) */}
        {embedData.url && (
          <div className="mb-3">
            <div className="aspect-video bg-sky-500/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-sky-500/40" />
              <span className="ml-2 text-xs text-sky-500/60">Media content</span>
            </div>
          </div>
        )}

        {/* Tweet Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-sky-500/10">
          <div className="flex items-center space-x-4 text-xs text-sky-500/60">
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-3 w-3" />
              <span>Reply</span>
            </div>
            <div className="flex items-center space-x-1">
              <ThumbsUp className="h-3 w-3" />
              <span>Like</span>
            </div>
            <div className="flex items-center space-x-1">
              <Share2 className="h-3 w-3" />
              <span>Share</span>
            </div>
          </div>
          <div className="text-xs text-sky-500/40">
            Twitter
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FacebookEmbedProps {
  url: string;
  postId: string;
  className?: string;
}

export function FacebookEmbed({ url, postId, className }: FacebookEmbedProps) {
  const [embedData, setEmbedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmbedData = async () => {
      try {
        setIsLoading(true);

        // Try to fetch OpenGraph data using CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch Facebook page data');
        }

        const data = await response.json();

        // Extract OpenGraph data from HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');

        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');
        const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');

        setEmbedData({
          title: ogTitle || 'Facebook Post',
          description: ogDescription || 'Click to view this Facebook post',
          image: ogImage,
          siteName: ogSiteName || 'Facebook'
        });
        setError(null);
      } catch (err) {
        // Fallback to basic data instead of error
        setEmbedData({
          title: 'Facebook Post',
          description: 'Click to view this Facebook post',
          siteName: 'Facebook'
        });
        console.warn('Facebook embed error (using fallback):', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbedData();
  }, [url]);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-blue-600/5 border-blue-600/20 overflow-hidden cursor-pointer", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-blue-600/20 rounded w-24 mb-2" />
                <div className="h-3 bg-blue-600/10 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-blue-600/10 rounded" />
              <div className="h-3 bg-blue-600/10 rounded w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn("bg-blue-600/5 border-blue-600/20 overflow-hidden cursor-pointer hover:border-blue-600/40 transition-all duration-200", className)}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Facebook Post
                </p>
                <p className="text-xs text-blue-600/60">
                  Click to view on Facebook
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4 text-blue-600" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("bg-blue-600/5 border-blue-600/20 overflow-hidden cursor-pointer hover:border-blue-600/40 transition-all duration-200 group", className)}
      onClick={handleClick}
    >
      {embedData?.image && (
        <div className="relative aspect-video bg-black/20 overflow-hidden">
          <img
            src={embedData.image}
            alt={embedData.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/60 text-white hover:bg-black/80">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="w-6 h-6 bg-blue-600/20 rounded-md flex items-center justify-center flex-shrink-0">
                <ThumbsUp className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-xs text-blue-600/60 font-medium truncate">
                {embedData?.siteName || 'Facebook'}
              </span>
            </div>
            {!embedData?.image && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </Button>
            )}
          </div>

          <h3 className="text-sm font-semibold text-blue-100 line-clamp-2 leading-tight">
            {embedData?.title || 'Facebook Post'}
          </h3>

          {embedData?.description && (
            <p className="text-xs text-blue-600/80 line-clamp-3 leading-relaxed">
              {embedData.description}
            </p>
          )}

          <p className="text-xs text-blue-600/50 truncate pt-1 border-t border-blue-600/10">
            {url}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface InstagramEmbedProps {
  url: string;
  postId: string;
  className?: string;
}

export function InstagramEmbed({ url, postId, className }: InstagramEmbedProps) {
  const [embedData, setEmbedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmbedData = async () => {
      try {
        setIsLoading(true);

        // Try Instagram's oEmbed API with CORS proxy
        const oEmbedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}&maxwidth=480`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oEmbedUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch Instagram embed data');
        }

        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);

        setEmbedData(data);
        setError(null);
      } catch (err) {
        // Fallback to basic data
        setEmbedData({
          title: 'Instagram Post',
          author_name: 'Instagram User',
          thumbnail_url: '',
          url: url
        });
        console.warn('Instagram embed error (using fallback):', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbedData();
  }, [url]);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-gradient-to-br from-pink-500/5 to-purple-500/5 border-pink-500/20 overflow-hidden cursor-pointer", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-pink-500/20 rounded w-24 mb-2" />
                <div className="h-3 bg-pink-500/10 rounded w-16" />
              </div>
            </div>
            <div className="aspect-square bg-pink-500/10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn("bg-gradient-to-br from-pink-500/5 to-purple-500/5 border-pink-500/20 overflow-hidden cursor-pointer hover:border-pink-500/40 transition-all duration-200", className)}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-pink-100">
                  Instagram Post
                </p>
                <p className="text-xs text-pink-500/60">
                  Click to view on Instagram
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4 text-pink-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("bg-gradient-to-br from-pink-500/5 to-purple-500/5 border-pink-500/20 overflow-hidden cursor-pointer hover:border-pink-500/40 transition-all duration-200 group", className)}
      onClick={handleClick}
    >
      {embedData?.thumbnail_url && (
        <div className="relative aspect-square bg-black/20 overflow-hidden">
          <img
            src={embedData.thumbnail_url}
            alt={embedData.title || 'Instagram Post'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/60 text-white hover:bg-black/80">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-500 rounded-md flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs text-pink-500/60 font-medium">
              Instagram
            </span>
          </div>

          {embedData?.title && (
            <h3 className="text-sm font-semibold text-pink-100 line-clamp-2 leading-tight">
              {embedData.title}
            </h3>
          )}

          {embedData?.author_name && (
            <p className="text-xs text-pink-500/80">
              By {embedData.author_name}
            </p>
          )}

          <p className="text-xs text-pink-500/50 truncate pt-1 border-t border-pink-500/10">
            {url}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface LinkedInEmbedProps {
  url: string;
  activityId: string;
  className?: string;
}

export function LinkedInEmbed({ url, activityId, className }: LinkedInEmbedProps) {
  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card
      className={cn("bg-blue-700/5 border-blue-700/20 overflow-hidden cursor-pointer hover:border-blue-700/40 transition-all duration-200 group", className)}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-700/20 rounded-full flex items-center justify-center">
              <span className="text-blue-700 font-semibold text-sm">in</span>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-100">
                LinkedIn Post
              </p>
              <p className="text-xs text-blue-700/60">
                Click to view on LinkedIn
              </p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <ExternalLink className="h-4 w-4 text-blue-700" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface RedditEmbedProps {
  url: string;
  postId: string;
  className?: string;
}

export function RedditEmbed({ url, postId, className }: RedditEmbedProps) {
  const [embedData, setEmbedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmbedData = async () => {
      try {
        setIsLoading(true);

        // Try Reddit's oEmbed API with CORS proxy
        const oEmbedUrl = `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oEmbedUrl)}`;

        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch Reddit embed data');
        }

        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);

        setEmbedData(data);
        setError(null);
      } catch (err) {
        // Fallback to basic data
        setEmbedData({
          title: 'Reddit Post',
          author_name: 'Reddit User',
          provider_name: 'reddit.com',
          url: url,
          html: `<div>Reddit Post - Click to view</div>`
        });
        console.warn('Reddit embed error (using fallback):', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmbedData();
  }, [url]);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <Card className={cn("bg-orange-500/5 border-orange-500/20 overflow-hidden cursor-pointer", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-orange-500/20 rounded w-24 mb-2" />
                <div className="h-3 bg-orange-500/10 rounded w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-orange-500/10 rounded" />
              <div className="h-3 bg-orange-500/10 rounded w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn("bg-orange-500/5 border-orange-500/20 overflow-hidden cursor-pointer hover:border-orange-500/40 transition-all duration-200", className)}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <span className="text-orange-500 font-semibold text-sm">r/</span>
              </div>
              <div>
                <p className="text-sm font-medium text-orange-100">
                  Reddit Post
                </p>
                <p className="text-xs text-orange-500/60">
                  Click to view on Reddit
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4 text-orange-500" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn("bg-orange-500/5 border-orange-500/20 overflow-hidden cursor-pointer hover:border-orange-500/40 transition-all duration-200 group", className)}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* Reddit Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
            <span className="text-orange-500 font-semibold text-sm">r/</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-100">
              {embedData?.author_name || 'Reddit Post'}
            </p>
            <p className="text-xs text-orange-500/60">
              {embedData?.provider_name || 'reddit.com'}
            </p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/60 text-white hover:bg-black/80">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Post Content */}
        {embedData?.title && (
          <h3 className="text-sm font-semibold text-orange-100 line-clamp-2 leading-tight mb-2">
            {embedData.title}
          </h3>
        )}

        {embedData?.html && (
          <div
            className="text-sm text-orange-50 leading-relaxed whitespace-pre-wrap mb-3"
            dangerouslySetInnerHTML={{ __html: embedData.html }}
          />
        )}

        {/* Reddit Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-orange-500/10">
          <div className="flex items-center space-x-4 text-xs text-orange-500/60">
            <div className="flex items-center space-x-1">
              <span>↑</span>
              <span>Upvote</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-3 w-3" />
              <span>Comment</span>
            </div>
            <div className="flex items-center space-x-1">
              <Share2 className="h-3 w-3" />
              <span>Share</span>
            </div>
          </div>
          <div className="text-xs text-orange-500/40">
            Reddit
          </div>
        </div>
      </CardContent>
    </Card>
  );
}