# Cerby to Okta Credential Sync

## Architecture

The service is organized into a CLI entry point, Cerby and Okta API clients, a credential synchronization domain service, and a redaction-aware logging layer.

## Sequence Flow

1. Load configuration and parse CLI arguments.
2. Resolve the Cerby user and account.
3. Validate that the Cerby user is authorized for the Cerby account.
4. Resolve the Okta user and Okta application.
5. Check whether the Okta application-user assignment already exists.
6. In dry-run mode, return a safe plan without retrieving credentials.
7. In execute mode, retrieve the Cerby password and update or create the Okta assignment.

## Configuration

Required variables:

- `CERBY_WORKSPACE`
- `CERBY_API_TOKEN`
- `OKTA_DOMAIN`
- `OKTA_AUTH_MODE`
- `OKTA_API_TOKEN` when `OKTA_AUTH_MODE=SSWS`
- `OKTA_OAUTH_ACCESS_TOKEN` when `OKTA_AUTH_MODE=OAUTH2`

Optional variables:

- `CERBY_API_BASE_URL`
- `CERBY_ORIGIN` and `CERBY_SOURCE` for live Cerby requests
- `CERBY_ORIGIN`
- `CERBY_SOURCE`
- `CERBY_ACCEPT`
- `CERBY_ACCEPT_LANGUAGE`
- `CERBY_SENTRY_BAGGAGE`
- `CERBY_SENTRY_TRACE`
- `HTTP_TIMEOUT_MS`
- `MAX_RETRIES`
- `DRY_RUN`

## Troubleshooting

- If Cerby or Okta returns `401` or `403`, verify the token and tenant configuration.
- If Cerby returns `403` before any lookup completes, confirm `CERBY_ORIGIN` and `CERBY_SOURCE` are set for the environment you are calling.
- If an account or user cannot be found, confirm the lookup identifier and avoid ambiguous labels.
- If assignment creation fails, verify that the target Okta app supports the requested credential shape.
- If rate limits occur, retry after the reported delay and reduce request frequency.

## Safety Notes

- Never place real API tokens, passwords, Sentry data, or cookies in this file.
- All examples must remain redacted.