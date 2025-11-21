import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export type RelayMode = "read" | "write" | "both";

export interface RelayConfig {
  /** Relay WebSocket URL */
  url: string;
  /** Relay mode: read, write, or both */
  mode: RelayMode;
  /** Optional custom name for the relay */
  name?: string;
  /** Connection status */
  status?: "connected" | "connecting" | "disconnected" | "error";
  /** Last connection error message */
  error?: string;
  /** Last successful connection timestamp */
  lastConnected?: number;
}

export interface AppConfig {
  /** Current theme */
  theme: Theme;
  /** Selected relay URL (for feed display) - DEPRECATED, use relays array */
  relayUrl: string;
  /** List of relays selected for notifications (optional, defaults to [relayUrl]) - DEPRECATED */
  selectedRelays?: string[];
  /** User's configured relays with read/write modes */
  relays?: RelayConfig[];
  /** When enabled, only read from the Spookstr relay */
  spookstrOnlyMode?: boolean;
  /** Search relays for content discovery and hashtag queries */
  searchRelays?: string[];
  /** Blossom servers for file uploads (with fallback support) */
  blossomServers?: string[];
  /** When enabled, includes NIP-89 client tag "conjured with Spookstr" in published events */
  includeClientTag?: boolean;
  /** Personalized hashtags for feed customization */
  personalizedHashtags?: string[];
  /** List of hidden user pubkeys */
  hiddenUsers?: string[];
  /** List of hidden hashtags */
  hiddenHashtags?: string[];
}

export interface AppContextType {
  /** Current application configuration */
  config: AppConfig;
  /** Update configuration using a callback that receives current config and returns new config */
  updateConfig: (updater: (currentConfig: AppConfig) => AppConfig) => void;
  /** Optional list of preset relays to display in the RelaySelector */
  presetRelays?: { name: string; url: string }[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);