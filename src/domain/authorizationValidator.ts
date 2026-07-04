import { AuthorizationError } from '../errors/domainErrors.js';

export function assertCerbyUserAuthorizedToAccount(userId: string, accountIds: string[]) {
  if (!accountIds.includes(userId)) {
    throw new AuthorizationError(`User ${userId} is not authorized for the requested account`);
  }
}