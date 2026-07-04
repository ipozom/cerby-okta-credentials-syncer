import { createHttpClient } from './httpClient.js';

export function createCerbyClient(config: { cerbyApiBaseUrl?: string; cerbyWorkspace: string; cerbyApiToken: string }) {
  const baseUrl = config.cerbyApiBaseUrl ?? `https://${config.cerbyWorkspace}.cerby.com/api/v1/`;
  const http = createHttpClient({
    baseUrl,
    timeoutMs: 30000,
    maxRetries: 3,
    headers: {
      'X-API-Key': config.cerbyApiToken
    }
  });

  return {
    listUsers: (query?: string) => http.get(`users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getUser: (userId: string) => http.get(`users/${encodeURIComponent(userId)}`),
    listAccounts: (query?: string) => http.get(`accounts${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getAccount: (accountId: string) => http.get(`accounts/${encodeURIComponent(accountId)}`),
    listAccountsForUser: (userId: string) => http.get(`users/${encodeURIComponent(userId)}/accounts`),
    getAccountPassword: (accountId: string) => http.get(`accounts/${encodeURIComponent(accountId)}/password`)
  };
}