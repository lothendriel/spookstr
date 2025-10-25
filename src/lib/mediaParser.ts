import { type NostrEvent } from '@nostrify/nostrify';

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'youtube' | 'vimeo' | 'twitch' | 'dailymotion' | 'tiktok' | 'spotify' | 'external' | 'link';
  url: string;
  alt?: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  dimensions?: { width: number; height: number };
  description?: string;
  siteName?: string;
  metadata?: {
    size?: number;
    format?: string;
    bitrate?: number;
    fps?: number;
    spotifyType?: 'track' | 'album' | 'playlist' | 'artist' | 'show' | 'episode';
    spotifyId?: string;
  };
}

// Media detection patterns
const mediaPatterns = {
  directImage: /https?:\/\/[^\s]+(?:\.(?:jpg|jpeg|png|gif|webp|svg|bmp|avif|ico|tiff?|psd|heic?|jpe|jif|jfif)|@(?:jpeg|jpg|png|gif|webp|avif))(?:\?[^\s]*)?/gi,
  directVideo: /https?:\/\/[^\s]+\.(?:mp4|webm|mov|avi|mkv|flv|ogv|3gp|m4v|wmv|asf|rm|rmvb|ts|m2ts|mts|divx|xvid)(?:\?[^\s]*)?/gi,
  directAudio: /https?:\/\/[^\s]+\.(?:mp3|wav|ogg|flac|m4a|aac|opus|wma|ra|ac3|dts)(?:\?[^\s]*)?/gi,
  youtube: /(?:youtube\.com\/watch[?]v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi,
  vimeo: /vimeo\.com\/(\d+)(?:\/[\w-]+)?/gi,
  twitch: /(?:twitch\.tv\/videos\/|twitch\.tv\/)(\w+)(?:\/videos\/(\d+))?/gi,
  dailymotion: /(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/gi,
  tiktok: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)([a-zA-Z0-9]+)/gi,
  spotify: /(?:open\.spotify\.com\/)(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/gi,
  nostrImage: /immediate:\/\/[^\s]+/gi,
  nostrVideo: /stream:\/\/[^\s]+/gi,
  // Common image hosting services that often serve images without extensions
  imageHosting: /https?:\/\/(?:i\.imgur\.com|images\.imgur\.com|preview\.redd\.it|i\.redd\.it|pbs\.twimg\.com|cdn\.discordapp\.com|media\.discordapp\.net|cdn\.discordapp\.com|attachments|camo\.githubusercontent\.com|user-images\.githubusercontent\.com|images\.unsplash\.com|images\.pexels\.com|dl\.dropboxusercontent\.com|lh3\.googleusercontent\.com|storage\.googleapis\.com|cloudinary\.com|images\.prismic\.io|www\.dropbox\.com\/s|cdn\.instagram\.com|scontent\.instagram\.com|fbcdn\.net|platform\.twitter\.com|pbs\.twimg\.com|cdn\.bsky\.app)\/[^\s]+/gi,
  // IMDB links for special preview handling
  imdb: /https?:\/\/(?:www\.)?imdb\.com\/(?:title|name)\/(?:[a-z0-9]+)(?:\/[^\s]*)?/gi,
  website: /https?:\/\/(?:www\.)?(?!youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|dailymotion\.com|tiktok\.com|open\.spotify\.com|i\.imgur\.com|images\.imgur\.com|preview\.redd\.it|i\.redd\.it|pbs\.twimg\.com|cdn\.discordapp\.com|media\.discordapp\.net|cdn\.discordapp\.com|attachments|camo\.githubusercontent\.com|user-images\.githubusercontent\.com|images\.unsplash\.com|images\.pexels\.com|dl\.dropboxusercontent\.com|lh3\.googleusercontent\.com|storage\.googleapis\.com|cloudinary\.com|images\.prismic\.io|www\.dropbox\.com\/s|cdn\.instagram\.com|scontent\.instagram\.com|fbcdn\.net|platform\.twitter\.com|pbs\.twimg\.com|cdn\.bsky\.app|imdb\.com)[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?(?<!\.(?:jpg|jpeg|png|gif|webp|svg|bmp|avif|ico|tiff?|psd|heic?|jpe|jif|jfif|mp4|webm|mov|avi|mkv|flv|ogv|3gp|m4v|wmv|asf|rm|rmvb|ts|m2ts|mts|divx|xvid|mp3|wav|ogg|flac|m4a|aac|opus|wma|ra|ac3|dts))(?:\?[^\s]*)?/gi,
};

export function parseMediaFromContent(content: string): MediaItem[] {
  const mediaItems: MediaItem[] = [];
  const processedUrls = new Set<string>(); // Track URLs we've already processed

  // Process YouTube URLs first
  let youtubeMatch;
  const youtubeRegex = mediaPatterns.youtube;
  youtubeRegex.lastIndex = 0; // Reset regex state

  while ((youtubeMatch = youtubeRegex.exec(content)) !== null) {
    const url = youtubeMatch[0];
    if (!processedUrls.has(url)) {
      const mediaItem = createMediaItem(url, 'youtube', youtubeMatch);
      if (mediaItem) {
        mediaItems.push(mediaItem);
        processedUrls.add(url);
      }
    }
  }

  // Process other media types in order of precedence
  const mediaTypes = ['directImage', 'directVideo', 'directAudio', 'vimeo', 'twitch', 'dailymotion', 'tiktok', 'spotify', 'imdb'];
  mediaTypes.forEach(type => {
    const pattern = mediaPatterns[type as keyof typeof mediaPatterns];
    if (!pattern) return;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[0];
      if (!processedUrls.has(url)) {
        const mediaItem = createMediaItem(url, type, match);
        if (mediaItem) {
          mediaItems.push(mediaItem);
          processedUrls.add(url);
        }
      }
    }
  });

  // Process image hosting services last (only if not already caught by directImage)
  const imageHostingPattern = mediaPatterns.imageHosting;
  if (imageHostingPattern) {
    let match;
    while ((match = imageHostingPattern.exec(content)) !== null) {
      const url = match[0];
      if (!processedUrls.has(url)) {
        const mediaItem = createMediaItem(url, 'imageHosting', match);
        if (mediaItem) {
          mediaItems.push(mediaItem);
          processedUrls.add(url);
        }
      }
    }
  }

  // Process website links last (excluding YouTube)
  const websitePattern = mediaPatterns.website;
  if (websitePattern) {
    let match;
    while ((match = websitePattern.exec(content)) !== null) {
      const url = match[0];
      // Skip if this URL was already processed as YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) continue;

      if (!processedUrls.has(url)) {
        const mediaItem = createMediaItem(url, 'website', match);
        if (mediaItem) {
          mediaItems.push(mediaItem);
          processedUrls.add(url);
        }
      }
    }
  }

  return mediaItems;
}

function createMediaItem(url: string, type: string, match: RegExpMatchArray): MediaItem | null {
  try {
    // Add protocol if missing
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    const urlObj = new URL(fullUrl);

    // Validate and normalize URL
    const cleanUrl = normalizeUrl(fullUrl);

    switch (type) {
      case 'directImage':
      case 'imageHosting':
        return {
          type: 'image',
          url: cleanUrl,
          alt: extractAltText(url, match),
          metadata: extractImageMetadata(cleanUrl)
        };

      case 'directVideo':
        return {
          type: 'video',
          url: cleanUrl,
          thumbnail: generateVideoThumbnail(cleanUrl),
          metadata: extractVideoMetadata(cleanUrl)
        };

      case 'directAudio':
        return {
          type: 'audio',
          url: cleanUrl,
          title: extractAudioTitle(url, match),
          metadata: extractAudioMetadata(cleanUrl)
        };

      case 'youtube':
        const videoId = match[1];
        return {
          type: 'youtube',
          url: cleanUrl,
          title: extractYouTubeTitle(videoId),
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          duration: extractYouTubeDuration(videoId)
        };

      case 'vimeo':
        const vimeoId = match[1];
        return {
          type: 'vimeo',
          url: cleanUrl,
          title: extractVimeoTitle(vimeoId),
          thumbnail: generateVimeoThumbnail(vimeoId),
          duration: extractVimeoDuration(vimeoId)
        };

      case 'twitch':
        const twitchChannel = match[1];
        const twitchVideoId = match[2];
        return {
          type: 'twitch',
          url: cleanUrl,
          title: extractTwitchTitle(twitchChannel, twitchVideoId),
          thumbnail: generateTwitchThumbnail(twitchChannel, twitchVideoId),
          duration: extractTwitchDuration(twitchVideoId)
        };

      case 'dailymotion':
        const dailymotionId = match[1];
        return {
          type: 'dailymotion',
          url: cleanUrl,
          title: extractDailymotionTitle(dailymotionId),
          thumbnail: generateDailymotionThumbnail(dailymotionId),
          duration: extractDailymotionDuration(dailymotionId)
        };

      case 'tiktok':
        const tiktokId = match[1];
        return {
          type: 'tiktok',
          url: cleanUrl,
          title: extractTikTokTitle(tiktokId),
          thumbnail: generateTikTokThumbnail(tiktokId),
          duration: extractTikTokDuration(tiktokId)
        };

      case 'spotify':
        const spotifyType = match[1] as 'track' | 'album' | 'playlist' | 'artist' | 'show' | 'episode';
        const spotifyId = match[2];
        return {
          type: 'spotify',
          url: cleanUrl,
          title: extractSpotifyTitle(spotifyType, spotifyId),
          thumbnail: generateSpotifyThumbnail(spotifyType, spotifyId),
          metadata: {
            spotifyType,
            spotifyId
          }
        };

      case 'imdb':
        const imdbData = extractImdbData(url);
        return {
          type: 'imdb',
          url: cleanUrl,
          title: imdbData.title,
          thumbnail: imdbData.thumbnail,
          description: imdbData.description,
          siteName: 'IMDb',
          metadata: {
            type: imdbData.type,
            year: imdbData.year,
            rating: imdbData.rating
          }
        };

      case 'nostrImage':
        return {
          type: 'image',
          url: cleanUrl.replace('immediate://', 'https://'),
          alt: 'Nostr Image',
          metadata: { format: 'unknown' }
        };

      case 'nostrVideo':
        return {
          type: 'video',
          url: cleanUrl.replace('stream://', 'https://'),
          thumbnail: generateVideoThumbnail(cleanUrl),
          metadata: { format: 'unknown' }
        };

      case 'website':
        return {
          type: 'link',
          url: cleanUrl,
          title: extractDomainName(cleanUrl),
          description: 'Click to view this website',
          thumbnail: '', // Will be populated by Open Graph data
        };

      default:
        return null;
    }
  } catch (error) {
    console.warn('Failed to parse media URL:', url, error);
    return null;
  }
}

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Ensure HTTPS
    urlObj.protocol = 'https:';
    return urlObj.toString();
  } catch {
    return url;
  }
}

function extractAltText(url: string, match: RegExpMatchArray): string {
  // Try to extract a meaningful alt text from the URL
  let cleanUrl = url;
  if (!url.startsWith('http')) {
    cleanUrl = 'https://' + url;
  }

  const filename = cleanUrl.split('/').pop()?.split('?')[0];
  if (filename) {
    const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
    return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Image';
}

function extractImageMetadata(url: string) {
  let cleanUrl = url;
  if (!url.startsWith('http')) {
    cleanUrl = 'https://' + url;
  }

  const format = cleanUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
  return {
    format: format || 'unknown',
    size: 0, // Would be calculated in real implementation
  };
}

function generateVideoThumbnail(url: string): string {
  // For direct video URLs, we can't generate thumbnails without server-side processing
  // Return empty string to let the component handle it
  return '';
}

function extractVideoMetadata(url: string) {
  let cleanUrl = url;
  if (!url.startsWith('http')) {
    cleanUrl = 'https://' + url;
  }

  const format = cleanUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
  return {
    format: format || 'unknown',
    fps: 30, // Default assumption
    bitrate: 0, // Would be extracted in real implementation
  };
}

function extractAudioTitle(url: string, match: RegExpMatchArray): string {
  let cleanUrl = url;
  if (!url.startsWith('http')) {
    cleanUrl = 'https://' + url;
  }

  const filename = cleanUrl.split('/').pop()?.split('?')[0];
  if (filename) {
    const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
    return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Audio Track';
}

function extractAudioMetadata(url: string) {
  let cleanUrl = url;
  if (!url.startsWith('http')) {
    cleanUrl = 'https://' + url;
  }

  const format = cleanUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
  return {
    format: format || 'unknown',
    bitrate: 128, // Default assumption in kbps
  };
}

function extractYouTubeTitle(videoId: string): string {
  // In a real implementation, you'd fetch this from YouTube API
  // For now, return a generic title
  return `YouTube Video (${videoId})`;
}

function extractYouTubeDuration(videoId: string): number {
  // Would fetch from YouTube API in real implementation
  return 0;
}

function extractVimeoTitle(videoId: string): string {
  // In a real implementation, you'd fetch this from Vimeo API
  // For now, return a generic title
  return `Vimeo Video (${videoId})`;
}

function generateVimeoThumbnail(videoId: string): string {
  // Vimeo thumbnail URL pattern
  return `https://vumbnail.com/${videoId}.jpg`;
}

function extractVimeoDuration(videoId: string): number {
  // Would fetch from Vimeo API in real implementation
  return 0;
}

function extractTwitchTitle(channel: string, videoId?: string): string {
  if (videoId) {
    return `Twitch Video: ${channel}`;
  }
  return `Twitch Stream: ${channel}`;
}

function generateTwitchThumbnail(channel: string, videoId?: string): string {
  if (videoId) {
    return `https://static-cdn.jtvnw.net/cf_vods/d2nvs31859zcd8/${channel}/${videoId}/thumb/thumb0-%{width}x%{height}.jpg`;
  }
  return `https://static-cdn.jtvnw.net/previews-ttv/live_user_${channel}-440x248.jpg`;
}

function extractTwitchDuration(videoId?: string): number {
  // Would fetch from Twitch API in real implementation
  return videoId ? 0 : 0; // 0 for live streams
}

function extractDailymotionTitle(videoId: string): string {
  return `Dailymotion Video (${videoId})`;
}

function generateDailymotionThumbnail(videoId: string): string {
  return `https://www.dailymotion.com/thumbnail/video/${videoId}`;
}

function extractDailymotionDuration(videoId: string): number {
  // Would fetch from Dailymotion API in real implementation
  return 0;
}

function extractTikTokTitle(videoId: string): string {
  return `TikTok Video (${videoId})`;
}

function generateTikTokThumbnail(videoId: string): string {
  // TikTok doesn't provide direct thumbnail URLs, this would need server-side processing
  return '';
}

function extractTikTokDuration(videoId: string): number {
  // TikTok videos are typically short
  return 60; // Default to 1 minute
}

function extractSpotifyTitle(type: 'track' | 'album' | 'playlist' | 'artist' | 'show' | 'episode', id: string): string {
  const typeNames = {
    track: 'Track',
    album: 'Album',
    playlist: 'Playlist',
    artist: 'Artist',
    show: 'Podcast',
    episode: 'Episode'
  };

  return `Spotify ${typeNames[type]} (${id})`;
}

function generateSpotifyThumbnail(type: 'track' | 'album' | 'playlist' | 'artist' | 'show' | 'episode', id: string): string {
  // Spotify doesn't provide direct thumbnail URLs from IDs alone
  // The embed will handle showing the artwork
  return '';
}

// Open Graph metadata fetching
export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url?: string;
  type?: string;
}

export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  try {
    // For demo purposes, we'll simulate Open Graph data
    // In a real implementation, this would fetch from a server-side proxy
    // that can handle CORS and parse HTML to extract Open Graph tags

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    // Mock Open Graph data for demonstration
    const mockData: Record<string, OpenGraphData> = {
      'github.com': {
        title: 'GitHub: Let\'s build from here',
        description: 'GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and features, power your CI/CD and DevOps workflows, and secure code before you commit it.',
        image: 'https://github.com/fluidicon.png',
        siteName: 'GitHub',
        url: url,
        type: 'website'
      },
      'twitter.com': {
        title: 'X. It\'s what\'s happening',
        description: 'From breaking news and entertainment to sports and politics, get the full story with all the live commentary.',
        image: 'https://abs.twimg.com/images/v1/og-image.248400e7.png',
        siteName: 'X',
        url: url,
        type: 'website'
      },
      'youtube.com': {
        title: 'YouTube',
        description: 'Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.',
        image: 'https://www.youtube.com/s/desktop/05bb6b44/img/favicon_144x144.png',
        siteName: 'YouTube',
        url: url,
        type: 'website'
      },
      'reddit.com': {
        title: 'Reddit - Dive into anything',
        description: 'Reddit is a network of communities where people can dive into their interests, hobbies and passions. There\'s a community for whatever you\'re interested in on Reddit.',
        image: 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
        siteName: 'Reddit',
        url: url,
        type: 'website'
      }
    };

    // Try to match the domain
    const domain = extractDomainName(url);
    const mockEntry = Object.entries(mockData).find(([key]) => domain.includes(key));

    if (mockEntry) {
      return {
        ...mockEntry[1],
        url: url
      };
    }

    // Generic fallback for unknown domains
    return {
      title: `${extractDomainName(url)} - Visit Website`,
      description: `Click to visit ${extractDomainName(url)} and explore more content.`,
      url: url,
      siteName: extractDomainName(url),
      type: 'website'
    };
  } catch (error) {
    console.warn('Failed to fetch Open Graph data:', error);
    // Return basic fallback data
    return {
      title: extractDomainName(url),
      description: 'Click to view this website',
      url: url,
    };
  }
}

function extractDomainName(url: string): string {
  try {
    let cleanUrl = url;
    if (!url.startsWith('http')) {
      cleanUrl = 'https://' + url;
    }
    const urlObj = new URL(cleanUrl);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Website';
  }
}

// Cache for Open Graph data to avoid repeated requests
const ogCache = new Map<string, OpenGraphData>();

export async function getOpenGraphData(url: string): Promise<OpenGraphData> {
  // Check cache first
  if (ogCache.has(url)) {
    return ogCache.get(url)!;
  }

  // Fetch fresh data
  const data = await fetchOpenGraphData(url);

  // Cache the result
  ogCache.set(url, data);

  return data;
}

// IMDB data extraction from HTML content
async function extractImdbDataFromHtml(html: string, url: string): Promise<{ title: string; type: string; year?: string; rating?: string; thumbnail: string; description: string }> {
  try {
    // Create a DOM parser to extract data from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const isMovie = url.includes('/title/');
    const isPerson = url.includes('/name/');

    if (isMovie) {
      // Extract movie data
      const titleElement = doc.querySelector('h1[data-testid="hero-title-block__title"]');
      const title = titleElement?.textContent?.trim() || 'Unknown Movie';

      const yearElement = doc.querySelector('.sc-8c396aa-2.jGRxWM');
      const year = yearElement?.textContent?.trim() || '';

      const ratingElement = doc.querySelector('[data-testid="hero-rating-bar__aggregate-rating__score"] span');
      const rating = ratingElement?.textContent?.trim() || '';

      const descriptionElement = doc.querySelector('[data-testid="plot-xl"]');
      const description = descriptionElement?.textContent?.trim() || 'No description available.';

      // Extract poster image - try multiple selectors
      const posterElement = doc.querySelector('img.ipc-image') ||
                          doc.querySelector('.ipc-poster') ||
                          doc.querySelector('[data-testid="hero-image__portrait"]') ||
                          doc.querySelector('meta[property="og:image"]');

      let thumbnail = '';
      if (posterElement) {
        if (posterElement.tagName === 'META') {
          thumbnail = posterElement.getAttribute('content') || '';
        } else {
          thumbnail = posterElement.getAttribute('src') || '';
        }

        // Convert to high resolution if possible
        if (thumbnail && !thumbnail.includes('@._')) {
          // IMDB uses @._ for different resolutions, try to get higher quality
          const baseUrl = thumbnail.split('@._')[0];
          if (baseUrl) {
            thumbnail = `${baseUrl}@._V1_UX600_CR0,0,600,900_AL_.jpg`;
          }
        }
      }

      return {
        title,
        type: 'Movie',
        year: year || undefined,
        rating: rating || undefined,
        thumbnail,
        description
      };
    } else if (isPerson) {
      // Extract person data
      const nameElement = doc.querySelector('h1[data-testid="hero-title-block__title"]');
      const name = nameElement?.textContent?.trim() || 'Unknown Person';

      const jobElement = doc.querySelector('[data-testid="hero-subnav-bar-section-anchor"]');
      const job = jobElement?.textContent?.trim() || '';

      // Extract person image
      const imageElement = doc.querySelector('img.ipc-image') ||
                         doc.querySelector('[data-testid="hero-image__portrait"]') ||
                         doc.querySelector('meta[property="og:image"]');

      let thumbnail = '';
      if (imageElement) {
        if (imageElement.tagName === 'META') {
          thumbnail = imageElement.getAttribute('content') || '';
        } else {
          thumbnail = imageElement.getAttribute('src') || '';
        }
      }

      // Get bio or description
      const bioElement = doc.querySelector('[data-testid="biography"]') ||
                        doc.querySelector('.ipc-html-content-inner-div');
      const description = bioElement?.textContent?.trim() || `${job} - Visit IMDb for full biography.`;

      return {
        title: name,
        type: 'Person',
        thumbnail,
        description
      };
    } else {
      return {
        title: 'IMDb',
        type: 'unknown',
        thumbnail: '',
        description: 'Visit IMDb for more information'
      };
    }
  } catch (error) {
    console.warn('Failed to parse IMDB HTML:', error);
    return {
      title: 'IMDb',
      type: 'unknown',
      thumbnail: '',
      description: 'Visit IMDb for more information'
    };
  }
}

function extractImdbData(url: string): { title: string; type: string; year?: string; rating?: string; thumbnail: string; description: string } {
  try {
    // Extract IMDB ID from URL
    const match = url.match(/imdb\.com\/(?:title|name)\/([a-z0-9]+)/);
    if (!match) {
      return {
        title: 'IMDb',
        type: 'unknown',
        thumbnail: '',
        description: 'Visit IMDb for more information'
      };
    }

    const imdbId = match[1];

    // For now, return basic data with a promise to fetch real data
    // In a real implementation, you'd fetch this from a proxy service
    // that can scrape IMDB pages and extract the actual data

    return {
      title: 'Loading IMDb data...',
      type: 'Loading',
      thumbnail: '',
      description: 'Fetching movie information from IMDb...'
    };
  } catch (error) {
    console.warn('Failed to extract IMDB data:', error);
    return {
      title: 'IMDb',
      type: 'unknown',
      thumbnail: '',
      description: 'Visit IMDb for more information'
    };
  }
}