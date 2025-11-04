/**
 * Service Worker Registration and Management
 *
 * Handles service worker registration, updates, and communication
 * for offline support in Spookstr.
 */

import { useState, useEffect } from 'react';

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
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      // Set up event listeners
      this.setupEventListeners(registration);

      // Check for updates
      await this.checkForUpdates(registration);

      this.notifyListeners();
      return registration;

    } catch (error) {
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

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version is ready to activate
          this.state.isUpdateAvailable = true;
          this.notifyListeners();
        }
      });
    });

    // Listen for controller changes (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
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
    // Handle service worker messages silently
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(registration?: ServiceWorkerRegistration): Promise<void> {
    const reg = registration || this.state.registration;
    if (!reg) return;

    try {
      await reg.update();
    } catch (error) {
      // Silent error handling for update checks
    }
  }

  /**
   * Activate waiting service worker
   */
  async activateUpdate(): Promise<void> {
    const registration = this.state.registration;
    if (!registration || !registration.waiting) {
      return;
    }

    // Send message to waiting SW to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    this.state.isUpdateAvailable = false;
    this.notifyListeners();
  }

  /**
   * Send message to service worker
   */
  async postMessage(message: any): Promise<void> {
    if (!this.state.registration || !navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage(message);
  }

  /**
   * Register for background sync
   */
  async registerBackgroundSync(tag: string): Promise<void> {
    const registration = this.state.registration;
    if (!registration || !('sync' in registration)) {
      return;
    }

    try {
      await registration.sync.register(tag);
    } catch (error) {
      // Silent error handling for background sync
    }
  }

  /**
   * Request notification permission and register for push
   */
  async setupNotifications(): Promise<boolean> {
    if (!this.state.registration || !('showNotification' in ServiceWorkerRegistration.prototype)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * Show a notification via service worker
   */
  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    const registration = this.state.registration;
    if (!registration) {
      return;
    }

    try {
      await registration.showNotification(title, {
        icon: '/favicon-32x32.png',
        badge: '/favicon-16x16.png',
        ...options,
      });
    } catch (error) {
      // Silent error handling for notifications
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
    } catch (error) {
      // Silent error handling for cache clearing
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
      return [];
    }
  }

  /**
   * Unregister service worker (for debugging)
   */
  async unregister(): Promise<boolean> {
    const registration = this.state.registration;
    if (!registration) {
      return false;
    }

    try {
      const result = await registration.unregister();

      this.state.isRegistered = false;
      this.state.registration = null;
      this.notifyListeners();

      return result;

    } catch (error) {
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
        // Silent error handling for listeners
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
  serviceWorkerManager.register();
}