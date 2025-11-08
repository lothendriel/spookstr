/**
 * Test Setup Configuration
 * Configures testing environment with custom matchers and utilities
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock window APIs that are not available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    ...window.performance,
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    setResourceTimingBufferSize: vi.fn(),
    toJSON: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 3000000,
    },
  },
});

// Mock navigator
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock AbortController
global.AbortController = vi.fn().mockImplementation(() => ({
  abort: vi.fn(),
  signal: {
    aborted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  },
}));

// Mock RequestIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 16 }), 1);
});

global.cancelIdleCallback = vi.fn(clearTimeout);

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  value: vi.fn(() => 'mock-uuid'),
});

// Mock File API
global.File = vi.fn((...args) => new (window as any).File(...args));

// Mock FileReader
Object.defineProperty(window, 'FileReader', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(),
    readAsText: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    readAsBinaryString: vi.fn(),
    abort: vi.fn(),
    readyState: 0,
    result: null,
    error: null,
    onloadstart: null,
    onprogress: null,
    onload: null,
    onabort: null,
    onerror: null,
    onloadend: null,
  })),
});

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  binaryType: 'blob',
  bufferedAmount: 0,
  extensions: '',
  onclose: null,
  onerror: null,
  onmessage: null,
  onopen: null,
  protocol: '',
  readyState: 0,
  url: '',
}));

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    key(index: number) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (function () {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    key(index: number) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Custom test matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveBeenCalledOnce(received: any) {
    const pass = received.mock?.calls?.length === 1;
    if (pass) {
      return {
        message: () => `expected mock function not to have been called exactly once`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected mock function to have been called exactly once, but was called ${received.mock?.calls?.length || 0} times`,
        pass: false,
      };
    }
  },

  toBeValidEvent(received: any) {
    const requiredProps = ['id', 'pubkey', 'created_at', 'kind', 'content', 'tags'];
    const hasRequiredProps = requiredProps.every(prop => prop in received);
    const hasValidId = typeof received.id === 'string' && received.id.length === 64;
    const hasValidPubkey = typeof received.pubkey === 'string' && received.pubkey.length === 64;
    const hasValidKind = typeof received.kind === 'number' && received.kind > 0;
    const hasValidTimestamp = typeof received.created_at === 'number';

    const pass = hasRequiredProps && hasValidId && hasValidPubkey && hasValidKind && hasValidTimestamp;

    if (pass) {
      return {
        message: () => `expected event not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected event to be valid, but it's missing required properties or has invalid values`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.testUtils = {
  createMockEvent: (overrides: Partial<any> = {}) => ({
    id: 'mock-event-id-1234567890123456789012345678901234567890123',
    pubkey: 'mock-pubkey-1234567890123456789012345678901234567890123',
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    content: 'Mock event content',
    tags: [],
    ...overrides,
  }),

  createMockUser: (overrides: Partial<any> = {}) => ({
    pubkey: 'mock-user-pubkey-1234567890123456789012345678901234567890123',
    metadata: {
      name: 'Mock User',
      display_name: 'Mock Display Name',
      picture: 'https://example.com/avatar.jpg',
      about: 'Mock user bio',
      nip05: 'mock@example.com',
      ...overrides.metadata,
    },
    ...overrides,
  }),

  createMockInteraction: (type: 'like' | 'repost' | 'zap' | 'comment', overrides: Partial<any> = {}) => {
    const baseEvent = {
      id: `mock-${type}-id-1234567890123456789012345678901234567890123`,
      pubkey: 'mock-interactor-pubkey-1234567890123456789012345678901234567890123',
      created_at: Math.floor(Date.now() / 1000),
      content: '',
      tags: [],
    };

    switch (type) {
      case 'like':
        return {
          ...baseEvent,
          kind: 7,
          content: '+',
          tags: [['e', 'target-event-id']],
          ...overrides,
        };
      case 'repost':
        return {
          ...baseEvent,
          kind: 6,
          content: JSON.stringify(testUtils.createMockEvent()),
          tags: [['e', 'target-event-id']],
          ...overrides,
        };
      case 'zap':
        return {
          ...baseEvent,
          kind: 9735,
          content: JSON.stringify({ amount: 1000, comment: 'Mock zap' }),
          tags: [['e', 'target-event-id'], ['p', 'target-pubkey']],
          ...overrides,
        };
      case 'comment':
        return {
          ...baseEvent,
          kind: 1,
          content: 'Mock comment',
          tags: [['e', 'target-event-id'], ['p', 'target-pubkey']],
          ...overrides,
        };
      default:
        return baseEvent;
    }
  },

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),

  createMockRelay: (overrides: Partial<any> = {}) => ({
    url: 'wss://mock-relay.example.com',
    status: 'connected',
    latency: 50,
    ...overrides,
  }),
};

// Global cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Test timeout configuration
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000,
});

// Console error suppression for expected errors
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn((...args) => {
    // Only log unexpected errors
    if (!args[0]?.includes('Warning: ReactDOM.render is no longer supported') &&
        !args[0]?.includes('Warning: An update to') &&
        !args[0]?.includes('React does not recognize the')) {
      originalError(...args);
    }
  });

  console.warn = vi.fn((...args) => {
    // Only log unexpected warnings
    if (!args[0]?.includes('Warning: ReactDOM.render is no longer supported')) {
      originalWarn(...args);
    }
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

export {};