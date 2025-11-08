import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Error categories for consistent error handling
 */
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  RELAY = 'relay',
  PUBLISHING = 'publishing',
  UPLOAD = 'upload',
  CACHE = 'cache',
  UNKNOWN = 'unknown'
}

/**
 * Standardized error interface
 */
export interface AppError {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: any;
  userMessage: string;
  retryable: boolean;
  timestamp: number;
}

/**
 * Error codes for different scenarios
 */
export const ErrorCodes = {
  // Network errors
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  RELAY_CONNECTION_FAILED: 'RELAY_CONNECTION_FAILED',
  
  // Authentication errors
  USER_NOT_LOGGED_IN: 'USER_NOT_LOGGED_IN',
  SIGNER_NOT_AVAILABLE: 'SIGNER_NOT_AVAILABLE',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',
  
  // Validation errors
  INVALID_EVENT_ID: 'INVALID_EVENT_ID',
  INVALID_NIP19_FORMAT: 'INVALID_NIP19_FORMAT',
  DUPLICATE_EVENT: 'DUPLICATE_EVENT',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  
  // Relay errors
  RELAY_NOT_FOUND: 'RELAY_NOT_FOUND',
  RELAY_QUERY_FAILED: 'RELAY_QUERY_FAILED',
  RELAY_PUBLISH_FAILED: 'RELAY_PUBLISH_FAILED',
  
  // Publishing errors
  PUBLISH_FAILED: 'PUBLISH_FAILED',
  EVENT_TOO_LARGE: 'EVENT_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Upload errors
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  BLOSSOM_SERVER_ERROR: 'BLOSSOM_SERVER_ERROR',
  
  // Cache errors
  CACHE_MISS: 'CACHE_MISS',
  CACHE_EXPIRED: 'CACHE_EXPIRED',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Create a standardized app error from any error
 */
export function createAppError(
  error: any,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  code: string = ErrorCodes.UNKNOWN_ERROR,
  userMessage?: string
): AppError {
  const timestamp = Date.now();
  
  // Extract meaningful message from error
  let message = 'An unknown error occurred';
  if (error?.message) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else if (error?.toString) {
    message = error.toString();
  }

  // Determine if error is retryable based on category
  const retryable = [
    ErrorCategory.NETWORK,
    ErrorCategory.RELAY,
    ErrorCategory.CACHE
  ].includes(category);

  // Generate user-friendly message if not provided
  if (!userMessage) {
    userMessage = getUserMessageForError(category, code);
  }

  return {
    category,
    code,
    message,
    details: error,
    userMessage,
    retryable,
    timestamp
  };
}

/**
 * Get user-friendly message for error category and code
 */
function getUserMessageForError(category: ErrorCategory, code: string): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Network connection issue. Please check your internet connection and try again.';
    
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication required. Please log in to continue.';
    
    case ErrorCategory.VALIDATION:
      if (code === ErrorCodes.DUPLICATE_EVENT) {
        return 'This appears to be a duplicate submission. Please wait a moment before trying again.';
      }
      return 'Invalid data provided. Please check your input and try again.';
    
    case ErrorCategory.RELAY:
      return 'Unable to connect to relay servers. Please try again or switch to a different relay.';
    
    case ErrorCategory.PUBLISHING:
      if (code === ErrorCodes.RATE_LIMITED) {
        return 'Too many requests. Please wait a moment before trying again.';
      }
      return 'Failed to publish content. Please try again.';
    
    case ErrorCategory.UPLOAD:
      if (code === ErrorCodes.FILE_TOO_LARGE) {
        return 'File is too large. Please choose a smaller file.';
      }
      if (code === ErrorCodes.UNSUPPORTED_FILE_TYPE) {
        return 'File type not supported. Please choose a different file.';
      }
      return 'Failed to upload file. Please try again.';
    
    case ErrorCategory.CACHE:
      return 'Data temporarily unavailable. Please try again.';
    
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log error with consistent format
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    category: error.category,
    code: error.code,
    message: error.message,
    context,
    timestamp: new Date(error.timestamp).toISOString(),
    retryable: error.retryable,
    details: error.details
  };

  console.error('🚨 App Error:', logData);
}

/**
 * Handle Nostr-specific errors
 */
export function handleNostrError(error: any, operation: string): AppError {
  // Network/relay errors
  if (error?.message?.includes('timeout')) {
    return createAppError(
      error,
      ErrorCategory.NETWORK,
      ErrorCodes.NETWORK_TIMEOUT,
      `Request timed out while ${operation}. Please try again.`
    );
  }

  if (error?.message?.includes('connection') || error?.message?.includes('relay')) {
    return createAppError(
      error,
      ErrorCategory.RELAY,
      ErrorCodes.RELAY_CONNECTION_FAILED,
      `Failed to connect to relay while ${operation}. Please try again.`
    );
  }

  // Authentication errors
  if (error?.message?.includes('not logged in') || error?.message?.includes('authentication')) {
    return createAppError(
      error,
      ErrorCategory.AUTHENTICATION,
      ErrorCodes.USER_NOT_LOGGED_IN
    );
  }

  if (error?.message?.includes('signer') || error?.message?.includes('signature')) {
    return createAppError(
      error,
      ErrorCategory.AUTHENTICATION,
      ErrorCodes.SIGNER_NOT_AVAILABLE,
      'Unable to sign event. Please check your Nostr signer extension.'
    );
  }

  // Validation errors
  if (error?.message?.includes('duplicate')) {
    return createAppError(
      error,
      ErrorCategory.VALIDATION,
      ErrorCodes.DUPLICATE_EVENT
    );
  }

  if (error?.message?.includes('Invalid event') || error?.message?.includes('malformed')) {
    return createAppError(
      error,
      ErrorCategory.VALIDATION,
      ErrorCodes.INVALID_EVENT_ID
    );
  }

  // Publishing errors
  if (operation.includes('publish') || operation.includes('event')) {
    return createAppError(
      error,
      ErrorCategory.PUBLISHING,
      ErrorCodes.PUBLISH_FAILED
    );
  }

  // Upload errors
  if (operation.includes('upload')) {
    return createAppError(
      error,
      ErrorCategory.UPLOAD,
      ErrorCodes.UPLOAD_FAILED
    );
  }

  // Default fallback
  return createAppError(
    error,
    ErrorCategory.UNKNOWN,
    ErrorCodes.UNKNOWN_ERROR
  );
}

/**
 * React Query error handler wrapper
 */
export function createQueryErrorHandler(operation: string) {
  return (error: any) => {
    const appError = handleNostrError(error, operation);
    logError(appError, operation);
    return appError;
  };
}

/**
 * Mutation error handler wrapper
 */
export function createMutationErrorHandler(operation: string) {
  return (error: any, variables: any) => {
    const appError = handleNostrError(error, operation);
    logError(appError, operation, { variables });
    return appError;
  };
}

/**
 * Check if error should be retried
 */
export function shouldRetryError(failureCount: number, error: AppError): boolean {
  // Don't retry non-retryable errors
  if (!error.retryable) {
    return false;
  }

  // Don't retry authentication or validation errors
  if ([ErrorCategory.AUTHENTICATION, ErrorCategory.VALIDATION].includes(error.category)) {
    return false;
  }

  // Retry network/relay errors up to 3 times
  if ([ErrorCategory.NETWORK, ErrorCategory.RELAY].includes(error.category)) {
    return failureCount < 3;
  }

  // Retry other errors up to 2 times
  return failureCount < 2;
}

/**
 * Get retry delay with exponential backoff
 */
export function getRetryDelay(failureCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const baseDelay = 1000;
  const maxDelay = 16000;
  const delay = Math.min(baseDelay * Math.pow(2, failureCount - 1), maxDelay);
  
  // Add some jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();
  
  return delay + jitter;
}

/**
 * Error boundary component helper
 */
export function getErrorDisplayProps(error: AppError) {
  return {
    title: getErrorTitle(error.category),
    message: error.userMessage,
    action: getErrorAction(error),
    severity: getErrorSeverity(error.category)
  };
}

function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 'Connection Issue';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication Required';
    case ErrorCategory.VALIDATION:
      return 'Invalid Input';
    case ErrorCategory.RELAY:
      return 'Relay Problem';
    case ErrorCategory.PUBLISHING:
      return 'Publish Failed';
    case ErrorCategory.UPLOAD:
      return 'Upload Failed';
    case ErrorCategory.CACHE:
      return 'Data Unavailable';
    default:
      return 'Something Went Wrong';
  }
}

function getErrorAction(error: AppError): string {
  if (error.retryable) {
    return 'Try Again';
  }
  
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return 'Log In';
    case ErrorCategory.VALIDATION:
      return 'Check Input';
    case ErrorCategory.RELAY:
      return 'Switch Relay';
    default:
      return 'Refresh';
  }
}

function getErrorSeverity(category: ErrorCategory): 'error' | 'warning' | 'info' {
  switch (category) {
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.VALIDATION:
      return 'warning';
    case ErrorCategory.CACHE:
      return 'info';
    default:
      return 'error';
  }
}