import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { nip44 } from 'nostr-tools';
import type { AppConfig } from '@/contexts/AppContext';

// NIP-78 Settings Event Kind
const SETTINGS_KIND = 30078;
const SETTINGS_IDENTIFIER = 'spookstr-settings';

interface NostrSettingsEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface EncryptedSettings {
  encrypted: string;
  version: string;
  timestamp: number;
}

export interface SettingsMetadata {
  version: string;
  timestamp: number;
  isEncrypted: boolean;
  hasNostrBackup: boolean;
  lastSync?: number;
}

/**
 * Hook for managing user settings via NIP-78 (Nostr-based storage)
 */
export function useNostrSettings() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  // Query for fetching settings from Nostr
  const {
    data: nostrSettings,
    isLoading: isLoadingNostrSettings,
    error: nostrSettingsError,
  } = useQuery({
    queryKey: ['nostr-settings', user?.pubkey],
    queryFn: async () => {
      if (!user?.pubkey || !user?.signer) {
        return null;
      }

      try {
        const signal = AbortSignal.timeout(5000);
        const events = await nostr.query([
          {
            kinds: [SETTINGS_KIND],
            authors: [user.pubkey],
            '#d': [SETTINGS_IDENTIFIER],
            limit: 1,
          }
        ], { signal });

        if (events.length === 0) {
          return null;
        }

        const latestEvent = events[0];
        
        // Check if content is encrypted (starts with NIP-44 format)
        if (latestEvent.content.startsWith('#?iv=') || latestEvent.content.includes('?iv=')) {
          // Decrypt the content
          const decryptedContent = await user.signer.nip44?.decrypt(user.pubkey, latestEvent.content);
          if (!decryptedContent) {
            throw new Error('Failed to decrypt settings');
          }
          
          return {
            ...latestEvent,
            content: decryptedContent,
            isEncrypted: true,
          };
        }

        return {
          ...latestEvent,
          isEncrypted: false,
        };
      } catch (error) {
        console.error('Error fetching Nostr settings:', error);
        throw error;
      }
    },
    enabled: !!user?.pubkey && !!user?.signer,
    retry: 2,
  });

  // Mutation for saving settings to Nostr
  const { mutate: saveSettingsToNostr, isPending: isSavingToNostr } = useMutation({
    mutationFn: async (config: AppConfig) => {
      if (!user?.pubkey || !user?.signer) {
        throw new Error('User must be logged in to save settings to Nostr');
      }

      try {
        const settingsContent = JSON.stringify({
          config,
          metadata: {
            version: '1.0',
            timestamp: Date.now(),
            app: 'spookstr',
          },
        });

        let content: string;
        const tags = [
          ['d', SETTINGS_IDENTIFIER],
          ['version', '1.0'],
          ['app', 'spookstr'],
        ];

        // Encrypt sensitive settings if user has NIP-44 support
        if (user.signer.nip44) {
          content = await user.signer.nip44.encrypt(user.pubkey, settingsContent);
          tags.push(['encrypted', 'nip44']);
        } else {
          content = settingsContent;
        }

        const event = {
          kind: SETTINGS_KIND,
          content,
          tags,
          created_at: Math.floor(Date.now() / 1000),
        };

        await publishEvent(event);
        
        // Invalidate query to refresh settings
        await queryClient.invalidateQueries({ queryKey: ['nostr-settings', user.pubkey] });
        
        return { success: true, timestamp: Date.now() };
      } catch (error) {
        console.error('Error saving settings to Nostr:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['nostr-settings', user?.pubkey] });
    },
  });

  // Mutation for deleting settings from Nostr
  const { mutate: deleteSettingsFromNostr, isPending: isDeletingFromNostr } = useMutation({
    mutationFn: async () => {
      if (!user?.pubkey) {
        throw new Error('User must be logged in to delete settings from Nostr');
      }

      try {
        // Create a deletion event (NIP-09)
        if (nostrSettings) {
          const event = {
            kind: 5, // Deletion request
            content: 'Delete user settings',
            tags: [['e', nostrSettings.id]],
            created_at: Math.floor(Date.now() / 1000),
          };

          await publishEvent(event);
        }

        // Invalidate query
        await queryClient.invalidateQueries({ queryKey: ['nostr-settings', user.pubkey] });
        
        return { success: true };
      } catch (error) {
        console.error('Error deleting settings from Nostr:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr-settings', user?.pubkey] });
    },
  });

  return {
    nostrSettings,
    isLoadingNostrSettings,
    nostrSettingsError,
    saveSettingsToNostr,
    isSavingToNostr,
    deleteSettingsFromNostr,
    isDeletingFromNostr,
    hasNostrSettings: !!nostrSettings,
    canUseNostrSettings: !!user?.pubkey && !!user?.signer,
  };
}

/**
 * Hook for managing settings metadata and sync status
 */
export function useSettingsMetadata() {
  const { user } = useCurrentUser();
  const { nostrSettings, isLoadingNostrSettings } = useNostrSettings();

  const metadata: SettingsMetadata = {
    version: '1.0',
    timestamp: Date.now(),
    isEncrypted: nostrSettings?.isEncrypted || false,
    hasNostrBackup: !!nostrSettings,
    lastSync: nostrSettings?.created_at ? nostrSettings.created_at * 1000 : undefined,
  };

  return {
    metadata,
    isLoading: isLoadingNostrSettings,
    canSync: !!user?.pubkey && !!user?.signer,
  };
}