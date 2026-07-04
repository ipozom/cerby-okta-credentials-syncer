import { describe, expect, it } from 'vitest';
import { createCredentialSyncService } from '../../src/domain/credentialSyncService.js';

describe('credential sync service', () => {
  it('returns dry-run result without secret exposure', async () => {
    const service = createCredentialSyncService({ cerbyWorkspace: 'workspace', cerbyApiToken: 'token', oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' }, { info: () => undefined, warn: () => undefined, error: () => undefined });
    await expect(service.run({ argv: [], dryRun: true })).resolves.toMatchObject({ status: 'dry-run', secretsExposed: false });
  });
});