import { describe, expect, it } from 'vitest';
import { createCerbyClient } from '../../src/clients/cerbyClient.js';

describe('cerby client', () => {
  it('builds a client', () => {
    expect(createCerbyClient({ cerbyWorkspace: 'workspace', cerbyApiToken: 'token' })).toBeTruthy();
  });
});