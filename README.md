# Cerby to Okta Credential Syncer

TypeScript scaffold for a secure Cerby-to-Okta credential synchronization service.

## What this includes

- Environment-driven configuration with validation hooks
- Cerby and Okta client scaffolding
- Centralized HTTP, logging, and redaction layers
- Credential sync domain service skeleton
- Unit and contract-style tests for the security-critical surface
- Documentation stub for operator and implementer guidance

## Planned workflow

```bash
npm run sync -- \
  --cerby-user user@example.com \
  --cerby-account 46b5b821-76b5-1234-ba43-003fc8d4ca31 \
  --okta-user user@example.com \
  --okta-app 0oafxqCAJWWGELFTYASJ \
  --dry-run
```

## Notes

- Secrets must come from environment variables or a secret store.
- Dry-run mode should validate mappings without retrieving passwords or writing to Okta.
- The prompt file in `.github/prompts/` is part of the deliverable set and remains checked in as a downloadable markdown prompt.