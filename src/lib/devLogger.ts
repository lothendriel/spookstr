/**
 * Development Logger Utility
 * 
 * Provides enhanced logging capabilities for development with better formatting,
 * categorization, and performance tracking. Only active in development mode.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'perf';

interface LogEntry {
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  timestamp: number;
  stack?: string;
}

class DevLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private isEnabled = import.meta.env.DEV;

  // Color schemes for different log levels
  private colors = {
    debug: '#9CA3AF', // gray-400
    info: '#3B82F6',  // blue-500
    warn: '#F59E0B',  // amber-500
    error: '#EF4444', // red-500
    perf: '#8B5CF6'   // violet-500
  };

  // Emoji prefixes for categories
  private categoryEmojis = {
    nostr: '🌐',
    cache: '💾',
    performance: '⚡',
    user: '👤',
    relay: '📡',
    query: '🔍',
    mutation: '✏️',
    auth: '🔐',
    feed: '📰',
    interaction: '💬',
    network: '🌍',
    error: '❌',
    success: '✅',
    warning: '⚠️',
    debug: '🐛'
  };

  /**
   * Log a debug message
   */
  debug(category: string, message: string, data?: any) {
    this.log('debug', category, message, data);
  }

  /**
   * Log an info message
   */
  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  /**
   * Log a warning message
   */
  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  /**
   * Log an error message
   */
  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data, new Error().stack);
  }

  /**
   * Log a performance measurement
   */
  perf(category: string, message: string, duration: number, data?: any) {
    this.log('perf', category, `${message} (${duration.toFixed(2)}ms)`, data);
  }

  /**
   * Time a function execution
   */
  time<T>(category: string, operation: string, fn: () => T): T {
    if (!this.isEnabled) return fn();

    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.perf(category, operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(category, `${operation} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * Time an async function execution
   */
  async timeAsync<T>(category: string, operation: string, fn: () => Promise<T>): Promise<T> {
    if (!this.isEnabled) return fn();

    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.perf(category, operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(category, `${operation} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * Create a scoped logger for a specific category
   */
  scope(category: string) {
    return {
      debug: (message: string, data?: any) => this.debug(category, message, data),
      info: (message: string, data?: any) => this.info(category, message, data),
      warn: (message: string, data?: any) => this.warn(category, message, data),
      error: (message: string, data?: any) => this.error(category, message, data),
      perf: (message: string, duration: number, data?: any) => this.perf(category, message, duration, data),
      time: <T>(operation: string, fn: () => T): T => this.time(category, operation, fn),
      timeAsync: <T>(operation: string, fn: () => Promise<T>): Promise<T> => this.timeAsync(category, operation, fn)
    };
  }

  /**
   * Get all logs (for debug panel)
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    console.clear();
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Export logs as JSON (for debugging/reporting)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  private log(level: LogLevel, category: string, message: string, data?: any, stack?: string) {
    if (!this.isEnabled) return;

    const entry: LogEntry = {
      level,
      category,
      message,
      data,
      timestamp: Date.now(),
      stack
    };

    // Add to internal log storage
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output with styling
    const emoji = this.categoryEmojis[category as keyof typeof this.categoryEmojis] || '📝';
    const color = this.colors[level];
    const timestamp = new Date().toLocaleTimeString();

    const logMessage = `${emoji} [${category.toUpperCase()}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(`%c${timestamp} ${logMessage}`, `color: ${color}`, data || '');
        break;
      case 'info':
        console.info(`%c${timestamp} ${logMessage}`, `color: ${color}`, data || '');
        break;
      case 'warn':
        console.warn(`%c${timestamp} ${logMessage}`, `color: ${color}`, data || '');
        break;
      case 'error':
        console.error(`%c${timestamp} ${logMessage}`, `color: ${color}`, data || '');
        if (stack) {
          console.error('Stack trace:', stack);
        }
        break;
      case 'perf':
        console.log(`%c⚡ [PERF] ${timestamp} ${logMessage}`, `color: ${color}; font-weight: bold`, data || '');
        break;
    }
  }
}

// Create singleton instance
export const devLogger = new DevLogger();

// Convenience scoped loggers for common categories
export const nostrLogger = devLogger.scope('nostr');
export const cacheLogger = devLogger.scope('cache');
export const perfLogger = devLogger.scope('performance');
export const userLogger = devLogger.scope('user');
export const relayLogger = devLogger.scope('relay');
export const queryLogger = devLogger.scope('query');
export const authLogger = devLogger.scope('auth');
export const feedLogger = devLogger.scope('feed');
export const interactionLogger = devLogger.scope('interaction');

// Global error handler for development
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    devLogger.error('global', 'Unhandled Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error?.stack
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    devLogger.error('global', 'Unhandled Promise Rejection', {
      reason: event.reason,
      stack: event.reason?.stack
    });
  });

  // Expose logger to global scope for console debugging
  (window as any).devLogger = devLogger;
}

// Performance measurement utilities
export const createPerformanceMarker = (name: string) => {
  if (!import.meta.env.DEV) return { start: () => {}, end: () => {} };

  let startTime = 0;
  
  return {
    start: () => {
      startTime = performance.now();
      performance.mark(`${name}-start`);
    },
    end: () => {
      const endTime = performance.now();
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const duration = endTime - startTime;
      perfLogger.perf(`Performance marker: ${name}`, duration);
      
      return duration;
    }
  };
};