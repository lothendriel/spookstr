import { createContext, useContext, useState, useEffect } from 'react';
import type { AppConfig } from './types';

const AppContext = createContext({} as {
  config: AppConfig;
  setConfig: (config: Partial<AppConfig>) => void;
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const localStorageConfig = JSON.parse(localStorage.getItem('appConfig') || '{}') as AppConfig;
  const [config, setConfig] = useState<AppConfig>({  
    theme: localStorageConfig.theme || 'light',
    relays: localStorageConfig.relays || ['wss://relay.nostr.band', 'wss://relay.damus.io'],
    nwcUrl: localStorageConfig.nwcUrl,
  });

  useEffect(() => {
    localStorage.setItem('appConfig', JSON.stringify(config));
  }, [config]);

  const handleSetConfig = (newConfig: Partial<AppConfig>) => {
    setConfig({ ...config, ...newConfig });
  };

  return (
    <AppContext.Provider value={{ config, setConfig: handleSetConfig }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);