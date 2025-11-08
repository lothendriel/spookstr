/**
 * AuthorDisplay Component Tests
 * Tests for the standardized author display component and variants
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  AuthorDisplay, 
  CompactAuthorDisplay, 
  MinimalAuthorDisplay,
  RepostAuthorDisplay,
  CommentAuthorDisplay,
  AuthorDisplaySkeleton,
  EnhancedAuthorDisplay 
} from '@/components/author/AuthorDisplay';
import { 
  renderWithProviders,
  createMockAuthor,
  flushPromises
} from '../utils/testUtils';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('AuthorDisplay Component', () => {
  const mockAuthor = createMockAuthor({
    metadata: {
      name: 'Test User',
      display_name: 'Test Display Name',
      picture: 'https://example.com/avatar.jpg',
      nip05: 'test@example.com',
      about: 'Test user bio',
      lud16: 'test@getalby.com',
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders author information correctly', () => {
    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    expect(screen.getByText('Test Display Name')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(screen.getByTitle('test@example.com')).toBeInTheDocument();
  });

  it('uses display name when available', () => {
    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    expect(screen.getByText('Test Display Name')).toBeInTheDocument();
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });

  it('falls back to name when display name is not available', () => {
    const authorWithoutDisplayName = {
      ...mockAuthor,
      metadata: {
        ...mockAuthor.metadata,
        display_name: undefined,
      }
    };

    renderWithProviders(
      <AuthorDisplay pubkey={authorWithoutDisplayName.pubkey} metadata={authorWithoutDisplayName.metadata} />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('shows skeleton when data is loading', () => {
    renderWithProviders(
      <AuthorDisplay pubkey="unknown-pubkey" />
    );

    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    // Should show loading skeleton
  });

  it('renders avatar correctly', () => {
    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(avatar).toHaveAttribute('alt', 'Test Display Name');
  });

  it('renders fallback avatar when no picture is provided', () => {
    const authorWithoutPicture = {
      ...mockAuthor,
      metadata: {
        ...mockAuthor.metadata,
        picture: undefined,
      }
    };

    renderWithProviders(
      <AuthorDisplay pubkey={authorWithoutPicture.pubkey} metadata={authorWithoutPicture.metadata} />
    );

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('src', '');
    
    // Should show first letter as fallback
    const fallback = screen.getByText('T');
    expect(fallback).toBeInTheDocument();
  });

  it('shows time when timestamp is provided', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        showTime={true}
        timestamp={timestamp}
      />
    );

    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('does not show time when showTime is false', () => {
    const timestamp = Math.floor(Date.now() / 1000) - 3600;

    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        showTime={false}
        timestamp={timestamp}
      />
    );

    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        size="lg"
      />
    );

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveClass('h-12', 'w-12');
    
    const name = screen.getByText('Test Display Name');
    expect(name).toHaveClass('text-base');
  });

  it('hides avatar when showAvatar is false', () => {
    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        showAvatar={false}
      />
    );

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('hides name when showName is false', () => {
    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        showName={false}
      />
    );

    expect(screen.queryByText('Test Display Name')).not.toBeInTheDocument();
  });

  it('hides nip05 verification when showNip05 is false', () => {
    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        showNip05={false}
      />
    );

    expect(screen.queryByTitle('test@example.com')).not.toBeInTheDocument();
  });

  it('handles avatar click correctly', async () => {
    const mockClick = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockClick);

    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const avatar = screen.getByRole('img');
    await userEvent.click(avatar);

    // Navigate should be called with encoded pubkey
    expect(mockClick).toHaveBeenCalled();
  });

  it('handles name click correctly', async () => {
    const mockClick = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockClick);

    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const name = screen.getByText('Test Display Name');
    await userEvent.click(name);

    expect(mockClick).toHaveBeenCalled();
  });

  it('applies custom className correctly', () => {
    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
        className="custom-author-class"
      />
    );

    const container = screen.getByText('Test Display Name').closest('div');
    expect(container).toHaveClass('custom-author-class');
  });
});

describe('AuthorDisplay Variants', () => {
  const mockAuthor = createMockAuthor();

  describe('CompactAuthorDisplay', () => {
    it('renders compact version correctly', () => {
      renderWithProviders(
        <CompactAuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
      );

      expect(screen.getByText('Test Display Name')).toBeInTheDocument();
      
      // Should use compact spacing
      const container = screen.getByText('Test Display Name').closest('div');
      expect(container).toHaveClass('space-x-2');
    });
  });

  describe('MinimalAuthorDisplay', () => {
    it('renders minimal version correctly', () => {
      renderWithProviders(
        <MinimalAuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
      );

      expect(screen.getByText('Test Display Name')).toBeInTheDocument();
      
      // Should use minimal spacing
      const container = screen.getByText('Test Display Name').closest('div');
      expect(container).toHaveClass('space-x-1');
    });
  });

  describe('CommentAuthorDisplay', () => {
    it('renders comment-sized version correctly', () => {
      renderWithProviders(
        <CommentAuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
      );

      const avatar = screen.getByRole('img');
      expect(avatar).toHaveClass('h-8', 'w-8');
      
      const name = screen.getByText('Test Display Name');
      expect(name).toHaveClass('text-sm');
    });
  });

  describe('RepostAuthorDisplay', () => {
    it('renders repost information correctly', () => {
      const reposter = createMockAuthor({
        metadata: { name: 'Reposter' }
      });

      renderWithProviders(
        <RepostAuthorDisplay 
          reposterPubkey={reposter.pubkey}
          reposterMetadata={reposter.metadata}
          pubkey={mockAuthor.pubkey}
          metadata={mockAuthor.metadata}
        />
      );

      expect(screen.getByText('Reposter')).toBeInTheDocument();
      expect(screen.getByText('reposted')).toBeInTheDocument();
      expect(screen.getByText('Test Display Name')).toBeInTheDocument();
    });

    it('hides repost label when showRepostLabel is false', () => {
      const reposter = createMockAuthor({
        metadata: { name: 'Reposter' }
      });

      renderWithProviders(
        <RepostAuthorDisplay 
          reposterPubkey={reposter.pubkey}
          reposterMetadata={reposter.metadata}
          pubkey={mockAuthor.pubkey}
          metadata={mockAuthor.metadata}
          showRepostLabel={false}
        />
      );

      expect(screen.queryByText('reposted')).not.toBeInTheDocument();
      expect(screen.getByText('Reposter')).toBeInTheDocument();
      expect(screen.getByText('Test Display Name')).toBeInTheDocument();
    });
  });

  describe('EnhancedAuthorDisplay', () => {
    it('renders with additional metadata when enabled', () => {
      renderWithProviders(
        <EnhancedAuthorDisplay 
          pubkey={mockAuthor.pubkey}
          metadata={{
            ...mockAuthor.metadata,
            about: 'Detailed user biography with lots of information about this person.',
            lud16: 'test@getalby.com'
          }}
          showAbout={true}
          showLightningAddress={true}
        />
      );

      expect(screen.getByText('Test Display Name')).toBeInTheDocument();
      expect(screen.getByText(/Detailed user biography/)).toBeInTheDocument();
      expect(screen.getByText(/test@getalby.com/)).toBeInTheDocument();
    });

    it('does not show about when showAbout is false', () => {
      renderWithProviders(
        <EnhancedAuthorDisplay 
          pubkey={mockAuthor.pubkey}
          metadata={mockAuthor.metadata}
          showAbout={false}
          showLightningAddress={true}
        />
      );

      expect(screen.queryByText(/Test user bio/)).not.toBeInTheDocument();
      expect(screen.getByText(/test@getalby.com/)).toBeInTheDocument();
    });

    it('truncates long about text correctly', () => {
      const longAbout = 'A'.repeat(200); // 200 characters

      renderWithProviders(
        <EnhancedAuthorDisplay 
          pubkey={mockAuthor.pubkey}
          metadata={{ ...mockAuthor.metadata, about: longAbout }}
          showAbout={true}
          maxAboutLength={50}
        />
      );

      const aboutText = screen.getByText(/A+/);
      expect(aboutText.textContent?.length).toBeLessThanOrEqual(53); // 50 + '...'
    });
  });

  describe('AuthorDisplaySkeleton', () => {
    it('renders loading skeleton correctly', () => {
      renderWithProviders(<AuthorDisplaySkeleton />);

      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
      // Should show skeleton elements
      const skeleton = document.querySelector('.bg-lime-500\\/20');
      expect(skeleton).toBeInTheDocument();
    });

    it('shows skeleton with correct size', () => {
      renderWithProviders(<AuthorDisplaySkeleton size="lg" />);

      const avatar = document.querySelector('.h-12.w-12');
      expect(avatar).toBeInTheDocument();
      
      const name = document.querySelector('.h-5');
      expect(name).toBeInTheDocument();
    });

    it('shows time skeleton when showTime is true', () => {
      renderWithProviders(<AuthorDisplaySkeleton showTime />);

      const timeSkeleton = document.querySelector('.h-3');
      expect(timeSkeleton).toBeInTheDocument();
    });

    it('hides avatar skeleton when showAvatar is false', () => {
      renderWithProviders(<AuthorDisplaySkeleton showAvatar={false} />);

      const avatar = document.querySelector('.h-10.w-10');
      expect(avatar).not.toBeInTheDocument();
    });
  });
});

describe('AuthorDisplay Accessibility', () => {
  const mockAuthor = createMockAuthor({
    metadata: {
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      nip05: 'test@example.com',
    }
  });

  it('provides proper alt text for avatar', () => {
    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const avatar = screen.getByRole('img');
    expect(avatar).toHaveAttribute('alt', 'Test User');
  });

  it('provides proper title for nip05 verification', () => {
    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const verification = screen.getByTitle('test@example.com');
    expect(verification).toBeInTheDocument();
  });

  it('makes avatar clickable with keyboard', async () => {
    const mockClick = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockClick);

    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const avatar = screen.getByRole('img');
    avatar.focus();
    
    // Test keyboard navigation
    fireEvent.keyDown(avatar, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('maintains proper color contrast', () => {
    renderWithProviders(
      <AuthorDisplay pubkey={mockAuthor.pubkey} metadata={mockAuthor.metadata} />
    );

    const name = screen.getByText('Test Display Name');
    expect(name).toHaveClass('text-lime-400');
  });
});

describe('AuthorDisplay Performance', () => {
  it('does not cause unnecessary re-renders', async () => {
    let renderCount = 0;
    
    const TestComponent = () => {
      renderCount++;
      return (
        <AuthorDisplay pubkey="test-pubkey" />
      );
    };

    const { rerender } = renderWithProviders(<TestComponent />);
    
    // Initial render
    expect(renderCount).toBe(1);
    
    // Re-render with same props
    rerender(<TestComponent />);
    
    // Should not cause additional render
    expect(renderCount).toBe(1);
  });

  it('handles rapid navigation clicks efficiently', async () => {
    const mockClick = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockClick);

    renderWithProviders(
      <AuthorDisplay 
        pubkey={mockAuthor.pubkey} 
        metadata={mockAuthor.metadata}
      />
    );

    const avatar = screen.getByRole('img');
    
    // Rapid clicks
    for (let i = 0; i < 5; i++) {
      await userEvent.click(avatar);
    }
    
    // Should not be throttled - each click should be handled
    expect(mockClick).toHaveBeenCalledTimes(5);
  });
});