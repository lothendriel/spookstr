import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';
import { nip19 } from 'nostr-tools';

/**
 * Hook for managing hidden users (hide/show functionality)
 * Users can hide posts from certain npubs and re-show them later
 */
export function useHiddenUsers() {
  const [hiddenPubkeys, setHiddenPubkeys] = useLocalStorage<string[]>('spookstr:hidden-users', []);

  /**
   * Check if a user is hidden
   */
  const isUserHidden = useCallback((pubkey: string): boolean => {
    return hiddenPubkeys.includes(pubkey);
  }, [hiddenPubkeys]);

  /**
   * Hide a user by their pubkey (hex or npub format)
   */
  const hideUser = useCallback((identifier: string) => {
    try {
      // Validate and normalize the identifier
      let pubkey: string;

      if (identifier.startsWith('npub1')) {
        // It's an npub, decode it to hex
        const decoded = nip19.decode(identifier);
        if (decoded.type === 'npub') {
          pubkey = decoded.data;
        } else {
          throw new Error('Invalid npub identifier');
        }
      } else if (/^[0-9a-fA-F]{64}$/.test(identifier)) {
        // It's already a valid 64-character hex pubkey
        pubkey = identifier.toLowerCase();
      } else {
        // It's not a valid format
        throw new Error('Invalid identifier. Please enter a valid npub (starting with npub1...) or 64-character hex pubkey');
      }

      // Validate the pubkey is 64 characters hex
      if (!/^[0-9a-f]{64}$/.test(pubkey)) {
        throw new Error('Invalid pubkey format');
      }

      setHiddenPubkeys(prev => {
        if (prev.includes(pubkey)) {
          return prev; // Already hidden
        }
        return [...prev, pubkey];
      });
    } catch (error) {
      console.error('Failed to hide user:', error);
      throw error;
    }
  }, [setHiddenPubkeys]);

  /**
   * Show a previously hidden user
   */
  const showUser = useCallback((identifier: string) => {
    try {
      // Validate and normalize the identifier
      let pubkey: string;

      if (identifier.startsWith('npub1')) {
        // It's an npub, decode it to hex
        const decoded = nip19.decode(identifier);
        if (decoded.type === 'npub') {
          pubkey = decoded.data;
        } else {
          throw new Error('Invalid npub identifier');
        }
      } else if (/^[0-9a-fA-F]{64}$/.test(identifier)) {
        // It's already a valid 64-character hex pubkey
        pubkey = identifier.toLowerCase();
      } else {
        // It's not a valid format
        throw new Error('Invalid identifier. Please enter a valid npub (starting with npub1...) or 64-character hex pubkey');
      }

      // Validate the pubkey is 64 characters hex
      if (!/^[0-9a-f]{64}$/.test(pubkey)) {
        throw new Error('Invalid pubkey format');
      }

      setHiddenPubkeys(prev => prev.filter(p => p !== pubkey));
    } catch (error) {
      console.error('Failed to show user:', error);
      throw error;
    }
  }, [setHiddenPubkeys]);

  /**
   * Toggle hide/show status for a user
   */
  const toggleUserVisibility = useCallback((identifier: string) => {
    try {
      // Validate and normalize the identifier
      let pubkey: string;

      if (identifier.startsWith('npub1')) {
        // It's an npub, decode it to hex
        const decoded = nip19.decode(identifier);
        if (decoded.type === 'npub') {
          pubkey = decoded.data;
        } else {
          throw new Error('Invalid npub identifier');
        }
      } else if (/^[0-9a-fA-F]{64}$/.test(identifier)) {
        // It's already a valid 64-character hex pubkey
        pubkey = identifier.toLowerCase();
      } else {
        // It's not a valid format
        throw new Error('Invalid identifier. Please enter a valid npub (starting with npub1...) or 64-character hex pubkey');
      }

      // Validate the pubkey is 64 characters hex
      if (!/^[0-9a-f]{64}$/.test(pubkey)) {
        throw new Error('Invalid pubkey format');
      }

      if (isUserHidden(pubkey)) {
        showUser(pubkey);
      } else {
        hideUser(pubkey);
      }
    } catch (error) {
      console.error('Failed to toggle user visibility:', error);
      throw error;
    }
  }, [isUserHidden, hideUser, showUser]);

  /**
   * Clear all hidden users
   */
  const clearHiddenUsers = useCallback(() => {
    setHiddenPubkeys([]);
  }, [setHiddenPubkeys]);

  return {
    hiddenPubkeys,
    isUserHidden,
    hideUser,
    showUser,
    toggleUserVisibility,
    clearHiddenUsers,
  };
}
