import { describe, expect, it } from 'vitest';
import { redactValue } from '../../src/logging/redaction.js';

describe('redaction', () => {
  it('redacts secret keys', () => {
    expect(redactValue({ authorization: 'Bearer abc123', password: 'secret', origin: 'https://tenant.example' })).toEqual({ authorization: '[REDACTED]', password: '[REDACTED]', origin: '[REDACTED]' });
  });
});