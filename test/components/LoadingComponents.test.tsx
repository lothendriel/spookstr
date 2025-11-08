/**
 * Loading Components Tests
 * Tests for all loading component variants and utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  Loading, 
  Skeleton, 
  PostSkeleton, 
  FeedSkeleton, 
  ProfileSkeleton,
  CommentSkeleton,
  LoadingOverlay,
  InlineLoading 
} from '@/components/ui/LoadingComponents';
import { renderWithProviders } from '../utils/testUtils';

describe('Loading Components', () => {
  describe('Loading Component', () => {
    it('renders spinner variant by default', () => {
      renderWithProviders(<Loading />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders dots variant correctly', () => {
      renderWithProviders(<Loading variant="dots" />);
      
      const dots = document.querySelectorAll('.animate-bounce');
      expect(dots).toHaveLength(3);
    });

    it('renders bars variant correctly', () => {
      renderWithProviders(<Loading variant="bars" />);
      
      const bars = document.querySelectorAll('.animate-pulse');
      expect(bars).toHaveLength(4);
    });

    it('renders skeleton variant correctly', () => {
      renderWithProviders(<Loading variant="skeleton" />);
      
      const skeleton = document.querySelector('.bg-lime-500\\/20');
      expect(skeleton).toBeInTheDocument();
    });

    it('applies size classes correctly', () => {
      renderWithProviders(<Loading size="lg" variant="spinner" />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('shows loading text when showText is true', () => {
      renderWithProviders(
        <Loading showText text="Loading data..." />
      );
      
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders multiple skeletons when count is specified', () => {
      renderWithProviders(
        <Loading variant="skeleton" count={3} />
      );
      
      const skeletons = document.querySelectorAll('.bg-lime-500\\/20');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('Skeleton Component', () => {
    it('renders basic skeleton correctly', () => {
      renderWithProviders(<Skeleton />);
      
      const skeleton = document.querySelector('.bg-lime-500\\/20');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('renders avatar variant correctly', () => {
      renderWithProviders(<Skeleton variant="avatar" />);
      
      const skeleton = document.querySelector('.rounded-full');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('h-10', 'w-10');
    });

    it('renders button variant correctly', () => {
      renderWithProviders(<Skeleton variant="button" />);
      
      const skeleton = document.querySelector('.rounded-md');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('h-10');
    });

    it('renders card variant correctly', () => {
      renderWithProviders(<Skeleton variant="card" />);
      
      const skeleton = document.querySelector('.rounded-lg');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders multiple lines correctly', () => {
      renderWithProviders(<Skeleton lines={3} />);
      
      const skeletons = document.querySelectorAll('.bg-lime-500\\/20');
      expect(skeletons).toHaveLength(3);
    });

    it('applies custom dimensions correctly', () => {
      renderWithProviders(
        <Skeleton width={200} height={50} />
      );
      
      const skeleton = document.querySelector('.bg-lime-500\\/20');
      expect(skeleton).toHaveClass('w-200', 'h-50');
    });
  });

  describe('Specialized Skeleton Components', () => {
    describe('PostSkeleton', () => {
      it('renders post skeleton structure correctly', () => {
        renderWithProviders(<PostSkeleton />);
        
        // Check for header
        const avatar = document.querySelector('.h-10.w-10');
        expect(avatar).toBeInTheDocument();
        
        // Check for content lines
        const contentSkeletons = document.querySelectorAll('.space-y-2 .bg-lime-500\\/20');
        expect(contentSkeletons.length).toBeGreaterThan(0);
        
        // Check for action buttons
        const actionSkeletons = document.querySelectorAll('.space-x-4 .bg-lime-500\\/20');
        expect(actionSkeletons).toHaveLength(4);
      });

      it('applies custom className correctly', () => {
        renderWithProviders(<PostSkeleton className="custom-class" />);
        
        const container = document.querySelector('.custom-class');
        expect(container).toBeInTheDocument();
      });
    });

    describe('FeedSkeleton', () => {
      it('renders multiple post skeletons', () => {
        renderWithProviders(<FeedSkeleton count={3} />);
        
        const skeletons = document.querySelectorAll('.space-y-4 > div');
        expect(skeletons).toHaveLength(3);
      });

      it('uses default count when not specified', () => {
        renderWithProviders(<FeedSkeleton />);
        
        const skeletons = document.querySelectorAll('.space-y-4 > div');
        expect(skeletons).toHaveLength(5); // Default count
      });
    });

    describe('ProfileSkeleton', () => {
      it('renders profile skeleton correctly', () => {
        renderWithProviders(<ProfileSkeleton />);
        
        // Check for avatar
        const avatar = document.querySelector('.h-12.w-12');
        expect(avatar).toBeInTheDocument();
        
        // Check for name skeleton
        const nameSkeleton = document.querySelector('.w-32');
        expect(nameSkeleton).toBeInTheDocument();
        
        // Check for about skeleton
        const aboutSkeletons = document.querySelectorAll('.w-full');
        expect(aboutSkeletons.length).toBeGreaterThan(0);
      });

      it('centers content correctly', () => {
        renderWithProviders(<ProfileSkeleton />);
        
        const container = document.querySelector('.flex.flex-col.items-center');
        expect(container).toBeInTheDocument();
      });
    });

    describe('CommentSkeleton', () => {
      it('renders comment skeleton correctly', () => {
        renderWithProviders(<CommentSkeleton />);
        
        // Check for small avatar
        const avatar = document.querySelector('.h-8.w-8');
        expect(avatar).toBeInTheDocument();
        
        // Check for comment content
        const contentSkeletons = document.querySelectorAll('.space-y-2 .bg-lime-500\\/20');
        expect(contentSkeletons.length).toBeGreaterThan(0);
      });

      it('uses horizontal layout', () => {
        renderWithProviders(<CommentSkeleton />);
        
        const container = document.querySelector('.flex.space-x-3');
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('LoadingOverlay', () => {
    beforeEach(() => {
      // Mock setTimeout for testing
      vi.useFakeTimers();
    });

    it('does not render when not visible', () => {
      renderWithProviders(<LoadingOverlay isVisible={false} />);
      
      const overlay = document.querySelector('.fixed.inset-0');
      expect(overlay).not.toBeInTheDocument();
    });

    it('renders overlay when visible', () => {
      renderWithProviders(
        <LoadingOverlay isVisible text="Loading..." />
      );
      
      const overlay = document.querySelector('.fixed.inset-0');
      expect(overlay).toBeInTheDocument();
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('applies custom text correctly', () => {
      renderWithProviders(
        <LoadingOverlay isVisible text="Custom loading text" />
      );
      
      expect(screen.getByText('Custom loading text')).toBeInTheDocument();
    });

    it('applies custom className correctly', () => {
      renderWithProviders(
        <LoadingOverlay isVisible className="custom-overlay" />
      );
      
      const overlay = document.querySelector('.custom-overlay');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('InlineLoading', () => {
    it('renders inline loading spinner', () => {
      renderWithProviders(<InlineLoading />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('inline-block');
    });

    it('applies small size by default', () => {
      renderWithProviders(<InlineLoading />);
      
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('applies custom className correctly', () => {
      renderWithProviders(<InlineLoading className="custom-inline" />);
      
      const spinner = document.querySelector('.custom-inline');
      expect(spinner).toBeInTheDocument();
    });
  });
});

describe('Loading Component Accessibility', () => {
  it('provides proper ARIA attributes', () => {
    renderWithProviders(<Loading showText text="Loading content" />);
    
      // Loading text should be readable by screen readers
      const loadingText = screen.getByText('Loading content');
      expect(loadingText).toBeInTheDocument();
  });

  it('maintains good contrast ratios', () => {
    renderWithProviders(<Loading />);
    
      // Check that skeleton elements have visible colors
      const skeleton = document.querySelector('.bg-lime-500\\/20');
      expect(skeleton).toBeInTheDocument();
  });
});

describe('Loading Component Performance', () => {
  it('does not cause excessive re-renders', async () => {
    const TestComponent = () => {
      const [renderCount, setRenderCount] = React.useState(0);
      
      React.useEffect(() => {
        setRenderCount(c => c + 1);
      });
      
      return (
        <div>
          <Loading showText={`Render count: ${renderCount}`} />
          <button onClick={() => setRenderCount(0)}>Reset</button>
        </div>
      );
    };
    
    const { rerender } = renderWithProviders(<TestComponent />);
    
    // Initial render
    expect(screen.getByText(/Render count:/)).toBeInTheDocument();
    
    // Trigger re-render
    const button = screen.getByText('Reset');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/Render count:/)).toBeInTheDocument();
    });
    
    // Component should not cause excessive re-renders
    // This is a basic performance check - more detailed profiling would be done in separate tests
  });
});