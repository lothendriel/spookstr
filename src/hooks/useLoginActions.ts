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
        const relays = url.searchParams.getAll('relay');
        const secret = url.searchParams.get('secret');

        console.log('👤 Remote signer pubkey:', pubkey?.substring(0, 16) + '...');
        console.log('🔗 Bunker relays:', relays);
        console.log('🔑 Has secret:', !!secret);

        // Check if this looks like a self-connection attempt
        if (pubkey === '0155373ac79b7ffb0f586c3e68396f9e82d46f7afe7016d46ed9ca46ba3e1bed') {
          console.warn('⚠️ The remote signer pubkey matches your own pubkey. This might indicate a configuration issue.');
          console.warn('⚠️ Bunker URIs typically contain the pubkey of the remote signer service, not your own pubkey.');
          console.warn('⚠️ Please verify you have the correct bunker URI from your bunker service.');
        }

        // Test relay connectivity first
        if (relays.length > 0) {
          console.log('🧪 Testing relay connectivity...');
          onStatus?.('Testing relay connectivity...');

          // Test each relay
          let anyReachable = false;
          for (const relayUrl of relays) {
            console.log(`🔍 Testing relay: ${relayUrl}`);
            const isReachable = await testRelayConnection(relayUrl);
            if (isReachable) {
              console.log('✅ Relay is reachable:', relayUrl);
              anyReachable = true;

              // Special handling for nsec.app
              if (relayUrl.includes('nsec.app')) {
                console.log('ℹ️ Detected nsec.app relay - this is a known bunker service');
                onStatus?.('Connected to nsec.app bunker service...');
              }
            } else {
              console.error('❌ Relay is not reachable:', relayUrl);
            }
          }

          if (!anyReachable) {
            console.error('❌ No relays are reachable:', relays);
            throw new Error(`Cannot connect to any relays: ${relays.join(', ')}. The relays may be down or blocked.`);
          }
          console.log('✅ At least one relay is reachable');
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
            console.log('📡 Calling NLogin.fromBunker with:', {
              uri: uri.substring(0, 60) + '...',
              nostrAvailable: !!nostr
            });

            const result = await NLogin.fromBunker(uri, nostr);

            console.log('✅ NLogin.fromBunker succeeded:', {
              hasId: !!result?.id,
              hasPubkey: !!result?.pubkey,
              hasSigner: !!result?.signer
            });

            return result;
          } catch (err) {
            console.error('❌ NLogin.fromBunker failed:', {
              error: err,
              message: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
              isAuthChallenge: err instanceof Error && err.message.startsWith('https://')
            });

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

          // Try to open the popup - don't fail if window.open returns null
          // The popup might still open even if we can't get a reference to it
          const authWindow = window.open(
            authUrl,
            'bunker-auth',
            `width=${width},height=${height},left=${left},top=${top},popup=yes`
          );

          // Log whether we got a window reference, but don't fail the flow
          if (authWindow) {
            console.log('✅ Popup window opened successfully');
          } else {
            console.warn('⚠️ Could not get popup window reference (but it may have opened anyway)');
          }

          // Wait for the auth to complete and retry the connection
          console.log('⏳ Waiting for authorization... Please approve the connection in the opened window.');
          onStatus?.('Please approve the connection in the popup window');

          // Extract request ID from the URL for monitoring
          const urlObj = new URL(authUrl);
          const reqId = urlObj.searchParams.get('reqId');
          console.log('📝 Request ID:', reqId);

          // Wait for the user to approve and for the bunker to process it
          console.log('⏰ Waiting 15 seconds for authorization approval and processing...');
          onStatus?.('Waiting for authorization approval... (15s)');
          await new Promise(resolve => setTimeout(resolve, 15000));

          console.log('🔄 Retrying bunker connection after auth approval...');
          onStatus?.('Completing connection after authorization...');

          // Retry the connection with a much longer timeout and multiple attempts
          const retryPromise = (async () => {
            const maxRetries = 6; // Try up to 6 times
            const retryDelay = 10000; // 10 seconds between retries

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
                onStatus?.(`Connecting... (attempt ${attempt}/${maxRetries})`);
                return await NLogin.fromBunker(uri, nostr);
              } catch (retryErr) {
                // If we get another auth URL on retry, it means auth isn't complete yet
                if (retryErr instanceof Error && retryErr.message.startsWith('https://')) {
                  if (attempt < maxRetries) {
                    console.log(`⏳ Auth not complete yet, waiting ${retryDelay/1000}s before retry ${attempt + 1}...`);
                    onStatus?.(`Authorization pending... retrying in ${retryDelay/1000}s`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue; // Try again
                  } else {
                    console.error('❌ Max retries reached, authorization still not complete');
                    throw new Error('Authorization was not completed. Please try again and make sure to approve the connection in the popup window.');
                  }
                }
                throw retryErr; // Re-throw non-auth errors immediately
              }
            }

            throw new Error('Max retry attempts reached without success.');
          })();

          const retryTimeout = new Promise((_, reject) => {
            setTimeout(() => {
              console.error('⏱️ Authorization timeout after 120s');
              reject(new Error('Authorization timeout. The bunker did not respond after approval. Please try again.'));
            }, 120000); // 120 second timeout for auth response (increased)
          });

          try {
            const login = await Promise.race([retryPromise, retryTimeout]) as Awaited<typeof retryPromise>;
            console.log('✅ Bunker authorized and connected!');

            // Close the auth window if we have a reference to it
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }

            addLogin(login);
            return;
          } catch (retryError) {
            console.error('❌ Bunker retry failed:', retryError);

            // Close the auth window if we have a reference to it
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }

            throw retryError;
          }
        }

        // Provide more user-friendly error messages
        if (error instanceof Error) {
          const errorMsg = error.message.toLowerCase();
          console.log('🔍 Error analysis:', {
            message: error.message,
            lower: errorMsg,
            stack: error.stack
          });

          // Log the full error for debugging
          console.error('🚨 Full bunker error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            uri: uri.substring(0, 50) + '...'
          });

          if (errorMsg.includes('timeout')) {
            throw new Error('Connection timeout. The bunker relay may be unreachable or not responding.');
          } else if (errorMsg.includes('relay') || errorMsg.includes('websocket')) {
            throw new Error('Failed to connect to the bunker relay. Please verify the relay URL is correct and accessible.');
          } else if (errorMsg.includes('secret')) {
            // More specific secret-related errors
            if (errorMsg.includes('invalid') || errorMsg.includes('wrong') || errorMsg.includes('incorrect')) {
              throw new Error('The secret in your bunker URI is incorrect. Please check your bunker app and copy the exact URI.');
            } else if (errorMsg.includes('expired') || errorMsg.includes('expir')) {
              throw new Error('The secret in your bunker URI has expired. Please generate a new connection URI from your bunker app.');
            } else if (errorMsg.includes('missing') || errorMsg.includes('required')) {
              throw new Error('A secret is required for this bunker. Please include the secret parameter in your bunker URI.');
            } else {
              throw new Error('Authentication failed. This could be due to an incorrect secret, expired secret, or the bunker service rejecting the connection.');
            }
          } else if (errorMsg.includes('auth')) {
            // More specific authentication errors
            if (errorMsg.includes('denied') || errorMsg.includes('reject')) {
              throw new Error('Authentication was denied by the bunker service. The connection may have been rejected.');
            } else if (errorMsg.includes('pending') || errorMsg.includes('waiting')) {
              throw new Error('Authentication is still pending. Please complete the authentication in your bunker app and try again.');
            } else if (errorMsg.includes('failed') || errorMsg.includes('error')) {
              throw new Error('Authentication process failed. This could be due to a server error or configuration issue with the bunker service.');
            } else {
              throw new Error('Authentication failed. Please check your bunker app and ensure the connection is properly configured.');
            }
          } else if (errorMsg.includes('pubkey') || errorMsg.includes('invalid key')) {
            throw new Error('Invalid pubkey or key in bunker URI. Please check the URI is correct and the pubkey is 64 hexadecimal characters.');
          } else if (errorMsg.includes('popup')) {
            throw new Error('Please enable popups for this site to complete bunker authentication.');
          } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
            throw new Error('Bunker service not found. The relay may be down or the URI may be incorrect.');
          } else if (errorMsg.includes('connection') || errorMsg.includes('connect')) {
            throw new Error('Connection failed. Please check your internet connection and the bunker relay URL.');
          } else if (errorMsg.includes('unauthorized') || errorMsg.includes('forbidden')) {
            throw new Error('Access denied. The bunker service is not allowing connections from this client.');
          } else if (errorMsg.includes('server') || errorMsg.includes('internal')) {
            throw new Error('Server error occurred. The bunker service may be experiencing technical difficulties.');
          } else {
            // Return the original error message if it doesn't match known patterns
            console.log('📝 Unknown error pattern, returning original message');
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
