import { createCerbyClient } from '../clients/cerbyClient.js';
import { createOktaClient } from '../clients/oktaClient.js';
import { assertCerbyUserAuthorizedToAccount } from './authorizationValidator.js';

export function createCredentialSyncService(config: any, logger: any) {
  const cerbyClient = createCerbyClient(config);
  const oktaClient = createOktaClient(config);

  return {
    async run(input: { argv: string[]; dryRun: boolean }) {
      logger.info('credential-sync-started', { correlationId: 'generated', dryRun: input.dryRun });
      assertCerbyUserAuthorizedToAccount('placeholder-user', ['placeholder-user']);
      if (input.dryRun) {
        return { status: 'dry-run', secretsExposed: false };
      }
      return { status: 'not-implemented', secretsExposed: false, cerbyClientExists: Boolean(cerbyClient), oktaClientExists: Boolean(oktaClient) };
    }
  };
}