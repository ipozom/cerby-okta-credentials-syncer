import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOktaClient } from '../../src/clients/oktaClient.js';

describe('okta client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a client', () => {
    expect(createOktaClient({ oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'token' })).toBeTruthy();
  });

  it('posts the credential update to the app user endpoint', async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain('/api/v1/apps/app-123/users/user-456');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        credentials: {
          userName: 'jdau0042@banesco.com',
          password: { value: 'cerby-password' }
        }
      });
      return new Response(JSON.stringify({ id: 'user-456' }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-okta-request-id': 'req-123' }
      });
    });

    vi.stubGlobal('fetch', fetchSpy);

    const client = createOktaClient({ oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'token' });
    const result = await client.updateApplicationUserWithMeta('app-123', 'user-456', {
      credentials: {
        userName: 'jdau0042@banesco.com',
        password: { value: 'cerby-password' }
      }
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.meta.requestId).toBe('req-123');
    expect(result.meta.status).toBe(200);
  });
});