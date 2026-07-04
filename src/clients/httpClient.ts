import { ApiError } from '../errors/apiErrors.js';

export type HttpClientOptions = {
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  headers?: Record<string, string>;
};

export function createHttpClient(options: HttpClientOptions) {
  return {
    async get(path: string) {
      const response = await fetch(new URL(path, options.baseUrl), { headers: options.headers });
      if (!response.ok) {
        throw new ApiError(`Request failed with status ${response.status}`, response.status);
      }
      return response.json();
    }
  };
}