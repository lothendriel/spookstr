import { useEffect } from 'react';

export function YouTubeDebug() {
  useEffect(() => {
    // Test YouTube URL pattern
    const youtubePattern = /(?:youtube\.com\/watch[?]v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi;

    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://youtube.com/live/dQw4w9WgXcQ',
      'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ it\'s great!',
    ];

    console.log('Testing YouTube URL pattern:');
    testUrls.forEach(url => {
      const match = url.match(youtubePattern);
      console.log(`URL: ${url}`);
      console.log(`Match:`, match);
      console.log('---');
    });

    // Test the extract function
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

    console.log('\nTesting extractYouTubeId:');
    testUrls.forEach(url => {
      const id = extractYouTubeId(url);
      console.log(`URL: ${url}`);
      console.log(`Extracted ID: ${id}`);
      console.log('---');
    });
  }, []);

  return null;
}