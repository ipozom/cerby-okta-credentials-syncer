import { redactValue } from './redaction.js';

export function createLogger(_config: { logLevel: string; redactedLogging: boolean }) {
  return {
    info(message: string, details?: unknown) {
      console.info(message, details ? redactValue(details) : undefined);
    },
    warn(message: string, details?: unknown) {
      console.warn(message, details ? redactValue(details) : undefined);
    },
    error(message: string, details?: unknown) {
      console.error(message, details ? redactValue(details) : undefined);
    }
  };
}