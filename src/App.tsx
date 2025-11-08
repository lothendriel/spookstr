// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense, lazy } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { PodcastProvider } from '@/contexts/PodcastContext';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';

// Conditionally load React Query DevTools only in development
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((d) => ({
        default: d.ReactQueryDevtools,
      }))
    )
  : null;

import { ScrollToTop } from '@/components/ScrollToTop';
import { SimpleChatIcon } from '@/components/SimpleChatIcon';
import { PopOutPodcastPlayer } from '@/components/PopOutPodcastPlayer';
import { PodcastIndicator } from '@/components/PodcastIndicator';
import { SpookstrProfileSync } from '@/components/SpookstrProfileSync';

import { CompactOfflineIndicator } from '@/components/OfflineIndicator';
import { useAggressiveMemoryCleanup } from '@/hooks/useAggressiveMemoryCleanup';

/**
 * Component that handles memory management and cleanup.
 * This must be wrapped by QueryClientProvider to access the QueryClient.
 */
function MemoryManager() {
  // Enable aggressive memory cleanup only
  useAggressiveMemoryCleanup();

  return null; // This component doesn't render anything
}

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Individual hooks control their own window focus behavior
      staleTime: 300000, // 5 minutes default - increased to reduce refetches
      gcTime: 120000, // 2 minutes - aggressively clean up unused data
      retry: 1, // Reduce retries for faster failure recovery
      refetchOnMount: false, // Prevent unnecessary refetches
      // Enhanced default behavior: No background refetch unless explicitly set
      refetchInterval: false, // Individual hooks control their own intervals
      // Better error retry strategy
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff capped at 5s
      // Memory optimization: Limit cache size
      structuralSharing: true, // Reduce memory by sharing reference structures
    },
    mutations: {
      retry: 1, // Single retry for mutations
      retryDelay: 1000, // 1 second delay for mutation retries
    },
  },
  // Configure cache limits to prevent memory bloat - much more aggressive
  maxsize: 50, // Maximum 50 queries in cache (reduced from 100)
  cacheTime: 120000, // 2 minutes default cache time (reduced from 3 minutes)
});

const defaultConfig: AppConfig = {
  theme: "dark",
  relayUrl: "wss://relay.primal.net",
  searchRelays: [
    "wss://relay.nostr.band",
    "wss://relay.nos.social",
  ],
  blossomServers: [
    "https://blossom.primal.net",
    "https://cdn.satellite.earth",
  ],
};

import { getPresetRelaysForApp } from '@/constants/relays';

const presetRelays = getPresetRelaysForApp();

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NWCProvider>
                <PodcastProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Suspense>
                      <AppRouter />
                    </Suspense>

                    {/* Memory management component - must be inside QueryClientProvider */}
                    <MemoryManager />

                    {/* Development-only React Query DevTools */}
                    {ReactQueryDevtools && (
                      <Suspense fallback={null}>
                        <ReactQueryDevtools
                          initialIsOpen={false}
                          position="bottom-right"
                          buttonPosition="bottom-right"
                        />
                      </Suspense>
                    )}



                    {/* Offline status indicator */}
                    <CompactOfflineIndicator className="fixed top-4 right-4 z-40" />

                    {/* Sync user profile to Spookstr relay on login */}
                    <SpookstrProfileSync />

                    {/* Global pop-out podcast player */}
                    <PopOutPodcastPlayer />

                    {/* Podcast indicator for background playing */}
                    <PodcastIndicator />

                    {/* Simple chat icon - positioned above scroll to top */}
                    <SimpleChatIcon />

                    {/* Scroll to top button */}
                    <ScrollToTop />
                  </TooltipProvider>
                </PodcastProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;