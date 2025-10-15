import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNWC } from '@/hooks/useNWCContext';
import type { WebLNProvider } from '@webbtc/webln-types';
import { useToast } from '@/hooks/useToast';

export interface WalletStatus {
  hasNWC: boolean;
  webln: WebLNProvider | null;
  activeNWC: ReturnType<typeof useNWC>['getActiveConnection'] extends () => infer T ? T : null;
  preferredMethod: 'nwc' | 'webln' | 'manual';
  isWebLNEnabled: boolean;
  walletError: string | null;
}

export function useWallet() {
  const { toast } = useToast();
  const { connections, getActiveConnection } = useNWC();
  const [isWebLNEnabled, setIsWebLNEnabled] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Get the active connection directly - no memoization to avoid stale state
  const activeNWC = getActiveConnection();

  // Access WebLN directly from browser global scope
  const webln = (globalThis as { webln?: WebLNProvider }).webln || null;

  // Calculate status values reactively
  const hasNWC = useMemo(() => {
    return connections.length > 0 && connections.some(c => c.isConnected);
  }, [connections]);

  // Enhanced WebLN detection and enabling
  const enableWebLN = useCallback(async () => {
    if (!webln) {
      setWalletError('WebLN not available in this browser');
      return false;
    }

    try {
      setIsWebLNEnabled(false);
      setWalletError(null);

      if (webln.enable && typeof webln.enable === 'function') {
        const result = await webln.enable();
        setIsWebLNEnabled(true);

        // Test the connection with a getInfo call if available
        if (webln.getInfo && typeof webln.getInfo === 'function') {
          try {
            const info = await webln.getInfo();
            console.log('WebLN provider info:', info);
          } catch (infoError) {
            console.warn('WebLN getInfo failed:', infoError);
          }
        }

        toast({
          title: 'WebLN enabled',
          description: 'Lightning wallet connected successfully',
        });

        return true;
      } else {
        setWalletError('WebLN provider does not support enable method');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown WebLN error';
      setWalletError(errorMessage);
      console.error('WebLN enable failed:', error);

      toast({
        title: 'WebLN connection failed',
        description: 'Could not connect to your Lightning wallet. Please check your wallet extension.',
        variant: 'destructive',
      });

      return false;
    }
  }, [webln, toast]);

  // Auto-enable WebLN when available
  useEffect(() => {
    if (webln && !isWebLNEnabled && !walletError) {
      enableWebLN();
    }
  }, [webln, isWebLNEnabled, walletError, enableWebLN]);

  // Monitor WebLN availability
  useEffect(() => {
    const checkWebLNAvailability = () => {
      const currentWebLN = (globalThis as { webln?: WebLNProvider }).webln || null;
      if (!currentWebLN && webln) {
        setIsWebLNEnabled(false);
        setWalletError('WebLN provider became unavailable');
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkWebLNAvailability, 5000);
    return () => clearInterval(interval);
  }, [webln]);

  // Determine preferred payment method with enhanced logic
  const preferredMethod: WalletStatus['preferredMethod'] = useMemo(() => {
    if (activeNWC && activeNWC.isConnected) {
      return 'nwc';
    }
    if (webln && isWebLNEnabled) {
      return 'webln';
    }
    return 'manual';
  }, [activeNWC, webln, isWebLNEnabled]);

  const status: WalletStatus = {
    hasNWC,
    webln,
    activeNWC,
    preferredMethod,
    isWebLNEnabled,
    walletError,
  };

  return {
    ...status,
    enableWebLN,
    clearWalletError: useCallback(() => setWalletError(null), []),
  };
}