import { type NostrEvent } from '@nostrify/nostrify';

export interface MediaItem {
  type: 'image' | 'video' | 'audio' | 'youtube' | 'vimeo' | 'twitch' | 'dailymotion' | 'tiktok' | 'spotify' | 'external' | 'link' | 'hls' | 'dash' | 'imdb' | 'instagram' | 'twitter' | 'facebook';
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
    // Streaming-specific metadata
    streamingFormat?: 'hls' | 'dash';
    cdnProvider?: 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'vimeo' | 'youtube' | 'generic';
    isAdaptive?: boolean;
    qualities?: Array<{ height: number; bitrate: number; url?: string }>;
    masterPlaylist?: string;
    // IMDB-specific metadata
    type?: string;
    year?: string;
    rating?: string;
    // Facebook-specific metadata
    postId?: string;
    postType?: 'post' | 'video' | 'photo' | 'reel';
  };
}

// Media detection patterns
const mediaPatterns = {
  directImage: /https?:\/\/[^\s]+(?:\.(?:jpg|jpeg|jpe|jp|png|gif|webp|svg|bmp|avif|ico|tiff?|tif|psd|heic?|heif|jif|jfif)|@(?:jpeg|jpg|png|gif|webp|avif))(?:\?[^\s]*)?/gi,
  directVideo: /https?:\/\/[^\s]+\.(?:mp4|webm|mov|avi|mkv|flv|ogv|3gp|m4v|wmv|asf|rm|rmvb|ts|m2ts|mts|divx|xvid)(?:\?[^\s]*)?/gi,
  directAudio: /https?:\/\/[^\s]+\.(?:mp3|wav|ogg|flac|m4a|aac|opus|wma|ra|ac3|dts)(?:\?[^\s]*)?/gi,
  youtube: /(?:www\.youtube\.com\/watch[?]v=|youtube\.com\/watch[?]v=|youtu\.be\/|www\.youtube\.com\/embed\/|youtube\.com\/embed\/|www\.youtube\.com\/shorts\/|youtube\.com\/shorts\/|www\.youtube\.com\/live\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi,
  vimeo: /vimeo\.com\/(\d+)(?:\/[\w-]+)?/gi,
  twitch: /(?:twitch\.tv\/videos\/|twitch\.tv\/)(\w+)(?:\/videos\/(\d+))?/gi,
  dailymotion: /(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/gi,
  tiktok: /(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)([a-zA-Z0-9]+)/gi,
  spotify: /(?:open\.spotify\.com\/)(track|album|playlist|artist|show|episode)\/([a-zA-Z0-9]+)/gi,
  instagram: /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/(?:p|reel)\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/gi,
  twitter: /(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/([0-9]+)/gi,
  facebook: /https?:\/\/(?:www\.facebook\.com|facebook\.com)\/(?:[^\/]+\/posts\/|[^\/]+\/activity\/|[^\/]+\/photos\/|[^\/]+\/videos\/|permalink\.php\?story_fbid=|story\.php\?story_fbid=|groups\/[^\/]+\/permalink\/)([0-9]+)/gi,
  nostrImage: /immediate:\/\/[^\s]+/gi,
  nostrVideo: /stream:\/\/[^\s]+/gi,
  // Streaming formats
  hls: /https?:\/\/[^\s]+\.m3u8(?:\?[^\s]*)?/gi,
  dash: /https?:\/\/[^\s]+\.mpd(?:\?[^\s]*)?/gi,
  // CDN-specific patterns
  cloudflareStream: /https?:\/\/(?:[a-z0-9-]+\.)?cloudflarestream\.com\/[^\s]+/gi,
  cloudflareVideoDelivery: /https?:\/\/(?:[a-z0-9-]+\.)?videodelivery\.net\/[^\s]+/gi,
  awsCloudFront: /https?:\/\/[a-z0-9-]+\.cloudfront\.net\/[^\s]+/gi,
  fastly: /https?:\/\/(?:[a-z0-9-]+\.)?(?:fastly\.net|fastly-ssl\.net)\/[^\s]+/gi,
  akamai: /https?:\/\/(?:[a-z0-9-]+\.)?(?:akamaized\.net|akamaihd\.net)\/[^\s]+/gi,
  vimeoCDN: /https?:\/\/(?:[a-z0-9-]+\.)?vimeocdn\.com\/[^\s]+/gi,
  youtubeCDN: /https?:\/\/(?:[a-z0-9-]+\.)?googlevideo\.com\/[^\s]+/gi,
  // Generic streaming endpoints that might be on CDNs
  genericStreaming: /https?:\/\/[^\s]+\/(?:stream|manifest|playlist|master)\/[^\s]+(?:\.(?:m3u8|mpd|dash))(?:\?[^\s]*)?/gi,
  // Common image hosting services that often serve images without extensions
  // This pattern catches domains that are known to serve media content
  imageHosting: /https?:\/\/(?:i\.imgur\.com|images\.imgur\.com|preview\.redd\.it|i\.redd\.it|pbs\.twimg\.com|cdn\.discordapp\.com|media\.discordapp\.net|attachments|camo\.githubusercontent\.com|user-images\.githubusercontent\.com|images\.unsplash\.com|images\.pexels\.com|dl\.dropboxusercontent\.com|lh3\.googleusercontent\.com|storage\.googleapis\.com|cloudinary\.com|images\.prismic\.io|www\.dropbox\.com\/s|cdn\.instagram\.com|scontent\.instagram\.com|fbcdn\.net|platform\.twitter\.com|cdn\.bsky\.app|image\.nostr\.build|nostr\.build|void\.cat|cdn\.satellite\.earth|media\.tenor\.com|media\.giphy\.com|media\.witter\.cz|files\.mastodon\.social|media\.mas\.to|scontent\.facebook\.com|external\.facebook\.com|lookaside\.fbsbx\.com)\/[^\s]+/gi,
  // Generic CDN/media URLs - catches URLs with media-like path structures
  // This pattern looks for URLs containing common media path segments like /media/, /attachments/, /files/, etc
  genericCDN: /https?:\/\/[^\s]+\/(?:media|attachments|files|assets|images|static|uploads|content|cdn-cgi|mediaproxy)(?:_attachments)?\/[^\s]+/gi,
  // IMDB links for special preview handling
  imdb: /https?:\/\/(?:www\.)?imdb\.com\/(?:title|name)\/(?:[a-z0-9]+)(?:\/[^\s]*)?/gi,
  website: /https?:\/\/(?:www\.)?(?!www\.youtube\.com|youtube\.com|youtu\.be|vimeo\.com|twitch\.tv|dailymotion\.com|tiktok\.com|open\.spotify\.com|i\.imgur\.com|images\.imgur\.com|preview\.redd\.it|i\.redd\.it|pbs\.twimg\.com|cdn\.discordapp\.com|media\.discordapp\.net|attachments|camo\.githubusercontent\.com|user-images\.githubusercontent\.com|images\.unsplash\.com|images\.pexels\.com|dl\.dropbox\.com|lh3\.googleusercontent\.com|storage\.googleapis\.com|cloudinary\.com|images\.prismic\.io|www\.dropbox\.com\/s|cdn\.instagram\.com|scontent\.instagram\.com|fbcdn\.net|platform\.twitter\.com|cdn\.bsky\.app|image\.nostr\.build|nostr\.build|void\.cat|cdn\.satellite\.earth|media\.tenor\.com|media\.giphy\.com|media\.witter\.cz|files\.mastodon\.social|media\.mas\.to|blossom\.primal\.net|media\.channels\.im|cdn\.masto\.host|media\.pubeurope\.com|o\.mastodon\.nz|social\.anoxinon\.de|imdb\.com|instagram\.com|twitter\.com|x\.com|facebook\.com)[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?(?<!\.(?:jpg|jpeg|jpe|jp|j|png|pn|p|gif|gi|g|webp|svg|bmp|avif|ico|tiff?|tif|psd|heic?|heif|jif|jfif|mp4|webm|mov|avi|mkv|flv|ogv|3gp|m4v|wmv|asf|rm|rmvb|ts|m2ts|mts|divx|xvid|mp3|wav|ogg|flac|m4a|aac|opus|wma|ra|ac3|dts))(?:\?[^\s]*)?/gi,
};

// Helper function to normalize URLs (ensure HTTPS and consistent format)
function normalizeUrl(url: string): string {
  try {
    // Add protocol if missing
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    const urlObj = new URL(fullUrl);
    // Ensure HTTPS
    urlObj.protocol = 'https:';
    return urlObj.toString();
  } catch {
    return url;
  }
}

export function parseMediaFromContent(content: string): MediaItem[] {
  const mediaItems: MediaItem[] = [];
  const processedUrls = new Set<string>(); // Track URLs we've already processed

  console.log('🔍 Parsing content:', content.substring(0, 300));

  // Process YouTube URLs first
  // Create a new RegExp instance to avoid shared state issues
  const youtubeRegex = new RegExp(mediaPatterns.youtube.source, mediaPatterns.youtube.flags);
  let youtubeMatch;

  console.log('🎬 YouTube regex pattern:', youtubeRegex.source);

  while ((youtubeMatch = youtubeRegex.exec(content)) !== null) {
    const url = youtubeMatch[0];
    const normalizedUrl = normalizeUrl(url);
    if (!processedUrls.has(normalizedUrl)) {
      console.log('✅ Matched as youtube:', url);
      console.log('🎬 YouTube match groups:', youtubeMatch);
      const mediaItem = createMediaItem(url, 'youtube', youtubeMatch);
      if (mediaItem) {
        mediaItems.push(mediaItem);
        processedUrls.add(normalizedUrl);
      }
    } else {
      console.log('⏭️  YouTube URL already processed:', url);
    }
  }

  // Process other media types in order of precedence
  const mediaTypes = ['directImage', 'directVideo', 'directAudio', 'hls', 'dash', 'cloudflareStream', 'cloudflareVideoDelivery', 'awsCloudFront', 'fastly', 'akamai', 'vimeoCDN', 'youtubeCDN', 'genericStreaming', 'vimeo', 'twitch', 'dailymotion', 'tiktok', 'spotify', 'instagram', 'twitter', 'facebook', 'imdb', 'genericCDN'];
  mediaTypes.forEach(type => {
    const pattern = mediaPatterns[type as keyof typeof mediaPatterns];
    if (!pattern) return;

    // Create a new RegExp instance to avoid shared state issues
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const url = match[0];
      const normalizedUrl = normalizeUrl(url);
      if (!processedUrls.has(normalizedUrl)) {
        console.log(`✅ Matched as ${type}:`, url);
        const mediaItem = createMediaItem(url, type, match);
        if (mediaItem) {
          mediaItems.push(mediaItem);
          processedUrls.add(normalizedUrl);
        }
      }
    }
  });

  // Process image hosting services last (only if not already caught by directImage)
  const imageHostingPattern = mediaPatterns.imageHosting;
  if (imageHostingPattern) {
    // Create a new RegExp instance to avoid shared state issues
    const regex = new RegExp(imageHostingPattern.source, imageHostingPattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const url = match[0];
      const normalizedUrl = normalizeUrl(url);
      if (!processedUrls.has(normalizedUrl)) {
        console.log('✅ Matched as imageHosting:', url);
        const mediaItem = createMediaItem(url, 'imageHosting', match);
        if (mediaItem) {
          mediaItems.push(mediaItem);
          processedUrls.add(normalizedUrl);
        }
      }
    }
  }

  // Process website links last (excluding already processed URLs)
  const websitePattern = mediaPatterns.website;
  if (websitePattern) {
    // Create a new RegExp instance to avoid shared state issues
    const regex = new RegExp(websitePattern.source, websitePattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const url = match[0];
      const normalizedUrl = normalizeUrl(url);

      // Check if this looks like a YouTube URL that should have been caught
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        console.log('⚠️  YouTube URL detected in website pattern:', url);
        console.log('🔍 Website regex negative lookahead check:', {
          hasYoutube: url.includes('youtube.com'),
          hasYoutuBe: url.includes('youtu.be'),
          hasWwwYoutube: url.includes('www.youtube.com')
        });
      }

      // Skip if this URL was already processed as any media type
      // This prevents duplicate rendering of images, videos, etc. as link cards
      if (processedUrls.has(normalizedUrl)) {
        console.log('⏭️  Skipping (already processed):', url);
        continue;
      }

      console.log('🔗 Matched as website:', url);
      const mediaItem = createMediaItem(url, 'website', match);
      if (mediaItem) {
        mediaItems.push(mediaItem);
        processedUrls.add(normalizedUrl);
      }
    }
  }

  console.log('📦 Final mediaItems:', mediaItems.map(m => ({ type: m.type, url: m.url.substring(0, 60) + '...' })));
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
      case 'genericCDN':
        // genericCDN URLs are treated as images since they're typically media attachments
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

      case 'hls':
        return {
          type: 'hls',
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'HLS'),
          metadata: {
            streamingFormat: 'hls',
            cdnProvider: detectCDNProvider(cleanUrl),
            isAdaptive: true,
            format: 'm3u8'
          }
        };

      case 'dash':
        return {
          type: 'dash',
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'DASH'),
          metadata: {
            streamingFormat: 'dash',
            cdnProvider: detectCDNProvider(cleanUrl),
            isAdaptive: true,
            format: 'mpd'
          }
        };

      case 'cloudflareStream':
      case 'cloudflareVideoDelivery':
        return {
          type: 'hls', // Cloudflare Stream uses HLS
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'Cloudflare Stream'),
          metadata: {
            streamingFormat: 'hls',
            cdnProvider: 'cloudflare',
            isAdaptive: true,
            format: 'm3u8'
          }
        };

      case 'awsCloudFront':
        return {
          type: detectStreamingFormat(cleanUrl),
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'AWS CloudFront'),
          metadata: {
            streamingFormat: detectStreamingFormat(cleanUrl) === 'hls' ? 'hls' : 'dash',
            cdnProvider: 'aws-cloudfront',
            isAdaptive: true,
            format: detectFileExtension(cleanUrl)
          }
        };

      case 'fastly':
        return {
          type: detectStreamingFormat(cleanUrl),
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'Fastly'),
          metadata: {
            streamingFormat: detectStreamingFormat(cleanUrl) === 'hls' ? 'hls' : 'dash',
            cdnProvider: 'fastly',
            isAdaptive: true,
            format: detectFileExtension(cleanUrl)
          }
        };

      case 'akamai':
        return {
          type: detectStreamingFormat(cleanUrl),
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'Akamai'),
          metadata: {
            streamingFormat: detectStreamingFormat(cleanUrl) === 'hls' ? 'hls' : 'dash',
            cdnProvider: 'akamai',
            isAdaptive: true,
            format: detectFileExtension(cleanUrl)
          }
        };

      case 'vimeoCDN':
        return {
          type: 'hls', // Vimeo CDN typically uses HLS
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'Vimeo CDN'),
          metadata: {
            streamingFormat: 'hls',
            cdnProvider: 'vimeo',
            isAdaptive: true,
            format: 'm3u8'
          }
        };

      case 'youtubeCDN':
        return {
          type: 'hls', // YouTube CDN uses HLS/DASH
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'YouTube CDN'),
          metadata: {
            streamingFormat: 'hls',
            cdnProvider: 'youtube',
            isAdaptive: true,
            format: 'm3u8'
          }
        };

      case 'genericStreaming':
        return {
          type: detectStreamingFormat(cleanUrl),
          url: cleanUrl,
          title: extractStreamingTitle(cleanUrl, 'Streaming'),
          metadata: {
            streamingFormat: detectStreamingFormat(cleanUrl) === 'hls' ? 'hls' : 'dash',
            cdnProvider: 'generic',
            isAdaptive: true,
            format: detectFileExtension(cleanUrl)
          }
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

      case 'instagram':
        const instagramId = extractInstagramId(cleanUrl);
        const instagramType = cleanUrl.includes('/reel/') ? 'reel' : 'post';
        return {
          type: 'instagram',
          url: cleanUrl,
          title: `Instagram ${instagramType.charAt(0).toUpperCase() + instagramType.slice(1)}`,
          metadata: {
            instagramId,
            instagramType
          }
        };

      case 'twitter':
        const tweetId = extractTwitterId(cleanUrl);
        return {
          type: 'twitter',
          url: cleanUrl,
          title: 'Twitter Post',
          metadata: {
            tweetId
          }
        };

      case 'facebook':
        const facebookPostId = extractFacebookId(cleanUrl);
        const facebookPostType = detectFacebookPostType(cleanUrl);
        return {
          type: 'facebook',
          url: cleanUrl,
          title: `Facebook ${facebookPostType.charAt(0).toUpperCase() + facebookPostType.slice(1)}`,
          metadata: {
            postId: facebookPostId,
            postType: facebookPostType
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

// IMDB data extraction - fetch real movie data
export async function fetchImdbData(url: string): Promise<{ title: string; type: string; year?: string; rating?: string; thumbnail: string; description: string }> {
  try {
    // Extract IMDB ID from URL
    const match = url.match(/imdb\.com\/(title|name)\/([a-z0-9]+)/);
    if (!match) {
      throw new Error('Invalid IMDB URL');
    }

    const [, itemType, imdbId] = match;
    const isMovie = itemType === 'title';

    // Try multiple CORS proxies with timeout
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let html = '';
    let lastError: Error | null = null;

    // Try each proxy with a 5 second timeout
    for (const proxyUrl of proxies) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(proxyUrl, {
          headers: {
            'Accept': 'application/json, text/html',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Handle different proxy response formats
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          html = data.contents || data.body || '';
        } else {
          html = await response.text();
        }

        if (html) {
          console.log(`✅ Successfully fetched IMDB data via ${proxyUrl.split('?')[0]}`);
          break; // Success, exit the loop
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to fetch from ${proxyUrl.split('?')[0]}:`, error);
        continue; // Try next proxy
      }
    }

    if (!html) {
      throw lastError || new Error('All proxies failed');
    }

    // Parse HTML to extract data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    if (isMovie) {
      // Extract movie data from meta tags (more reliable than DOM structure)
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

      // Extract title and year from og:title (format: "Movie Title (Year)")
      const titleMatch = ogTitle.match(/^(.+?)\s*\((\d{4})\)/);
      const title = titleMatch ? titleMatch[1] : ogTitle || 'Unknown Movie';
      const year = titleMatch ? titleMatch[2] : undefined;

      // Try to extract rating from JSON-LD script
      let rating: string | undefined;
      const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const script of Array.from(scripts)) {
        try {
          const jsonData = JSON.parse(script.textContent || '{}');
          if (jsonData.aggregateRating?.ratingValue) {
            rating = String(jsonData.aggregateRating.ratingValue);
            break;
          }
        } catch {
          // Ignore JSON parse errors
        }
      }

      // Convert image to higher resolution
      let thumbnail = ogImage;
      if (thumbnail && thumbnail.includes('._V1_')) {
        // IMDB uses ._V1_ for different resolutions
        const baseUrl = thumbnail.split('._V1_')[0];
        if (baseUrl) {
          thumbnail = `${baseUrl}._V1_QL75_UX380_CR0,0,380,562_.jpg`;
        }
      }

      return {
        title,
        type: 'Movie',
        year,
        rating,
        thumbnail,
        description: ogDescription || 'No description available.'
      };
    } else {
      // Extract person data
      const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || 'Unknown Person';
      const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const ogDescription = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

      let thumbnail = ogImage;
      if (thumbnail && thumbnail.includes('._V1_')) {
        const baseUrl = thumbnail.split('._V1_')[0];
        if (baseUrl) {
          thumbnail = `${baseUrl}._V1_QL75_UX380_.jpg`;
        }
      }

      return {
        title: ogTitle,
        type: 'Person',
        thumbnail,
        description: ogDescription || 'Visit IMDb for full biography.'
      };
    }
  } catch (error) {
    console.warn('Failed to fetch IMDB data:', error);
    return {
      title: 'IMDb',
      type: 'Movie',
      thumbnail: '',
      description: 'Unable to load movie information. Visit IMDb for more details.'
    };
  }
}

// Helper functions for CDN and streaming detection

function detectCDNProvider(url: string): 'cloudflare' | 'aws-cloudfront' | 'fastly' | 'akamai' | 'vimeo' | 'youtube' | 'generic' {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('cloudflarestream.com') || hostname.includes('videodelivery.net')) {
      return 'cloudflare';
    } else if (hostname.includes('cloudfront.net')) {
      return 'aws-cloudfront';
    } else if (hostname.includes('fastly.net') || hostname.includes('fastly-ssl.net')) {
      return 'fastly';
    } else if (hostname.includes('akamaized.net') || hostname.includes('akamaihd.net')) {
      return 'akamai';
    } else if (hostname.includes('vimeocdn.com')) {
      return 'vimeo';
    } else if (hostname.includes('googlevideo.com')) {
      return 'youtube';
    }
  } catch (error) {
    console.warn('Failed to detect CDN provider:', error);
  }

  return 'generic';
}

function detectStreamingFormat(url: string): 'hls' | 'dash' | 'video' {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    if (pathname.endsWith('.m3u8')) {
      return 'hls';
    } else if (pathname.endsWith('.mpd')) {
      return 'dash';
    } else if (pathname.includes('manifest') || pathname.includes('playlist') || pathname.includes('master')) {
      // Try to infer from URL structure
      if (pathname.includes('hls') || url.includes('m3u8')) {
        return 'hls';
      } else if (pathname.includes('dash') || url.includes('mpd')) {
        return 'dash';
      }
    }
  } catch (error) {
    console.warn('Failed to detect streaming format:', error);
  }

  // Default to regular video if we can't determine
  return 'video';
}

function extractStreamingTitle(url: string, provider: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop()?.split('?')[0];

    if (filename && filename !== '') {
      // Clean up the filename for display
      const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
      return `${provider}: ${nameWithoutExt.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    }
  } catch (error) {
    console.warn('Failed to extract streaming title:', error);
  }

  return `${provider} Stream`;
}

function detectFileExtension(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop()?.split('?')[0];

    if (filename && filename.includes('.')) {
      return filename.split('.').pop()?.toLowerCase() || 'unknown';
    }
  } catch (error) {
    console.warn('Failed to detect file extension:', error);
  }

  return 'unknown';
}

// Helper function to extract Instagram ID from URL
function extractInstagramId(url: string): string {
  try {
    console.log('📷 Extracting Instagram ID from:', url);

    // Handle various Instagram URL formats including www subdomains and both p/ and reel/
    // Updated pattern to handle URLs with query parameters properly
    const patterns = [
      /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/p\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/,
      /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/reel\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/,
    ];

    // Also try a more comprehensive pattern that combines both p and reel
    const comprehensivePattern = /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
    console.log('🔍 Testing comprehensive pattern:', comprehensivePattern);
    const comprehensiveMatch = url.match(comprehensivePattern);
    if (comprehensiveMatch && comprehensiveMatch[1]) {
      console.log('✅ Instagram ID extracted via comprehensive pattern:', comprehensiveMatch[1]);
      return comprehensiveMatch[1];
    }

    // Try individual patterns
    for (const pattern of patterns) {
      console.log('🔍 Testing pattern:', pattern);
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Instagram ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    // Try even more basic pattern as fallback
    const basicPattern = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
    console.log('🔍 Testing basic pattern:', basicPattern);
    const basicMatch = url.match(basicPattern);
    if (basicMatch && basicMatch[1]) {
      console.log('✅ Instagram ID extracted via basic pattern:', basicMatch[1]);
      return basicMatch[1];
    }

    console.warn('❌ No Instagram ID found in URL:', url);
    console.warn('🔍 URL parts:', url.split('/'));
    console.warn('🔍 Query parameters:', url.split('?')[1]);
  } catch (error) {
    console.warn('Failed to extract Instagram ID from:', url, error);
  }

  return '';
}

// Helper function to extract Twitter ID from URL
function extractTwitterId(url: string): string {
  try {
    console.log('🐦 Extracting Twitter ID from:', url);

    // Handle both twitter.com and x.com URLs
    const patterns = [
      /twitter\.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/,
      /x\.com\/[a-zA-Z0-9_]+\/status\/([0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Twitter ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    console.warn('❌ No Twitter ID found in URL:', url);
  } catch (error) {
    console.warn('Failed to extract Twitter ID from:', url, error);
  }

  return '';
}

// Helper function to extract Facebook post ID from URL
function extractFacebookId(url: string): string {
  try {
    console.log('📘 Extracting Facebook ID from:', url);

    // Handle various Facebook URL formats
    const patterns = [
      /facebook\.com\/[^\/]+\/posts\/([0-9]+)/,
      /facebook\.com\/[^\/]+\/activity\/([0-9]+)/,
      /facebook\.com\/[^\/]+\/photos\/([0-9]+)/,
      /facebook\.com\/[^\/]+\/videos\/([0-9]+)/,
      /facebook\.com\/permalink\.php\?story_fbid=([0-9]+)/,
      /facebook\.com\/story\.php\?story_fbid=([0-9]+)/,
      /facebook\.com\/groups\/[^\/]+\/permalink\/([0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log('✅ Facebook ID extracted:', match[1], 'using pattern:', pattern);
        return match[1];
      }
    }

    console.warn('❌ No Facebook ID found in URL:', url);
  } catch (error) {
    console.warn('Failed to extract Facebook ID from:', url, error);
  }

  return '';
}

// Helper function to detect Facebook post type
function detectFacebookPostType(url: string): 'post' | 'video' | 'photo' | 'reel' {
  try {
    if (url.includes('/videos/')) {
      return 'video';
    } else if (url.includes('/photos/')) {
      return 'photo';
    } else if (url.includes('/reels/')) {
      return 'reel';
    }

    // Default to post for other types
    return 'post';
  } catch (error) {
    console.warn('Failed to detect Facebook post type from:', url, error);
    return 'post';
  }
}

// Placeholder data for IMDB links (actual data will be fetched asynchronously by the component)
function extractImdbData(url: string): { title: string; type: string; year?: string; rating?: string; thumbnail: string; description: string } {
  try {
    // Extract IMDB ID from URL for the placeholder
    const match = url.match(/imdb\.com\/(title|name)\/([a-z0-9]+)/);
    if (!match) {
      return {
        title: 'IMDb',
        type: 'Movie',
        thumbnail: '',
        description: 'Visit IMDb for more information'
      };
    }

    const [, itemType] = match;
    const isMovie = itemType === 'title';

    // Return placeholder that will be replaced by the component
    return {
      title: 'Loading...',
      type: isMovie ? 'Movie' : 'Person',
      thumbnail: '',
      description: 'Fetching information from IMDb...'
    };
  } catch (error) {
    console.warn('Failed to extract IMDB data:', error);
    return {
      title: 'IMDb',
      type: 'Movie',
      thumbnail: '',
      description: 'Visit IMDb for more information'
    };
  }
}