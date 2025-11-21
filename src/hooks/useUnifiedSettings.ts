import { useAppContext } from './useAppContext';
import { usePersonalizedHashtags } from './usePersonalizedHashtags';
import { useHiddenUsers } from './useHiddenUsers';
import { useHiddenHashtags } from './useHiddenHashtags';
import { useCallback, useEffect } from 'react';

/**
 * Hook to synchronize user preferences (personalized hashtags, hidden users, hidden hashtags)
 * between the unified AppConfig and their individual localStorage hooks
 */
export function useUnifiedSettings() {
  const { config, updateConfig } = useAppContext();
  const { 
    personalizedHashtags: localPersonalizedHashtags, 
    addPersonalizedHashtag, 
    removePersonalizedHashtag, 
    clearPersonalizedHashtags,
    togglePersonalizedHashtag 
  } = usePersonalizedHashtags();
  
  const { 
    hiddenPubkeys: localHiddenUsers, 
    hideUser, 
    showUser, 
    clearHiddenUsers,
    toggleUserVisibility 
  } = useHiddenUsers();
  
  const { 
    hiddenHashtags: localHiddenHashtags, 
    addHiddenHashtag, 
    removeHiddenHashtag, 
    clearHiddenHashtags,
    toggleHiddenHashtag 
  } = useHiddenHashtags();

  /**
   * Sync from AppConfig to individual hooks (when loading from Nostr/import)
   */
  const syncFromConfig = useCallback(() => {
    // Sync personalized hashtags
    if (config.personalizedHashtags) {
      const currentPersonalized = new Set(localPersonalizedHashtags.map(h => h.toLowerCase()));
      const configPersonalized = config.personalizedHashtags.map(h => h.toLowerCase());
      
      // Add missing hashtags
      configPersonalized.forEach(hashtag => {
        if (!currentPersonalized.has(hashtag)) {
          addPersonalizedHashtag(hashtag);
        }
      });
      
      // Remove extra hashtags
      localPersonalizedHashtags.forEach(hashtag => {
        if (!configPersonalized.includes(hashtag.toLowerCase())) {
          removePersonalizedHashtag(hashtag);
        }
      });
    }

    // Sync hidden users
    if (config.hiddenUsers) {
      const currentHidden = new Set(localHiddenUsers);
      const configHidden = config.hiddenUsers;
      
      // Add missing hidden users
      configHidden.forEach(pubkey => {
        if (!currentHidden.has(pubkey)) {
          hideUser(pubkey);
        }
      });
      
      // Remove extra hidden users
      localHiddenUsers.forEach(pubkey => {
        if (!configHidden.includes(pubkey)) {
          showUser(pubkey);
        }
      });
    }

    // Sync hidden hashtags
    if (config.hiddenHashtags) {
      const currentHidden = new Set(localHiddenHashtags.map(h => h.toLowerCase()));
      const configHidden = config.hiddenHashtags.map(h => h.toLowerCase());
      
      // Add missing hidden hashtags
      configHidden.forEach(hashtag => {
        if (!currentHidden.has(hashtag)) {
          addHiddenHashtag(hashtag);
        }
      });
      
      // Remove extra hidden hashtags
      localHiddenHashtags.forEach(hashtag => {
        if (!configHidden.includes(hashtag.toLowerCase())) {
          removeHiddenHashtag(hashtag);
        }
      });
    }
  }, [
    config,
    localPersonalizedHashtags,
    localHiddenUsers,
    localHiddenHashtags,
    addPersonalizedHashtag,
    removePersonalizedHashtag,
    hideUser,
    showUser,
    addHiddenHashtag,
    removeHiddenHashtag
  ]);

  /**
   * Sync from individual hooks to AppConfig (when user makes changes)
   */
  const syncToConfig = useCallback(() => {
    updateConfig((current) => ({
      ...current,
      personalizedHashtags: [...localPersonalizedHashtags],
      hiddenUsers: [...localHiddenUsers],
      hiddenHashtags: [...localHiddenHashtags],
    }));
  }, [
    localPersonalizedHashtags,
    localHiddenUsers,
    localHiddenHashtags,
    updateConfig
  ]);

  /**
   * Wrapper functions that sync to AppConfig after individual operations
   */
  const addPersonalizedHashtagWithSync = useCallback((hashtag: string) => {
    addPersonalizedHashtag(hashtag);
    syncToConfig();
  }, [addPersonalizedHashtag, syncToConfig]);

  const removePersonalizedHashtagWithSync = useCallback((hashtag: string) => {
    removePersonalizedHashtag(hashtag);
    syncToConfig();
  }, [removePersonalizedHashtag, syncToConfig]);

  const clearPersonalizedHashtagsWithSync = useCallback(() => {
    clearPersonalizedHashtags();
    syncToConfig();
  }, [clearPersonalizedHashtags, syncToConfig]);

  const togglePersonalizedHashtagWithSync = useCallback((hashtag: string) => {
    togglePersonalizedHashtag(hashtag);
    syncToConfig();
  }, [togglePersonalizedHashtag, syncToConfig]);

  const hideUserWithSync = useCallback((identifier: string) => {
    hideUser(identifier);
    syncToConfig();
  }, [hideUser, syncToConfig]);

  const showUserWithSync = useCallback((identifier: string) => {
    showUser(identifier);
    syncToConfig();
  }, [showUser, syncToConfig]);

  const clearHiddenUsersWithSync = useCallback(() => {
    clearHiddenUsers();
    syncToConfig();
  }, [clearHiddenUsers, syncToConfig]);

  const toggleUserVisibilityWithSync = useCallback((identifier: string) => {
    toggleUserVisibility(identifier);
    syncToConfig();
  }, [toggleUserVisibility, syncToConfig]);

  const addHiddenHashtagWithSync = useCallback((hashtag: string) => {
    addHiddenHashtag(hashtag);
    syncToConfig();
  }, [addHiddenHashtag, syncToConfig]);

  const removeHiddenHashtagWithSync = useCallback((hashtag: string) => {
    removeHiddenHashtag(hashtag);
    syncToConfig();
  }, [removeHiddenHashtag, syncToConfig]);

  const clearHiddenHashtagsWithSync = useCallback(() => {
    clearHiddenHashtags();
    syncToConfig();
  }, [clearHiddenHashtags, syncToConfig]);

  const toggleHiddenHashtagWithSync = useCallback((hashtag: string) => {
    toggleHiddenHashtag(hashtag);
    syncToConfig();
  }, [toggleHiddenHashtag, syncToConfig]);

  // Auto-sync from config when it changes (e.g., after Nostr load or import)
  useEffect(() => {
    syncFromConfig();
  }, [config.personalizedHashtags, config.hiddenUsers, config.hiddenHashtags]);

  return {
    // Original functions (for backward compatibility)
    personalizedHashtags: localPersonalizedHashtags,
    hiddenUsers: localHiddenUsers,
    hiddenHashtags: localHiddenHashtags,
    
    // Synced wrapper functions
    addPersonalizedHashtag: addPersonalizedHashtagWithSync,
    removePersonalizedHashtag: removePersonalizedHashtagWithSync,
    clearPersonalizedHashtags: clearPersonalizedHashtagsWithSync,
    togglePersonalizedHashtag: togglePersonalizedHashtagWithSync,
    
    hideUser: hideUserWithSync,
    showUser: showUserWithSync,
    clearHiddenUsers: clearHiddenUsersWithSync,
    toggleUserVisibility: toggleUserVisibilityWithSync,
    
    addHiddenHashtag: addHiddenHashtagWithSync,
    removeHiddenHashtag: removeHiddenHashtagWithSync,
    clearHiddenHashtags: clearHiddenHashtagsWithSync,
    toggleHiddenHashtag: toggleHiddenHashtagWithSync,
    
    // Utility functions
    syncFromConfig,
    syncToConfig,
  };
}