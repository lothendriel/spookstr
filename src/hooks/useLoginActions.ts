import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';

// NOTE: This file should not be edited except for adding new login methods.

// Helper function to test relay connectivity
async function testRelayConnection(relayUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(relayUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      console.log('🔐 Starting bunker login...');
      console.log('📋 Bunker URI format check:', uri.substring(0, 20) + '...');

      try {
        // Parse the URI to extract relay information for debugging
        const url = new URL(uri);
        const pubkey = url.hostname || url.pathname.replace('//', '');
        const relay = url.searchParams.get('relay');
        const secret = url.searchParams.get('secret');

        console.log('👤 Remote signer pubkey:', pubkey?.substring(0, 16) + '...');
        console.log('🔗 Bunker relay:', relay);
        console.log('🔑 Has secret:', !!secret);

        // Test relay connectivity first
        if (relay) {
          console.log('🧪 Testing relay connectivity...');
          const isReachable = await testRelayConnection(relay);
          if (!isReachable) {
            console.error('❌ Relay is not reachable:', relay);
            throw new Error(`Cannot connect to relay: ${relay}. The relay may be down or blocked.`);
          }
          console.log('✅ Relay is reachable');
        }

        // Add a timeout for the bunker connection (30 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error('⏱️ Bunker connection timeout after 30s');
            reject(new Error('Connection timeout. Please check your bunker relay and try again.'));
          }, 30000);
        });

        console.log('🚀 Attempting to connect to bunker via NLogin.fromBunker...');
        const loginPromise = NLogin.fromBunker(uri, nostr);

        const login = await Promise.race([loginPromise, timeoutPromise]) as Awaited<typeof loginPromise>;
        console.log('✅ Bunker connection successful!');
        addLogin(login);
      } catch (error) {
        console.error('❌ Bunker login failed:', error);
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        // Provide more user-friendly error messages
        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          if (errorMsg.includes('timeout')) {
            throw new Error('Connection timeout. The bunker relay may be unreachable or not responding.');
          } else if (errorMsg.includes('relay') || errorMsg.includes('websocket') || errorMsg.includes('connect')) {
            throw new Error('Failed to connect to the bunker relay. Please verify the relay URL is correct and accessible.');
          } else if (errorMsg.includes('secret') || errorMsg.includes('auth')) {
            throw new Error('Authentication failed. Please check your bunker secret is correct.');
          } else if (errorMsg.includes('pubkey') || errorMsg.includes('invalid')) {
            throw new Error('Invalid bunker URI. Please check the pubkey and parameters.');
          } else {
            // Return the original error message if it doesn't match known patterns
            throw new Error(`Bunker connection failed: ${error.message}`);
          }
        }
        throw new Error('An unknown error occurred during bunker connection. Please try again.');
      }
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
