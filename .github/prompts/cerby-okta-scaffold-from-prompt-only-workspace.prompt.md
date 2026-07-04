---
agent: true
description: Force scaffold a production-ready Cerby-to-Okta credential sync implementation even when the workspace only contains prompt files.
model: GPT-5.4 mini
thinking_effort: medium
language: en
always_generate_downloadable_md_prompt: true
---

# Prompt File: Scaffold Cerby-to-Okta Credential Sync from Prompt-Only Workspace

## Conversation and Output Rules
Maintain all conversation, generated content, documentation, code comments that are part of deliverables, and final responses in English.

Always produce or update a downloadable Markdown prompt file when creating implementation guidance or follow-up prompt engineering work.

Use this target model profile when available:

```yaml
model: GPT-5.4 mini
thinking_effort: medium
```

## Why This Prompt Exists
The previous agent run inspected the repository, found only prompt assets, and stopped because it determined there was no implementation surface to edit. That behavior is not desired for this task.

For this run, if the workspace contains only prompt files or no application code, you must scaffold a new implementation instead of stopping.

## Role
Act as a senior identity engineering, cybersecurity, and secure software development assistant. Scaffold a secure, testable, production-oriented Cerby-to-Okta credential synchronization project based on the existing prompt requirements.

## Primary Objective
Create the initial implementation files for a service or CLI that synchronizes credentials for a given user from a Cerby tenant to an Okta tenant using Cerby and Okta APIs.

The implementation must be safe by default, support dry-run mode, redact secrets, include tests, and include full documentation.

## Critical Instruction
Do not stop after saying the prompt file already exists.

If there is no existing application stack, create one using these defaults:

- TypeScript
- Node.js 20+
- Native `fetch`
- ESM modules
- Vitest for testing
- Modular source layout
- No unnecessary runtime dependencies

## Source Prompt to Preserve
Use the existing prompt file as the requirements source if present:

```text
cerby-okta-credential-sync-gpt54-mini-medium-with-cerby-headers.prompt.md
```

Carry forward all security, language, model, Cerby header, Okta API, redaction, dry-run, testing, and documentation requirements from that prompt.

## Source API Documentation
Use these API references as primary sources:

- [Cerby Accounts API documentation](https://developer.cerby.com/#accounts)
- [Okta Applications API documentation](https://developer.okta.com/docs/api/openapi/okta-management/management/tags/application)
- [Okta Core API reference](https://developer.okta.com/docs/reference/core-okta-api/)
- [Okta Application Users API documentation](https://developer.okta.com/docs/api/openapi/okta-management/management/tags/applicationusers)

## Required Files to Create When No Stack Exists
Create this project structure:

```text
package.json
tsconfig.json
vitest.config.ts
.env.example
.gitignore
README.md
src/
  index.ts
  cli/
    syncCredentialsCommand.ts
  clients/
    httpClient.ts
    cerbyClient.ts
    oktaClient.ts
  config/
    loadConfig.ts
    validateConfig.ts
  domain/
    credentialSyncService.ts
    mappingResolver.ts
    authorizationValidator.ts
  errors/
    apiErrors.ts
    domainErrors.ts
  logging/
    logger.ts
    redaction.ts
  types/
    cerby.ts
    okta.ts
    sync.ts
tests/
  unit/
    config.test.ts
    redaction.test.ts
    httpClient.test.ts
    cerbyClient.test.ts
    oktaClient.test.ts
    credentialSyncService.test.ts
  integration/
    syncContract.test.ts
docs/
  cerby-okta-credential-sync.md
.github/
  prompts/
    cerby-okta-credential-sync-gpt54-mini-medium-with-cerby-headers.prompt.md
```

If some files already exist, update them safely instead of overwriting unrelated content.

## Functional Requirements
Implement a CLI command similar to:

```bash
npm run sync -- \
  --cerby-user user@example.com \
  --cerby-account 46b5b821-76b5-1234-ba43-003fc8d4ca31 \
  --okta-user user@example.com \
  --okta-app 0oafxqCAJWWGELFTYASJ \
  --dry-run
```

The workflow must:

1. Load and validate configuration from environment variables.
2. Parse CLI arguments.
3. Create a correlation ID.
4. Resolve Cerby user/account metadata.
5. Validate the Cerby user-account relationship.
6. Resolve the Okta user and Okta application.
7. Check the Okta app-user assignment.
8. In dry-run mode, report the planned operation without retrieving the Cerby password or modifying Okta.
9. In execute mode, retrieve the Cerby password only after all validation checks pass.
10. Update an existing Okta app-user assignment or create one only when explicitly allowed.
11. Return a structured, redacted result.
12. Never log or print secrets.

## Cerby API Requirements
Support:

- Default base URL: `https://{CERBY_WORKSPACE}.cerby.com/api/v1/`
- Optional observed base URL override: `CERBY_API_BASE_URL=https://api.cerby.com/v1/`
- Authentication header from `CERBY_API_TOKEN`
- Canonical header `X-API-Key`, with case-insensitive handling for `X-API-KEY`
- Optional observed headers controlled by env vars:

```bash
CERBY_ORIGIN=https://example.cerby.com
CERBY_SOURCE=web/refs/tags/web/v0.0.410
CERBY_ACCEPT=application/json, text/plain, */*
CERBY_ACCEPT_LANGUAGE=en-US,en;q=0.9
CERBY_SENTRY_BAGGAGE=
CERBY_SENTRY_TRACE=
```

Do not hard-code real Cerby keys, Sentry IDs, origins, or tenant-specific values.

## Okta API Requirements
Support:

- Base URL: `https://{OKTA_DOMAIN}`
- Auth modes:
  - `Authorization: SSWS <OKTA_API_TOKEN>`
  - `Authorization: Bearer <OKTA_OAUTH_ACCESS_TOKEN>`
- Users API lookup by ID or login
- Applications API lookup by ID or label
- Application Users API list/get/assign/update operations
- Okta pagination using `Link` headers
- Safe capture of `X-Okta-Request-Id`

## Configuration Variables
Create `.env.example` with placeholders only:

```bash
CERBY_WORKSPACE=example-workspace
CERBY_API_BASE_URL=
CERBY_API_TOKEN=replace-me
CERBY_ORIGIN=https://example.cerby.com
CERBY_SOURCE=web/refs/tags/web/v0.0.410
CERBY_ACCEPT=application/json, text/plain, */*
CERBY_ACCEPT_LANGUAGE=en-US,en;q=0.9
CERBY_SENTRY_BAGGAGE=
CERBY_SENTRY_TRACE=
OKTA_DOMAIN=example.okta.com
OKTA_AUTH_MODE=SSWS
OKTA_API_TOKEN=replace-me
OKTA_OAUTH_ACCESS_TOKEN=
LOG_LEVEL=info
DRY_RUN=false
HTTP_TIMEOUT_MS=30000
MAX_RETRIES=3
SYNC_REQUIRE_EXPLICIT_USER_ACCOUNT_MATCH=true
SYNC_ALLOW_CREATE_OKTA_ASSIGNMENT=true
SYNC_ALLOW_UPDATE_OKTA_ASSIGNMENT=true
SYNC_REDACTED_LOGGING=true
SYNC_CORRELATION_ID_HEADER=X-Correlation-Id
SYNC_ALLOW_TOTP_SYNC=false
```

## Security Requirements
Implement these controls:

1. Redact API tokens, authorization headers, passwords, TOTP values, Sentry baggage, Sentry traces, origins, cookies, and any field named like `secret`, `token`, `password`, `authorization`, `apiKey`, `x-api-key`, or `credential`.
2. Do not print request/response bodies that may contain secrets.
3. Do not include real secrets in tests or fixtures.
4. Keep credential values in memory only and pass them directly to the Okta API call.
5. Dry-run mode must not call Cerby password retrieval or Okta write endpoints.
6. Fail safely on ambiguous lookups.
7. Fail safely on unsupported Okta credential schemes.
8. Implement retry with bounded exponential backoff and jitter for `429`, selected `5xx`, and network timeout errors.
9. Surface safe, actionable errors.
10. Include tests proving redaction works.

## Implementation Expectations
Implement production-oriented but concise code. Use clear interfaces and dependency injection where useful for testability.

### HTTP Client
Create a reusable HTTP client with:

- Base URL support
- Timeout via `AbortController`
- Retry policy
- JSON parsing
- Safe error objects
- Redaction-aware logs
- Header injection
- Correlation ID propagation

### Cerby Client
Implement methods:

```text
listUsers(query?)
getUser(userId)
listAccounts(filters?)
getAccount(accountId)
listAccountsForUser(userId)
getAccountPassword(accountId)
```

### Okta Client
Implement methods:

```text
getUser(userIdOrLogin)
listUsers(searchOrFilter)
listApplications(queryOrFilter)
getApplication(appId)
listApplicationUsers(appId, query?)
getApplicationUser(appId, userId)
assignUserToApplication(appId, payload)
updateApplicationUser(appId, userId, payload)
```

### Domain Service
Implement `CredentialSyncService` with:

- Dry-run path
- Execute path
- Idempotent assignment handling
- Safe handling of unsupported apps
- Safe result object

## Documentation Requirements
Create `docs/cerby-okta-credential-sync.md` with:

1. Executive summary
2. Architecture overview
3. Sequence diagram
4. Configuration reference
5. Cerby headers and safe configuration
6. Okta authentication modes
7. API endpoint inventory
8. Dry-run behavior
9. Execute behavior
10. Error handling
11. Retry and rate-limit strategy
12. Logging and audit strategy
13. Secret redaction strategy
14. Testing strategy
15. Deployment instructions
16. Operational runbook
17. Troubleshooting guide
18. Security checklist
19. Known limitations
20. Future enhancements

## Testing Requirements
Create tests for:

- Config validation
- Redaction
- Cerby header construction
- Okta authorization header construction
- Retry behavior
- Dry-run avoids secret retrieval and writes
- Existing assignment update path
- Missing assignment create path
- Unsupported app failure
- Ambiguous mapping failure
- API error handling

## Acceptance Criteria
The task is complete only when:

1. The implementation scaffold exists even if the original workspace only had prompt files.
2. The prompt file is preserved or copied into `.github/prompts/`.
3. The CLI can run in dry-run mode using mocked or placeholder configuration without exposing secrets.
4. Tests exist for core behavior and redaction.
5. Documentation exists in `docs/cerby-okta-credential-sync.md`.
6. No real secrets are present.
7. All responses and generated documentation are in English.
8. The work does not stop merely because the original prompt file already exists.

## Expected Copilot Response Format
Respond with:

1. Brief implementation summary
2. Files created or modified
3. Notable security decisions
4. How to run tests
5. How to run dry-run mode
6. Any assumptions or limitations

## Final Instruction
Proceed to scaffold the implementation now. Do not ask for confirmation. Do not stop after repository inspection. If only prompt files exist, create the TypeScript project structure and implementation described above.
