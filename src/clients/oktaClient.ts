import { createHttpClient } from './httpClient.js';

export function createOktaClient(config: { oktaDomain: string; oktaAuthMode: string; oktaApiToken?: string; oktaOauthAccessToken?: string }) {
  const authHeader = config.oktaAuthMode === 'OAUTH2'
    ? { Authorization: `Bearer ${config.oktaOauthAccessToken ?? ''}` }
    : { Authorization: `SSWS ${config.oktaApiToken ?? ''}` };

  const http = createHttpClient({
    baseUrl: `https://${config.oktaDomain}/`,
    timeoutMs: 30000,
    maxRetries: 3,
    headers: authHeader
  });

  return {
    getUser: (userIdOrLogin: string) => http.get(`api/v1/users/${encodeURIComponent(userIdOrLogin)}`),
    listUsers: (query?: string) => http.get(`api/v1/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    listApplications: (query?: string) => http.get(`api/v1/apps${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getApplication: (appId: string) => http.get(`api/v1/apps/${encodeURIComponent(appId)}`),
    listApplicationUsers: (appId: string, query?: string) => http.get(`api/v1/apps/${encodeURIComponent(appId)}/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getApplicationUser: (appId: string, userId: string) => http.get(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`),
    assignUserToApplication: (appId: string, payload: unknown) => fetch(new URL(`api/v1/apps/${encodeURIComponent(appId)}/users`, `https://${config.oktaDomain}/`), { method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    updateApplicationUser: (appId: string, userId: string, payload: unknown) => fetch(new URL(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`, `https://${config.oktaDomain}/`), { method: 'PUT', headers: { ...authHeader, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  };
}