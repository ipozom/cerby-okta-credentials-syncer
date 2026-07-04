import { describe, expect, it } from 'vitest';
import { createCredentialSyncService } from '../../src/domain/credentialSyncService.js';

describe('credential sync service', () => {
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

  it('fails fast when Cerby execution headers are missing', async () => {
    const service = createCredentialSyncService(
      { environment: 'preview', cerbyWorkspace: 'workspace', cerbyApiToken: 'token', oktaDomainPreview: 'okta-preview.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' },
      { info: () => undefined, warn: () => undefined, error: () => undefined }
    );

    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1', '--preview'], dryRun: false, preview: true })).rejects.toThrow(/CERBY_ORIGIN and CERBY_SOURCE/i);
  });

  it('blocks production execution unless explicitly allowed', async () => {
    const service = createCredentialSyncService({ environment: 'production', cerbyWorkspace: 'workspace', cerbyApiToken: 'token', cerbyHeaders: { origin: 'https://example.cerby.com', source: 'web/refs/tags/web/v0.0.410' }, oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'okta-token' }, { info: () => undefined, warn: () => undefined, error: () => undefined });
    await expect(service.run({ argv: ['--cerby-user', 'user@example.com', '--cerby-account', 'account-1', '--okta-user', 'user@example.com', '--okta-app', 'app-1'], dryRun: false })).rejects.toThrow(/Production execution is blocked/i);
  });
});