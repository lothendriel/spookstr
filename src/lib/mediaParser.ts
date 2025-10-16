import { type NostrEvent } from '@nostrify/nostrify';

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'youtube' | 'vimeo' | 'external' | 'link';
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
  };
}

// Media detection patterns
const mediaPatterns = {
  directImage: /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?/gi,
  directVideo: /https?:\/\/[^\s]+\.(mp4|webm|mov|avi|mkv|flv|ogv|3gp)(?:\?[^\s]*)?/gi,
  directAudio: /https?:\/\/[^\s]+\.(mp3|wav|ogg|flac|m4a|aac|opus)(?:\?[^\s]*)?/gi,
  youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi,
  vimeo: /vimeo\.com\/(\d+)(?:\/[\w-]+)?/gi,
  nostrImage: /immediate:\/\/[^\s]+/gi,
  nostrVideo: /stream:\/\/[^\s]+/gi,
  website: /https?:\/\/(?:www\.)?(?!youtube\.com|youtu\.be)[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?(?<!\.(?:jpg|jpeg|png|gif|webp|svg|bmp|mp4|webm|mov|avi|mkv|flv|ogv|3gp|mp3|wav|ogg|flac|m4a|aac|opus))(?:\?[^\s]*)?/gi,
};

export function parseMediaFromContent(content: string): MediaItem[] {
  const mediaItems: MediaItem[] = [];
  
  // Process YouTube URLs first
  const youtubeMatches = content.match(mediaPatterns.youtube);
  if (youtubeMatches) {
    youtubeMatches.forEach(url => {
      const mediaItem = createMediaItem(url, 'youtube', [url, '', '']);
      if (mediaItem) {
        mediaItems.push(mediaItem);
      }
    });
  }
  
  // Process other media types
  const mediaTypes = ['directImage', 'directVideo', 'directAudio', 'vimeo'];
  mediaTypes.forEach(type => {
    const pattern = mediaPatterns[type as keyof typeof mediaPatterns];
    if (!pattern) return;
    
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[0];
      const mediaItem = createMediaItem(url, type, match);
      if (mediaItem) {
        mediaItems.push(mediaItem);
      }
    }
  });
  
  // Process website links last (excluding YouTube)
  const websitePattern = mediaPatterns.website;
  if (websitePattern) {
    let match;
    while ((match = websitePattern.exec(content)) !== null) {
      const url = match[0];
      // Skip if this URL was already processed as YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) continue;
      
      const mediaItem = createMediaItem(url, 'website', match);
      if (mediaItem) {
        mediaItems.push(mediaItem);
      }
    }
  }

  return mediaItems;
}

function createMediaItem(url: string, type: string, match: RegExpMatchArray): MediaItem | null {
  try {
    const urlObj = new URL(url);

    // Validate and normalize URL
    const cleanUrl = normalizeUrl(url);

    switch (type) {
      case 'directImage':
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
  const filename = url.split('/').pop()?.split('?')[0];
  if (filename) {
    const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
    return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Image';
}

function extractImageMetadata(url: string) {
  const format = url.split('.').pop()?.split('?')[0]?.toLowerCase();
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
  const format = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  return {
    format: format || 'unknown',
    fps: 30, // Default assumption
    bitrate: 0, // Would be extracted in real implementation
  };
}

function extractAudioTitle(url: string, match: RegExpMatchArray): string {
  const filename = url.split('/').pop()?.split('?')[0];
  if (filename) {
    const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
    return nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return 'Audio Track';
}

function extractAudioMetadata(url: string) {
  const format = url.split('.').pop()?.split('?')[0]?.toLowerCase();
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
    const urlObj = new URL(url);
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