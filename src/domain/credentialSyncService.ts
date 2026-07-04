import { createCerbyClient } from '../clients/cerbyClient.js';
import { createOktaClient } from '../clients/oktaClient.js';
import { assertCerbyUserAuthorizedToAccount } from './authorizationValidator.js';
import { AmbiguousMatchError, AuthorizationError, ConfigValidationError } from '../errors/domainErrors.js';

type SyncConfig = {
  cerbyWorkspace?: string;
  cerbyApiBaseUrl?: string;
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
  oktaAuthMode?: string;
  oktaApiToken?: string;
  oktaOauthAccessToken?: string;
  httpTimeoutMs?: number;
  maxRetries?: number;
  dryRun?: boolean;
  allowCreateOktaAssignment?: boolean;
  allowUpdateOktaAssignment?: boolean;
  redactedLogging?: boolean;
  correlationIdHeader?: string;
};

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith('--')) continue;
    const key = entry.slice(2);
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

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function definedStrings(values: Array<string | undefined>) {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function createCredentialSyncService(config: SyncConfig, logger: { info: Function; warn: Function; error: Function }) {
  if (!config.cerbyApiToken || !config.oktaDomain || !config.oktaAuthMode) {
    throw new ConfigValidationError('Missing required sync configuration');
  }

  const cerbyClient = createCerbyClient({
    cerbyWorkspace: config.cerbyWorkspace ?? '',
    cerbyApiBaseUrl: config.cerbyApiBaseUrl,
    cerbyApiToken: config.cerbyApiToken,
    cerbyHeaders: config.cerbyHeaders,
    httpTimeoutMs: config.httpTimeoutMs,
    maxRetries: config.maxRetries
  });
  const oktaClient = createOktaClient({
    oktaDomain: config.oktaDomain,
    oktaAuthMode: config.oktaAuthMode,
    oktaApiToken: config.oktaApiToken,
    oktaOauthAccessToken: config.oktaOauthAccessToken,
    httpTimeoutMs: config.httpTimeoutMs,
    maxRetries: config.maxRetries
  });

  return {
    async run(input: { argv: string[]; dryRun: boolean }) {
      const parsed = parseArgs(input.argv);
      const correlationIdValue = correlationId();
      const cerbyAccountLookup = safeString(parsed['cerby-account']);
      const cerbyUserLookup = safeString(parsed['cerby-user']);
      const oktaUserLookup = safeString(parsed['okta-user']);
      const oktaAppLookup = safeString(parsed['okta-app']);

      logger.info('credential-sync-started', { correlationId: correlationIdValue, dryRun: input.dryRun, operation: 'sync_credentials' });

      const effectiveCerbyUserLookup = cerbyUserLookup;
      const effectiveCerbyAccountLookup = cerbyAccountLookup;
      const effectiveOktaUserLookup = oktaUserLookup;
      const effectiveOktaAppLookup = oktaAppLookup;

      if (!effectiveCerbyAccountLookup || !effectiveCerbyUserLookup || !effectiveOktaUserLookup || !effectiveOktaAppLookup) {
        throw new ConfigValidationError('Missing required CLI arguments');
      }

      if (input.dryRun) {
        return {
          status: 'success',
          operation: 'dry_run_planned_sync',
          correlationId: correlationIdValue,
          secretsExposed: false,
          dryRun: true
        };
      }

      const cerbyUsers = await cerbyClient.listUsers(effectiveCerbyUserLookup);
      const cerbyUser = Array.isArray(cerbyUsers) ? cerbyUsers.find((entry) => entry.id === effectiveCerbyUserLookup || entry.email === effectiveCerbyUserLookup) : cerbyUsers;
      if (!cerbyUser) {
        throw new AuthorizationError(`Cerby user not found: ${effectiveCerbyUserLookup}`);
      }

      const cerbyAccount = await cerbyClient.getAccount(effectiveCerbyAccountLookup);
      if (!cerbyAccount) {
        throw new AuthorizationError(`Cerby account not found: ${effectiveCerbyAccountLookup}`);
      }

      const userAccounts = await cerbyClient.listAccountsForUser(cerbyUser.id ?? cerbyUserLookup);
      const authorizedAccountIds = Array.isArray(userAccounts) ? definedStrings(userAccounts.map((entry: { id?: string }) => entry.id)) : [];
      assertCerbyUserAuthorizedToAccount(cerbyAccount.id ?? effectiveCerbyAccountLookup, authorizedAccountIds);

      const oktaUsers = await oktaClient.listUsers(effectiveOktaUserLookup);
      const oktaUser = Array.isArray(oktaUsers) ? oktaUsers.find((entry) => entry.id === effectiveOktaUserLookup || entry.profile?.login === effectiveOktaUserLookup) : oktaUsers;
      if (!oktaUser) {
        throw new AuthorizationError(`Okta user not found: ${effectiveOktaUserLookup}`);
      }

      const oktaApps = await oktaClient.listApplications(effectiveOktaAppLookup);
      const oktaApp = Array.isArray(oktaApps) ? oktaApps.find((entry) => entry.id === effectiveOktaAppLookup || entry.label === effectiveOktaAppLookup || entry.label === effectiveOktaAppLookup) : oktaApps;
      if (!oktaApp) {
        throw new AuthorizationError(`Okta application not found: ${effectiveOktaAppLookup}`);
      }

      const existingAssignment = await oktaClient.getApplicationUser(oktaApp.id ?? oktaAppLookup, oktaUser.id ?? oktaUserLookup).catch(() => undefined);

      if (input.dryRun) {
        return {
          status: 'success',
          operation: existingAssignment ? 'planned_okta_assignment_update' : 'planned_okta_assignment_create',
          correlationId: correlationIdValue,
          secretsExposed: false,
          dryRun: true
        };
      }

      const passwordResponse = await cerbyClient.getAccountPassword(cerbyAccount.id ?? cerbyAccountLookup);
      const password = typeof passwordResponse === 'string' ? passwordResponse : passwordResponse?.password ?? passwordResponse?.value ?? passwordResponse?.data?.password;
      if (!password) {
        throw new AuthorizationError('Cerby password retrieval failed');
      }

      const payload = {
        id: oktaUser.id ?? oktaUserLookup,
        scope: 'USER',
        credentials: {
          userName: oktaUser.profile?.login ?? oktaUser.login ?? oktaUserLookup,
          password: { value: password }
        },
        profile: {}
      };

      let operation = 'okta_assignment_updated';
      if (existingAssignment) {
        if (config.allowUpdateOktaAssignment === false) {
          throw new AuthorizationError('Okta assignment update is disabled');
        }
        await oktaClient.updateApplicationUser(oktaApp.id ?? oktaAppLookup, oktaUser.id ?? oktaUserLookup, payload);
      } else {
        if (config.allowCreateOktaAssignment === false) {
          throw new AuthorizationError('Okta assignment creation is disabled');
        }
        await oktaClient.assignUserToApplication(oktaApp.id ?? oktaAppLookup, payload);
        operation = 'okta_assignment_created';
      }

      return {
        status: 'success',
        operation,
        correlationId: correlationIdValue,
        secretsExposed: false
      };
    }
  };
}