/**
 * Test Utilities and Helpers
 * Common utilities for testing React components and Nostr functionality
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { NostrEvent } from '@nostrify/nostrify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AppProvider } from '@/AppProvider';
import { TestApp } from '@/test/TestApp';

// Test wrapper component with all necessary providers
export interface AllTheProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  router?: {
    initialEntries?: string[];
    initialIndex?: number;
  };
}

const AllTheProviders = ({ children, queryClient, router }: AllTheProvidersProps) => {
  const client = queryClient || createTestQueryClient();

  return (
    <MemoryRouter {...router}>
      <QueryClientProvider client={client}>
        <AppProvider>
          <TestApp>
            {children}
          </TestApp>
        </AppProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderOptions & {
    queryClient?: QueryClient;
    router?: AllTheProvidersProps['router'];
  } = {}
) => {
  const { queryClient, router, ...renderOptions } = options;

  return render(
    <AllTheProviders queryClient={queryClient} router={router}>
      {ui}
    </AllTheProviders>,
    renderOptions
  );
};

// Create test query client with default configuration
export const createTestQueryClient = (overrides = {}) => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        ...overrides.queries,
      },
      mutations: {
        retry: false,
        ...overrides.mutations,
      },
    },
  });
};

// Mock data factories
export const createMockNostrEvent = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
  id: 'mock-event-id-1234567890123456789012345678901234567890123',
  pubkey: 'mock-pubkey-1234567890123456789012345678901234567890123',
  created_at: Math.floor(Date.now() / 1000),
  kind: 1,
  content: 'Mock event content',
  tags: [],
  sig: 'mock-signature',
  ...overrides,
});

export const createMockAuthor = (overrides: Partial<any> = {}) => ({
  pubkey: 'mock-author-pubkey-1234567890123456789012345678901234567890123',
  metadata: {
    name: 'Test User',
    display_name: 'Test Display Name',
    picture: 'https://example.com/avatar.jpg',
    about: 'Test user bio',
    nip05: 'test@example.com',
    lud16: 'test@getalby.com',
    ...overrides.metadata,
  },
  ...overrides,
});

export const createMockInteraction = (type: 'like' | 'repost' | 'zap' | 'comment', overrides: Partial<NostrEvent> = {}): NostrEvent => {
  const baseEvent = createMockNostrEvent(overrides);
  
  switch (type) {
    case 'like':
      return createMockNostrEvent({
        kind: 7,
        content: '+',
        tags: [['e', 'target-event-id']],
        ...overrides,
      });
    
    case 'repost':
      return createMockNostrEvent({
        kind: 6,
        content: JSON.stringify(createMockNostrEvent()),
        tags: [['e', 'target-event-id']],
        ...overrides,
      });
    
    case 'zap':
      return createMockNostrEvent({
        kind: 9735,
        content: JSON.stringify({ amount: 1000, comment: 'Test zap' }),
        tags: [['e', 'target-event-id'], ['p', 'target-pubkey']],
        ...overrides,
      });
    
    case 'comment':
      return createMockNostrEvent({
        kind: 1,
        content: 'Test comment',
        tags: [['e', 'target-event-id'], ['p', 'target-pubkey']],
        ...overrides,
      });
    
    default:
      return baseEvent;
  }
};

export const createMockRelay = (overrides: Partial<any> = {}) => ({
  url: 'wss://mock-relay.example.com',
  status: 'connected',
  latency: 50,
  name: 'Mock Relay',
  ...overrides,
});

export const createMockCommunity = (overrides: Partial<any> = {}) => ({
  id: 'mock-community-id',
  name: 'Test Community',
  about: 'Test community description',
  moderators: ['mock-moderator-pubkey'],
  rules: ['Rule 1', 'Rule 2'],
  image: 'https://example.com/community-image.jpg',
  ...overrides,
});

// Nostr specific utilities
export const createMockNostrContext = (overrides = {}) => {
  return {
    nostr: {
      query: vi.fn().mockResolvedValue([]),
      event: vi.fn().mockResolvedValue({}),
      req: vi.fn().mockReturnValue({}),
      close: vi.fn(),
      ...overrides,
    },
    connected: true,
    connecting: false,
    error: null,
  };
};

export const createMockUserContext = (overrides = {}) => {
  return {
    user: createMockAuthor(overrides.user),
    accounts: [createMockAuthor(overrides.user)],
    login: vi.fn(),
    logout: vi.fn(),
    switchAccount: vi.fn(),
    isLoggedIn: true,
    isLoading: false,
    error: null,
    ...overrides,
  };
};

export const createMockWalletContext = (overrides = {}) => {
  return {
    webln: {
      enabled: true,
      lnurl: 'test@getalby.com',
      makeInvoice: vi.fn().mockResolvedValue({
        pr: 'mock-invoice',
        payment_hash: 'mock-payment-hash',
      }),
      sendPayment: vi.fn().mockResolvedValue({
        preimage: 'mock-preimage',
        payment_hash: 'mock-payment-hash',
      }),
      ...overrides.webln,
    },
    activeNWC: {
      pubkey: 'mock-nwc-pubkey',
      ...overrides.activeNWC,
    },
    connectWebLN: vi.fn(),
    connectNWC: vi.fn(),
    disconnect: vi.fn(),
    isConnecting: false,
    ...overrides,
  };
};

// Component testing utilities
export const renderWithRouter = (
  ui: ReactElement,
  initialEntries: string[] = ['/']
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={createTestQueryClient()}>
        <AppProvider>
          <TestApp>
            {ui}
          </TestApp>
        </AppProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

export const renderWithNostr = (
  ui: ReactElement,
  nostrContext = createMockNostrContext()
) => {
  return render(
    <TestApp nostrContext={nostrContext}>
      <QueryClientProvider client={createTestQueryClient()}>
        {ui}
      </QueryClientProvider>
    </TestApp>
  );
};

export const renderWithUser = (
  ui: ReactElement,
  userContext = createMockUserContext()
) => {
  return render(
    <TestApp userContext={userContext}>
      <QueryClientProvider client={createTestQueryClient()}>
        {ui}
      </QueryClientProvider>
    </TestApp>
  );
};

// Async utilities
export const waitFor = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = (): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, 0));

export const waitForElement = async (
  getByTestId: (id: string) => HTMLElement,
  testId: string,
  timeout = 5000
): Promise<HTMLElement> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      return getByTestId(testId);
    } catch {
      await waitFor(100);
    }
  }
  
  throw new Error(`Element with test-id "${testId}" not found within ${timeout}ms`);
};

// Event testing utilities
export const createMockEventStream = (events: NostrEvent[]) => {
  let index = 0;
  
  return {
    next: () => {
      if (index < events.length) {
        return {
          done: false,
          value: events[index++],
        };
      }
      return { done: true };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
};

export const createMockWebSocket = (overrides = {}) => {
  const listeners = {};
  
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn((event, callback) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(callback);
    }),
    removeEventListener: vi.fn((event, callback) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      }
    }),
    dispatchEvent: vi.fn((event) => {
      if (listeners[event.type]) {
        listeners[event.type].forEach(callback => callback(event));
      }
    }),
    ...overrides,
  };
};

// File testing utilities
export const createMockFile = (
  content: string,
  name: string,
  type: string = 'text/plain'
): File => {
  return new File([content], name, { type });
};

export const createMockImageFile = (
  name = 'test.jpg',
  type = 'image/jpeg'
): File => {
  // Create a minimal valid JPEG blob
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 100, 100);
  
  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], name, { type }));
      }
    }, type);
  });
};

// Time utilities
export const advanceTime = (ms: number) => {
  vi.advanceTimersByTime(ms);
};

export const advanceTimeTo = (ms: number) => {
  vi.advanceTimersToTime(ms);
};

// Performance testing utilities
export const measureRenderTime = async (Component: ReactElement, iterations = 10) => {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderWithProviders(Component);
    const end = performance.now();
    times.push(end - start);
    
    // Allow React to clean up
    await flushPromises();
  }
  
  return {
    average: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    times,
  };
};

// Accessibility testing utilities
export const checkAccessibility = async (Component: ReactElement) => {
  // This would integrate with axe-core if available
  // For now, just basic checks
  const { container } = renderWithProviders(Component);
  
  const issues: string[] = [];
  
  // Check for missing alt text on images
  const images = container.querySelectorAll('img:not([alt])');
  if (images.length > 0) {
    issues.push(`${images.length} images missing alt text`);
  }
  
  // Check for missing ARIA labels on interactive elements
  const buttons = container.querySelectorAll('button:not([aria-label]):not([aria-labelledby]):not([textContent])');
  if (buttons.length > 0) {
    issues.push(`${buttons.length} buttons missing accessible labels`);
  }
  
  return {
    issues,
    passes: issues.length === 0,
  };
};

// Export all utilities
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export * from '@testing-library/jest-dom';
export * from 'vitest';

export {
  renderWithProviders as default,
  AllTheProviders,
};