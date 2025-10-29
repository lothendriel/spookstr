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
    async bunker(uri: string, onStatus?: (status: string) => void): Promise<void> {
      console.log('🔐 Starting bunker login...');
      console.log('📋 Bunker URI format check:', uri.substring(0, 20) + '...');
      onStatus?.('Validating bunker URI...');

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
          onStatus?.('Testing relay connectivity...');
          const isReachable = await testRelayConnection(relay);
          if (!isReachable) {
            console.error('❌ Relay is not reachable:', relay);
            throw new Error(`Cannot connect to relay: ${relay}. The relay may be down or blocked.`);
          }
          console.log('✅ Relay is reachable');
          onStatus?.('Relay connected successfully');
        }

        // Add a timeout for the bunker connection (30 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            console.error('⏱️ Bunker connection timeout after 30s');
            reject(new Error('Connection timeout. Please check your bunker relay and try again.'));
          }, 30000);
        });

        console.log('🚀 Attempting to connect to bunker via NLogin.fromBunker...');
        onStatus?.('Connecting to remote signer...');

        // Wrap the bunker connection to catch auth challenges immediately
        const wrappedLoginPromise = (async () => {
          try {
            return await NLogin.fromBunker(uri, nostr);
          } catch (err) {
            // Check if this is an auth challenge (URL thrown as error)
            if (err instanceof Error && err.message.startsWith('https://')) {
              console.log('🔐 Auth challenge detected immediately!');
              onStatus?.('Authorization required - opening popup...');
              throw err; // Re-throw to be caught by outer try-catch
            }
            throw err;
          }
        })();

        const login = await Promise.race([wrappedLoginPromise, timeoutPromise]) as Awaited<typeof wrappedLoginPromise>;
        console.log('✅ Bunker connection successful!');
        addLogin(login);
      } catch (error) {
        console.error('❌ Bunker login failed:', error);
        console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        // Check if this is an auth challenge URL (NIP-46 auth flow)
        if (error instanceof Error && error.message.startsWith('https://')) {
          const authUrl = error.message;
          console.log('🔐 Auth challenge detected! Opening authorization URL...');

          // Open the auth URL in a new window
          const width = 600;
          const height = 700;
          const left = (window.screen.width - width) / 2;
          const top = (window.screen.height - height) / 2;
          const authWindow = window.open(
            authUrl,
            'bunker-auth',
            `width=${width},height=${height},left=${left},top=${top},popup=yes,noopener,noreferrer`
          );

          if (!authWindow) {
            throw new Error('Please allow popups for this site to complete bunker authentication.');
          }

          // Wait for the auth to complete and retry the connection
          console.log('⏳ Waiting for authorization... Please approve the connection in the opened window.');
          onStatus?.('Please approve the connection in the popup window');

          // Extract request ID from the URL for monitoring
          const urlObj = new URL(authUrl);
          const reqId = urlObj.searchParams.get('reqId');
          console.log('📝 Request ID:', reqId);

          // Wait a bit for the user to approve, then retry with extended timeout
          console.log('⏰ Waiting 2 seconds for authorization approval...');
          onStatus?.('Waiting for authorization approval...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          console.log('🔄 Retrying bunker connection after auth approval...');
          onStatus?.('Completing connection after authorization...');

          // Retry the connection with a much longer timeout (90 seconds)
          const retryPromise = (async () => {
            try {
              return await NLogin.fromBunker(uri, nostr);
            } catch (retryErr) {
              // If we get another auth URL on retry, it means the first auth didn't work
              if (retryErr instanceof Error && retryErr.message.startsWith('https://')) {
                throw new Error('Authorization was not completed. Please try again and approve the connection in the popup.');
              }
              throw retryErr;
            }
          })();

          const retryTimeout = new Promise((_, reject) => {
            setTimeout(() => {
              console.error('⏱️ Authorization timeout after 90s');
              reject(new Error('Authorization timeout. The bunker did not respond after approval. Please try again.'));
            }, 90000); // 90 second timeout for auth response
          });

          try {
            const login = await Promise.race([retryPromise, retryTimeout]) as Awaited<typeof retryPromise>;
            console.log('✅ Bunker authorized and connected!');
            authWindow.close();
            addLogin(login);
            return;
          } catch (retryError) {
            console.error('❌ Bunker retry failed:', retryError);
            authWindow.close();
            throw retryError;
          }
        }

        // Provide more user-friendly error messages
        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();

          if (errorMsg.includes('timeout')) {
            throw new Error('Connection timeout. The bunker relay may be unreachable or not responding.');
          } else if (errorMsg.includes('relay') || errorMsg.includes('websocket')) {
            throw new Error('Failed to connect to the bunker relay. Please verify the relay URL is correct and accessible.');
          } else if (errorMsg.includes('secret') || errorMsg.includes('auth')) {
            throw new Error('Authentication failed. Please check your bunker secret is correct.');
          } else if (errorMsg.includes('pubkey') || errorMsg.includes('invalid')) {
            throw new Error('Invalid bunker URI. Please check the pubkey and parameters.');
          } else if (errorMsg.includes('popup')) {
            throw new Error('Please enable popups for this site to complete bunker authentication.');
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
