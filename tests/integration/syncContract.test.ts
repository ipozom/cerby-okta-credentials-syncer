import { describe, expect, it, vi } from 'vitest';
import { createCredentialSyncService } from '../../src/domain/credentialSyncService.js';

describe('sync contract', () => {
  it('returns a dry-run plan with safe output', async () => {
    const logs: unknown[] = [];
    const service = createCredentialSyncService(
      {
        cerbyWorkspace: 'workspace',
        cerbyApiToken: 'token',
        oktaDomain: 'okta.example',
        oktaAuthMode: 'SSWS',
        oktaApiToken: 'okta-token'
      },
      { info: (message: string, details?: unknown) => logs.push({ message, details }), warn: vi.fn(), error: vi.fn() }
    );

    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1', '--dry-run'], dryRun: true })).resolves.toMatchObject({
      status: 'success',
      dryRun: true,
      secretsExposed: false
    });
    expect(JSON.stringify(logs)).not.toContain('token');
  });
});