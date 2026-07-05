import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCerbyClient } from '../../src/clients/cerbyClient.js';

describe('cerby client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a client', () => {
    expect(createCerbyClient({ cerbyWorkspace: 'workspace', cerbyApiToken: 'token' })).toBeTruthy();
  });

  it('uses the validated password secret endpoint and extracts the password', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain('/api/v1/accounts/account-123/secrets?filter[secretType]=password');
      return new Response(JSON.stringify({ data: [{ id: 'secret-1', type: 'account_secret', attributes: { body: { type: 'plaintext', value: 'cerby-password' } } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    vi.stubGlobal('fetch', fetchSpy);

    const client = createCerbyClient({ cerbyWorkspace: 'workspace', cerbyApiToken: 'token' });
    const secret = await client.getAccountPassword('account-123');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(Array.isArray(secret)).toBe(true);
    expect((secret as Array<Record<string, unknown>>)[0].body).toMatchObject({ type: 'plaintext', value: 'cerby-password' });
  });
});