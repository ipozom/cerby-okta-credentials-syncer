import { createHttpClient } from './httpClient.js';

type CerbyHeaders = {
  source?: string;
  origin?: string;
  accept?: string;
  acceptLanguage?: string;
  baggage?: string;
  sentryTrace?: string;
};

type CerbyClientConfig = {
  cerbyApiBaseUrl?: string;
  cerbyWorkspace: string;
  cerbyApiToken: string;
  cerbyHeaders?: CerbyHeaders;
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
      throw new Error(`Cerby request failed (${response.status}): ${text || response.statusText}`);
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt < options.maxRetries && (error instanceof DOMException && error.name === 'AbortError')) {
        await sleep(250 * 2 ** attempt);
        attempt += 1;
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Cerby request failed');
}

function flattenCerbyResource(resource: unknown): unknown {
  if (!resource || typeof resource !== 'object') {
    return resource;
  }

  const record = resource as Record<string, unknown>;
  const attributes = record.attributes;
  if (attributes && typeof attributes === 'object') {
    return {
      ...record,
      ...(attributes as Record<string, unknown>)
    };
  }

  return record;
}

function normalizeCerbyResponse(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const record = body as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data.map((item) => flattenCerbyResource(item));
  }

  if (record.data && typeof record.data === 'object') {
    return flattenCerbyResource(record.data);
  }

  return flattenCerbyResource(record);
}

export function createCerbyClient(config: CerbyClientConfig) {
  const workspaceBaseUrl = `https://${config.cerbyWorkspace}.cerby.com/api/v1/`;
  const candidateBaseUrls = config.cerbyApiBaseUrl && config.cerbyApiBaseUrl !== workspaceBaseUrl
    ? [config.cerbyApiBaseUrl, workspaceBaseUrl]
    : [config.cerbyApiBaseUrl ?? workspaceBaseUrl];

  const request = async (path: string, init?: RequestInit) => {
    let lastError: unknown;

    for (const [index, baseUrl] of candidateBaseUrls.entries()) {
      try {
        const response = await requestJson(new URL(path, baseUrl).toString(), {
          timeoutMs: config.httpTimeoutMs ?? 30000,
          maxRetries: config.maxRetries ?? 3,
          ...init,
          headers: {
            'X-API-Key': config.cerbyApiToken,
            ...(config.cerbyHeaders?.source ? { 'cerby-source': config.cerbyHeaders.source } : {}),
            ...(config.cerbyHeaders?.origin ? { origin: config.cerbyHeaders.origin } : {}),
            ...(config.cerbyHeaders?.accept ? { accept: config.cerbyHeaders.accept } : {}),
            ...(config.cerbyHeaders?.acceptLanguage ? { 'accept-language': config.cerbyHeaders.acceptLanguage } : {}),
            ...(config.cerbyHeaders?.baggage ? { baggage: config.cerbyHeaders.baggage } : {}),
            ...(config.cerbyHeaders?.sentryTrace ? { 'sentry-trace': config.cerbyHeaders.sentryTrace } : {}),
            ...(init?.headers ?? {})
          }
        });

        return normalizeCerbyResponse(response);
      } catch (error) {
        lastError = error;
        const shouldFallback = index === 0 && baseUrl !== workspaceBaseUrl && error instanceof Error && /403/.test(error.message);
        if (!shouldFallback) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Cerby request failed');
  };

  const get = async <T>(path: string) => (await request(path)) as T;

  return {
    listUsers: (query?: string) => get(`users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getUser: (userId: string) => get(`users/${encodeURIComponent(userId)}`),
    listAccounts: (query?: string) => get(`accounts${query ? `?q=${encodeURIComponent(query)}` : ''}`),
    getAccount: (accountId: string) => get(`accounts/${encodeURIComponent(accountId)}`),
    listAccountsForUser: (userId: string) => get(`users/${encodeURIComponent(userId)}/accounts`),
    getAccountPassword: (accountId: string) => get(`accounts/${encodeURIComponent(accountId)}/password`),
    request
  };
}