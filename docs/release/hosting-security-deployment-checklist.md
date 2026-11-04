# Hosting Security and Deployment Checklist

**Status: REVIEW PREPARED — NOT PRODUCTION APPROVAL**

**Scope:** Static review of repository documentation and tracked Apache configuration. No hosting account, live server, database, credentials, or `public/storage` contents were accessed.

## Status key

- **CONFIRMED** — visible in the reviewed repository or explicitly supplied as environment information; this does not imply host-side behavior was tested.
- **PENDING VERIFICATION** — requires an authorized check on the actual target host.
- **BLOCKED** — a required verification capability or approval is currently unavailable.
- **NOT APPLICABLE** — not required for this deployment model.

## Current hosting facts and release status

| Check | Status | Evidence or next action |
|---|---|---|
| Hosting platform information | **CONFIRMED** | User-supplied: Linux, cPanel 138.0, Apache 2.4.69. These details have not been independently verified on the host. |
| Production PHP runtime and extensions | **PENDING VERIFICATION** | `DEPLOYMENT.md` targets PHP 8.3 and lists required extensions. Verify the actual cPanel PHP-FPM and CLI versions and extensions before release. |
| Apache configuration files | **CONFIRMED** | Repository includes `public/.htaccess` and `storage/app/public/.htaccess`; effective host behavior remains **PENDING VERIFICATION**. |
| Public application domain certificate | **PENDING VERIFICATION** | A previous cPanel screenshot showed a self-signed certificate warning for an unidentified domain or service. This does not establish that the public application domain has an invalid certificate. Identify the affected hostname and check the application domain independently. |
| Frontend dependency audit and fresh build | **BLOCKED** | npm execution is unavailable in the approved environment. `npm audit` and a fresh production build have not been verified. |
| Clean-checkout PHPUnit after frontend build | **BLOCKED** | 48 earlier clean-checkout failures were reported as missing Vite-manifest/view-rendering failures. They remain unresolved until a fresh build and retest are completed. |
| Storage link and upload protection | **PENDING VERIFICATION** | No inspection of `public/storage`, its target, or uploaded files was performed. |
| Backup and restore readiness | **PENDING VERIFICATION** | A protected backup and isolated restore procedure must be demonstrated before database changes or production release. |
| Governance approvals | **PENDING VERIFICATION** | Audit retention and clinical-reference governance documents remain drafts and require management and qualified professional review. |

## 1. Server and application requirements

- [ ] Verify the target account runs the supported PHP 8.3 runtime for both web requests and command-line tasks. **Status: PENDING VERIFICATION.**
- [ ] Verify required PHP extensions from `DEPLOYMENT.md`, including PDO MySQL, ctype, fileinfo, filter, hash, mbstring, OpenSSL, session, tokenizer, DOM, XML, and XMLWriter. Do not leave a public `phpinfo()` diagnostic page online.
- [ ] Confirm Apache provides `mod_rewrite`, `mod_headers`, and `mod_mime`, and honors required `.htaccess` overrides for the application public directory and upload path.
- [ ] Confirm the domain document root points only to the Laravel `public` directory. Keep application source, `.env`, `vendor`, logs, backups, and framework caches outside the web root where hosting permits.
- [ ] Set production configuration with `APP_ENV=production` and `APP_DEBUG=false`. Keep the actual `.env` outside release archives and source control; never replace a live `.env` with the example template.
- [ ] Use a dedicated least-privilege database account and private, host-approved secret storage. Do not place credentials in commands, logs, tickets, release archives, or Git.

## 2. Apache and public-directory review

### Repository configuration observed

- `public/.htaccess` contains Laravel front-controller rewrites, denies dotfiles through `FilesMatch`, denies direct paths for selected sensitive directories, and sets baseline response headers when `mod_headers` is available.
- HSTS is commented out with an instruction to enable it only after end-to-end HTTPS is confirmed. No HTTP-to-HTTPS redirect was observed in the reviewed file.
- `storage/app/public/.htaccess` disables CGI, includes, and directory indexes; denies script-like file extensions and removes their handlers.
- `DEPLOYMENT.md` requires the public document root to be the Laravel `public` directory and warns against exposing the project root or uploading `.git`, `.env`, SQL dumps, logs, local databases, tests, or development tooling.

These are repository observations only. **Host enforcement is PENDING VERIFICATION.** Confirm the Apache version and override policy, ensure both files are deployed at the intended paths, and verify their effective behavior with harmless requests in an authorized non-production environment.

### Host-side checks

- [ ] Confirm the public hostname serves the Laravel `public` directory and that the project root is not reachable over HTTP.
- [ ] From an authorized non-production environment, request harmless paths representing dotfiles, `.git`, logs, backups, `vendor`, and cache files; confirm no sensitive content is returned. Do not request actual secrets or records.
- [ ] Confirm rewrite behavior for application routes and static assets; confirm nonexistent routes do not expose directory listings or filesystem paths.
- [ ] Confirm response headers are present on both application and static responses where intended: frame restriction, MIME sniffing protection, referrer policy, and permissions policy.
- [ ] Confirm error pages do not expose stack traces, environment values, filesystem paths, or credentials.
- [ ] Consider HSTS only after trusted HTTPS, all required subdomains, and rollback implications have been reviewed by the hosting administrator. The repository does not enable HSTS by default.

## 3. HTTPS and SSL verification

The prior cPanel screenshot warning is not enough to determine the certificate status of the public application domain. No cPanel or live-server access occurred in this review.

An authorized hosting administrator should record:

- [ ] The exact hostname and cPanel service to which the self-signed warning applies.
- [ ] Whether the public application hostname presents a certificate chaining to a trusted issuer.
- [ ] Certificate subject/SAN hostname match, validity start/end dates, chain completeness, and renewal/AutoSSL status.
- [ ] HTTPS behavior for the canonical application hostname and any approved aliases.
- [ ] HTTP-to-HTTPS redirect behavior, redirect loops, and proxy forwarding of the original HTTPS scheme.
- [ ] Absence of mixed content and third-party font requests.
- [ ] Login, logout, password reset, and session expiry over HTTPS using a non-production account.
- [ ] Session cookies are Secure, HttpOnly, and use the configured SameSite policy after HTTPS is verified; confirm no cookie is sent over plain HTTP.
- [ ] Application-generated links, redirects, and PDF links use the correct HTTPS origin behind the cPanel proxy.

Do not change certificates, DNS, redirects, HSTS, or cookie configuration as part of this checklist. Record evidence and obtain separate authorization for any correction.

## 4. Storage and upload protection

`DEPLOYMENT.md` describes Laravel's public disk as `storage/app/public` with `public/storage` pointing to it, and warns not to replace an existing path without inspection and backup. This review intentionally did not inspect `public/storage`, its target, or any uploaded file. Its current state and exposure remain **PENDING VERIFICATION**.

Before deployment, an authorized operator should:

- [ ] Confirm the configured private and public storage paths without opening or copying patient files.
- [ ] Confirm `public/storage` is the intended link/path and does not expose private clinical attachments. Do not overwrite an existing directory or link until separately authorized and backed up.
- [ ] Keep patient documents and other clinical attachments on a private disk; serve them only through authorized application routes with server-side checks.
- [ ] Confirm upload-directory `.htaccess` is present and effective. In a disposable non-production directory, use harmless synthetic files to verify ordinary permitted file behavior and that script-like content cannot execute.
- [ ] Confirm directory indexes are disabled and uploaded names/content types are handled safely by the application.
- [ ] Verify owner/group and minimum required permissions for `storage/` and `bootstrap/cache/`; avoid world-writable permissions and blanket recursive permission changes.
- [ ] Keep backup archives outside the web root, restrict access, encrypt them under the approved process, and avoid including local logs or credentials in support bundles.
- [ ] Confirm recovery procedures use an isolated target and never overwrite a live database as an automatic recovery action.

No symlink, permission, file, or hosting change is authorized by this document.

## 5. Frontend build and release artifacts

`DEPLOYMENT.md` requires locally built `public/build/` assets and the self-hosted Bengali font resources. A Vite manifest is required by the Laravel frontend integration. No current build was created or inspected in this step.

- [ ] Use an explicitly permitted environment to run `npm ci` from the committed lockfile and `npm audit`; do not bypass execution restrictions.
- [ ] Run the approved production build from the exact release commit. Do not use an old build or fabricate a manifest.
- [ ] Verify `public/build/manifest.json` exists and every manifest-referenced file exists.
- [ ] Verify required application entrypoints, CSS/JS chunks, and source maps policy. Avoid publishing source maps unless specifically approved.
- [ ] Verify both required Bengali font files are present in their documented locations: `public/fonts/NotoSansBengali-Regular.ttf` for browser styling and `storage/fonts/NotoSansBengali-Regular.ttf` for prescription PDF rendering.
- [ ] Upload only the build output and required public assets to the intended release locations; do not expose private storage or development dependencies.
- [ ] After deployment, verify asset responses, Bengali text rendering, and PDF output with synthetic non-clinical content.
- [ ] Re-run clean-checkout tests with the generated manifest and confirmed isolated SQLite configuration. The previously reported 48 missing-manifest test failures remain **BLOCKED / UNRESOLVED** until this succeeds.

Current status: npm execution is **BLOCKED**; npm audit is **BLOCKED — NOT VERIFIED**; a fresh frontend build and manifest verification are **BLOCKED**.

## 6. Secrets and configuration

- [ ] Create production configuration only in a private application directory from the reviewed template; never include a real `.env` in Git or a release archive.
- [ ] Preserve the existing production `APP_KEY` on upgrades. Generate a key only for a genuinely new installation under the approved procedure.
- [ ] Keep SMTP, database, and other credentials in the private environment configuration or approved secret facility. Redact them from command output, logs, screenshots, and incident reports.
- [ ] Confirm debug mode is off, error reporting is appropriately restricted, and no temporary diagnostic endpoint remains.
- [ ] Confirm session/cookie security settings only after HTTPS behavior has been verified.

## 7. Backup and recovery prerequisites

- [ ] Obtain a protected backup before schema changes using an approved least-privilege process.
- [ ] Verify backup integrity and metadata without exposing clinical contents.
- [ ] Perform a restore only in an isolated, disposable environment and document the result.
- [ ] Record recovery owner, approval path, expected recovery point/time objectives, and handling of writes made after a backup.
- [ ] Do not use rollback commands that can remove clinical data or role assignments as a routine release rollback. Follow documented forward-recovery procedures and verified backups.

Backup creation, restore, and recovery readiness are **PENDING VERIFICATION**; they were not performed here.

## 8. Governance and operational monitoring

- [ ] Clinic management approves an audit retention, archive, monitoring, investigation, and disposal policy. No retention period is set in this checklist.
- [ ] Assign an operational owner to monitor best-effort audit-write warnings and investigate unusual access or export activity. The activity log is not independently tamper-proof, and failures can result in missing events.
- [ ] Qualified clinical reviewers approve the clinical-reference governance procedure and complete version-specific sign-offs before reference content is relied on clinically.
- [ ] Confirm operational roles for deployment, security monitoring, backups, restore authorization, and incident escalation.
- [ ] Keep the existing governance files marked **DRAFT — NOT APPROVED** until their authorized approvers sign them:
  - `audit-retention-policy-draft.md`
  - `clinical-reference-review-policy-draft.md`
  - `clinical-reference-signoff-checklist.md` (draft template)

## 9. Post-deployment acceptance checklist

- [ ] Confirm release commit and deployment artifact checksums.
- [ ] Confirm document root, Apache rules, HTTPS certificate, redirects, headers, and safe error pages.
- [ ] Confirm production debug is off and the private environment configuration was not included in the release.
- [ ] Confirm frontend manifest and all referenced files resolve; verify Bengali font rendering and PDF output using synthetic content.
- [ ] Confirm storage link/path and upload execution restrictions using approved synthetic tests; verify clinical attachments remain private without opening real files.
- [ ] Confirm authentication, secure cookies, session expiry, and role-specific access with non-production accounts.
- [ ] Confirm monitoring and audit-write warning visibility without exposing clinical data in operational logs.
- [ ] Confirm verified backup and isolated restore evidence is current.
- [ ] Record approvals and unresolved exceptions. Do not declare production readiness while mandatory checks remain blocked or unapproved.

## 10. Approval responsibilities

| Decision or verification | Responsible approver |
|---|---|
| Hosting runtime, Apache, document root, SSL, and storage-path evidence | Hosting administrator / authorized technical owner |
| Production release and recovery window | Clinic management / release owner |
| Audit viewers, monitoring, retention, archive, and disposal policy | Clinic management with privacy/operational advice as appropriate |
| Clinical-reference qualification, source standards, and approval process | Qualified clinical governance lead and appointed reviewers |
| Backup and restore authorization and evidence | Clinic management and authorized technical operator |

**Release status: NOT PRODUCTION-READY.** This checklist prepares verification; it does not establish host compatibility, clinical approval, or production readiness.
