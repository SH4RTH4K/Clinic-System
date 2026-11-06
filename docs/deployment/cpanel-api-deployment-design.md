# Optional cPanel API deployment design

**Status: DISABLED — DESIGN ONLY.** There is no active deployment workflow, API token, remote host, or automated write operation in this release preparation.

Any future implementation requires separate authorization and verification of:

- Exact cPanel hostname and supported API version.
- cPanel account username and the least-privilege API token capability needed for file upload/replace operations.
- Exact private application directory and selected domain document root.
- Chosen domain/subdomain and cPanel's resolved document-root path.
- A verified backup and tested recovery procedure for code, environment configuration, persistent storage, and database.
- Maintenance-window, upload-integrity, activation, smoke-test, and rollback steps.
- A release artifact SHA-256 verification step.

If approved later, store the token only in the repository's protected GitHub Actions secrets or an equivalent secret manager. Never put it in source, workflow YAML, artifacts, command output, or logs. Scope the token to the narrowest supported cPanel API operations, rotate it after suspected exposure, and keep the workflow disabled until a human explicitly enables it. Database migrations and seeders must remain a separate reviewed operation; remote file deployment must never run them automatically.

The current GitHub Actions workflow only builds and uploads an artifact. It has no deployment job and requests read-only repository contents permission.
