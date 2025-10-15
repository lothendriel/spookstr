import { useEffect, useRef } from 'react';
import { useNostr } from '@nostrify/react';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';

interface RelayHealthManagerProps {
  children: React.ReactNode;
}

export function RelayHealthManager({ children }: RelayHealthManagerProps) {
  const { nostr } = useNostr();
  const { config, presetRelays } = useAppContext();
  const { toast } = useToast();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;

    const initializeRelayHealth = async () => {
      try {
        // Test the current relay connection
        const currentRelay = nostr.relay(config.relayUrl);
        const signal = AbortSignal.timeout(5000);
        
        await currentRelay.query([{ kinds: [1], limit: 1 }], { signal });
        console.log('✅ Current relay connection healthy:', config.relayUrl);
        
        // Test preset relays
        for (const presetRelay of presetRelays?.slice(0, 2) || []) {
          try {
            const testRelay = nostr.relay(presetRelay.url);
            await testRelay.query([{ kinds: [1], limit: 1 }], { signal });
            console.log('✅ Preset relay connection healthy:', presetRelay.url);
          } catch (error) {
            console.warn('⚠️ Preset relay connection failed:', presetRelay.url, error);
          }
        }
        
        isInitialized.current = true;
      } catch (error) {
        console.error('❌ Relay health initialization failed:', error);
        toast({
          title: 'Relay connection issue',
          description: 'Having trouble connecting to Nostr relays. Some features may be limited.',
          variant: 'destructive',
        });
      }
    };

    initializeRelayHealth();
  }, [nostr, config.relayUrl, presetRelays, toast]);

  // Periodic health checks
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      try {
        const currentRelay = nostr.relay(config.relayUrl);
        const signal = AbortSignal.timeout(3000);
        
        await currentRelay.query([{ kinds: [1], limit: 1 }], { signal });
      } catch (error) {
        console.warn('Periodic health check failed for relay:', config.relayUrl, error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [nostr, config.relayUrl]);

  return <>{children}</>;
}