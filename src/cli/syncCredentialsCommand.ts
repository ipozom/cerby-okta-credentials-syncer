import { loadConfig } from '../config/loadConfig.js';
import { validateConfig } from '../config/validateConfig.js';
import { createCredentialSyncService } from '../domain/credentialSyncService.js';
import { createLogger } from '../logging/logger.js';

export async function runSyncCredentialsCommand(argv: string[], env: NodeJS.ProcessEnv) {
  const config = validateConfig(loadConfig(env));
  const logger = createLogger(config);
  const service = createCredentialSyncService(config, logger);
  return service.run({ argv, dryRun: argv.includes('--dry-run') || config.dryRun });
}