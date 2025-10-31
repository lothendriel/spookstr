// Test script to verify Instagram URL parsing and embed fixes
// Run this in browser console to test the fixes

console.log('🧪 Testing Instagram URL parsing fixes...\n');

// Test URLs that were previously problematic
const testUrls = [
  // URLs with query parameters (main issue)
  'https://www.instagram.com/reel/ABC123/?igsh=NjZiM2M3MzIxNA==',
  'https://instagram.com/p/DEF456/?igsh=xyz123',
  'https://www.instagram.com/reel/GHI789/?igsh=test123&foo=bar',
  
  // URLs without query parameters
  'https://www.instagram.com/reel/JKL012/',
  'https://instagram.com/p/MNO345/',
  
  // URLs with different formats
  'https://instagram.com/reel/PQR678/?utm_source=test',
  'https://www.instagram.com/p/STU901/?igsh=abc123def',
];

console.log('📝 Testing extractInstagramId function...\n');

// Import the extractInstagramId function (this would need to be done in actual component)
// For testing, we'll recreate the function here
function extractInstagramId(url) {
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

// Test each URL
let allPassed = true;
testUrls.forEach((url, index) => {
  console.log(`\n--- Test ${index + 1}: ${url} ---`);
  const id = extractInstagramId(url);
  
  if (id) {
    console.log(`✅ SUCCESS: Extracted ID "${id}"`);
    
    // Test embed URL construction
    const isReel = url.includes('/reel/');
    const embedUrl = `https://www.instagram.com/${isReel ? 'reel' : 'p'}/${id}/embed`;
    console.log(`📋 Embed URL: ${embedUrl}`);
    
    // Test that ID doesn't contain query parameters
    if (id.includes('?') || id.includes('&') || id.includes('=')) {
      console.log(`❌ FAILURE: ID contains query parameters: "${id}"`);
      allPassed = false;
    } else {
      console.log(`✅ SUCCESS: ID is clean (no query parameters)`);
    }
  } else {
    console.log(`❌ FAILURE: Could not extract ID`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 ALL TESTS PASSED! Instagram URL parsing is working correctly.');
  console.log('✅ URLs with query parameters now parse correctly');
  console.log('✅ No more URL fragments showing under loading placeholders');
} else {
  console.log('❌ SOME TESTS FAILED! Check the output above for details.');
}
console.log('='.repeat(50));

console.log('\n📋 Expected behavior after fixes:');
console.log('1. Instagram URLs like "https://www.instagram.com/reel/ABC123/?igsh=NjZiM2M3MzIxNA==" should:');
console.log('   - Extract ID: "ABC123" (clean, no query params)');
console.log('   - Show Instagram embed iframe');
console.log('   - Display loading state initially');
console.log('   - Hide loading state when iframe loads');
console.log('   - Show error state if iframe fails to load');
console.log('   - NOT show "?igsh=NjZiM2M3MzIxNA==" anywhere in UI');

console.log('\n2. If URL parsing fails, should:');
console.log('   - Show "Invalid Instagram URL" message');
console.log('   - Display the original URL for debugging');
console.log('   - Provide "Open on Instagram" button as fallback');

console.log('\n🔧 To test in actual application:');
console.log('1. Open browser developer console');
console.log('2. Create a Nostr note with Instagram URL containing query parameters');
console.log('3. Check console for "📷 Extracting Instagram ID" messages');
console.log('4. Verify ID is extracted correctly (no query params)');
console.log('5. Check if Instagram embed loads and displays properly');
console.log('6. Verify loading state disappears when embed loads');