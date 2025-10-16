// Test YouTube URL pattern
const youtubePattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/gi;

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

// Test the full media parser
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

function parseMediaFromContent(content) {
  const mediaItems = [];
  
  // Process YouTube URLs first
  const youtubeMatches = content.match(mediaPatterns.youtube);
  if (youtubeMatches) {
    console.log('YouTube matches found:', youtubeMatches);
    youtubeMatches.forEach(url => {
      mediaItems.push({
        type: 'youtube',
        url: url
      });
    });
  }
  
  return mediaItems;
}

console.log('\nTesting full parser:');
const testContent = 'Check out this video: https://www.youtube.com/watch?v=dQw4w9WgXcQ and this image: https://example.com/image.jpg';
const result = parseMediaFromContent(testContent);
console.log('Result:', result);