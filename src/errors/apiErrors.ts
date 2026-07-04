export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RetryableApiError extends ApiError {
  constructor(message: string, status?: number, requestId?: string, public readonly retryAfterMs?: number) {
    super(message, status, requestId);
    this.name = 'RetryableApiError';
  }
}