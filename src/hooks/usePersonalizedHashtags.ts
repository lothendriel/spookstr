import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';

/**
 * Hook for managing personalized hashtags for feed enhancement
 * Users can add hashtags they're interested in to see more relevant content
 */
export function usePersonalizedHashtags() {
  const [personalizedHashtags, setPersonalizedHashtags, refreshPersonalizedHashtags] = useLocalStorage<string[]>('spookstr:personalized-hashtags', []);

  /**
   * Check if a hashtag is in the personalized list
   */
  const isHashtagPersonalized = useCallback((hashtag: string): boolean => {
    // Normalize hashtag (remove # prefix, convert to lowercase)
    const normalized = hashtag.replace(/^#/, '').toLowerCase();
    return personalizedHashtags.some(h => h.toLowerCase() === normalized);
  }, [personalizedHashtags]);

  /**
   * Check if a note contains any personalized hashtags
   * @param tags - The tags array from a Nostr event
   */
  const hasPersonalizedHashtag = useCallback((tags: string[][]): boolean => {
    const noteTags = tags
      .filter(([tagName]) => tagName === 't')
      .map(([, tagValue]) => tagValue?.toLowerCase());

    return noteTags.some(tag =>
      personalizedHashtags.some(h => h.toLowerCase() === tag)
    );
  }, [personalizedHashtags]);

  /**
   * Add a hashtag to personalized list
   */
  const addPersonalizedHashtag = useCallback((hashtag: string) => {
    // Normalize hashtag (remove # prefix, trim whitespace)
    const normalized = hashtag.replace(/^#/, '').trim();

    if (!normalized) {
      throw new Error('Hashtag cannot be empty');
    }

    setPersonalizedHashtags(prev => {
      const lowerNormalized = normalized.toLowerCase();
      if (prev.some(h => h.toLowerCase() === lowerNormalized)) {
        return prev; // Already in list
      }
      return [...prev, normalized];
    });
  }, [setPersonalizedHashtags]);

  /**
   * Remove a hashtag from personalized list
   */
  const removePersonalizedHashtag = useCallback((hashtag: string) => {
    const normalized = hashtag.replace(/^#/, '').toLowerCase();
    setPersonalizedHashtags(prev => prev.filter(h => h.toLowerCase() !== normalized));
  }, [setPersonalizedHashtags]);

  /**
   * Toggle a hashtag in the personalized list
   */
  const togglePersonalizedHashtag = useCallback((hashtag: string) => {
    if (isHashtagPersonalized(hashtag)) {
      removePersonalizedHashtag(hashtag);
    } else {
      addPersonalizedHashtag(hashtag);
    }
  }, [isHashtagPersonalized, addPersonalizedHashtag, removePersonalizedHashtag]);

  /**
   * Clear all personalized hashtags
   */
  const clearPersonalizedHashtags = useCallback(() => {
    setPersonalizedHashtags([]);
  }, [setPersonalizedHashtags]);

  return {
    personalizedHashtags,
    isHashtagPersonalized,
    hasPersonalizedHashtag,
    addPersonalizedHashtag,
    removePersonalizedHashtag,
    togglePersonalizedHashtag,
    clearPersonalizedHashtags,
    refreshPersonalizedHashtags,
  };
}