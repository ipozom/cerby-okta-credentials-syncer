import { describe, expect, it } from 'vitest';
import { createCredentialSyncService } from '../../src/domain/credentialSyncService.js';

describe('credential sync service', () => {
  it('returns dry-run result without secret exposure', async () => {
    const service = createCredentialSyncService({ cerbyWorkspace: 'workspace', cerbyApiToken: 'token', oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' }, { info: () => undefined, warn: () => undefined, error: () => undefined });
    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1', '--dry-run'], dryRun: true })).resolves.toMatchObject({ status: 'success', secretsExposed: false, dryRun: true });
  });

  it('blocks production execution unless explicitly allowed', async () => {
    const service = createCredentialSyncService({ environment: 'production', cerbyWorkspace: 'workspace', cerbyApiToken: 'token', oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' }, { info: () => undefined, warn: () => undefined, error: () => undefined });
    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1'], dryRun: false })).rejects.toThrow(/Production execution is blocked/i);
  });
});