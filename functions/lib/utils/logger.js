"use strict";
/**
 * jusDNCE AI - Structured Logging Utility
 * A Paul Phillips Manifestation - Paul@clearseassolutions.com
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logWarning = logWarning;
exports.logError = logError;
/**
 * Log info message with structured context
 */
function logInfo(message, context) {
    console.log(JSON.stringify(Object.assign(Object.assign({ severity: "INFO", message }, context), { timestamp: new Date().toISOString() })));
}
/**
 * Log warning message with structured context
 */
function logWarning(message, context) {
    console.warn(JSON.stringify(Object.assign(Object.assign({ severity: "WARNING", message }, context), { timestamp: new Date().toISOString() })));
}
/**
 * Log error message with structured context
 */
function logError(message, error, context) {
    console.error(JSON.stringify(Object.assign(Object.assign({ severity: "ERROR", message, error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
        } }, context), { timestamp: new Date().toISOString() })));
}
//# sourceMappingURL=logger.js.map