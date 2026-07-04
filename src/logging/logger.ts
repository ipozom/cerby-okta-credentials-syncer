import { redactValue } from './redaction.js';

export function createLogger(_config: { logLevel: string; redactedLogging: boolean }) {
  return {
    info(message: string, details?: unknown) {
      console.info(JSON.stringify({ level: 'info', message, ...(details ? { details: redactValue(details) } : {}) }));
    },
    warn(message: string, details?: unknown) {
      console.warn(JSON.stringify({ level: 'warn', message, ...(details ? { details: redactValue(details) } : {}) }));
    },
    error(message: string, details?: unknown) {
      console.error(JSON.stringify({ level: 'error', message, ...(details ? { details: redactValue(details) } : {}) }));
    }
  };
}