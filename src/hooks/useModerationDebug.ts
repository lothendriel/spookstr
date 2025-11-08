/**
 * Debug utilities for troubleshooting moderation persistence issues
 */

/**
 * Check all moderation decisions in localStorage
 */
export function debugModerationLocalStorage() {
  console.log('🔍 === MODERATION LOCALSTORAGE DEBUG ===');
  
  const moderationKeys = [];
  const moderationData = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('moderation-')) {
      moderationKeys.push(key);
      
      try {
        const value = localStorage.getItem(key);
        const data = JSON.parse(value || '{}');
        moderationData.push({ key, data, value });
        
        console.log(`📱 Key: ${key}`);
        console.log(`   Raw value: ${value}`);
        console.log(`   Parsed data:`, data);
        console.log(`   ---`);
      } catch (error) {
        console.error(`❌ Failed to parse key ${key}:`, error);
        console.error(`   Raw value: ${localStorage.getItem(key)}`);
      }
    }
  }
  
  console.log(`📱 Total moderation keys found: ${moderationKeys.length}`);
  console.log(`📱 All moderation data:`, moderationData);
  
  return { keys: moderationKeys, data: moderationData };
}

/**
 * Check localStorage availability and basic functionality
 */
export function debugLocalStorageAvailability() {
  console.log('🔍 === LOCALSTORAGE AVAILABILITY DEBUG ===');
  
  try {
    // Test basic functionality
    const testKey = 'test-moderation-' + Date.now();
    const testValue = JSON.stringify({
      action: 'test',
      eventId: 'test-event-id',
      timestamp: Date.now()
    });
    
    console.log(`🧪 Testing localStorage with key: ${testKey}`);
    console.log(`🧪 Test value: ${testValue}`);
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    const parsed = JSON.parse(retrieved || '{}');
    
    console.log(`✅ Set successful`);
    console.log(`✅ Retrieved: ${retrieved}`);
    console.log(`✅ Parsed:`, parsed);
    console.log(`✅ Matches original: ${retrieved === testValue}`);
    
    // Clean up
    localStorage.removeItem(testKey);
    console.log(`✅ Cleanup successful`);
    
    return { available: true, working: true };
    
  } catch (error) {
    console.error(`❌ localStorage test failed:`, error);
    return { available: false, working: false, error: error.message };
  }
}

/**
 * Simulate the filtering logic used in usePendingPosts
 */
export function debugPendingPostsFiltering(
  allPosts: any[],
  communityId: string,
  communityAuthor: string
) {
  console.log('🔍 === PENDING POSTS FILTERING DEBUG ===');
  console.log(`📝 Input posts: ${allPosts.length}`);
  console.log(`🏠 Community ID: ${communityId}`);
  console.log(`👤 Community Author: ${communityAuthor}`);
  
  // Simulate loading local moderation decisions
  const localModeratedEvents = new Map<string, 'approve' | 'deny'>();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`moderation-${communityId}-`)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.eventId && data.action) {
          localModeratedEvents.set(data.eventId, data.action);
          console.log(`📱 Local moderation found: ${data.action} for ${data.eventId.slice(0, 8)}...`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse local moderation data:`, key, error);
      }
    }
  }
  
  console.log(`📱 Total local moderation decisions: ${localModeratedEvents.size}`);
  
  // Simulate filtering
  const filteredPosts = allPosts.filter(post => {
    const localAction = localModeratedEvents.get(post.id);
    const isLocallyModerated = localAction === 'approve' || localAction === 'deny';
    
    console.log(`📝 Post ${post.id.slice(0, 8)}...:`);
    console.log(`   Local action: ${localAction}`);
    console.log(`   Is locally moderated: ${isLocallyModerated}`);
    console.log(`   Should be filtered out: ${isLocallyModerated}`);
    
    return !isLocallyModerated;
  });
  
  console.log(`📝 Filtered posts: ${filteredPosts.length}`);
  console.log(`📝 Filtered post IDs:`, filteredPosts.map(p => p.id.slice(0, 8) + '...'));
  
  return {
    originalCount: allPosts.length,
    filteredCount: filteredPosts.length,
    localDecisions: localModeratedEvents,
    filteredPosts
  };
}