import { createCerbyClient } from '../clients/cerbyClient.js';
import { createOktaClient } from '../clients/oktaClient.js';
import { AuthorizationError, ConfigValidationError } from '../errors/domainErrors.js';
import { ApiError } from '../errors/apiErrors.js';

type SyncConfig = {
  environment?: 'preview' | 'production';
  cerbyWorkspace?: string;
  cerbyApiBaseUrl?: string;
  cerbyApiBaseUrlPreview?: string;
  cerbyApiToken?: string;
  cerbyHeaders?: {
    source?: string;
    origin?: string;
    accept?: string;
    acceptLanguage?: string;
    baggage?: string;
    sentryTrace?: string;
  };
  oktaDomain?: string;
  oktaDomainPreview?: string;
  oktaAuthMode?: string;
  oktaApiToken?: string;
  oktaOauthAccessToken?: string;
  httpTimeoutMs?: number;
  maxRetries?: number;
  dryRun?: boolean;
  safeExecution?: boolean;
  debugMode?: boolean;
  allowCreateOktaAssignment?: boolean;
  allowUpdateOktaAssignment?: boolean;
  redactedLogging?: boolean;
  correlationIdHeader?: string;
  allowProductionExecution?: boolean;
  secretManager?: { get(name: string): string | undefined };
};

type AuditLogger = {
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
  debug?(message: string, details?: unknown): void;
};

type SyncResult = {
  status: string;
  operation: string;
  correlationId: string;
  environment: 'preview' | 'production';
  secretsExposed: false;
  dryRun?: boolean;
};

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function correlationId() {
  return globalThis.crypto?.randomUUID?.() ?? `corr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function readSecret(config: SyncConfig, key: 'cerbyApiToken' | 'oktaApiToken' | 'oktaOauthAccessToken') {
  return config.secretManager?.get(key) ?? config[key];
}

function audit(logger: AuditLogger, event: string, details: Record<string, unknown>) {
  logger.info('audit', { event, ...details });
}

function isSupportedOktaApp(app: Record<string, unknown>) {
  const signOnMode = stringValue(app.signOnMode);
  const status = stringValue(app.status);
  const allowedModes = new Set(['AUTO_LOGIN', 'BROWSER_PLUGIN', 'SECURE_PASSWORD_STORE', 'OPENID_CONNECT']);
  return status !== 'INACTIVE' && (!signOnMode || allowedModes.has(signOnMode));
}

function normalizePassword(response: unknown) {
  if (typeof response === 'string') return response;
  if (Array.isArray(response)) {
    return normalizePassword(response[0]);
  }
  if (!response || typeof response !== 'object') return '';
  const payload = response as Record<string, unknown>;
  const direct = payload.password ?? payload.value;
  if (typeof direct === 'string') return direct;
  const body = payload.body as Record<string, unknown> | undefined;
  const bodyValue = body?.value;
  if (typeof bodyValue === 'string') return bodyValue;
  const bodyAttributes = body?.attributes as Record<string, unknown> | undefined;
  const nestedBody = bodyAttributes?.body as Record<string, unknown> | undefined;
  const nestedBodyValue = nestedBody?.value;
  if (typeof nestedBodyValue === 'string') return nestedBodyValue;
  const nested = payload.data as Record<string, unknown> | undefined;
  const nestedPassword = nested?.password;
  return typeof nestedPassword === 'string' ? nestedPassword : '';
}

export function createCredentialSyncService(config: SyncConfig, logger: AuditLogger) {
  const cerbyApiToken = readSecret(config, 'cerbyApiToken');
  const oktaApiToken = readSecret(config, 'oktaApiToken');
  const oktaOauthAccessToken = readSecret(config, 'oktaOauthAccessToken');

  return {
    async run(input: { argv: string[]; dryRun: boolean; preview?: boolean; debug?: boolean }): Promise<SyncResult> {
      const parsed = parseArgs(input.argv);
      const correlationIdValue = correlationId();
      const environment = input.preview ? 'preview' : (config.environment ?? 'preview');
      const cerbyApiBaseUrl = environment === 'preview' ? config.cerbyApiBaseUrlPreview || config.cerbyApiBaseUrl : config.cerbyApiBaseUrl;
      const oktaDomain = environment === 'preview' ? config.oktaDomainPreview || config.oktaDomain : config.oktaDomain;

      if (!cerbyApiToken || !oktaDomain || !config.oktaAuthMode) {
        throw new ConfigValidationError('Missing required sync configuration');
      }

      const cerbyClient = createCerbyClient({
        cerbyWorkspace: config.cerbyWorkspace ?? '',
        cerbyApiBaseUrl,
        cerbyApiToken,
        cerbyHeaders: config.cerbyHeaders,
        httpTimeoutMs: config.httpTimeoutMs,
        maxRetries: config.maxRetries
      });

      const oktaClient = createOktaClient({
        oktaDomain: oktaDomain ?? '',
        oktaAuthMode: config.oktaAuthMode,
        oktaApiToken,
        oktaOauthAccessToken,
        httpTimeoutMs: config.httpTimeoutMs,
        maxRetries: config.maxRetries
      });

      if (environment === 'production' && !config.allowProductionExecution) {
        throw new AuthorizationError('Production execution is blocked unless explicitly allowed');
      }

      if (config.safeExecution) {
        audit(logger, 'safe-execution-enabled', { correlationId: correlationIdValue, environment });
      }

      const cerbyUserLookup = stringValue(parsed['cerby-user']);
      const cerbyAccountLookup = stringValue(parsed['cerby-account']);
      const oktaUserLookup = stringValue(parsed['okta-user']);
      const oktaAppLookup = stringValue(parsed['okta-app']);

      if (!cerbyUserLookup || !cerbyAccountLookup || !oktaUserLookup || !oktaAppLookup) {
        throw new ConfigValidationError('Missing required CLI arguments');
      }

      audit(logger, 'sync-started', {
        correlationId: correlationIdValue,
        environment,
        dryRun: input.dryRun,
        cerbyUserLookup,
        cerbyAccountLookup,
        oktaUserLookup,
        oktaAppLookup
      });

      if (input.dryRun) {
        audit(logger, 'sync-dry-run', { correlationId: correlationIdValue });
        return {
          status: 'success',
          operation: 'dry_run_planned_sync',
          correlationId: correlationIdValue,
          environment,
          secretsExposed: false,
          dryRun: true
        };
      }

      const debugEnabled = input.debug || config.debugMode;

      const cerbyAccountResponse = await cerbyClient.getAccountWithMeta(cerbyAccountLookup);
      const cerbyAccount = cerbyAccountResponse.body as Record<string, unknown>;
      if (!cerbyAccount || typeof cerbyAccount !== 'object') {
        throw new AuthorizationError(`Cerby account not found: ${cerbyAccountLookup}`);
      }

      audit(logger, 'cerby-validated', {
        correlationId: correlationIdValue,
        cerbyAccountId: stringValue(cerbyAccount.id) || cerbyAccountLookup,
        endpoint: `GET /api/v1/accounts/${cerbyAccountLookup}`,
        statusCode: cerbyAccountResponse.meta.status
      });

      if (debugEnabled) {
        logger.debug?.('request-metadata', {
          correlationId: correlationIdValue,
          endpoint: `GET /api/v1/accounts/${cerbyAccountLookup}`,
          statusCode: cerbyAccountResponse.meta.status
        });
      }

      const passwordResponse = config.safeExecution
        ? { body: 'DUMMY_PASSWORD', meta: { status: 200, url: '' } }
        : await cerbyClient.getAccountPasswordWithMeta(stringValue(cerbyAccount.id) || cerbyAccountLookup);
      const passwordSource = passwordResponse.body;
      const password = normalizePassword(passwordSource);
      if (!password) {
        throw new AuthorizationError('Cerby password retrieval failed');
      }

      audit(logger, 'cerby-password-retrieved', {
        correlationId: correlationIdValue,
        endpoint: `GET /api/v1/accounts/${cerbyAccountLookup}/secrets?filter[secretType]=password`,
        statusCode: passwordResponse.meta.status
      });

      if (debugEnabled) {
        logger.debug?.('request-metadata', {
          correlationId: correlationIdValue,
          endpoint: `GET /api/v1/accounts/${cerbyAccountLookup}/secrets?filter[secretType]=password`,
          statusCode: passwordResponse.meta.status
        });
      }

      const oktaUserResponse = await oktaClient.getUserWithMeta(oktaUserLookup);
      const oktaUser = oktaUserResponse.body as Record<string, unknown>;
      if (!oktaUser || typeof oktaUser !== 'object' || !stringValue(oktaUser.id)) {
        throw new AuthorizationError(`Okta user lookup was ambiguous or not found: ${oktaUserLookup}`);
      }

      audit(logger, 'okta-user-resolved', {
        correlationId: correlationIdValue,
        endpoint: `GET /api/v1/users/${oktaUserLookup}`,
        statusCode: oktaUserResponse.meta.status,
        oktaRequestId: oktaUserResponse.meta.requestId,
        oktaUserId: stringValue(oktaUser.id)
      });

      if (debugEnabled) {
        logger.debug?.('request-metadata', {
          correlationId: correlationIdValue,
          endpoint: `GET /api/v1/users/${oktaUserLookup}`,
          statusCode: oktaUserResponse.meta.status,
          oktaRequestId: oktaUserResponse.meta.requestId
        });
      }

      const oktaAppResponse = await oktaClient.getApplicationWithMeta(oktaAppLookup);
      const oktaApp = oktaAppResponse.body as Record<string, unknown>;
      if (!oktaApp || typeof oktaApp !== 'object' || !stringValue(oktaApp.id)) {
        throw new AuthorizationError(`Okta application lookup was ambiguous or not found: ${oktaAppLookup}`);
      }

      audit(logger, 'okta-app-resolved', {
        correlationId: correlationIdValue,
        endpoint: `GET /api/v1/apps/${oktaAppLookup}`,
        statusCode: oktaAppResponse.meta.status,
        oktaRequestId: oktaAppResponse.meta.requestId,
        oktaAppId: stringValue(oktaApp.id)
      });

      if (debugEnabled) {
        logger.debug?.('request-metadata', {
          correlationId: correlationIdValue,
          endpoint: `GET /api/v1/apps/${oktaAppLookup}`,
          statusCode: oktaAppResponse.meta.status,
          oktaRequestId: oktaAppResponse.meta.requestId
        });
      }

      if (!isSupportedOktaApp(oktaApp)) {
        throw new AuthorizationError('Unsupported Okta application sign-on mode');
      }

      const oktaAppId = stringValue(oktaApp.id) || oktaAppLookup;
      const oktaUserId = stringValue(oktaUser.id) || oktaUserLookup;

      const assignmentResponse = await oktaClient.getApplicationUserWithMeta(oktaAppId, oktaUserId).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) {
          return undefined;
        }
        throw error;
      });

      const existingAssignment = assignmentResponse?.body;
      audit(logger, 'okta-assignment-checked', {
        correlationId: correlationIdValue,
        environment,
        endpoint: `GET /api/v1/apps/${oktaAppId}/users/${oktaUserId}`,
        statusCode: assignmentResponse?.meta.status ?? 404,
        oktaRequestId: assignmentResponse?.meta.requestId,
        oktaAppId,
        oktaUserId,
        assignmentExists: Boolean(existingAssignment)
      });

      if (debugEnabled) {
        logger.debug?.('request-metadata', {
          correlationId: correlationIdValue,
          environment,
          endpoint: `GET /api/v1/apps/${oktaAppId}/users/${oktaUserId}`,
          statusCode: assignmentResponse?.meta.status ?? 404,
          oktaRequestId: assignmentResponse?.meta.requestId
        });
      }

      const oktaUserRecord = oktaUser as Record<string, unknown>;
      const oktaProfile = oktaUserRecord.profile as Record<string, unknown> | undefined;

      const payload = {
        credentials: {
          userName: stringValue(oktaProfile?.login) || stringValue(oktaUserRecord.login) || oktaUserLookup,
          password: { value: password }
        }
      };

      if (config.allowUpdateOktaAssignment === false) {
        throw new AuthorizationError('Okta assignment update is disabled');
      }

      const updateResult = await oktaClient.updateApplicationUserWithMeta(oktaAppId, oktaUserId, payload);
      audit(logger, 'okta-assignment-updated', {
        correlationId: correlationIdValue,
        environment,
        endpoint: `POST /api/v1/apps/${oktaAppId}/users/${oktaUserId}`,
        statusCode: updateResult.meta.status,
        oktaRequestId: updateResult.meta.requestId,
        oktaAppId,
        oktaUserId
      });

      if (debugEnabled) {
        logger.debug?.('request-metadata', {
          correlationId: correlationIdValue,
          environment,
          endpoint: `POST /api/v1/apps/${oktaAppId}/users/${oktaUserId}`,
          statusCode: updateResult.meta.status,
          oktaRequestId: updateResult.meta.requestId
        });
      }

      return {
        status: 'success',
        operation: 'okta_assignment_updated',
        correlationId: correlationIdValue,
        environment,
        secretsExposed: false
      };
    }
  };
}