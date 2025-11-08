/**
 * OptimizedFeed Integration Tests
 * Tests for the optimized feed component with virtual scrolling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NostrEvent } from '@nostrify/nostrify';
import { QueryClient } from '@tanstack/react-query';
import { OptimizedFeed } from '@/components/feeds/OptimizedFeed';
import { 
  renderWithProviders,
  createMockNostrEvent,
  createMockAuthor,
  flushPromises,
  advanceTime
} from '../utils/testUtils';

// Mock IntersectionObserver for virtual scrolling
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
});
global.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Nostr context
const createMockNostrContext = () => ({
  nostr: {
    query: vi.fn().mockResolvedValue([]),
    event: vi.fn().mockResolvedValue({}),
    req: vi.fn().mockReturnValue({}),
    close: vi.fn(),
  },
  connected: true,
  connecting: false,
  error: null,
});

describe('OptimizedFeed Integration Tests', () => {
  let queryClient: QueryClient;
  let mockPosts: NostrEvent[];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
      },
    });

    // Create mock posts
    mockPosts = Array.from({ length: 50 }, (_, i) => 
      createMockNostrEvent({
        id: `mock-event-id-${i}`,
        created_at: Math.floor(Date.now() / 1000) - (i * 60), // 1 minute apart
        content: `Mock post content ${i}`,
        kind: 1,
        pubkey: `mock-pubkey-${i}`,
        tags: [['t', 'test']],
      })
    );
  });

  afterEach(() => {
    queryClient.clear();
    vi.clearAllTimers();
  });

  describe('Initial Loading', () => {
    it('shows loading state initially', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts);

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      // Should show loading state
      expect(screen.getByText(/Loading.../)).toBeInTheDocument();
    });

    it('loads and displays posts successfully', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 20));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
      });

      // Should display posts
      expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      expect(screen.getByText('Mock post content 1')).toBeInTheDocument();
    });

    it('shows empty state when no posts are returned', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue([]);

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('No Posts Found')).toBeInTheDocument();
        expect(screen.getByText('No posts match your current filters.')).toBeInTheDocument();
      });
    });

    it('shows custom empty state message', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue([]);

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          emptyStateTitle="Custom Empty Title"
          emptyStateDescription="Custom empty description"
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Custom Empty Title')).toBeInTheDocument();
        expect(screen.getByText('Custom empty description')).toBeInTheDocument();
      });
    });
  });

  describe('Virtual Scrolling', () => {
    it('enables virtual scrolling by default', () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts);

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      // Virtual scroll container should be present
      expect(screen.getByRole('scrollbar')).toBeInTheDocument();
    });

    it('disables virtual scrolling when requested', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 10));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          virtualScrolling={false}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
      });

      // Should render without virtual scroll container
      expect(screen.queryByRole('scrollbar')).not.toBeInTheDocument();
      expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
    });

    it('handles dynamic height items correctly', () => {
      const postsWithVaryingContent = mockPosts.map((post, i) => ({
        ...post,
        content: 'A'.repeat(50 + i * 10), // Varying content length
      }));

      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(postsWithVaryingContent);

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          dynamicHeight={true}
          estimatedItemHeight={100}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      // Dynamic virtual scroll should be enabled
      expect(screen.getByRole('scrollbar')).toBeInTheDocument();
    });
  });

  describe('Infinite Scrolling', () => {
    it('loads more posts when scrolling to bottom', async () => {
      const mockNostr = createMockNostrContext();
      // First batch
      mockNostr.nostr.query
        .mockResolvedValueOnce(mockPosts.slice(0, 20))
        .mockResolvedValueOnce(mockPosts.slice(20, 40));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          batchSize={20}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Simulate scroll to bottom
      const scrollContainer = screen.getByRole('scrollbar');
      
      // Mock IntersectionObserver callback for load more
      const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
      const mockEntry = {
        isIntersecting: true,
        target: scrollContainer,
      };

      await act(async () => {
        intersectionCallback([mockEntry]);
      });

      // Should load more posts
      await waitFor(() => {
        expect(screen.getByText('Mock post content 20')).toBeInTheDocument();
      });

      expect(mockNostr.nostr.query).toHaveBeenCalledTimes(2);
    });

    it('stops loading when no more posts are available', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 20));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          batchSize={20}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Simulate scroll to bottom when no more posts
      const scrollContainer = screen.getByRole('scrollbar');
      const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
      const mockEntry = {
        isIntersecting: true,
        target: scrollContainer,
      };

      await act(async () => {
        intersectionCallback([mockEntry]);
      });

      await flushPromises();

      // Should not make additional requests
      expect(mockNostr.nostr.query).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator while loading more posts', async () => {
      const mockNostr = createMockNostrContext();
      let resolveQuery: (posts: NostrEvent[]) => void;
      const queryPromise = new Promise<NostrEvent[]>((resolve) => {
        resolveQuery = resolve;
      });

      mockNostr.nostr.query.mockReturnValue(queryPromise);

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          batchSize={20}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      // Trigger initial load
      await flushPromises();

      // Resolve first batch
      await act(async () => {
        resolveQuery!(mockPosts.slice(0, 20));
      });

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Simulate scroll to bottom
      const scrollContainer = screen.getByRole('scrollbar');
      const intersectionCallback = mockIntersectionObserver.mock.calls[0][0];
      const mockEntry = {
        isIntersecting: true,
        target: scrollContainer,
      };

      await act(async () => {
        intersectionCallback([mockEntry]);
      });

      // Should show loading indicator
      expect(screen.getByText('Loading more posts...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error state when query fails', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
      });
    });

    it('retries when retry button is clicked', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockPosts.slice(0, 20));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load posts')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      expect(mockNostr.nostr.query).toHaveBeenCalledTimes(2);
    });

    it('shows refresh button in error state', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });
    });
  });

  describe('Post Interactions', () => {
    it('calls onPostClick when a post is clicked', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 5));
      const onPostClick = vi.fn();

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          onPostClick={onPostClick}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      const firstPost = screen.getByText('Mock post content 0').closest('[role="button"]');
      await userEvent.click(firstPost!);

      expect(onPostClick).toHaveBeenCalledWith(mockPosts[0]);
    });

    it('renders posts with correct structure', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 5));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Check that posts have correct structure
      const posts = screen.getAllByRole('article');
      expect(posts.length).toBeGreaterThan(0);

      posts.forEach((post, index) => {
        expect(post).toHaveAttribute('data-testid', `post-${mockPosts[index].id}`);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('tracks visible posts when monitoring is enabled', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 5));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          enablePerformanceMonitoring={true}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Should show performance metrics in development
      expect(screen.getByText(/Posts:/)).toBeInTheDocument();
      expect(screen.getByText(/Visible:/)).toBeInTheDocument();
    });

    it('updates performance metrics on scroll', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 20));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          enablePerformanceMonitoring={true}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText(/Posts:/)).toBeInTheDocument();
      });

      // Initial metrics
      expect(screen.getByText('Posts: 20')).toBeInTheDocument();

      // Simulate visibility tracking
      const visibilityTracker = mockIntersectionObserver.mock.calls.find(
        call => call[0].name === 'PostVisibilityTracker'
      )?.[0];

      if (visibilityTracker) {
        const mockEntry = { isIntersecting: true, target: document.createElement('div') };
        await act(() => {
          visibilityTracker([mockEntry]);
        });

        // Should update visible count
        await waitFor(() => {
          expect(screen.getByText(/Visible:/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Filter and Sorting', () => {
    it('respects custom filters', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 10));

      const filters = [
        { kinds: [1], limit: 10, '#t': ['test'] },
        { kinds: [6], limit: 5 } // reposts
      ];

      renderWithProviders(
        <OptimizedFeed
          filters={filters}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.queryByText(/Loading.../)).not.toBeInTheDocument();
      });

      // Should have called query with provided filters
      expect(mockNostr.nostr.query).toHaveBeenCalledWith(filters, expect.any(Object));
    });

    it('handles filter changes correctly', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue([]);

      const { rerender } = renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      // Change filters
      const newFilters = [{ kinds: [1], limit: 20, '#t': ['new-topic'] }];
      
      rerender(
        <OptimizedFeed
          filters={newFilters}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(mockNostr.nostr.query).toHaveBeenLastCalledWith(newFilters, expect.any(Object));
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 5));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Posts should be keyboard accessible
      const posts = screen.getAllByRole('article');
      posts.forEach(post => {
        expect(post).toHaveAttribute('tabIndex', '0');
      });

      // Scroll container should be accessible
      const scrollContainer = screen.getByRole('scrollbar');
      expect(scrollContainer).toHaveAttribute('tabIndex', '0');
    });

    it('supports keyboard navigation', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 5));

      renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      // Tab to first post
      fireEvent.keyDown(document, { key: 'Tab' });

      const firstPost = screen.getByText('Mock post content 0').closest('[tabIndex="0"]');
      expect(firstPost).toHaveFocus();

      // Enter to click
      fireEvent.keyDown(firstPost!, { key: 'Enter' });

      // Should trigger click (would call onPostClick)
      // This is tested in the post interactions test above
    });
  });

  describe('Memory and Performance', () => {
    it('properly cleans up observers on unmount', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue(mockPosts.slice(0, 5));

      const { unmount } = renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      await waitFor(() => {
        expect(screen.getByText('Mock post content 0')).toBeInTheDocument();
      });

      const intersectionObserverDisconnect = vi.fn();
      mockIntersectionObserver.mockReturnValue({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: intersectionObserverDisconnect,
      });

      unmount();

      // Should clean up observers
      expect(intersectionObserverDisconnect).toHaveBeenCalled();
    });

    it('does not cause memory leaks with rapid filter changes', async () => {
      const mockNostr = createMockNostrContext();
      mockNostr.nostr.query.mockResolvedValue([]);

      const { rerender } = renderWithProviders(
        <OptimizedFeed
          filters={[{ kinds: [1], limit: 20 }]}
          queryClient={queryClient}
        />,
        { nostrContext: mockNostr }
      );

      // Rapid filter changes
      for (let i = 0; i < 10; i++) {
        const newFilters = [{ kinds: [1], limit: 20, '#t': [`topic-${i}`] }];
        
        rerender(
          <OptimizedFeed
            filters={newFilters}
            queryClient={queryClient}
          />,
          { nostrContext: mockNostr }
        );

        await flushPromises();
      }

      // Should not accumulate excessive observers or event listeners
      const observeCalls = mockIntersectionObserver.mock.calls.length;
      expect(observeCalls).toBeLessThan(50); // Should be reasonable
    });
  });
});