import { describe, expect, it } from 'vitest';
import { createOktaClient } from '../../src/clients/oktaClient.js';

describe('okta client', () => {
  it('builds a client', () => {
    expect(createOktaClient({ oktaDomain: 'okta.example', oktaAuthMode: 'SSWS', oktaApiToken: 'token' })).toBeTruthy();
  });
});