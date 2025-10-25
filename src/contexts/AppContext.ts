import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Selected relay URL (for feed display) */
  relayUrl: string;
  /** List of relays selected for notifications (optional, defaults to [relayUrl]) */
  selectedRelays?: string[];
  /** Whether to use user's profile relays */
  useProfileRelays?: boolean;
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: AppConfig) => AppConfig) => void;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
  /** Computed list of relays including profile relays and Spookstr */
  computedRelays: string[];
  /** Whether profile relays are enabled */
  useProfileRelays: boolean;
  /** Set whether to use profile relays */
  setUseProfileRelays: (enabled: boolean) => void;
  /** Update computed relays (used by RelayComputer) */
  setComputedRelays: (relays: string[]) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);