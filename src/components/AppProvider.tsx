import { ReactNode, useEffect, useState, useCallback } from 'react';
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

const SPOOKSTR_RELAY_URL = "wss://spookstr2.nostr1.com";

// Zod schema for AppConfig validation
const AppConfigSchema: z.ZodType<AppConfig, z.ZodTypeDef, unknown> = z.object({
  theme: z.enum(['dark', 'light', 'system']),
  relayUrl: z.string().url(),
  selectedRelays: z.array(z.string().url()).optional(),
  useProfileRelays: z.boolean().optional(),
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
        // Ensure selectedRelays exists, defaulting to [relayUrl] for backward compatibility
        if (parsed.selectedRelays === undefined) {
          parsed.selectedRelays = [parsed.relayUrl];
        }
        // Ensure useProfileRelays exists, defaulting to false
        if (parsed.useProfileRelays === undefined) {
          parsed.useProfileRelays = false;
        }
        return AppConfigSchema.parse(parsed);
      }
    }
  );

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: AppConfig) => AppConfig) => {
    setConfig(updater);
  };

  // State for computed relays that can be updated by RelayComputer
  const [computedRelays, setComputedRelays] = useState<string[]>(
    presetRelays?.map(r => r.url) || [SPOOKSTR_RELAY_URL]
  );

  // Method to toggle profile relays
  const setUseProfileRelays = useCallback((enabled: boolean) => {
    updateConfig(current => ({ ...current, useProfileRelays: enabled }));
  }, [updateConfig]);

  const appContextValue: AppContextType = {
    config,
    updateConfig,
    presetRelays,
    computedRelays,
    useProfileRelays: config.useProfileRelays || false,
    setUseProfileRelays,
    setComputedRelays,
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