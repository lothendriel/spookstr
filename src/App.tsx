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
import { PopOutPodcastPlayer } from '@/components/PopOutPodcastPlayer';
import { PodcastIndicator } from '@/components/PodcastIndicator';
import { SpookstrProfileSync } from '@/components/SpookstrProfileSync';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import { DebugPanel } from '@/components/DebugPanel';
import { CompactOfflineIndicator } from '@/components/OfflineIndicator';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Individual hooks control their own window focus behavior
      staleTime: 60000, // 1 minute default - individual hooks override as needed
      gcTime: 300000, // 5 minutes - reduced from 10 minutes to save memory
      retry: 1, // Reduce retries for faster failure recovery
      refetchOnMount: false, // Prevent unnecessary refetches
      // Enhanced default behavior: No background refetch unless explicitly set
      refetchInterval: false, // Individual hooks control their own intervals
      // Better error retry strategy
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff capped at 5s
    },
    mutations: {
      retry: 1, // Single retry for mutations
      retryDelay: 1000, // 1 second delay for mutation retries
    },
  },
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

                    {/* Development-only Debug Panel */}
                    <DebugPanel />

                    {/* Offline status indicator */}
                    <CompactOfflineIndicator className="fixed top-4 right-4 z-40" />

                    {/* Sync user profile to Spookstr relay on login */}
                    <SpookstrProfileSync />

                    {/* Global pop-out podcast player */}
                    <PopOutPodcastPlayer />

                    {/* Podcast indicator for background playing */}
                    <PodcastIndicator />

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