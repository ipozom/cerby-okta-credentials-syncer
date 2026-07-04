import { describe, expect, it } from 'vitest';
import { createHttpClient } from '../../src/clients/httpClient.js';

describe('http client', () => {
  it('creates a client', () => {
    expect(createHttpClient({ baseUrl: 'https://example.com/', timeoutMs: 1000, maxRetries: 1 })).toBeTruthy();
  });
});