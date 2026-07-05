import { createHttpClient } from './httpClient.js';

type OktaClientConfig = {
  oktaDomain: string;
  oktaAuthMode: string;
  oktaApiToken?: string;
  oktaOauthAccessToken?: string;
  httpTimeoutMs?: number;
  maxRetries?: number;
};

type OktaResponse<T> = {
  body: T;
  meta: { status: number; url: string; requestId?: string };
};

function oktaBaseUrl(domain: string) {
  return `https://${domain}/`;
}

function authHeaders(config: OktaClientConfig) {
  return config.oktaAuthMode === 'OAUTH2'
    ? { Authorization: `Bearer ${config.oktaOauthAccessToken ?? ''}` }
    : { Authorization: `SSWS ${config.oktaApiToken ?? ''}` };
}

export function createOktaClient(config: OktaClientConfig) {
  const http = createHttpClient({
    baseUrl: oktaBaseUrl(config.oktaDomain),
    timeoutMs: config.httpTimeoutMs ?? 30000,
    maxRetries: config.maxRetries ?? 3,
    headers: authHeaders(config)
  });

  const get = async <T>(path: string) => http.request<T>(path);
  const post = async <T>(path: string, body: unknown) => http.request<T>(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  const put = async <T>(path: string, body: unknown) => http.request<T>(path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

  return {
    getUser: async (userIdOrLogin: string) => (await get<any>(`api/v1/users/${encodeURIComponent(userIdOrLogin)}`)).body,
    getUserWithMeta: (userIdOrLogin: string) => get<any>(`api/v1/users/${encodeURIComponent(userIdOrLogin)}`),
    listUsers: async (query?: string) => (await get<any[]>(`api/v1/users${query ? `?q=${encodeURIComponent(query)}` : ''}`)).body,
    listUsersWithMeta: (query?: string) => get<any[]>(`api/v1/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    listApplications: async (query?: string) => (await get<any[]>(`api/v1/apps${query ? `?q=${encodeURIComponent(query)}` : ''}`)).body,
    listApplicationsWithMeta: (query?: string) => get<any[]>(`api/v1/apps${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getApplication: async (appId: string) => (await get<any>(`api/v1/apps/${encodeURIComponent(appId)}`)).body,
    getApplicationWithMeta: (appId: string) => get<any>(`api/v1/apps/${encodeURIComponent(appId)}`),
    listApplicationUsers: async (appId: string, query?: string) => (await get<any[]>(`api/v1/apps/${encodeURIComponent(appId)}/users${query ? `?q=${encodeURIComponent(query)}` : ''}`)).body,
    getApplicationUser: async (appId: string, userId: string) => (await get<any>(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`)).body,
    getApplicationUserWithMeta: (appId: string, userId: string) => get<any>(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`),
    assignUserToApplication: async (appId: string, payload: unknown) => (await post<any>(`api/v1/apps/${encodeURIComponent(appId)}/users`, payload)).body,
    assignUserToApplicationWithMeta: (appId: string, payload: unknown) => post<any>(`api/v1/apps/${encodeURIComponent(appId)}/users`, payload),
    updateApplicationUser: async (appId: string, userId: string, payload: unknown) => (await put<any>(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`, payload)).body,
    updateApplicationUserWithMeta: (appId: string, userId: string, payload: unknown) => put<any>(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`, payload)
  };
}