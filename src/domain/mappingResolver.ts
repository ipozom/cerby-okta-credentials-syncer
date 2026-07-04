import { AmbiguousMatchError } from '../errors/domainErrors.js';

export function resolveUniqueMatch<T extends { id?: string; label?: string; email?: string; login?: string }>(items: T[], lookup: string) {
  const matches = items.filter((item) => item.id === lookup || item.label === lookup || item.email === lookup || item.login === lookup);
  if (matches.length === 0) return undefined;
  if (matches.length > 1) throw new AmbiguousMatchError(`Ambiguous match for ${lookup}`);
  return matches[0];
}