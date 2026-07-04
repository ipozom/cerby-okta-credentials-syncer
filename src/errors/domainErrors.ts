export class ConfigValidationError extends Error {
  override name = 'ConfigValidationError';
}

export class DomainValidationError extends Error {
  override name = 'DomainValidationError';
}

export class AmbiguousMatchError extends DomainValidationError {
  override name = 'AmbiguousMatchError';
}

export class AuthorizationError extends DomainValidationError {
  override name = 'AuthorizationError';
}