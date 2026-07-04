import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { validateConfig } from '../../src/config/validateConfig.js';

describe('config', () => {
  it('loads defaults', () => {
    const config = loadConfig({ CERBY_WORKSPACE: 'workspace', CERBY_API_TOKEN: 'token', OKTA_DOMAIN: 'okta.example', OKTA_AUTH_MODE: 'SSWS', OKTA_API_TOKEN: 'okta-token' });
    expect(config.logLevel).toBe('info');
  });

  it('fails when required config is missing', () => {
    expect(() => validateConfig(loadConfig({}))).toThrow();
  });
});