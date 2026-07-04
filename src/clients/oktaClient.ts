import { createHttpClient } from './httpClient.js';

type OktaClientConfig = {
  oktaDomain: string;
  oktaAuthMode: string;
  oktaApiToken?: string;
  oktaOauthAccessToken?: string;
  httpTimeoutMs?: number;
  maxRetries?: number;
};

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(url: string, options: RequestInit & { timeoutMs: number; maxRetries: number }) {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= options.maxRetries) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        if (response.status === 204) {
          return undefined;
        }
        return await response.json();
      }

      if (isRetryableStatus(response.status) && attempt < options.maxRetries) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '0');
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await sleep(delayMs);
        attempt += 1;
        continue;
      }

      const text = await response.text();
      throw new Error(`Okta request failed (${response.status}): ${text || response.statusText}`);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < options.maxRetries && error instanceof DOMException && error.name === 'AbortError') {
        await sleep(250 * 2 ** attempt);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Okta request failed');
}

export function createOktaClient(config: OktaClientConfig) {
  const authHeader = config.oktaAuthMode === 'OAUTH2'
    ? { Authorization: `Bearer ${config.oktaOauthAccessToken ?? ''}` }
    : { Authorization: `SSWS ${config.oktaApiToken ?? ''}` };

  const http = createHttpClient({
    baseUrl: `https://${config.oktaDomain}/`,
    timeoutMs: config.httpTimeoutMs ?? 30000,
    maxRetries: config.maxRetries ?? 3,
    headers: authHeader
  });

  const request = (path: string, init?: RequestInit) => requestJson(new URL(path, `https://${config.oktaDomain}/`).toString(), {
    timeoutMs: config.httpTimeoutMs ?? 30000,
    maxRetries: config.maxRetries ?? 3,
    ...init,
    headers: {
      ...authHeader,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  });

  return {
    getUser: (userIdOrLogin: string) => http.get(`api/v1/users/${encodeURIComponent(userIdOrLogin)}`),
    listUsers: (query?: string) => http.get(`api/v1/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    listApplications: (query?: string) => http.get(`api/v1/apps${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getApplication: (appId: string) => http.get(`api/v1/apps/${encodeURIComponent(appId)}`),
    listApplicationUsers: (appId: string, query?: string) => http.get(`api/v1/apps/${encodeURIComponent(appId)}/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getApplicationUser: (appId: string, userId: string) => http.get(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`),
    assignUserToApplication: (appId: string, payload: unknown) => request(`api/v1/apps/${encodeURIComponent(appId)}/users`, { method: 'POST', body: JSON.stringify(payload) }),
    updateApplicationUser: (appId: string, userId: string, payload: unknown) => request(`api/v1/apps/${encodeURIComponent(appId)}/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    request
  };
}