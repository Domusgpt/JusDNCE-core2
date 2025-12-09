/**
 * jusDNCE AI - Structured Logging Utility
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */

interface LogContext {
  uid?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Log info message with structured context
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(JSON.stringify({
    severity: "INFO",
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Log warning message with structured context
 */
export function logWarning(message: string, context?: LogContext): void {
  console.warn(JSON.stringify({
    severity: "WARNING",
    message,
    ...context,
    timestamp: new Date().toISOString(),
  }));
}

/**
 * Log error message with structured context
 */
export function logError(message: string, error: Error, context?: LogContext): void {
  console.error(JSON.stringify({
    severity: "ERROR",
    message,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
    timestamp: new Date().toISOString(),
  }));
}
