import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

// Initialize offline support
import { serviceWorkerManager } from '@/lib/serviceWorker';
import { offlineSync } from '@/lib/offlineSync';
import { offlineStorage } from '@/lib/offlineStorage';

// FIXME: a custom font should be used. Eg:
// import '@fontsource-variable/<font-name>';

// Initialize offline storage and sync
async function initializeOfflineSupport() {
  try {
    // Initialize offline storage
    await offlineStorage.init();
    console.log('✅ Offline storage initialized');

    // Register service worker (in production)
    if (import.meta.env.PROD) {
      await serviceWorkerManager.register();
      console.log('✅ Service worker registered');
    }

    // Initialize sync manager (will be connected to Nostr client later)
    console.log('✅ Offline sync manager ready');
  } catch (error) {
    console.error('❌ Failed to initialize offline support:', error);
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Initialize offline support after app starts
initializeOfflineSupport();
