import { ApiError } from '../errors/apiErrors.js';

export type HttpClientOptions = {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  headers?: Record<string, string>;
};

export type HttpResponseMeta = {
  status: number;
  url: string;
  requestId?: string;
};

export type HttpResponse<T> = {
  body: T;
  meta: HttpResponseMeta;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfterHeader?: string | null) {
  const retryAfterSeconds = Number(retryAfterHeader ?? '0');
  if (retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const baseDelay = 250 * 2 ** attempt;
  const jitter = Math.round(baseDelay * 0.2 * Math.random());
  return baseDelay + jitter;
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

export function createHttpClient(options: HttpClientOptions) {
  async function request<T>(path: string, init?: RequestInit): Promise<HttpResponse<T>> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= options.maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

      try {
        const response = await fetch(new URL(path, options.baseUrl), {
          ...init,
          headers: {
            ...(options.headers ?? {}),
            ...(init?.headers ?? {})
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
          const body = response.status === 204 ? undefined : await response.json();
          return {
            body: body as T,
            meta: {
              status: response.status,
              url: response.url,
              requestId: response.headers.get('x-okta-request-id') ?? response.headers.get('x-request-id') ?? undefined
            }
          };
        }

        if (isRetryableStatus(response.status) && attempt < options.maxRetries) {
          await sleep(retryDelayMs(attempt, response.headers.get('retry-after')));
          attempt += 1;
          continue;
        }

        throw new ApiError(
          `Request failed with status ${response.status}`,
          response.status,
          response.headers.get('x-okta-request-id') ?? response.headers.get('x-request-id') ?? undefined
        );
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;

        if (attempt < options.maxRetries && error instanceof DOMException && error.name === 'AbortError') {
          await sleep(retryDelayMs(attempt));
          attempt += 1;
          continue;
        }

        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new ApiError('Request failed');
  }

  return {
    get: async <T>(path: string) => (await request<T>(path)).body,
    request
  };
}