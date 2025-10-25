import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { NostrProvider } from '@nostrify/react';

// Define app config type
export type AppConfig = {
  theme: 'light' | 'dark';
  relays: string[];
};

const defaultConfig: AppConfig = {
  theme: 'light',
  relays: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://purplepag.es',
    'wss://relay.primal.net'
  ]
};

const AppContext = createContext<AppConfig>(defaultConfig);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('appConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Error loading app config from localStorage:', error);
      setConfig(defaultConfig);
    }
  }, []);

  const saveConfig = (newConfig: Partial<AppConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    localStorage.setItem('appConfig', JSON.stringify(updatedConfig));
  };

  return (
    <AppContext.Provider value={{ ...config, setConfig, saveConfig }}>
      <NostrProvider relays={config.relays}>
        {children}
      </NostrProvider>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}