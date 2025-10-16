import { useEffect } from 'react';

export function YouTubeTest() {
  useEffect(() => {
    // Test YouTube regex pattern
    const youtubePattern = /(?:youtube\.com\/watch[?]v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi;

    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://youtube.com/live/dQw4w9WgXcQ',
      'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ it\'s great!',
      'Mixed content: https://youtu.be/dQw4w9WgXcQ and https://example.com/image.jpg',
    ];

    console.log('=== Testing YouTube URL Pattern ===');
    testUrls.forEach((url, index) => {
      const match = url.match(youtubePattern);
      console.log(`${index + 1}. URL: ${url}`);
      console.log(`   Match:`, match);
      if (match && match[1]) {
        console.log(`   Video ID: ${match[1]}`);
        console.log(`   ✅ SUCCESS`);
      } else {
        console.log(`   ❌ FAILED - No match or video ID`);
      }
      console.log('---');
    });

    // Test extract function
    function extractYouTubeId(url) {
      const patterns = [
        /youtube\.com\/watch[?]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      return '';
    }

    console.log('\n=== Testing extractYouTubeId Function ===');
    testUrls.forEach((url, index) => {
      const videoId = extractYouTubeId(url);
      console.log(`${index + 1}. URL: ${url}`);
      console.log(`   Extracted ID: ${videoId}`);
      if (videoId) {
        console.log(`   ✅ SUCCESS`);
      } else {
        console.log(`   ❌ FAILED - No video ID extracted`);
      }
      console.log('---');
    });

    // Test media parsing
    const mediaPatterns = {
      directImage: /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?/gi,
      directVideo: /https?:\/\/[^\s]+\.(mp4|webm|mov|avi|mkv|flv|ogv|3gp)(?:\?[^\s]*)?/gi,
      directAudio: /https?:\/\/[^\s]+\.(mp3|wav|ogg|flac|m4a|aac|opus)(?:\?[^\s]*)?/gi,
      youtube: /(?:youtube\.com\/watch[?]v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi,
      vimeo: /vimeo\.com\/(\d+)(?:\/[\w-]+)?/gi,
      nostrImage: /immediate:\/\/[^\s]+/gi,
      nostrVideo: /stream:\/\/[^\s]+/gi,
      website: /https?:\/\/(?:www\.)?(?!youtube\.com|youtu\.be)[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?(?<!\.(?:jpg|jpeg|png|gif|webp|svg|bmp|mp4|webm|mov|avi|mkv|flv|ogv|3gp|mp3|wav|ogg|flac|m4a|aac|opus))(?:\?[^\s]*)?/gi,
    };

    function parseMediaFromContent(content) {
      const mediaItems = [];
      
      // Process YouTube URLs
      let youtubeMatch;
      const youtubeRegex = mediaPatterns.youtube;
      youtubeRegex.lastIndex = 0;
      
      while ((youtubeMatch = youtubeRegex.exec(content)) !== null) {
        const url = youtubeMatch[0];
        mediaItems.push({
          type: 'youtube',
          url: url,
        });
      }
      
      return mediaItems;
    }

    console.log('\n=== Testing Media Parsing ===');
    const testContent = 'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ it\'s amazing! Also check https://youtu.be/TEST12345678';
    const result = parseMediaFromContent(testContent);
    console.log('Content:', testContent);
    console.log('Parsed media:', result);

  }, []);

  return null;
}