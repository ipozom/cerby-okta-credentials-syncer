---
mode: agent
description: Implement and document a secure Cerby-to-Okta credential synchronization service using GPT-5.4 mini with medium thinking effort.
model: GPT-5.4 mini
thinking_effort: medium
language: en
always_generate_downloadable_md_prompt: true
---

# Prompt File: Cerby-to-Okta Credential Synchronization Implementation

## Conversation and Output Rules
Maintain all conversation, generated content, documentation, code comments that are part of deliverables, and final responses in English.

Always produce or update a downloadable Markdown prompt file when this prompt is used as the basis for new implementation guidance, planning, documentation, or follow-up prompt engineering work.

Use the following model configuration when available in the target assistant or Copilot environment:

```yaml
model: GPT-5.4 mini
thinking_effort: medium
```

If the exact model or thinking-effort setting is not available in the execution environment, proceed with the closest available GPT-5-family model and explicitly document the substitution in the assumptions section. Do not block the implementation solely because of model configuration differences.

## Important Secret-Handling Notice
The Cerby API header example below must be treated as a sanitized implementation reference. Never commit or print real API keys, Sentry trace identifiers, tenant-specific origins, or other sensitive header values. Use environment variables, secret stores, and redaction. Any real values observed during manual API testing must be rotated if exposed in chat, logs, screenshots, tickets, or source control.

## Role
Act as a senior identity engineering, cybersecurity, and secure software development assistant. Design and help implement a production-ready software component that synchronizes credentials for a given user from a Cerby tenant to an Okta tenant using official Cerby and Okta APIs.

## Technical Objective
Create a secure, auditable, testable, and maintainable service or CLI workflow that:

1. Resolves a Cerby user and Cerby account.
2. Validates that the requested Cerby user is authorized to access the requested Cerby account.
3. Retrieves the Cerby account credential only after all validation checks pass.
4. Resolves the target Okta user and Okta application.
5. Checks whether the Okta user is already assigned to the target Okta application.
6. Updates the existing Okta application-user credentials when supported.
7. Creates the Okta application-user assignment with credentials when missing and explicitly allowed.
8. Produces complete technical implementation documentation.
9. Never exposes, logs, persists, or prints raw credential values.

## Source Documentation
Use these official API references as the primary sources:

- [Cerby Accounts API documentation](https://developer.cerby.com/#accounts)
- [Okta Applications API documentation](https://developer.okta.com/docs/api/openapi/okta-management/management/tags/application)
- [Okta Core API reference](https://developer.okta.com/docs/reference/core-okta-api/)
- [Okta Application Users API documentation](https://developer.okta.com/docs/api/openapi/okta-management/management/tags/applicationusers)

## Repository Context Instructions
Before making code changes:

1. Inspect the repository structure.
2. Identify the programming language, framework, runtime, dependency manager, test framework, linter, formatter, logging library, and configuration conventions.
3. Reuse existing patterns where possible.
4. If no implementation stack exists, assume:
   - TypeScript
   - Node.js 20+
   - Native `fetch` or a minimal HTTP client abstraction
   - Modular service architecture
   - Jest or Vitest for tests, depending on existing repository conventions
5. Clearly document all assumptions.

## Business Goal
Reduce manual credential synchronization work between Cerby and Okta while preserving strong security controls, least privilege, traceability, auditability, and operational reliability.

## High-Level CLI Workflow
Design the implementation around a workflow similar to:

```bash
sync-credentials \
  --cerby-user <cerbyUserIdOrEmail> \
  --cerby-account <cerbyAccountIdOrLabel> \
  --okta-user <oktaUserIdOrLogin> \
  --okta-app <oktaAppIdOrLabel> \
  [--dry-run]
```

The CLI or service interface must support both dry-run and execution modes.

## Functional Requirements
The implementation must:

1. Load configuration from environment variables or the repository's approved secure configuration mechanism.
2. Validate required configuration and input arguments before API calls.
3. Authenticate to Cerby with the Cerby API token.
4. Resolve the Cerby user by ID or email where supported.
5. Resolve the Cerby account by ID or label where supported.
6. Fail safely if label/email lookups are ambiguous.
7. Verify the Cerby user-account relationship using available Cerby user/account APIs.
8. Retrieve the Cerby password only after Okta user/app resolution and authorization validation pass.
9. Authenticate to Okta using either SSWS API token authentication or OAuth 2.0 bearer token authentication.
10. Resolve the Okta user by ID or login.
11. Resolve the Okta application by ID or label.
12. Determine whether the Okta user is already assigned to the Okta app.
13. Update the existing app-user assignment credentials if supported and allowed.
14. Create the app-user assignment if missing, supported, and explicitly allowed.
15. Return a structured result containing non-sensitive IDs, operation status, and correlation ID.
16. Redact all secrets from logs, errors, traces, and output.

## Cerby API Requirements
Use the documented Cerby REST API behavior:

- Base URL pattern: `https://{CERBY_WORKSPACE}.cerby.com/api/v1/`
- Alternative observed API authority/base reference from captured calls: `https://api.cerby.com/v1/`
- Authentication header: `X-API-Key: <CERBY_API_TOKEN>`
- Preserve case-insensitive handling for `X-API-Key` / `X-API-KEY`; send the canonical header as configured by the Cerby documentation unless an environment-specific integration requires a different casing.
- Use documented account and user endpoints for:
  - Listing users
  - Retrieving a user by ID
  - Listing accounts
  - Retrieving an account by ID
  - Listing accounts for a user
  - Retrieving the password of an account
- Handle pagination via Cerby response `links` and `meta` objects where available.
- Handle relevant response statuses: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, and `429`.
- Do not retrieve TOTP codes unless explicitly required and separately approved.
- Treat passwords, TOTP codes, backup codes, recovery data, and tokens as highly sensitive.

## Observed Cerby API Headers to Support
The implementation should support optional Cerby headers observed from an existing browser/API call, but must not hard-code real values. Store sensitive or environment-specific values in configuration and redact them from all logs.

### Sanitized header shape

```json
{
  "baggage": "sentry-environment=production,sentry-release=<SENTRY_RELEASE>,sentry-user_segment=<SENTRY_USER_SEGMENT>,sentry-public_key=<SENTRY_PUBLIC_KEY>,sentry-trace_id=<SENTRY_TRACE_ID>,sentry-sample_rate=<SENTRY_SAMPLE_RATE>",
  "authority": "https://api.cerby.com/v1/",
  "X-API-KEY": "${CERBY_API_TOKEN}",
  "cerby-source": "web/refs/tags/web/<CERBY_WEB_VERSION>",
  "origin": "${CERBY_ORIGIN}",
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "sentry-trace": "<SENTRY_TRACE_ID>-<SENTRY_SPAN_ID>-<SENTRY_SAMPLED_FLAG>"
}
```

### Header configuration guidance
Support these optional environment variables for the observed Cerby headers:

```bash
CERBY_API_BASE_URL=https://api.cerby.com/v1/
CERBY_ORIGIN=https://example.cerby.com
CERBY_SOURCE=web/refs/tags/web/v0.0.410
CERBY_ACCEPT=application/json, text/plain, */*
CERBY_ACCEPT_LANGUAGE=en-US,en;q=0.9
CERBY_SENTRY_BAGGAGE=
CERBY_SENTRY_TRACE=
```

### Header handling rules
- Required header: `X-API-Key` or `X-API-KEY`, populated from `CERBY_API_TOKEN`.
- Optional headers: `cerby-source`, `origin`, `accept`, `accept-language`, `baggage`, and `sentry-trace`.
- Do not log raw `X-API-Key`, `baggage`, `sentry-trace`, tenant-specific `origin`, or trace IDs unless they are redacted.
- Prefer official Cerby documented authentication and base URL behavior. Use observed browser-like headers only when required by the target environment.
- Validate whether the `authority` value is a real HTTP header in the selected HTTP client. In most server-side clients, configure the base URL rather than sending an `authority` header manually.
- Fix malformed captured header formatting: `accept` and `accept-language` must be separate headers.

## Okta API Requirements
Use only documented Okta Management API endpoints:

- Base URL pattern: `https://{OKTA_DOMAIN}`
- Supported authentication modes:
  - `Authorization: SSWS <OKTA_API_TOKEN>`
  - `Authorization: Bearer <OKTA_OAUTH_ACCESS_TOKEN>`
- Prefer scoped OAuth 2.0 tokens when available.
- Use Okta Users API to resolve users.
- Use Okta Applications API to resolve applications.
- Use Okta Application Users API to list, assign, retrieve, or update application-user assignments.
- Follow Okta pagination through `Link` response headers.
- Capture `X-Okta-Request-Id` in safe logs for troubleshooting.
- Handle relevant statuses: `200`, `204`, `400`, `401`, `403`, `404`, `409`, `411`, `429`, and `5xx`.
- Do not assume all Okta app types support assigned app-user passwords.
- Detect unsupported credential schemes or fail safely based on documented Okta API errors.

## Configuration
Support these required environment variables:

```bash
CERBY_WORKSPACE=example-workspace
CERBY_API_TOKEN=***
OKTA_DOMAIN=example.okta.com
OKTA_AUTH_MODE=SSWS # SSWS or OAUTH2
OKTA_API_TOKEN=*** # required when OKTA_AUTH_MODE=SSWS
OKTA_OAUTH_ACCESS_TOKEN=*** # required when OKTA_AUTH_MODE=OAUTH2
LOG_LEVEL=info
DRY_RUN=false
HTTP_TIMEOUT_MS=30000
MAX_RETRIES=3
```

Support these optional environment variables:

```bash
CERBY_API_BASE_URL=https://api.cerby.com/v1/
CERBY_ORIGIN=https://example.cerby.com
CERBY_SOURCE=web/refs/tags/web/v0.0.410
CERBY_ACCEPT=application/json, text/plain, */*
CERBY_ACCEPT_LANGUAGE=en-US,en;q=0.9
CERBY_SENTRY_BAGGAGE=
CERBY_SENTRY_TRACE=
SYNC_REQUIRE_EXPLICIT_USER_ACCOUNT_MATCH=true
SYNC_ALLOW_CREATE_OKTA_ASSIGNMENT=true
SYNC_ALLOW_UPDATE_OKTA_ASSIGNMENT=true
SYNC_REDACTED_LOGGING=true
SYNC_CORRELATION_ID_HEADER=X-Correlation-Id
SYNC_ALLOW_TOTP_SYNC=false
```

## Security Requirements
Implement security controls from the beginning:

1. Never log raw passwords, TOTP codes, API tokens, authorization headers, cookies, session values, Sentry tracing values, or secret payloads.
2. Redact secrets in structured logs, thrown errors, test failures, HTTP traces, and debug messages.
3. Keep credential values in memory only for the minimum necessary scope.
4. Do not persist retrieved credentials to disk, cache, telemetry, crash reports, or test fixtures.
5. Use TLS-only communication.
6. Validate all user-provided identifiers and reject malformed or suspicious input.
7. Enforce least privilege token guidance in documentation.
8. Include retry logic for transient failures and rate limits with bounded exponential backoff and jitter.
9. Make dry-run mode avoid credential retrieval whenever possible.
10. Ensure repeated runs are idempotent and do not create duplicate assignments.
11. Return actionable, non-sensitive errors.
12. Provide audit logs with correlation ID, timestamps, operation name, non-sensitive resource IDs, result, and Okta request IDs where available.
13. Include automated tests proving secret redaction.
14. Do not bypass Cerby RBAC, Okta policies, MFA, application-level security, or any access control.
15. If a real token was exposed during prompt creation, rotate it before using the integration.

## Suggested Architecture
Adapt to repository conventions. If no conventions exist, use a modular structure similar to:

```text
src/
  config/
    loadConfig.ts
    validateConfig.ts
  clients/
    httpClient.ts
    cerbyClient.ts
    oktaClient.ts
  domain/
    credentialSyncService.ts
    mappingResolver.ts
    authorizationValidator.ts
  cli/
    syncCredentialsCommand.ts
  logging/
    logger.ts
    redaction.ts
  errors/
    apiErrors.ts
    domainErrors.ts
  types/
    cerby.ts
    okta.ts
    sync.ts
tests/
  unit/
  integration/
  fixtures/
docs/
  cerby-okta-credential-sync.md
.github/
  prompts/
    cerby-okta-credential-sync-gpt54-mini-medium.prompt.md
```

## Core Sequence Diagram
Include this or an adapted equivalent in the documentation:

```mermaid
sequenceDiagram
    participant Operator as Operator or Scheduler
    participant Sync as Credential Sync Service
    participant Cerby as Cerby API
    participant Okta as Okta API

    Operator->>Sync: Start sync with Cerby user/account and Okta user/app
    Sync->>Sync: Load config, validate input, create correlation ID
    Sync->>Cerby: Resolve Cerby user/account metadata
    Cerby-->>Sync: Metadata response
    Sync->>Sync: Validate Cerby user-account authorization
    Sync->>Okta: Resolve Okta user and application
    Okta-->>Sync: User and application metadata
    Sync->>Okta: Check application-user assignment
    Okta-->>Sync: Existing assignment or not found
    alt Dry-run mode
        Sync-->>Operator: Planned action, no secret retrieved or written
    else Execute mode
        Sync->>Cerby: Retrieve account password
        Cerby-->>Sync: Password value
        alt Assignment exists
            Sync->>Okta: Update app-user credentials if supported
        else Assignment missing and creation allowed
            Sync->>Okta: Assign user to app with credentials if supported
        end
        Okta-->>Sync: Result
        Sync->>Sync: Redact and clear sensitive references where possible
        Sync-->>Operator: Safe structured result
    end
```

## HTTP Client Requirements
Create a centralized HTTP client abstraction with:

- Base URL support
- Request timeout
- Retry policy for `429`, transient `5xx`, and network timeouts
- Exponential backoff with jitter
- Safe error normalization
- Header injection
- Correlation ID propagation
- JSON parsing
- Response metadata capture
- Redaction-aware logging
- Pagination helper support for Cerby and Okta patterns
- Optional Cerby observed-header injection controlled by environment variables

## Cerby Client Methods
Implement or equivalent methods:

```text
listUsers(query?)
getUser(userId)
listAccounts(filters?)
getAccount(accountId)
listAccountsForUser(userId)
getAccountPassword(accountId)
getAccountTotpCode(accountId) // optional, disabled by default
```

## Okta Client Methods
Implement or equivalent methods:

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

## Mapping Strategy
Support explicit IDs first. Allow email or label lookup only if unique.

Mapping input example:

```json
{
  "cerby": {
    "workspace": "example-workspace",
    "userIdOrEmail": "user@example.com",
    "accountIdOrLabel": "46b5b821-76b5-1234-ba43-003fc8d4ca31"
  },
  "okta": {
    "domain": "example.okta.com",
    "userIdOrLogin": "user@example.com",
    "appIdOrLabel": "0oafxqCAJWWGELFTYASJ"
  },
  "options": {
    "dryRun": false,
    "allowCreateAssignment": true,
    "allowUpdateAssignment": true
  }
}
```

## Okta Assignment Payload Guidance
When the target Okta app supports app-user credentials, use a payload shape similar to:

```json
{
  "id": "OKTA_USER_ID",
  "scope": "USER",
  "credentials": {
    "userName": "APP_USERNAME",
    "password": {
      "value": "REDACTED_IN_LOGS_ONLY"
    }
  },
  "profile": {}
}
```

Important: The actual request must contain the password value only when performing the secure API call. Logging, error handling, and output must always redact it.

## Documentation Deliverable
Create or update:

```text
docs/cerby-okta-credential-sync.md
```

The documentation must include:

1. Executive summary
2. Scope
3. Non-goals
4. Assumptions and open decisions
5. Model and prompt configuration, including GPT-5.4 mini and medium thinking effort
6. Architecture overview
7. Component diagram
8. Sequence diagram
9. Configuration reference
10. Required Cerby token permissions/scopes
11. Required Okta token permissions/scopes
12. API endpoint inventory
13. Request/response examples with secrets redacted
14. Observed Cerby API headers and safe configuration strategy
15. Credential mapping strategy
16. Dry-run behavior
17. Error handling strategy
18. Rate-limit and retry strategy
19. Logging and audit strategy
20. Secret handling and redaction strategy
21. Idempotency rules
22. Testing strategy
23. Deployment instructions
24. Operational runbook
25. Troubleshooting guide
26. Security review checklist
27. Known limitations
28. Future enhancements

## Testing Requirements
Add automated tests according to repository conventions.

### Required Unit Tests
- Configuration validation succeeds and fails correctly.
- Cerby client builds correct base URLs and headers.
- Cerby client optionally injects observed headers only when configured.
- Cerby client separates `accept` and `accept-language` correctly.
- Cerby redaction masks `X-API-Key`, `baggage`, `sentry-trace`, `origin`, and trace IDs.
- Okta client builds correct base URLs and authorization headers.
- Cerby pagination is handled correctly.
- Okta `Link` header pagination is handled correctly.
- Retry logic handles `429`, transient `5xx`, and timeout scenarios.
- Mapping resolver rejects ambiguous Cerby accounts, Cerby users, Okta users, or Okta apps.
- Authorization validator rejects unauthorized Cerby user-account relationships.
- Redaction removes passwords, API tokens, authorization headers, TOTP codes, and secret values.
- Dry-run mode does not retrieve passwords and does not modify Okta.

### Required Integration or Contract Tests
Use mocked APIs or a local HTTP server unless the repository already has a secure integration-test strategy.

Test scenarios:

1. Successful update of an existing Okta app-user assignment.
2. Successful creation of a missing Okta app-user assignment.
3. Cerby account not found.
4. Cerby user not found.
5. Cerby user not authorized for account.
6. Cerby password retrieval denied.
7. Okta user not found.
8. Okta application not found.
9. Okta app-user credentials unsupported.
10. Okta rate limit response.
11. Network timeout.
12. Invalid or expired token.
13. Redaction remains effective in error paths.
14. Optional Cerby observed headers are sent only when configured and never logged raw.

## Acceptance Criteria
The implementation is complete when:

1. A downloadable Markdown prompt file exists and reflects GPT-5.4 mini with medium thinking effort.
2. All generated content and documentation are in English.
3. Dry-run mode validates mappings and reports planned operations without retrieving or writing credentials when possible.
4. Execute mode can sync one Cerby account credential to one Okta app-user assignment when both APIs support the operation.
5. Existing Okta assignments are updated instead of duplicated.
6. Missing Okta assignments are created only when explicitly allowed.
7. Unsupported Okta credential schemes fail safely with actionable messages.
8. Secrets are never logged, printed, persisted, committed, or exposed.
9. Observed Cerby headers are supported via safe configuration with redaction and without hard-coded real values.
10. Tests cover success, failure, retry, redaction, dry-run, observed-header handling, and idempotency paths.
11. Documentation is complete in `docs/cerby-okta-credential-sync.md`.
12. Linting, formatting, type checking, and tests pass.
13. No secrets or real tenant values are included in source code, tests, prompt files, logs, or docs.

## Expected Response Format from Copilot
When using this prompt in Copilot Chat or agent mode, respond with:

1. Implementation plan
2. Files to create or modify
3. Code changes by file
4. Tests by file
5. Documentation content
6. Security considerations and tradeoffs
7. Manual validation steps
8. Assumptions and open questions

## Constraints
- Do not use undocumented Okta endpoints.
- Do not scrape browser UI or automate credential entry through UI automation.
- Do not bypass Cerby RBAC, Okta policies, MFA, or application controls.
- Do not expose secret values in logs, console output, telemetry, exceptions, or generated files.
- Do not include real tokens, tenant names, user emails, passwords, TOTP codes, Sentry trace IDs, origins, or app secrets in examples.
- Do not implement TOTP synchronization unless explicitly enabled and documented as a separate security-sensitive capability.
- Do not make destructive changes without explicit safeguards.

## Safe Operator Examples

Dry run:

```bash
sync-credentials \
  --cerby-user user@example.com \
  --cerby-account 46b5b821-76b5-1234-ba43-003fc8d4ca31 \
  --okta-user user@example.com \
  --okta-app 0oafxqCAJWWGELFTYASJ \
  --dry-run
```

Execute sync:

```bash
sync-credentials \
  --cerby-user user@example.com \
  --cerby-account 46b5b821-76b5-1234-ba43-003fc8d4ca31 \
  --okta-user user@example.com \
  --okta-app 0oafxqCAJWWGELFTYASJ
```

Expected safe output:

```json
{
  "status": "success",
  "operation": "okta_application_user_credentials_updated",
  "cerbyAccountId": "46b5b821-76b5-1234-ba43-003fc8d4ca31",
  "oktaUserId": "00u...",
  "oktaAppId": "0oa...",
  "correlationId": "...",
  "secretsExposed": false,
  "language": "en",
  "modelProfile": {
    "model": "GPT-5.4 mini",
    "thinkingEffort": "medium"
  }
}
```

## Final Instruction
Implement this as production-ready software and documentation. Keep all responses and generated deliverables in English. Maintain a downloadable Markdown prompt file as an explicit deliverable. Prefer small, testable modules, secure defaults, safe failure modes, clear documentation, and auditable behavior.
