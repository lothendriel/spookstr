/**
 * Error Boundary components for graceful error handling
 * Provides consistent error fallback UI across the application
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ErrorBoundaryProps } from '@/types/components';

/**
 * Main Error Boundary component for catching React errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps> {
  state = {
    hasError: false,
    error: null as Error | null,
    errorInfo: null as ErrorInfo | null
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
    
    // Log error for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when resetKeys change
    if (
      this.state.hasError &&
      this.props.resetOnPropsChange &&
      prevProps.resetKeys !== this.props.resetKeys &&
      this.props.resetKeys?.length
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        onReset={this.resetErrorBoundary}
        className={this.props.className}
      />;
    }

    return this.props.children;
  }
}

/**
 * Error Fallback component for displaying errors
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  className?: string;
}

function ErrorFallback({ error, errorInfo, onReset, className }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-lg border-red-500/20 bg-black/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <CardTitle className="text-red-400">Something went wrong</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-300">
              {error?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={onReset}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          {isDevelopment && errorInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-400 hover:text-red-300">
                <Bug className="h-4 w-4 inline mr-1" />
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-red-500/10 rounded text-xs font-mono text-red-300 overflow-auto max-h-48">
                <div className="font-semibold mb-2">Error:</div>
                <div className="mb-3">{error?.toString()}</div>
                
                <div className="font-semibold mb-2">Component Stack:</div>
                <div className="whitespace-pre-wrap">{errorInfo.componentStack}</div>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Async Error Boundary for handling async operation errors
 */
interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: Array<string | number>;
}

export function AsyncErrorBoundary({ 
  children, 
  fallback, 
  onError, 
  resetKeys 
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary 
      fallback={fallback}
      onError={(error, errorInfo) => {
        // Log async errors specifically
        console.error('Async Error Boundary caught error:', error);
        onError?.(error);
      }}
      resetKeys={resetKeys}
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Network Error component for API/network related errors
 */
interface NetworkErrorProps {
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ error, onRetry, className }: NetworkErrorProps) {
  const isNetworkError = error?.message.includes('Network Error') || 
                        error?.message.includes('fetch') ||
                        error?.message.includes('timeout');

  const isAuthError = error?.message.includes('401') || 
                      error?.message.includes('403') ||
                      error?.message.includes('unauthorized');

  return (
    <Card className={cn('border-yellow-500/20 bg-black/60 backdrop-blur-sm', className)}>
      <CardContent className="p-6 text-center">
        <div className="mx-auto w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">
          {isNetworkError ? 'Network Error' : isAuthError ? 'Authentication Error' : 'Request Failed'}
        </h3>
        
        <p className="text-yellow-300/80 mb-4 text-sm">
          {isNetworkError 
            ? 'Unable to connect to the server. Please check your internet connection.'
            : isAuthError
            ? 'Please log in again to continue.'
            : error?.message || 'An error occurred while processing your request.'
          }
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          {isAuthError && (
            <Button 
              onClick={() => window.location.href = '/login'}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              Log In
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty State component for consistent empty state displays
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <Card className={cn('border-lime-500/20 bg-black/40 backdrop-blur-sm', className)}>
      <CardContent className="p-8 text-center">
        {icon && (
          <div className="mx-auto w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center mb-4">
            {icon}
          </div>
        )}
        
        <h3 className="text-lg font-semibold text-lime-400 mb-2">
          {title}
        </h3>
        
        {description && (
          <p className="text-lime-300/70 mb-6 text-sm">
            {description}
          </p>
        )}
        
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Error Alert component for inline error messages
 */
interface ErrorAlertProps {
  error: Error | string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'warning';
}

export function ErrorAlert({ error, onDismiss, className, variant = 'destructive' }: ErrorAlertProps) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  
  const variantClasses = {
    default: 'border-lime-500/20 bg-lime-500/10 text-lime-300',
    destructive: 'border-red-500/20 bg-red-500/10 text-red-300',
    warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'
  };

  return (
    <Alert className={cn(variantClasses[variant], className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{errorMessage}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 ml-2 hover:bg-current/20"
          >
            ×
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Page Error component for full-page error displays
 */
interface PageErrorProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
    icon?: ReactNode;
  };
  backAction?: {
    label?: string;
    onClick: () => void;
  };
  className?: string;
}

export function PageError({ 
  title, 
  description, 
  action, 
  backAction, 
  className 
}: PageErrorProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4', className)}>
      <Card className="w-full max-w-md border-red-500/20 bg-black/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <CardTitle className="text-red-400 text-xl">{title}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 text-center">
          <p className="text-red-300/80">{description}</p>
          
          <div className="flex flex-col gap-2">
            {action && (
              <Button 
                onClick={action.onClick}
                variant={action.variant || 'default'}
                className="w-full"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            )}
            
            {backAction && (
              <Button 
                onClick={backAction.onClick}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {backAction.label || 'Go Back'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export all error boundary components
export {
  ErrorFallback,
  NetworkError,
  EmptyState,
  ErrorAlert,
  PageError
};

// Higher-order component for adding error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for error handling in functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error caught by hook:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      // Log error to error tracking service if available
      console.error('Unhandled error:', error);
    }
  }, [error]);

  return { error, handleError, clearError };
}