// Debug script to test social media URL parsing
// Run this in browser console to see what's happening

// Test URLs
const testUrls = [
  'https://www.instagram.com/reel/ABC123/?igsh=NjZiM2M3MzIxNA==',
  'https://instagram.com/p/DEF456/?igsh=xyz123',
  'https://www.instagram.com/reel/GHI789/',
  'https://instagram.com/p/JKL012/',
];

// Instagram regex patterns from mediaParser.ts
const instagramPatterns = [
  /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/(?:p|reel)\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/gi,
];

console.log('🔍 Testing Instagram URL patterns...');

testUrls.forEach(url => {
  console.log('\n📝 Testing URL:', url);
  
  // Test main pattern
  const mainMatch = url.match(/https?:\/\/(?:www\.instagram\.com|instagram\.com)\/(?:p|reel)\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/);
  console.log('Main pattern match:', mainMatch);
  
  // Test extractInstagramId function patterns
  const patterns = [
    /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/p\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/,
    /https?:\/\/(?:www\.instagram\.com|instagram\.com)\/reel\/([A-Za-z0-9_-]+)(?:\/?|\?[^\s]*)?/,
  ];
  
  patterns.forEach((pattern, index) => {
    const match = url.match(pattern);
    console.log(`Pattern ${index + 1} match:`, match);
    if (match && match[1]) {
      console.log(`✅ Extracted ID: "${match[1]}"`);
    }
  });
});

console.log('\n🎯 Testing other social media URLs...');

const otherUrls = [
  'https://twitter.com/user/status/123456789',
  'https://x.com/user/status/123456789',
  'https://www.youtube.com/watch?v=ABC123def',
  'https://youtu.be/ABC123def',
  'https://www.tiktok.com/@user/video/123456789',
];

otherUrls.forEach(url => {
  console.log('\n📝 Testing URL:', url);
  
  // Twitter
  const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/([0-9]+)/);
  if (twitterMatch) {
    console.log('Twitter ID:', twitterMatch[1]);
  }
  
  // YouTube
  const youtubeMatch = url.match(/(?:www\.youtube\.com|youtube\.com)\/watch[?]v=([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    console.log('YouTube ID:', youtubeMatch[1]);
  }
  
  // TikTok
  const tiktokMatch = url.match(/(?:tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/)([a-zA-Z0-9]+)/);
  if (tiktokMatch) {
    console.log('TikTok ID:', tiktokMatch[1]);
  }
});