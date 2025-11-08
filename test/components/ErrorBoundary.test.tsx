/**
 * ErrorBoundary Component Tests
 * Tests for error boundary and error handling components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { Component, ErrorInfo } from 'react';
import { 
  ErrorBoundary,
  AsyncErrorBoundary,
  NetworkError,
  EmptyState,
  ErrorAlert,
  PageError 
} from '@/components/ui/ErrorBoundary';
import { renderWithProviders } from '../utils/testUtils';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children when there is no error', () => {
    const TestComponent = () => <div>Test Content</div>;
    
    renderWithProviders(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('catches and displays error when child component throws', () => {
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary onError={onError}>
        <ThrowComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object)
    );
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom Error UI</div>;
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary fallback={customFallback}>
        <ThrowComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('resets error when resetKeys change', () => {
    let shouldThrow = true;
    const ThrowComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Fixed Content</div>;
    };

    const { rerender } = renderWithProviders(
      <ErrorBoundary resetKeys={[1]}>
        <ThrowComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the component and change resetKey
    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKeys={[2]}>
        <ThrowComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Fixed Content')).toBeInTheDocument();
  });

  it('shows retry button that resets error', async () => {
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);

    // Should reset to try again (will error again in this case)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows go home button that navigates', async () => {
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    const homeButton = screen.getByText('Go Home');
    expect(homeButton).toBeInTheDocument();

    // Mock window.location.href
    const mockHref = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { href: mockHref },
      writable: true,
    });

    await userEvent.click(homeButton);

    expect(mockHref).toHaveBeenCalledWith('/');
  });

  it('logs error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByText(/Error Details/);
    await userEvent.click(detailsButton);

    expect(screen.getByText(/Error:/)).toBeInTheDocument();
    expect(screen.getByText(/Component Stack:/)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('hides error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('AsyncErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('catches and logs async errors', async () => {
    const ThrowComponent = () => {
      React.useEffect(() => {
        throw new Error('Async error');
      }, []);
      return <div>Content</div>;
    };

    renderWithProviders(
      <AsyncErrorBoundary>
        <ThrowComponent />
      </AsyncErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it('calls onError with async error details', async () => {
    const onError = vi.fn();
    const ThrowComponent = () => {
      React.useEffect(() => {
        throw new Error('Async error');
      }, []);
      return <div>Content</div>;
    };

    renderWithProviders(
      <AsyncErrorBoundary onError={onError}>
        <ThrowComponent />
      </AsyncErrorBoundary>
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('NetworkError Component', () => {
  it('renders network error correctly', () => {
    const error = new Error('Network Error');
    
    renderWithProviders(
      <NetworkError error={error} />
    );

    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server.')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders authentication error correctly', () => {
    const error = new Error('401 Unauthorized');
    
    renderWithProviders(
      <NetworkError error={error} />
    );

    expect(screen.getByText('Authentication Error')).toBeInTheDocument();
    expect(screen.getByText('Please log in again to continue.')).toBeInTheDocument();
    expect(screen.getByText('Log In')).toBeInTheDocument();
  });

  it('renders generic request error correctly', () => {
    const error = new Error('Request failed');
    
    renderWithProviders(
      <NetworkError error={error} />
    );

    expect(screen.getByText('Request Failed')).toBeInTheDocument();
    expect(screen.getByText('Request failed')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    const error = new Error('Network Error');
    
    renderWithProviders(
      <NetworkError error={error} onRetry={onRetry} />
    );

    const retryButton = screen.getByText('Retry');
    await userEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('applies custom className correctly', () => {
    const error = new Error('Test error');
    
    renderWithProviders(
      <NetworkError error={error} className="custom-network-error" />
    );

    const container = screen.getByText('Network Error').closest('div');
    expect(container).toHaveClass('custom-network-error');
  });
});

describe('EmptyState Component', () => {
  it('renders basic empty state correctly', () => {
    renderWithProviders(
      <EmptyState 
        title="No Items"
        description="There are no items to display."
      />
    );

    expect(screen.getByText('No Items')).toBeInTheDocument();
    expect(screen.getByText('There are no items to display.')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const CustomIcon = () => <div data-testid="custom-icon">Icon</div>;
    
    renderWithProviders(
      <EmptyState 
        title="No Items"
        icon={<CustomIcon />}
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('No Items')).toBeInTheDocument();
  });

  it('renders with custom action', () => {
    const CustomAction = () => <button>Custom Action</button>;
    
    renderWithProviders(
      <EmptyState 
        title="No Items"
        action={<CustomAction />}
      />
    );

    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    renderWithProviders(
      <EmptyState 
        title="No Items"
        className="custom-empty-state"
      />
    );

    const container = screen.getByText('No Items').closest('div');
    expect(container).toHaveClass('custom-empty-state');
  });
});

describe('ErrorAlert Component', () => {
  it('renders error string correctly', () => {
    renderWithProviders(
      <ErrorAlert error="Test error message" />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders error object correctly', () => {
    const error = new Error('Test error object');
    
    renderWithProviders(
      <ErrorAlert error={error} />
    );

    expect(screen.getByText('Test error object')).toBeInTheDocument();
  });

  it('does not render when error is null', () => {
    renderWithProviders(
      <ErrorAlert error={null} />
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('does not render when error is empty string', () => {
    renderWithProviders(
      <ErrorAlert error="" />
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    
    renderWithProviders(
      <ErrorAlert 
        error="Test error" 
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByText('×');
    await userEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes correctly', () => {
    renderWithProviders(
      <ErrorAlert error="Test error" variant="warning" />
    );

    const container = screen.getByRole('alert');
    expect(container).toHaveClass('border-yellow-500/20');
  });
});

describe('PageError Component', () => {
  it('renders page error correctly', () => {
    renderWithProviders(
      <PageError 
        title="Page Not Found"
        description="The page you are looking for does not exist."
        backAction={{
          onClick: () => {}
        }}
      />
    );

    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('The page you are looking for does not exist.')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('renders with custom action', () => {
    const action = {
      label: 'Custom Action',
      onClick: vi.fn()
    };
    
    renderWithProviders(
      <PageError 
        title="Custom Error"
        description="Custom error description."
        action={action}
      />
    );

    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
  });

  it('calls back action when clicked', async () => {
    const backAction = { onClick: vi.fn() };
    
    renderWithProviders(
      <PageError 
        title="Test Error"
        description="Test description."
        backAction={backAction}
      />
    );

    const backButton = screen.getByText('Go Back');
    await userEvent.click(backButton);

    expect(backAction.onClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className correctly', () => {
    renderWithProviders(
      <PageError 
        title="Test Error"
        className="custom-page-error"
      />
    );

    const container = screen.getByText('Test Error').closest('div');
    expect(container).toHaveClass('custom-page-error');
  });
});

describe('ErrorBoundary Integration', () => {
  it('works with async operations', async () => {
    const AsyncComponent = () => {
      React.useEffect(() => {
        // Simulate async error
        setTimeout(() => {
          throw new Error('Async error in useEffect');
        }, 100);
      }, []);
      return <div>Loading...</div>;
    };

    renderWithProviders(
      <ErrorBoundary>
        <AsyncComponent />
      </ErrorBoundary>
    );

    // Should show loading initially
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Should catch error after timeout
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('works with nested error boundaries', () => {
    const NestedThrowComponent = () => {
      throw new Error('Nested error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <div>Outer content</div>
        <ErrorBoundary>
          <NestedThrowComponent />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Outer boundary should still work, inner should catch the error
    expect(screen.getByText('Outer content')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('ErrorBoundary Accessibility', () => {
  it('provides proper ARIA labels', () => {
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    const title = screen.getByRole('heading');
    expect(title).toHaveAccessibleName('Something went wrong');
  });

  it('provides keyboard navigation for buttons', async () => {
    const ThrowComponent = () => {
      throw new Error('Test error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Try Again');
    retryButton.focus();

    expect(retryButton).toHaveFocus();

    // Test Enter key
    fireEvent.keyDown(retryButton, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});