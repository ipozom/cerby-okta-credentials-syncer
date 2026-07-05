import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCredentialSyncService } from '../../src/domain/credentialSyncService.js';

describe('credential sync service', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns dry-run result without secret exposure', async () => {
    const service = createCredentialSyncService({ cerbyWorkspace: 'workspace', cerbyApiToken: 'token', cerbyHeaders: { origin: 'https://example.cerby.com', source: 'web/refs/tags/web/v0.0.410' }, oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' }, { info: () => undefined, warn: () => undefined, error: () => undefined });
    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1', '--dry-run'], dryRun: true })).resolves.toMatchObject({ status: 'success', secretsExposed: false, dryRun: true });
  });

  it('accepts preview-only domain configuration for dry runs', async () => {
    const service = createCredentialSyncService(
      { environment: 'preview', cerbyWorkspace: 'workspace', cerbyApiToken: 'token', cerbyHeaders: { origin: 'https://example.cerby.com', source: 'web/refs/tags/web/v0.0.410' }, cerbyApiBaseUrlPreview: 'https://cerby-preview.example', oktaDomainPreview: 'okta-preview.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' },
      { info: () => undefined, warn: () => undefined, error: () => undefined }
    );

    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1', '--preview', '--dry-run'], dryRun: true, preview: true })).resolves.toMatchObject({
      status: 'success',
      environment: 'preview',
      secretsExposed: false,
      dryRun: true
    });
  });

  it('blocks production execution unless explicitly allowed', async () => {
    const service = createCredentialSyncService({ environment: 'production', cerbyWorkspace: 'workspace', cerbyApiToken: 'token', cerbyHeaders: { origin: 'https://example.cerby.com', source: 'web/refs/tags/web/v0.0.410' }, oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' }, { info: () => undefined, warn: () => undefined, error: () => undefined });
    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1'], dryRun: false })).rejects.toThrow(/Production execution is blocked/i);
  });

  it('follows the exact Cerby and Okta request sequence', async () => {
    const requests: Array<{ url: string; method?: string; body?: string }> = [];
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = typeof init?.body === 'string' ? init.body : undefined;
      requests.push({ url, method, body });

      if (url.includes('/api/v1/accounts/account-1/secrets?filter[secretType]=password')) {
        return new Response(JSON.stringify({ data: [{ id: 'secret-1', type: 'account_secret', attributes: { body: { type: 'plaintext', value: 'cerby-password' } } }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      if (url.includes('/api/v1/accounts/account-1')) {
        return new Response(JSON.stringify({ data: { id: 'account-1', type: 'account', attributes: { username: 'jdau0042', label: 'test w4', status: 'enabled' } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }

      if (url.includes('/api/v1/users/jdau0042%40banesco.com')) {
        return new Response(JSON.stringify({ id: 'okta-user-1', profile: { login: 'jdau0042@banesco.com' } }), {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-okta-request-id': 'req-user-1' }
        });
      }

      if (url.includes('/api/v1/apps/0oa10y8bdhku686Xx1d8')) {
        if (method === 'GET' && url.includes('/users/okta-user-1')) {
          return new Response('{}', { status: 404, headers: { 'content-type': 'application/json', 'x-okta-request-id': 'req-assignment-404' } });
        }

        if (method === 'GET') {
          return new Response(JSON.stringify({ id: '0oa10y8bdhku686Xx1d8', signOnMode: 'AUTO_LOGIN', status: 'ACTIVE' }), {
            status: 200,
            headers: { 'content-type': 'application/json', 'x-okta-request-id': 'req-app-1' }
          });
        }

        if (method === 'POST' && url.includes('/users/okta-user-1')) {
          return new Response(JSON.stringify({ id: 'okta-user-1' }), {
            status: 200,
            headers: { 'content-type': 'application/json', 'x-okta-request-id': 'req-update-1' }
          });
        }
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchSpy);

    const logs: unknown[] = [];
    const service = createCredentialSyncService(
      {
        environment: 'preview',
        cerbyWorkspace: 'workspace',
        cerbyApiToken: 'token',
        cerbyApiBaseUrl: 'https://ssoappsdev.cerby.com/api/v1/',
        cerbyHeaders: { origin: 'https://example.cerby.com', source: 'web/refs/tags/web/v0.0.410' },
        oktaDomainPreview: 'okta.example',
        oktaAuthMode: 'SSWS',
        oktaApiToken: 'okta-token'
      },
      { info: (message: string, details?: unknown) => logs.push({ message, details }), warn: () => undefined, error: () => undefined, debug: (message: string, details?: unknown) => logs.push({ message, details }) }
    );

    await expect(service.run({ argv: ['--cerby-user', 'jdaupueba@banesco.com', '--cerby-account', 'account-1', '--okta-user', 'jdau0042@banesco.com', '--okta-app', '0oa10y8bdhku686Xx1d8', '--preview', '--debug'], dryRun: false, preview: true, debug: true })).resolves.toMatchObject({
      status: 'success',
      operation: 'okta_assignment_updated',
      secretsExposed: false,
      environment: 'preview'
    });

    expect(requests.map((entry) => `${entry.method} ${entry.url}`)).toEqual([
      'GET https://ssoappsdev.cerby.com/api/v1/accounts/account-1',
      'GET https://ssoappsdev.cerby.com/api/v1/accounts/account-1/secrets?filter[secretType]=password',
      'GET https://okta.example/api/v1/users/jdau0042%40banesco.com',
      'GET https://okta.example/api/v1/apps/0oa10y8bdhku686Xx1d8',
      'GET https://okta.example/api/v1/apps/0oa10y8bdhku686Xx1d8/users/okta-user-1',
      'POST https://okta.example/api/v1/apps/0oa10y8bdhku686Xx1d8/users/okta-user-1'
    ]);

    expect(JSON.parse(String(requests[5].body))).toEqual({
      credentials: {
        userName: 'jdau0042@banesco.com',
        password: { value: 'cerby-password' }
      }
    });

    expect(JSON.stringify(logs)).toContain('req-update-1');
  });
});