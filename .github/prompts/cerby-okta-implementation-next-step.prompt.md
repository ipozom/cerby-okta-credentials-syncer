agent: true
model: GPT-5.4 mini
thinking_effort: medium
language: en

# Execute Cerby → Okta Credential Sync Implementation

## Execution Mode

You are performing a code implementation task.

You MUST:

You MUST NOT:


## Context

Project is already scaffolded and valid:


Current state:


## Files to Modify ONLY

```text
src/clients/cerbyClient.ts
src/clients/oktaClient.ts
src/domain/credentialSyncService.ts
src/cli/syncCredentialsCommand.ts
src/logging/redaction.ts
docs/cerby-okta-credential-sync.md

---
model: GPT-5.4 mini
thinking_effort: medium
language: en
always_generate_downloadable_md_prompt: true
---
# Prompt: Implement the Real Cerby to Okta Sync Step

## Purpose

Continue from the existing scaffolded repository and replace the placeholder sync behavior with production-oriented implementation work.

## Starting Point

The repository already contains:

- A TypeScript Node.js scaffold
## Primary Objective

Implement the actual Cerby-to-Okta credential synchronization flow while preserving the security, dry-run, redaction, and auditability constraints from the earlier prompt.

## Must Preserve

- GPT-5.4 mini with medium thinking effort
## Implement in the Existing Structure

Prefer the existing scaffold and avoid introducing unrelated new structure unless it is required for correctness.

Focus on these files first:

```text
src/clients/cerbyClient.ts
src/clients/oktaClient.ts
src/domain/credentialSyncService.ts
src/cli/syncCredentialsCommand.ts
src/logging/redaction.ts
docs/cerby-okta-credential-sync.md
```

## Expected Implementation Work

### Cerby Client

Implement real, secure Cerby API calls for:

- user lookup
Support:

- `CERBY_API_BASE_URL` override
### Okta Client

Implement real, secure Okta Management API calls for:

- user lookup
Support:

- `SSWS` and `Bearer` authorization
### Sync Service

Implement the end-to-end flow:

1. Load and validate configuration
2. Parse CLI input
3. Resolve Cerby user and account
4. Validate Cerby authorization for the account
5. Resolve Okta user and application
6. Check existing application-user assignment
7. In dry-run mode, stop after safe validation and return a plan
8. In execution mode, retrieve the Cerby password only after validation
9. Update existing Okta assignment or create a new assignment when explicitly allowed
10. Return a structured, fully redacted result

### Redaction

Extend or tighten redaction so it masks:

- `authorization`
### CLI

Make the CLI output safe JSON only, with no credential values, tokens, or raw headers.

### Documentation

Expand [docs/cerby-okta-credential-sync.md](docs/cerby-okta-credential-sync.md) to cover:

- architecture
### Tests

Add or refine tests for:

- configuration validation
## Constraints

- Do not expose real secrets
## Validation Expectations

After implementation, the repository should still pass:

- build/type checking
## Expected Response From the Next Agent

1. Summary of the implementation changes
2. Files modified
3. Tests added or updated
4. Documentation updated
5. Security considerations
6. Validation results

## Final Instruction

Implement the real sync logic on top of the existing scaffold. Keep the work localized, secure, and testable.
---

# Prompt: Implement the Real Cerby to Okta Sync Step

## Purpose

Continue from the existing scaffolded repository and replace the placeholder sync behavior with production-oriented implementation work.

## Starting Point

The repository already contains:

- A TypeScript Node.js scaffold
- CLI entry points
- Cerby and Okta client modules
- A credential sync domain service
- Logging and redaction helpers
- Unit and integration test placeholders
- A minimal documentation file

## Primary Objective

Implement the actual Cerby-to-Okta credential synchronization flow while preserving the security, dry-run, redaction, and auditability constraints from the earlier prompt.

## Must Preserve

- GPT-5.4 mini with medium thinking effort
- English-only content and comments
- No real secrets, tokens, tenant values, or passwords in code, docs, prompts, or tests
- Downloadable Markdown prompt file delivery

## Implement in the Existing Structure

Prefer the existing scaffold and avoid introducing unrelated new structure unless it is required for correctness.

Focus on these files first:

```text
src/clients/cerbyClient.ts
src/clients/oktaClient.ts
src/domain/credentialSyncService.ts
src/cli/syncCredentialsCommand.ts
src/logging/redaction.ts
docs/cerby-okta-credential-sync.md
```

## Expected Implementation Work

### Cerby Client

Implement real, secure Cerby API calls for:

- user lookup
- account lookup
- user-to-account relationship validation
- password retrieval only after validation passes

Support:

- `CERBY_API_BASE_URL` override
- `X-API-Key` authentication
- Optional observed headers from environment variables
- Pagination where applicable
- Safe handling of `401`, `403`, `404`, `409`, and `429`

### Okta Client

Implement real, secure Okta Management API calls for:

- user lookup
- application lookup
- application-user lookup
- assignment creation
- assignment update

Support:

- `SSWS` and `Bearer` authorization
- App-user password assignment only when supported
- Safe handling of `400`, `401`, `403`, `404`, `409`, `411`, `429`, and transient `5xx`
- `X-Okta-Request-Id` capture in logs or structured results without leaking secrets

### Sync Service

Implement the end-to-end flow:

1. Load and validate configuration
2. Parse CLI input
3. Resolve Cerby user and account
4. Validate Cerby authorization for the account
5. Resolve Okta user and application
6. Check existing application-user assignment
7. In dry-run mode, stop after safe validation and return a plan
8. In execution mode, retrieve the Cerby password only after validation
9. Update existing Okta assignment or create a new assignment when explicitly allowed
10. Return a structured, fully redacted result

### Redaction

Extend or tighten redaction so it masks:

- `authorization`
- `x-api-key`
- `password`
- `token`
- `credential`
- `baggage`
- `sentry-trace`
- `origin`

### CLI

Make the CLI output safe JSON only, with no credential values, tokens, or raw headers.

### Documentation

Expand [docs/cerby-okta-credential-sync.md](docs/cerby-okta-credential-sync.md) to cover:

- architecture
- configuration
- API flows
- dry-run behavior
- error handling
- security model
- troubleshooting
- safe examples

### Tests

Add or refine tests for:

- configuration validation
- redaction behavior
- Cerby header construction
- Okta auth header construction
- dry-run behavior
- successful update path
- successful create path
- rate-limit retry behavior
- unsupported assignment handling
- secret-free logging and output

## Constraints

- Do not expose real secrets
- Do not bypass access control
- Do not add unnecessary dependencies
- Do not change the scaffold unless required by the implementation
- Prefer small, testable edits

## Validation Expectations

After implementation, the repository should still pass:

- build/type checking
- unit tests
- integration or contract tests that can run locally with mocks or local HTTP servers

## Expected Response From the Next Agent

1. Summary of the implementation changes
2. Files modified
3. Tests added or updated
4. Documentation updated
5. Security considerations
6. Validation results

## Final Instruction

Implement the real sync logic on top of the existing scaffold. Keep the work localized, secure, and testable.
