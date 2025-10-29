/**
 * Spookstr Service Worker
 * 
 * Provides offline support through:
 * - Static asset caching (app shell)
 * - Nostr event caching
 * - Background sync for offline actions
 * - Intelligent cache management
 */

const CACHE_VERSION = 'spookstr-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const NOSTR_CACHE = `${CACHE_VERSION}-nostr`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;

// Cache expiration times
const CACHE_EXPIRY = {
  static: 7 * 24 * 60 * 60 * 1000, // 7 days
  nostr: 24 * 60 * 60 * 1000,      // 24 hours
  images: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

// Nostr relay endpoints (for caching responses)
const NOSTR_RELAY_PATTERNS = [
  /^wss?:\/\/.*\.nostr\./,
  /^wss?:\/\/relay\./,
  /^wss?:\/\/.*spookstr.*\.com/,
  /^wss?:\/\/.*\.damus\./,
  /^wss?:\/\/.*\.primal\./,
];

// Image hosting patterns
const IMAGE_PATTERNS = [
  /^https:\/\/.*\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i,
  /^https:\/\/.*\.imgur\.com/,
  /^https:\/\/.*\.twimg\.com/,
  /^https:\/\/.*\.nostr\.build/,
  /^https:\/\/blossom\./,
  /^https:\/\/cdn\.satellite\.earth/,
];

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        // Force activation to take control immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old version caches
            if (cacheName.includes('spookstr-') && !cacheName.includes(CACHE_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup completed');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isNostrRelayRequest(url)) {
    event.respondWith(handleNostrRelayRequest(request));
  } else if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else {
    // Default: network first, fallback to cache
    event.respondWith(handleDefaultRequest(request));
  }
});

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'nostr-publish') {
    event.waitUntil(syncNostrPublish());
  } else if (event.tag === 'nostr-interaction') {
    event.waitUntil(syncNostrInteractions());
  }
});

/**
 * Handle push notifications (for future real-time features)
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(showNotification(data));
  }
});

// === Helper Functions ===

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  return url.pathname.includes('.') && (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname === '/'
  );
}

/**
 * Check if request is for an image
 */
function isImageRequest(url) {
  return IMAGE_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * Check if request is to a Nostr relay
 */
function isNostrRelayRequest(url) {
  return NOSTR_RELAY_PATTERNS.some(pattern => pattern.test(url.href));
}

/**
 * Check if request is to an API endpoint
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.host !== self.location.host;
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse && !isCacheExpired(cachedResponse, CACHE_EXPIRY.static)) {
      return cachedResponse;
    }

    // Fetch and cache new version
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for static asset, serving from cache:', request.url);
    // Return cached version even if expired when network fails
    return await caches.match(request) || new Response('Offline', { status: 503 });
  }
}

/**
 * Handle images with cache-first strategy (long TTL)
 */
async function handleImageRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse && !isCacheExpired(cachedResponse, CACHE_EXPIRY.images)) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGES_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for image, serving from cache:', request.url);
    return await caches.match(request) || new Response('Image unavailable offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Handle Nostr relay requests (cache responses for offline viewing)
 */
async function handleNostrRelayRequest(request) {
  try {
    // For Nostr relay requests, try network first but cache responses
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful Nostr responses
      const cache = await caches.open(NOSTR_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Nostr relay offline, checking cache:', request.url);
    
    // When offline, return cached Nostr data if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse && !isCacheExpired(cachedResponse, CACHE_EXPIRY.nostr)) {
      // Add offline indicator header
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Offline-Cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // No cache available, return offline response
    return new Response(JSON.stringify({ 
      error: 'Offline - no cached data available',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] API request failed:', request.url);
    
    // For GET requests, try to serve from cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Service unavailable offline',
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle default requests (HTML pages)
 */
async function handleDefaultRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('[SW] Default request failed, serving app shell:', request.url);
    
    // Serve the main app for navigation requests when offline
    if (request.mode === 'navigate') {
      return await caches.match('/') || new Response('App unavailable offline', { 
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

/**
 * Check if cached response has expired
 */
function isCacheExpired(response, maxAge) {
  const cachedDate = response.headers.get('date');
  if (!cachedDate) return true;
  
  const age = Date.now() - new Date(cachedDate).getTime();
  return age > maxAge;
}

/**
 * Sync Nostr publish actions when back online
 */
async function syncNostrPublish() {
  console.log('[SW] Syncing offline Nostr publish actions');
  
  try {
    // Get offline actions from IndexedDB
    const db = await openOfflineDB();
    const tx = db.transaction(['offline_actions'], 'readonly');
    const store = tx.objectStore('offline_actions');
    const actions = await store.getAll();
    
    for (const action of actions) {
      if (action.type === 'publish') {
        try {
          // Attempt to publish the event
          await publishOfflineEvent(action.data);
          
          // Remove from offline queue on success
          const deleteTx = db.transaction(['offline_actions'], 'readwrite');
          const deleteStore = deleteTx.objectStore('offline_actions');
          await deleteStore.delete(action.id);
          
          console.log('[SW] Successfully synced offline publish:', action.id);
        } catch (error) {
          console.error('[SW] Failed to sync offline publish:', action.id, error);
          // Keep in queue for next sync attempt
        }
      }
    }
  } catch (error) {
    console.error('[SW] Error during Nostr publish sync:', error);
  }
}

/**
 * Sync Nostr interactions (likes, reposts, etc.) when back online
 */
async function syncNostrInteractions() {
  console.log('[SW] Syncing offline Nostr interactions');
  
  try {
    const db = await openOfflineDB();
    const tx = db.transaction(['offline_actions'], 'readonly');
    const store = tx.objectStore('offline_actions');
    const actions = await store.getAll();
    
    for (const action of actions) {
      if (action.type === 'interaction') {
        try {
          await publishOfflineEvent(action.data);
          
          const deleteTx = db.transaction(['offline_actions'], 'readwrite');
          const deleteStore = deleteTx.objectStore('offline_actions');
          await deleteStore.delete(action.id);
          
          console.log('[SW] Successfully synced offline interaction:', action.id);
        } catch (error) {
          console.error('[SW] Failed to sync offline interaction:', action.id, error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Error during Nostr interaction sync:', error);
  }
}

/**
 * Open IndexedDB for offline storage
 */
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SpookstrOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create offline actions store
      if (!db.objectStoreNames.contains('offline_actions')) {
        const store = db.createObjectStore('offline_actions', { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create offline events store
      if (!db.objectStoreNames.contains('offline_events')) {
        const store = db.createObjectStore('offline_events', { keyPath: 'id' });
        store.createIndex('kind', 'kind', { unique: false });
        store.createIndex('pubkey', 'pubkey', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

/**
 * Publish an offline event to Nostr relays
 */
async function publishOfflineEvent(eventData) {
  // This would integrate with the Nostr client
  // For now, we'll simulate the publishing process
  console.log('[SW] Publishing offline event:', eventData);
  
  // In a real implementation, this would:
  // 1. Connect to configured relays
  // 2. Sign the event if needed
  // 3. Publish to relays
  // 4. Handle success/failure responses
  
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(resolve, 1000);
  });
}

/**
 * Show push notification
 */
async function showNotification(data) {
  const options = {
    body: data.body || 'New Nostr activity',
    icon: '/favicon-32x32.png',
    badge: '/favicon-16x16.png',
    data: data,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  return self.registration.showNotification(data.title || 'Spookstr', options);
}

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    // Open the app to the relevant content
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || '/')
    );
  }
});

console.log('[SW] Service worker script loaded');