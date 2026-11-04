# Step 16H.1 — Frontend, Security, and Clinical Governance Review

**Project:** Homeopathy Clinic System

**Branch:** `hardening`

**Reviewed commit:** `07937499700e9c413b63b8532dcd72b11fe61d48`

**Review type:** Static source and documentation review

## Scope and verification limits

This review inspected React/Inertia pages and shared components, Vite and font configuration, Apache protection files, and deployment guidance. It did not run PHP, Composer, npm, browser or assistive-technology tests; connect to a database; inspect `.env`, patient records, or `public/storage`; or change hosting settings. Findings that need execution or hosting verification are identified as unverified.

The working tree was clean before this report was added. Step 16H.2 updated the frontend items identified below and this report. It did not change backend authorization, PHP, database behavior, hosting configuration, or source outside the approved frontend scope.

## Frontend review

The reviewed interface areas include the dashboard, patient and doctor pages, visits and prescription history, medicines, symptoms, Symptom Map, permissions, activity logs, shared navigation, data tables, forms, and confirmation UI. The pages generally use responsive Tailwind breakpoints, wrapping action groups, constrained content widths, and horizontally scrollable data tables. This is a source-level observation, not a verification at actual mobile viewport sizes.

| Priority | Finding | Evidence and impact | Recommended follow-up |
|---|---|---|---|
| P1 — authorization presentation | **Corrected in Step 16H.2; runtime not verified.** Super Admin membership no longer acts as a frontend permission grant. | `resources/js/Components/usePermission.js` and the explicit Doctor, PatientConfig, and PrescriptionConfig checks now consult named permissions. `AuthenticatedLayout` also requires the named permission while preserving role-restricted Activity Logs visibility. This is a presentation change only; server authorization remains authoritative. | Run role/permission visibility regression tests and verify the server continues to enforce every route. |
| P2 — keyboard and screen-reader access | **Corrected in source; manual accessibility verification remains.** | The mobile drawer now exposes expanded/control relationships, is a modal dialog, becomes inert and hidden when closed, traps Tab focus, closes on Escape/backdrop/navigation, locks background scrolling while open, and restores focus to its opener on close. | Verify on mobile and desktop breakpoints using keyboard and a screen reader, including focus behavior during route navigation and viewport resizing. |
| P2 — catalog form validation feedback | **Corrected in source; server response behavior remains unverified.** | Medicine and Symptom create/edit forms now render Inertia field errors, required states, processing feedback, and `aria-invalid`/`aria-describedby` associations. Symptom Map create/edit and CSV import fields have associated labels and error messages. Review actions display shared validation errors and submission status. | Exercise invalid and valid submissions in an approved runtime and confirm error keys match the existing server responses. |
| P2 — form labels | **Corrected in the reviewed catalog forms.** | Medicine and Symptom fields now have associated labels and stable IDs. Symptom Map form controls and CSV file selection have associated labels. | Include accessible-name and error-association checks in manual browser testing. |
| P2/P3 — Symptom category UI | **Addressed in Step 16H.3 using the existing `category` value.** | Create/Edit now expose the existing category string as plain text, and Index displays stored category values with a safe `Uncategorized` fallback. No allowed-value list or separate Show page was present in the frontend contract. | Confirm product expectations for category vocabulary. If categories should be constrained, provide an approved backend contract rather than adding unverified frontend options. |
| P3 — loading announcements | **Addressed in the shared table component; runtime behavior not verified.** | `DataTable` now announces loading, generic completion, empty results, and a generic error; its region exposes `aria-busy`. Search forms with existing Inertia processing state pass that state to the table. | Verify announcements with screen readers. Keep row contents and patient/clinical details out of status text. |
| P3 — dashboard metric pairing | OPEN — requires separate investigation before production use. The “Active Doctors” card uses `total_medicines` with the label “medicines listed.” | `resources/js/Pages/Admin/Dashboard.jsx` pairs a doctor count with a medicine count in the same card. This appears semantically unrelated and can confuse users. | Confirm the intended dashboard metric; use a doctors-related secondary value or a separate card. |

### Responsive behavior and interaction

- `DataTable` provides horizontal overflow for wide tables. This preserves columns but can require horizontal scrolling on small screens; verify important patient/visit actions remain discoverable and that row content does not become unusably wide.
- The layout and forms use responsive utility classes. No actual viewport, zoom, touch-target, orientation, or browser testing was run.
- Shared empty-state and confirmation components are present. This review did not exhaustively verify that every destructive action uses a confirmation dialog or that every asynchronous action exposes a useful completion/failure state.
- A browser and keyboard review should cover dashboard cards, patient details, visit entry, prescription history, catalog forms, Symptom Map review, permissions, and activity logs. Include 200% zoom, narrow viewport, keyboard-only operation, and at least one screen reader.

## Permission-based UI visibility

`PermissionLink` disables unavailable links in the UI, and page/navigation code uses shared access helpers. These are presentation controls only. Step 16H.2 removed the blanket Super Admin permission result from the shared hook, navigation check, and direct Doctor, PatientConfig, and PrescriptionConfig checks. Activity Logs still require both the Super Admin role and its explicit view permission. Clinical and catalog controls now depend on the specific named permissions already supplied to the frontend.

Do not infer a security fix from hidden or disabled controls. Every request must continue to be authorized on the server, including direct URLs, APIs, exports, and PDFs. Frontend tests should assert the correct presentation for Doctors, Receptionists, and Super Admins with and without explicit clinical grants.

## Vite, build assets, and Bengali fonts

`vite.config.js` declares the application CSS and JavaScript entry points, and `package.json` provides Vite build scripts. The repository contains locally hosted Bengali font references; no external font CDN reference was found in the reviewed files.

The previously reported clean-checkout test failures were caused by Laravel being unable to find the Vite manifest when the clean checkout had no freshly generated `public/build/manifest.json`. The original working tree's manifest existence does not prove that a clean checkout can generate a current build. Step 16F.3 remained blocked because no permitted npm execution environment was available. Therefore:

- **Frontend build:** BLOCKED / NOT VERIFIED.
- **npm audit:** BLOCKED / NOT VERIFIED; no vulnerability count is asserted.
- **Clean-checkout PHPUnit results:** 318 passed and 48 failed in the reported run; the 48 failures were attributed to the missing Vite manifest, but that attribution has not been confirmed by a fresh build and retest.
- Do not fabricate a manifest or treat an old generated build as a reproducible build.

`resources/css/fonts.css` declares the local `NotoSansBengali-Regular.ttf` file with `font-weight: 400 700`. The filename indicates a regular static font, while the declared range suggests a variable or multi-weight face. Confirm the font's actual metadata and visual rendering; if it is a static regular face, declare the correct weight or include separately licensed weight files. The browser and PDF font paths are documented in `DEPLOYMENT.md`, but their deployment rendering was not tested.

## Apache, HTTPS, and hosting security

The hosting facts supplied for this review are **Apache 2.4.69**, **cPanel 138.0**, and **Linux**. An earlier self-signed SSL warning was reported. No hosting account or server was accessed, so these details and the current certificate state have not been independently verified.

Reviewed documentation and files:

- `DEPLOYMENT.md`
- `public/.htaccess`
- `storage/app/public/.htaccess`

The deployment guide correctly calls for the Laravel `public` directory as the web document root, `.env` outside the web root, `APP_DEBUG=false`, HTTPS-aware secure cookies, and verification of Apache rewrite/header behavior. The public `.htaccess` denies dotfiles, applies baseline security headers, and leaves HSTS commented until end-to-end HTTPS is confirmed. No HTTP-to-HTTPS redirect was observed in that file. The cPanel sidebar displayed a self-signed certificate warning, but the affected hostname has not been confirmed. Verify the certificate for the public application domain separately. If that domain uses an untrusted certificate, arrange correction through the authorized hosting administrator.

Recommended hosting checks, without changing hosting settings in this step:

1. Identify the hostname covered by the warning and verify the public application domain separately. If the public domain uses an untrusted certificate, arrange correction through the authorized hosting administrator, then verify its chain and expiry from a client network.
2. Verify HTTPS termination and forwarded scheme handling through cPanel/proxy before enabling secure cookies or HSTS. Enable HSTS only after all required hostnames and HTTPS routes are confirmed; begin with a conservative policy and expand deliberately.
3. Redirect HTTP to HTTPS at the supported cPanel/Apache layer after trusted HTTPS is working. Verify login, logout, password reset, and session expiration over HTTPS.
4. Keep the Laravel project, `.env`, logs, backups, and framework cache outside the document root. Point the site only to Laravel's `public` directory.
5. Confirm `AllowOverride`/`.htaccess` support and the required Apache modules on this exact host; do not assume the checked-in directives are active merely because the files exist.
6. Verify default-deny behavior for dotfiles, logs, backups, and application internals using harmless test paths, without requesting or exposing real secrets.

## File-storage protection

The tracked `storage/app/public/.htaccess` disables CGI/includes/indexes, denies script-like extensions, and sets a default handler. `DEPLOYMENT.md` says not to expose patient documents on the public disk and warns against replacing an existing `public/storage` path without backup and reconciliation.

Protection remains **not verified on the host**. Effective behavior depends on the actual public storage link/path, Apache configuration, and `.htaccess` override policy. This review did not inspect or modify `public/storage` or any uploaded files. Before release, verify on a disposable non-production path that ordinary intended public assets can be served and server-side scripts cannot execute; confirm clinical attachments are stored outside the public disk and served only through authorized application endpoints.

## Audit-retention policy proposal

No retention duration is proposed here. The clinic must approve the policy with its qualified privacy, clinical, and operational decision-makers before production use. The policy should explicitly decide:

- **Authorized viewers:** retain least-privilege access to audit records; specify which named operational roles may review access events and under what purpose. Technical Super Admin status alone should not imply clinical chart access.
- **Monitoring owner:** assign a responsible role to review failed audit writes, unusual access patterns, denied clinical access, and export activity; define alert routing and review cadence.
- **Retention trigger and duration:** decide how the retention clock starts, applicable durations by event category, and how legal/clinical holds pause disposal. Do not infer a statutory period from this report.
- **Secure archive:** define encryption, access control, integrity checks, restore tests, and separation from the application runtime for archived logs and backups.
- **Investigation workflow:** define authorization, case/reference tracking, evidence preservation, reviewer attribution, and a privacy-minimized way to record investigation outcomes.
- **Protected disposal:** require documented approval, controlled execution, verification, and coverage of replicas/backups when the approved retention period expires. No automatic deletion or purge should be introduced before policy approval.
- **Failure handling:** confirm best-effort access logging is monitored. Decide separately whether any specific high-risk operation requires a stricter failure response; do not silently change urgent-care behavior as part of retention policy work.

## Qualified clinical-reference review checklist

Before clinical reference data is relied on operationally, qualified reviewers should document:

- Reviewer identity, qualifications/role, review date, and approval authority for each reference set.
- Source title, author/publisher, edition/version, publication date, and precise page/section or stable reference identifier.
- Medicine name, potency/strength, form, and terminology normalization rules, with source provenance.
- Symptom terminology, translations, synonyms, and any mapping from local terms to controlled terminology.
- Each Symptom Map relationship's evidence/source, rationale, status, reviewer, timestamp, and version.
- Independent review or second sign-off requirements for high-impact or ambiguous mappings.
- Version history retention, correction/withdrawal process, reason for change, and how prior approved versions remain inspectable.
- A rule that suggestions/references never automatically add medicine to a prescription; the prescriber makes and records an independent decision.
- Explicit treatment of missing, conflicting, or unverifiable evidence as uncertain; do not fabricate provenance or infer approval from the presence of data.

This checklist is a governance proposal, not a clinical endorsement of any medicine or treatment reference.

## Final non-database release checklist

| Item | Status | Evidence / next action |
|---|---|---|
| React source review | REVIEWED — STATIC | Step 16H.2 corrections are recorded below; browser recheck remains. |
| Responsive/mobile behavior | SOURCE REVIEWED; NOT TESTED IN BROWSER | Drawer closes when crossing to desktop width; table regions are keyboard-focusable for horizontal scrolling; category text wraps. Test actual viewports, touch, orientation, and zoom. |
| Keyboard and screen-reader accessibility | SOURCE CORRECTIONS MADE; NOT TESTED | Manually verify drawer focus behavior and form labels/errors with assistive technology. |
| Frontend permission presentation | CORRECTED IN SOURCE; NOT RUNTIME VERIFIED | Specific frontend controls now use explicit permission props; verify role matrix and backend independently. |
| npm dependency install and audit | BLOCKED — NOT VERIFIED | Use only an explicitly permitted npm environment; do not bypass policy. |
| Fresh Vite production build | BLOCKED — NOT VERIFIED | Build from committed lockfile in a permitted clean checkout; verify manifest and referenced files. |
| Full PHPUnit after build | NOT VERIFIED AFTER BUILD | Re-run only after manifest generation and confirmed isolated SQLite test settings. The reported 48 missing-manifest failures remain unresolved. |
| Apache configuration and `.htaccess` | DOCUMENTED; HOST NOT VERIFIED | Confirm modules, overrides, document root, and deny rules with the host. |
| Trusted HTTPS and session behavior | PENDING VERIFICATION | Identify the hostname covered by the cPanel warning and verify the public application domain separately. If that domain uses an untrusted certificate, arrange correction through the authorized hosting administrator; then test proxy scheme and session flows. |
| Storage and upload execution protection | DOCUMENTED; HOST NOT VERIFIED | Verify actual path/link behavior on a disposable non-production test path; keep clinical attachments private. |
| Audit retention policy | DRAFT — NOT APPROVED | Review [audit-retention-policy-draft.md](audit-retention-policy-draft.md); management must set retention decisions and assign monitoring/oversight owners. No legal period is assumed. |
| Clinical reference governance | DRAFT — NOT APPROVED | Review [clinical-reference-review-policy-draft.md](clinical-reference-review-policy-draft.md) and use the blank [clinical-reference-signoff-checklist.md](clinical-reference-signoff-checklist.md) only after approval. No reference is validated by these documents. |
| PHP/database release gates | OUT OF SCOPE HERE; STILL BLOCKED PER PRIOR STATUS | This step did not verify MySQL migrations, cPanel database compatibility, or backup/restore. Do not treat this review as production approval. |
| Git release status | COMMIT REVIEWED; NO GIT WRITES | No stage, commit, push, merge, or deployment action was taken. |

## Remaining verification order after Step 16H.3

1. In an approved npm environment, build from the committed lockfile, run the dependency audit, verify the Vite manifest and all referenced assets, and inspect Bengali font rendering.
2. Run the available frontend automated tests and the full isolated SQLite PHPUnit suite after the fresh build. Investigate failures rather than masking them; the previous 48 manifest-related failures remain unverified.
3. Complete manual keyboard, screen-reader, responsive, zoom, contrast, touch, table-loading, and category-input testing for the affected pages.
4. Verify UI permission presentation for Doctors, Receptionists, and Super Admins with varied explicit permissions; separately retain server-side authorization tests.
5. Obtain clinic approval for audit retention and qualified clinical-reference review.
6. Separately complete the database, hosting, HTTPS, storage-path, and backup/restore release gates. Do not declare production readiness until all mandatory gates are verified.

## Step 16H.2 implementation results

The authorized frontend correction changed:

- `resources/js/Layouts/AuthenticatedLayout.jsx` — accessible modal mobile drawer semantics, `aria-expanded`/`aria-controls`, closed-state `inert` and `aria-hidden`, focus movement/trapping/restoration, Escape and backdrop dismissal, navigation dismissal, and background scroll/inert handling.
- `resources/js/Components/usePermission.js` — permission checks now require the explicit permission instead of treating Super Admin role membership as an automatic grant.
- `resources/js/Pages/Admin/Doctors/Index.jsx` and `resources/js/Pages/Admin/Doctors/Show.jsx` — Doctor actions use explicit permission checks.
- `resources/js/Pages/Admin/PatientConfig/Edit.jsx` and `resources/js/Components/PrescriptionConfigModal.jsx` — administrative controls use explicit permission checks.
- `resources/js/Pages/Admin/Medicines/Create.jsx`, `Edit.jsx`; `resources/js/Pages/Admin/Symptoms/Create.jsx`, `Edit.jsx` — associated labels, visible required indicators, field errors, invalid/described-by state, and submission feedback.
- `resources/js/Pages/Admin/SymptomMedicineMap/Create.jsx`, `Edit.jsx`, and `Index.jsx` — associated form labels, field errors, required indicators, CSV input error association, and review submission feedback.

No permission identifiers or submitted field names were added. No PHP, database, migration, seeder, backend authorization, or hosting files were changed. No new fields were added to the forms, and no clinical records or references were changed.

Static review confirmed the shared permission helper and direct Super Admin shortcuts in the affected React code now use explicit grants; server-provided `auth.permissions` was already present in the frontend contract. `git diff --check` passed. The complete source diff was reviewed for imports, bindings, IDs, and event cleanup. npm/build execution remains blocked and was not attempted, so JSX compilation, runtime behavior, frontend automated tests, and the previously reported 48 manifest-related PHPUnit failures remain unverified.

### Remaining accessibility risks and runtime acceptance tests

- Verify the drawer's focus trap, restoration, Escape/backdrop dismissal, route-navigation close, body scroll lock, and resize behavior with real browser keyboard and screen-reader testing.
- Confirm React renders the `inert` attributes as intended in the locked React version and that no focusable background content remains available while the dialog is open.
- Submit invalid Medicine, Symptom, and Symptom Map values and confirm every backend validation key is announced and associated with its field. Check the CSV preview/import errors and review actions as well.
- Confirm explicit permissions keep legitimate admin controls visible only when granted and hide clinical, catalog, review, finalize, and cancellation controls otherwise. Verify server authorization separately; no backend permission behavior changed.
- Test contrast, zoom, responsive table scrolling, touch targets, Bengali font rendering, and status announcements with supported browsers and assistive technology.
- Obtain an approved npm environment for the build, frontend test suite (if configured), and clean-checkout PHPUnit rerun. No runtime test is claimed by this source-only verification.

## Step 16H.3 implementation results

The authorized Step 16H.3 frontend corrections changed:

- `resources/js/Pages/Admin/Symptoms/Create.jsx` and `Edit.jsx` — expose the existing `category` state through an associated text input and show its validation error. No new request field or hardcoded category values were introduced.
- `resources/js/Pages/Admin/Symptoms/Index.jsx` — show each existing category value; empty, null, or unsupported types display as `Uncategorized`, and long text wraps. No Symptom Show page exists in the inspected frontend directory.
- `resources/js/Components/DataTable.jsx` — add a generic live status for loading/completion/empty/error states, `aria-busy`, a generic error row through an optional `hasError` prop, and a named keyboard-focusable horizontal-scroll region with a visible focus outline. Announcement text does not include row values.
- `resources/js/Pages/Admin/Patients/Index.jsx`, `resources/js/Pages/Admin/Medicines/Index.jsx`, `resources/js/Pages/Admin/Symptoms/Index.jsx`, and `resources/js/Pages/Admin/ActivityLogs/Index.jsx` — connect existing search-form processing to the table loading state, label search inputs, and prevent repeat search submissions while processing.

No asynchronous requests, endpoints, filter semantics, pagination behavior, request keys, PHP code, or backend data contracts were changed. The existing category state was already included in the symptom form data; the UI now edits that same field. There is no list-level error state in the inspected pages to connect to the table's generic error state, so it remains opt-in and no errors are fabricated. Doctors, Visits, and Symptom Map list views have no existing list-loading state to wire; CSV preview processing was kept separate from table loading.

Static review checked the modified JSX for imports, field bindings, label IDs, generic-only status text, and responsive overflow behavior. `git diff --check` passed. No npm command was run because the approved frontend execution capability remains unavailable. JSX compilation, frontend automated tests, mobile viewport behavior, and live screen-reader announcements remain unverified.

### Remaining runtime acceptance tests

- Verify category strings, including unknown and long values, survive create/edit and display correctly; confirm validation messages and blank-category fallback.
- With a screen reader, verify loading starts, completion, empty results, and error states are announced once and contain no patient/clinical details. Confirm `aria-busy` tracks the existing search processing state.
- Keyboard-test horizontal table scrolling, visible focus, search submission, pagination, dialogs, and the Step 16H.2 mobile drawer.
- Test narrow mobile, standard mobile, tablet, desktop, 200% zoom, touch targets, and long text in the actual supported browsers.
- Complete an approved clean-checkout frontend build and rerun the isolated test suite; the missing-manifest failures remain unresolved until then.

## Step 16H.4 governance preparation status

Three documentation-only drafts were prepared for management and qualified professional review:

- `docs/release/audit-retention-policy-draft.md` — proposes least-privilege audit viewing, named monitoring owners, failure escalation, investigation, export controls, archival, holds, disposal, backup/restore safeguards, and approval fields. **Retention durations remain blank for management decision.** The draft records that logging is best effort, fallback paths can also fail, and the activity log is not independently tamper-proof.
- `docs/release/clinical-reference-review-policy-draft.md` — defines proposed responsibilities for management, Super Admin, Treating Doctor, Covering Doctor, Receptionist, Medicine Manager, Symptom Map Expert, Clinical Reviewer, and Audit Reviewer. It requires a management-appointed qualified clinical professional to approve each reviewed reference version before clinical use. It does not validate any existing reference or grant application permissions.
- `docs/release/clinical-reference-signoff-checklist.md` — blank reference/version and source fields, reviewer qualification and date, review checks, outcome, concerns, corrections, reapproval requirements, and final signatures. It contains no clinical or patient records.

**All three documents are DRAFT — NOT APPROVED.** Management decisions remain open for audit viewer assignment, monitoring ownership/cadence, retention periods and triggers, export conditions, archive/disposal, backup and restore controls, review schedule, qualified reviewer appointment and qualification evidence, source standards, second-review criteria, reassessment cadence, and clinical escalation. Application roles, permissions, records, and reference data were not changed.

No legal compliance claim or retention duration is supplied. The draft governance procedure does not state that clinical references are professionally validated; qualified review and sign-off remain required before clinical use.

## Step 16H.5 hosting security and deployment review

Created [hosting-security-deployment-checklist.md](hosting-security-deployment-checklist.md) as a documentation-only review. It records the repository's public and upload `.htaccess` behavior, document-root and sensitive-file requirements, a read-only SSL verification procedure, storage-path and upload checks, frontend build-artifact requirements, secret handling, backup prerequisites, post-deployment checks, and approval responsibilities.

The supplied hosting facts are Linux, cPanel 138.0, and Apache 2.4.69; they were not independently verified. A previous cPanel screenshot's self-signed warning does not identify the affected hostname and does not prove that the public application domain has an invalid certificate. No cPanel, live server, certificate, DNS, or hosting configuration was accessed or changed. No `public/storage` path or contents were inspected; its protection remains unverified.

The checklist marks PHP/extension and Apache behavior, trusted HTTPS, storage/upload behavior, backup/restore, and governance approvals as pending verification. npm execution and audit remain blocked; no fresh build or Vite manifest was produced or checked. The previous 48 clean-checkout test failures attributed to the missing manifest remain unresolved. The three governance documents remain **DRAFT — NOT APPROVED**, with no retention period or clinical approval fabricated.

No PHP, database, frontend source, hosting, or credential changes were made. `git diff --check` is the static verification required for this documentation step; no production readiness claim is made.

## Overall assessment

Steps 16H.2 and 16H.3 corrected the approved frontend issues in source, but runtime accessibility and permission-presentation behavior have not been tested. Step 16H.4 prepared draft governance documents only; management approval, retention decisions, and qualified clinical sign-offs are pending. The frontend build and npm audit remain blocked; Apache and storage safeguards are documented but unverified on cPanel. Database, backup/restore, and hosting release gates remain unresolved. **This report does not establish production readiness.**
