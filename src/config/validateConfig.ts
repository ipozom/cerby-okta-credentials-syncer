import { ConfigValidationError } from '../errors/domainErrors.js';

export function validateConfig(config: ReturnType<typeof import('./loadConfig.js').loadConfig>) {
  const missing: string[] = [];

  if (!config.cerbyWorkspace) missing.push('CERBY_WORKSPACE');
  if (!config.cerbyApiToken) missing.push('CERBY_API_TOKEN');
  if (!config.oktaDomain && !config.oktaDomainPreview) missing.push('OKTA_DOMAIN or OKTA_DOMAIN_PREVIEW');
  if (!config.oktaAuthMode) missing.push('OKTA_AUTH_MODE');
  if (config.oktaAuthMode === 'SSWS' && !config.oktaApiToken) missing.push('OKTA_API_TOKEN');
  if (config.oktaAuthMode === 'OAUTH2' && !config.oktaOauthAccessToken) missing.push('OKTA_OAUTH_ACCESS_TOKEN');

  if (missing.length > 0) {
    throw new ConfigValidationError(`Missing required configuration: ${missing.join(', ')}`);
  }

  return config;
}