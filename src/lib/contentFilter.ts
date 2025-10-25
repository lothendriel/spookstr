// List of prohibited hashtags
const PROHIBITED_HASHTAGS = new Set([
  '#loli',
  '#incest', 
  '#loli',
  '#lolicon',
  '#cuntboy',
  '#agegap',
  '#underage',
  '#Lolified',
  '#lolifiedselfportrait',
  '#loli',
  '#agedifference'
]);

/**
 * Check if content contains prohibited hashtags
 * @param content The content to check
 * @returns true if content contains prohibited hashtags, false otherwise
 */
export function containsProhibitedHashtags(content: string): boolean {
  if (!content) return false;
  
  const lowerContent = content.toLowerCase();
  
  // Check each prohibited hashtag
  for (const hashtag of PROHIBITED_HASHTAGS) {
    if (lowerContent.includes(hashtag.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get list of prohibited hashtags found in content
 * @param content The content to check
 * @returns Array of prohibited hashtags found
 */
export function getProhibitedHashtags(content: string): string[] {
  if (!content) return [];
  
  const lowerContent = content.toLowerCase();
  const foundHashtags: string[] = [];
  
  // Check each prohibited hashtag
  for (const hashtag of PROHIBITED_HASHTAGS) {
    if (lowerContent.includes(hashtag.toLowerCase())) {
      foundHashtags.push(hashtag);
    }
  }
  
  return foundHashtags;
}

/**
 * Sanitize content by removing prohibited hashtags
 * @param content The content to sanitize
 * @returns Content with prohibited hashtags removed
 */
export function sanitizeContent(content: string): string {
  if (!content) return content;
  
  let sanitizedContent = content;
  
  // Remove each prohibited hashtag
  for (const hashtag of PROHIBITED_HASHTAGS) {
    // Create regex to match the hashtag with optional spaces and punctuation
    const regex = new RegExp(`\\s*${hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    sanitizedContent = sanitizedContent.replace(regex, '');
  }
  
  // Clean up extra whitespace that might be left
  return sanitizedContent.replace(/\s+/g, ' ').trim();
}

/**
 * Check if a post should be blocked based on content
 * @param content The post content
 * @returns Object containing shouldBlock and reason
 */
export function shouldBlockPost(content: string): { shouldBlock: boolean; reason: string } {
  const prohibitedHashtags = getProhibitedHashtags(content);
  
  if (prohibitedHashtags.length > 0) {
    return {
      shouldBlock: true,
      reason: `Contains prohibited hashtags: ${prohibitedHashtags.join(', ')}`
    };
  }
  
  return {
    shouldBlock: false,
    reason: ''
  };
}