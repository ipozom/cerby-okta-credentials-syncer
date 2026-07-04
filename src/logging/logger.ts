import { redactValue } from './redaction.js';

export function createLogger(_config: { logLevel: string; redactedLogging: boolean; debugMode?: boolean }) {
  function write(level: 'info' | 'warn' | 'error', message: string, details?: unknown) {
    console[level](JSON.stringify({ level, message, ...(details ? { details: redactValue(details) } : {}) }));
  }

  return {
    info(message: string, details?: unknown) {
      write('info', message, details);
    },
    warn(message: string, details?: unknown) {
      write('warn', message, details);
    },
    error(message: string, details?: unknown) {
      write('error', message, details);
    },
    debug(message: string, details?: unknown) {
      if (!_config.debugMode) return;
      write('info', `debug:${message}`, details);
    }
  };
}