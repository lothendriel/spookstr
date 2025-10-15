import { useEffect, useRef } from 'react';
import { NRelay1 } from '@nostrify/nostrify';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';

interface RelayHealthManagerProps {
  children: React.ReactNode;
}

export function RelayHealthManager({ children }: RelayHealthManagerProps) {
  const { config, presetRelays } = useAppContext();
  const { toast } = useToast();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;

    const initializeRelayHealth = async () => {
      try {
        // Test current relay connection
        const currentRelay = new NRelay1(config.relayUrl);
        const signal = AbortSignal.timeout(5000);

        await currentRelay.query([{ kinds: [1], limit: 1 }], { signal });
        console.log('✅ Current relay connection healthy:', config.relayUrl);

        // Test preset relays
        for (const presetRelay of presetRelays?.slice(0, 2) || []) {
          try {
            const testRelay = new NRelay1(presetRelay.url);
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
  }, [config.relayUrl, presetRelays, toast]);

  // Periodic health checks
  useEffect(() => {
    const healthCheckInterval = setInterval(async () => {
      try {
        const currentRelay = new NRelay1(config.relayUrl);
        const signal = AbortSignal.timeout(3000);

        await currentRelay.query([{ kinds: [1], limit: 1 }], { signal });
      } catch (error) {
        console.warn('Periodic health check failed for relay:', config.relayUrl, error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, [config.relayUrl]);

  return <>{children}</>;
}