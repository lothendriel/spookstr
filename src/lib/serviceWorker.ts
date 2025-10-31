/**
 * Service Worker Registration and Management
 *
 * Handles service worker registration, updates, and communication
 * for offline support in Spookstr.
 */

import { useState, useEffect } from 'react';
import { devLogger } from './devLogger';

const swLogger = devLogger.scope('sw');

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

class ServiceWorkerManager {
  private state: ServiceWorkerState = {
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  };

  private listeners: Array<(state: ServiceWorkerState) => void> = [];

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.state.isSupported) {
      swLogger.warn('Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      swLogger.info('Service worker registered successfully');

      // Set up event listeners
      this.setupEventListeners(registration);

      // Check for updates
      await this.checkForUpdates(registration);

      this.notifyListeners();
      return registration;

    } catch (error) {
      swLogger.error('Service worker registration failed', error);
      return null;
    }
  }

  /**
   * Set up service worker event listeners
   */
  private setupEventListeners(registration: ServiceWorkerRegistration): void {
    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      swLogger.info('New service worker version found');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version is ready to activate
          this.state.isUpdateAvailable = true;
          this.notifyListeners();
          swLogger.info('New service worker version ready');
        }
      });
    });

    // Listen for controller changes (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      swLogger.info('Service worker controller changed - reloading page');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(data: any): void {
    swLogger.debug('Received message from service worker', data);

    switch (data.type) {
      case 'CACHE_UPDATED':
        swLogger.info('Cache updated by service worker');
        break;
      case 'OFFLINE_MODE':
        swLogger.info('App is now in offline mode');
        break;
      case 'ONLINE_MODE':
        swLogger.info('App is now in online mode');
        break;
      case 'SYNC_COMPLETE':
        swLogger.info('Background sync completed');
        break;
      default:
        swLogger.debug('Unknown message type from service worker', data.type);
    }
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(registration?: ServiceWorkerRegistration): Promise<void> {
    const reg = registration || this.state.registration;
    if (!reg) return;

    try {
      await reg.update();
      swLogger.debug('Checked for service worker updates');
    } catch (error) {
      swLogger.error('Failed to check for service worker updates', error);
    }
  }

  /**
   * Activate waiting service worker
   */
  async activateUpdate(): Promise<void> {
    const registration = this.state.registration;
    if (!registration || !registration.waiting) {
      swLogger.warn('No waiting service worker to activate');
      return;
    }

    // Send message to waiting SW to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    this.state.isUpdateAvailable = false;
    this.notifyListeners();

    swLogger.info('Activating new service worker version');
  }

  /**
   * Send message to service worker
   */
  async postMessage(message: any): Promise<void> {
    if (!this.state.registration || !navigator.serviceWorker.controller) {
      swLogger.warn('No active service worker to send message to');
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
    swLogger.debug('Sent message to service worker', message);
  }

  /**
   * Register for background sync
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    const registration = this.state.registration;
    if (!registration || !('sync' in registration)) {
      swLogger.warn('Background sync not supported');
      return;
    }

    try {
      await registration.sync.register(tag);
      swLogger.info(`Registered background sync: ${tag}`);
    } catch (error) {
      swLogger.error(`Failed to register background sync: ${tag}`, error);
    }
  }

  /**
   * Request notification permission and register for push
   */
  async setupNotifications(): Promise<boolean> {
    if (!this.state.registration || !('showNotification' in ServiceWorkerRegistration.prototype)) {
      swLogger.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        swLogger.warn('Notification permission denied');
        return false;
      }

      swLogger.info('Notification permission granted');
      return true;

    } catch (error) {
      swLogger.error('Failed to request notification permission', error);
      return false;
    }
  }

  /**
   * Show a notification via service worker
   */
  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    const registration = this.state.registration;
    if (!registration) {
      swLogger.warn('No service worker registration for notifications');
      return;
    }

    try {
      await registration.showNotification(title, {
        icon: '/favicon-32x32.png',
        badge: '/favicon-16x16.png',
        ...options,
      });

      swLogger.info(`Showed notification: ${title}`);
    } catch (error) {
      swLogger.error('Failed to show notification', error);
    }
  }

  /**
   * Clear all caches (for debugging/reset)
   */
  async clearCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );

      swLogger.info(`Cleared ${cacheNames.length} caches`);
    } catch (error) {
      swLogger.error('Failed to clear caches', error);
    }
  }

  /**
   * Get cache storage statistics
   */
  async getCacheStats(): Promise<{ name: string; size: number }[]> {
    try {
      const cacheNames = await caches.keys();
      const stats = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, size: keys.length };
        })
      );

      return stats;
    } catch (error) {
      swLogger.error('Failed to get cache stats', error);
      return [];
    }
  }

  /**
   * Unregister service worker (for debugging)
   */
  async unregister(): Promise<boolean> {
    const registration = this.state.registration;
    if (!registration) {
      swLogger.warn('No service worker registration to unregister');
      return false;
    }

    try {
      const result = await registration.unregister();

      this.state.isRegistered = false;
      this.state.registration = null;
      this.notifyListeners();

      swLogger.info('Service worker unregistered successfully');
      return result;

    } catch (error) {
      swLogger.error('Failed to unregister service worker', error);
      return false;
    }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: ServiceWorkerState) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        swLogger.error('Error in service worker state listener', error);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): ServiceWorkerState {
    return { ...this.state };
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * React hook for service worker state
 */
export function useServiceWorker() {
  const [state, setState] = useState(serviceWorkerManager.getState());

  useEffect(() => {
    const unsubscribe = serviceWorkerManager.onStateChange(setState);
    return unsubscribe;
  }, []);

  return {
    ...state,
    register: serviceWorkerManager.register.bind(serviceWorkerManager),
    activateUpdate: serviceWorkerManager.activateUpdate.bind(serviceWorkerManager),
    checkForUpdates: serviceWorkerManager.checkForUpdates.bind(serviceWorkerManager),
    setupNotifications: serviceWorkerManager.setupNotifications.bind(serviceWorkerManager),
    showNotification: serviceWorkerManager.showNotification.bind(serviceWorkerManager),
    clearCaches: serviceWorkerManager.clearCaches.bind(serviceWorkerManager),
    getCacheStats: serviceWorkerManager.getCacheStats.bind(serviceWorkerManager),
  };
}

/**
 * Auto-register service worker when module loads
 */
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  // Only auto-register in production
  serviceWorkerManager.register().then(() => {
    swLogger.info('Service worker auto-registration completed');
  });
}