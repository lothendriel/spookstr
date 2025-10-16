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