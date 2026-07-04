export type RawConfig = Record<string, string | undefined>;

export function loadConfig(env: RawConfig) {
  return {
    cerbyWorkspace: env.CERBY_WORKSPACE,
    cerbyApiBaseUrl: env.CERBY_API_BASE_URL,
    cerbyApiToken: env.CERBY_API_TOKEN,
    cerbyOrigin: env.CERBY_ORIGIN,
    cerbySource: env.CERBY_SOURCE,
    cerbyAccept: env.CERBY_ACCEPT,
    cerbyAcceptLanguage: env.CERBY_ACCEPT_LANGUAGE,
    cerbySentryBaggage: env.CERBY_SENTRY_BAGGAGE,
    cerbySentryTrace: env.CERBY_SENTRY_TRACE,
    oktaDomain: env.OKTA_DOMAIN,
    oktaAuthMode: env.OKTA_AUTH_MODE,
    oktaApiToken: env.OKTA_API_TOKEN,
    oktaOauthAccessToken: env.OKTA_OAUTH_ACCESS_TOKEN,
    logLevel: env.LOG_LEVEL ?? 'info',
    dryRun: env.DRY_RUN === 'true',
    httpTimeoutMs: Number(env.HTTP_TIMEOUT_MS ?? '30000'),
    maxRetries: Number(env.MAX_RETRIES ?? '3'),
    requireExplicitUserAccountMatch: env.SYNC_REQUIRE_EXPLICIT_USER_ACCOUNT_MATCH !== 'false',
    allowCreateOktaAssignment: env.SYNC_ALLOW_CREATE_OKTA_ASSIGNMENT !== 'false',
    allowUpdateOktaAssignment: env.SYNC_ALLOW_UPDATE_OKTA_ASSIGNMENT !== 'false',
    redactedLogging: env.SYNC_REDACTED_LOGGING !== 'false',
    correlationIdHeader: env.SYNC_CORRELATION_ID_HEADER ?? 'X-Correlation-Id',
    allowTotpSync: env.SYNC_ALLOW_TOTP_SYNC === 'true',
    secretManager: {
      get(name: string) {
        return env[name];
      }
    },
    cerbyHeaders: {
      origin: env.CERBY_ORIGIN,
      source: env.CERBY_SOURCE,
      accept: env.CERBY_ACCEPT,
      acceptLanguage: env.CERBY_ACCEPT_LANGUAGE,
      baggage: env.CERBY_SENTRY_BAGGAGE,
      sentryTrace: env.CERBY_SENTRY_TRACE
    }
  };
}