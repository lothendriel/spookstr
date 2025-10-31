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
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { CompactOfflineIndicator } from '@/components/OfflineIndicator';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
import { useAggressiveMemoryCleanup, useMemoryMonitorWithCleanup } from '@/hooks/useAggressiveMemoryCleanup';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Individual hooks control their own window focus behavior
      staleTime: 120000, // 2 minutes default - increased to reduce refetches
      gcTime: 180000, // 3 minutes - aggressively clean up unused data
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
  // Configure cache limits to prevent memory bloat
  maxsize: 100, // Maximum 100 queries in cache
  cacheTime: 180000, // 3 minutes default cache time
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

const presetRelays = [
  { url: 'wss://spookstr2.nostr1.com', name: 'Spookstr2' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://relay.mostr.pub', name: 'Mostr' },
];

export function App() {
  // Enable global memory monitoring and cleanup
  useMemoryMonitor();
  useAggressiveMemoryCleanup();
  useMemoryMonitorWithCleanup();

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

                    {/* Development-only Performance Monitor */}
                    <PerformanceMonitor />

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