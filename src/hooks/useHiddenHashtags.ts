import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';

/**
 * Hook for managing hidden hashtags (hide/show functionality)
 * Users can hide posts containing certain hashtags and re-show them later
 */
export function useHiddenHashtags() {
  const [hiddenHashtags, setHiddenHashtags, refreshHiddenHashtags] = useLocalStorage<string[]>('spookstr:hidden-hashtags', []);

  /**
   * Check if a hashtag is hidden
   */
  const isHashtagHidden = useCallback((hashtag: string): boolean => {
    // Normalize hashtag (remove # prefix, convert to lowercase)
    const normalized = hashtag.replace(/^#/, '').toLowerCase();
    return hiddenHashtags.some(h => h.toLowerCase() === normalized);
  }, [hiddenHashtags]);

  /**
   * Check if a note contains any hidden hashtags
   * @param tags - The tags array from a Nostr event
   */
  const hasHiddenHashtag = useCallback((tags: string[][]): boolean => {
    const noteTags = tags
      .filter(([tagName]) => tagName === 't')
      .map(([, tagValue]) => tagValue?.toLowerCase());

    return noteTags.some(tag =>
      hiddenHashtags.some(h => h.toLowerCase() === tag)
    );
  }, [hiddenHashtags]);

  /**
   * Hide posts containing a specific hashtag
   */
  const hideHashtag = useCallback((hashtag: string) => {
    // Normalize hashtag (remove # prefix, trim whitespace)
    const normalized = hashtag.replace(/^#/, '').trim();

    if (!normalized) {
      throw new Error('Hashtag cannot be empty');
    }

    setHiddenHashtags(prev => {
      const lowerNormalized = normalized.toLowerCase();
      if (prev.some(h => h.toLowerCase() === lowerNormalized)) {
        return prev; // Already hidden
      }
      return [...prev, normalized];
    });
  }, [setHiddenHashtags]);

  /**
   * Show posts containing a previously hidden hashtag
   */
  const showHashtag = useCallback((hashtag: string) => {
    const normalized = hashtag.replace(/^#/, '').toLowerCase();
    setHiddenHashtags(prev => prev.filter(h => h.toLowerCase() !== normalized));
  }, [setHiddenHashtags]);

  /**
   * Toggle hide/show status for a hashtag
   */
  const toggleHashtagVisibility = useCallback((hashtag: string) => {
    if (isHashtagHidden(hashtag)) {
      showHashtag(hashtag);
    } else {
      hideHashtag(hashtag);
    }
  }, [isHashtagHidden, hideHashtag, showHashtag]);

  /**
   * Clear all hidden hashtags
   */
  const clearHiddenHashtags = useCallback(() => {
    setHiddenHashtags([]);
  }, [setHiddenHashtags]);

  return {
    hiddenHashtags,
    isHashtagHidden,
    hasHiddenHashtag,
    hideHashtag,
    showHashtag,
    toggleHashtagVisibility,
    clearHiddenHashtags,
    refreshHiddenHashtags,
  };
}
