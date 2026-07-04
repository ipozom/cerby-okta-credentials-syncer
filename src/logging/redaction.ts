const REDACTED = '[REDACTED]';
const SECRET_KEYS = /password|token|authorization|api[-_]?key|credential|secret|baggage|sentry-trace|origin|cookie/i;

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/([A-Za-z0-9._-]{8,})/g, REDACTED);
  }

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SECRET_KEYS.test(key) ? REDACTED : redactValue(nestedValue);
    }
    return output;
  }

  return value;
}