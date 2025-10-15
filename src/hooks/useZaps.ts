import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useToast } from '@/hooks/useToast';
import { useNWC } from '@/hooks/useNWCContext';
import type { NWCConnection } from '@/hooks/useNWC';
import { nip57 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import type { WebLNProvider } from '@webbtc/webln-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

export function useZaps(
  target: Event | Event[],
  webln: WebLNProvider | null,
  _nwcConnection: NWCConnection | null,
  onZapSuccess?: () => void
) {
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Handle the case where an empty array is passed (from ZapButton when external data is provided)
  const actualTarget = Array.isArray(target) ? (target.length > 0 ? target[0] : null) : target;

  // Check if this is the developer mock event
  const isDeveloper = actualTarget?.id === 'developer-tip';
  const developerLud16 = isDeveloper ? 'studio314@getalby.com' : null;

  const author = useAuthor(actualTarget?.pubkey);
  const { sendPayment, getActiveConnection } = useNWC();
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);

  // Cleanup state when component unmounts
  useEffect(() => {
    return () => {
      setIsZapping(false);
      setInvoice(null);
    };
  }, []);

  const { data: zapEvents, ...query } = useQuery<NostrEvent[], Error>({
    queryKey: ['zaps', actualTarget?.id],
    staleTime: 30000, // 30 seconds
    refetchInterval: (query) => {
      // Only refetch if the query is currently being observed (component is mounted)
      return query.getObserversCount() > 0 ? 60000 : false;
    },
    queryFn: async (c) => {
      if (!actualTarget) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for zap receipts for this specific event
      if (actualTarget.kind >= 30000 && actualTarget.kind < 40000) {
        // Addressable event
        const identifier = actualTarget.tags.find((t) => t[0] === 'd')?.[1] || '';
        const events = await nostr.query([{
          kinds: [9735],
          '#a': [`${actualTarget.kind}:${actualTarget.pubkey}:${identifier}`],
        }], { signal });
        return events;
      } else {
        // Regular event
        const events = await nostr.query([{
          kinds: [9735],
          '#e': [actualTarget.id],
        }], { signal });
        return events;
      }
    },
    enabled: !!actualTarget?.id,
  });

  // Process zap events into simple counts and totals
  const { zapCount, totalSats, zaps } = useMemo(() => {
    if (!zapEvents || !Array.isArray(zapEvents) || !actualTarget) {
      return { zapCount: 0, totalSats: 0, zaps: [] };
    }

    let count = 0;
    let sats = 0;

    zapEvents.forEach(zap => {
      count++;

      // Try multiple methods to extract the amount:

      // Method 1: amount tag (from zap request, sometimes copied to receipt)
      const amountTag = zap.tags.find(([name]) => name === 'amount')?.[1];
      if (amountTag) {
        const millisats = parseInt(amountTag);
        sats += Math.floor(millisats / 1000);
        return;
      }

      // Method 2: Extract from bolt11 invoice
      const bolt11Tag = zap.tags.find(([name]) => name === 'bolt11')?.[1];
      if (bolt11Tag) {
        try {
          const invoiceSats = nip57.getSatoshisAmountFromBolt11(bolt11Tag);
          sats += invoiceSats;
          return;
        } catch (error) {
          console.warn('Failed to parse bolt11 amount:', error);
        }
      }

      // Method 3: Parse from description (zap request JSON)
      const descriptionTag = zap.tags.find(([name]) => name === 'description')?.[1];
      if (descriptionTag) {
        try {
          const zapRequest = JSON.parse(descriptionTag);
          const requestAmountTag = zapRequest.tags?.find(([name]: string[]) => name === 'amount')?.[1];
          if (requestAmountTag) {
            const millisats = parseInt(requestAmountTag);
            sats += Math.floor(millisats / 1000);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse description JSON:', error);
        }
      }

      console.warn('Could not extract amount from zap receipt:', zap.id);
    });


    return { zapCount: count, totalSats: sats, zaps: zapEvents };
  }, [zapEvents, actualTarget]);

  const zap = async (amount: number, comment: string) => {
    if (amount <= 0) {
      return;
    }

    console.log('Starting zap process:', { amount, comment, isDeveloper, target: actualTarget });
    setIsZapping(true);
    setInvoice(null); // Clear any previous invoice at the start

    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to send a zap.',
        variant: 'destructive',
      });
      setIsZapping(false);
      return;
    }

    if (!actualTarget) {
      toast({
        title: 'Event not found',
        description: 'Could not find the event to zap.',
        variant: 'destructive',
      });
      setIsZapping(false);
      return;
    }

    try {
      // For developer zaps, we don't need author metadata
      if (!isDeveloper && (!author.data || !author.data?.metadata || !author.data?.event)) {
        console.error('Author not found for regular zap');
        toast({
          title: 'Author not found',
          description: 'Could not find the author of this item.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      // Get lightning address - use developer's for developer zaps, otherwise use author's
      const lud16 = isDeveloper ? developerLud16 : author?.metadata?.lud16 || author?.metadata?.lud06;

      console.log('Lightning address check:', {
        isDeveloper,
        lud16,
        developerLud16,
        authorLud16: author?.metadata?.lud16,
        authorLud06: author?.metadata?.lud06,
        authorData: author.data
      });

      if (!lud16) {
        console.error('No lightning address found:', {
          isDeveloper,
          hasAuthorData: !!author.data,
          hasMetadata: !!author.data?.metadata,
          authorLud16: author.data?.metadata?.lud16,
          authorLud06: author.data?.metadata?.lud06
        });
        toast({
          title: 'Lightning address not found',
          description: 'The author does not have a lightning address configured.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      let zapEndpoint;

      if (isDeveloper) {
        // For developer, construct zap endpoint from lightning address
        const [username, domain] = lud16.split('@');
        // Try direct LNURL endpoint first (more reliable)
        zapEndpoint = `https://${domain}/.well-known/lnurlp/${username}`;
        console.log('Developer zap endpoint constructed:', zapEndpoint);
      } else {
        // Get zap endpoint using nostr-tools for regular users
        zapEndpoint = await nip57.getZapEndpoint(author.data!.event);
        console.log('Zap endpoint found:', zapEndpoint);
      }

      if (!zapEndpoint) {
        toast({
          title: 'Zap not available',
          description: 'This author does not have a properly configured zap service. They may need to set up a lightning address that supports zaps.',
          variant: 'destructive',
        });
        setIsZapping(false);
        return;
      }

      const zapAmount = amount * 1000; // convert to millisats

      // For developer zaps, we use a simpler approach without zap request
      let zapUrl: string;

      if (isDeveloper) {
        // For developer zaps, use direct LNURL approach
        const [username, domain] = lud16.split('@');
        zapUrl = `https://${domain}/.well-known/lnurlp/${username}?amount=${zapAmount}`;
      } else {
        // Create zap request for regular users - use appropriate event format based on kind
        // For addressable events (30000-39999), pass the object to get 'a' tag
        // For all other events, pass the ID string to get 'e' tag
        const event = (actualTarget.kind >= 30000 && actualTarget.kind < 40000)
          ? actualTarget
          : actualTarget.id;

        const zapRequest = nip57.makeZapRequest({
          profile: actualTarget.pubkey,
          event: event,
          amount: zapAmount,
          relays: [config.relayUrl],
          comment
        });

        // Sign the zap request (but don't publish to relays - only send to LNURL endpoint)
        if (!user.signer) {
          throw new Error('No signer available');
        }
        const signedZapRequest = await user.signer.signEvent(zapRequest);

        zapUrl = `${zapEndpoint}?amount=${zapAmount}&nostr=${encodeURIComponent(JSON.stringify(signedZapRequest))}`;
      }

      console.log('Attempting to fetch invoice from:', zapUrl);

      try {
        const res = await fetch(zapUrl);
        const responseData = await res.json();

        console.log('Zap endpoint response:', { status: res.status, data: responseData });

        if (!res.ok) {
          const errorMessage = responseData.reason || responseData.error || responseData.message || JSON.stringify(responseData);
          console.error('Zap endpoint failed:', {
            status: res.status,
            statusText: res.statusText,
            responseData,
            zapEndpoint,
            zapAmount
          });

          // Handle specific error messages
          if (responseData.message === "Recipient wallet error. Please contact recipient.") {
            toast({
              title: 'Zap unavailable',
              description: 'This recipient\'s lightning wallet is currently unavailable or misconfigured. Please try again later or contact the recipient.',
              variant: 'destructive',
            });
            setIsZapping(false);
            return;
          }

          if (responseData.error === true && typeof responseData.message === 'string') {
            toast({
              title: 'Zap failed',
              description: responseData.message || 'The recipient\'s lightning service returned an error.',
              variant: 'destructive',
            });
            setIsZapping(false);
            return;
          }

          // For developer zaps, try fallback to callback URL if direct request fails
          if (isDeveloper && responseData.callback) {
            try {
              console.log('Trying LNURL-pay callback flow for developer zap');
              const callbackUrl = `${responseData.callback}?amount=${zapAmount}`;
              const callbackRes = await fetch(callbackUrl);
              const callbackData = await callbackRes.json();

              console.log('Callback response:', { status: callbackRes.status, data: callbackData });

              if (callbackRes.ok && callbackData.pr) {
                setInvoice(callbackData.pr);
                setIsZapping(false);
                return;
              }
            } catch (callbackError) {
              console.error('Callback also failed:', callbackError);
            }
          }

          // Try fallback to direct lightning address for regular users
          if (!isDeveloper && lud16) {
            try {
              const [username, domain] = lud16.split('@');
              const fallbackUrl = `https://${domain}/.well-known/lnurlp/${username}?amount=${zapAmount}`;
              console.log('Trying fallback to:', fallbackUrl);

              const fallbackRes = await fetch(fallbackUrl);
              const fallbackData = await fallbackRes.json();

              console.log('Fallback response:', { status: fallbackRes.status, data: fallbackData });

              if (fallbackRes.ok && fallbackData.pr) {
                const newInvoice = fallbackData.pr;
                console.log('Fallback invoice generated successfully');

                // Set the invoice and return to payment flow
                setInvoice(newInvoice);
                setIsZapping(false);
                return;
              } else if (fallbackRes.ok && fallbackData.callback) {
                // Handle LNURL-pay flow
                console.log('LNURL-pay callback flow detected');
                const callbackUrl = `${fallbackData.callback}?amount=${zapAmount}`;
                const callbackRes = await fetch(callbackUrl);
                const callbackData = await callbackRes.json();

                if (callbackRes.ok && callbackData.pr) {
                  setInvoice(callbackData.pr);
                  setIsZapping(false);
                  return;
                }
              }
            } catch (fallbackError) {
              console.error('Fallback also failed:', fallbackError);
            }
          }

          // Try another fallback service for regular users
          if (!isDeveloper && lud16) {
            try {
              const [username] = lud16.split('@');
              const fallbackUrl2 = `https://lnurl.fiatjaf.com/.well-known/lnurlp/${username}?amount=${zapAmount}`;
              console.log('Trying second fallback to:', fallbackUrl2);

              const fallbackRes2 = await fetch(fallbackUrl2);
              const fallbackData2 = await fallbackRes2.json();

              console.log('Second fallback response:', { status: fallbackRes2.status, data: fallbackData2 });

              if (fallbackRes2.ok && fallbackData2.pr) {
                const newInvoice = fallbackData2.pr;
                console.log('Second fallback invoice generated successfully');

                setInvoice(newInvoice);
                setIsZapping(false);
                return;
              }
            } catch (fallbackError2) {
              console.error('Second fallback also failed:', fallbackError2);
            }
          }

          throw new Error(`Zap failed: ${errorMessage}. The author may need to configure their lightning service properly.`);
        }

        const newInvoice = responseData.pr;
        if (!newInvoice || typeof newInvoice !== 'string') {
          throw new Error('Lightning service did not return a valid invoice');
        }

        // Get the current active NWC connection dynamically
        const currentNWCConnection = getActiveConnection();

        // Try NWC first if available and properly connected
        if (currentNWCConnection && currentNWCConnection.connectionString && currentNWCConnection.isConnected) {
          try {
            await sendPayment(currentNWCConnection, newInvoice);

            // Clear states immediately on success
            setIsZapping(false);
            setInvoice(null);

            toast({
              title: 'Zap successful!',
              description: `You sent ${amount} sats via NWC to ${isDeveloper ? 'the developer' : 'the author'}.`,
            });

            // Invalidate zap queries to refresh counts
            queryClient.invalidateQueries({ queryKey: ['zaps'] });

            // Close dialog last to ensure clean state
            onZapSuccess?.();
            return;
          } catch (nwcError) {
            console.error('NWC payment failed, falling back:', nwcError);

            // Show specific NWC error to user for debugging
            const errorMessage = nwcError instanceof Error ? nwcError.message : 'Unknown NWC error';
            toast({
              title: 'NWC payment failed',
              description: `${errorMessage}. Falling back to other payment methods...`,
              variant: 'destructive',
            });
          }
        }

        if (webln) {  // Try WebLN next
          try {
            // For native WebLN, we may need to enable it first
            let webLnProvider = webln;
            if (webln.enable && typeof webln.enable === 'function') {
              const enabledProvider = await webln.enable();
              // Some implementations return the provider, others return void
              // Cast to WebLNProvider to handle both cases
              const provider = enabledProvider as WebLNProvider | undefined;
              if (provider) {
                webLnProvider = provider;
              }
            }

            await webLnProvider.sendPayment(newInvoice);

            // Clear states immediately on success
            setIsZapping(false);
            setInvoice(null);

            toast({
              title: 'Zap successful!',
              description: `You sent ${amount} sats to ${isDeveloper ? 'the developer' : 'the author'}.`,
            });

            // Invalidate zap queries to refresh counts
            queryClient.invalidateQueries({ queryKey: ['zaps'] });

            // Close dialog last to ensure clean state
            onZapSuccess?.();
          } catch (weblnError) {
            console.error('WebLN payment failed, falling back:', weblnError);

            // Show specific WebLN error to user for debugging
            const errorMessage = weblnError instanceof Error ? weblnError.message : 'Unknown WebLN error';
            toast({
              title: 'WebLN payment failed',
              description: `${errorMessage}. Falling back to other payment methods...`,
              variant: 'destructive',
            });

            setInvoice(newInvoice);
            setIsZapping(false);
          }
        } else { // Default - show QR code and manual Lightning URI
          setInvoice(newInvoice);
          setIsZapping(false);
        }
          } catch (err) {
            console.error('Zap error:', err);
            toast({
              title: 'Zap failed',
              description: (err as Error).message,
              variant: 'destructive',
            });
            setIsZapping(false);
          }
    } catch (err) {
      console.error('Zap error:', err);
      toast({
        title: 'Zap failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setIsZapping(false);
    }
  };

  const resetInvoice = useCallback(() => {
    setInvoice(null);
  }, []);

  return {
    zaps,
    zapCount,
    totalSats,
    ...query,
    zap,
    isZapping,
    invoice,
    setInvoice,
    resetInvoice,
  };
}
