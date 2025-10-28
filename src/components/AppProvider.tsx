import { ReactNode, useEffect } from 'react';
import { z } from 'zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppContext, type AppConfig, type AppContextType, type Theme } from '@/contexts/AppContext';

interface AppProviderProps {
  children: ReactNode;
  /** Application storage key */
  storageKey: string;
  /** Default app configuration */
  defaultConfig: AppConfig;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

// Zod schema for RelayConfig
const RelayConfigSchema = z.object({
  url: z.string().url(),
  mode: z.enum(['read', 'write', 'both']),
  name: z.string().optional(),
  status: z.enum(['connected', 'connecting', 'disconnected', 'error']).optional(),
  error: z.string().optional(),
  lastConnected: z.number().optional(),
});

// Zod schema for AppConfig validation
const AppConfigSchema: z.ZodType<AppConfig, z.ZodTypeDef, unknown> = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relayUrl: z.string().url(),
  selectedRelays: z.array(z.string().url()).optional(),
  relays: z.array(RelayConfigSchema).optional(),
  spookstrOnlyMode: z.boolean().optional(),
  searchRelays: z.array(z.string().url()).optional(),
  blossomServers: z.array(z.string().url()).optional(),
});

export function AppProvider(props: AppProviderProps) {
  const {
    children,
    storageKey,
    defaultConfig,
    presetRelays,
  } = props;

  // App configuration state with localStorage persistence
  const [config, setConfig] = useLocalStorage<AppConfig>(
    storageKey,
    defaultConfig,
    {
      serialize: JSON.stringify,
      deserialize: (value: string) => {
        const parsed = JSON.parse(value);

        // Migrate old single relay config to new multi-relay system
        if (!parsed.relays || parsed.relays.length === 0) {
          // Set sensible defaults with Spookstr relay first
          parsed.relays = [
            {
              url: 'wss://spookstr2.nostr1.com',
              mode: 'both' as const,
              name: 'Spookstr2',
            },
            {
              url: 'wss://relay.primal.net',
              mode: 'both' as const,
              name: 'Primal',
            },
            {
              url: 'wss://relay.nostr.band',
              mode: 'both' as const,
              name: 'Nostr.Band',
            },
          ];
          // Keep the legacy relayUrl for backward compatibility
          parsed.relayUrl = parsed.relayUrl || 'wss://spookstr2.nostr1.com';
        }

        // Ensure selectedRelays exists for backward compatibility
        if (parsed.selectedRelays === undefined) {
          parsed.selectedRelays = [parsed.relayUrl];
        }

        // Ensure searchRelays has defaults
        if (!parsed.searchRelays || parsed.searchRelays.length === 0) {
          parsed.searchRelays = [
            'wss://relay.nostr.band',
            'wss://relay.nos.social',
          ];
        }

        // Ensure blossomServers has defaults
        if (!parsed.blossomServers || parsed.blossomServers.length === 0) {
          parsed.blossomServers = [
            'https://blossom.primal.net',
            'https://cdn.satellite.earth',
          ];
        }

        return AppConfigSchema.parse(parsed);
      }
    }
  );

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: AppConfig) => AppConfig) => {
    setConfig(updater);
  };

  const appContextValue: AppContextType = {
    config,
    updateConfig,
    presetRelays,
  };

  // Apply theme effects to document
  useApplyTheme(config.theme);

  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to apply theme changes to the document root
 */
function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Handle system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
}