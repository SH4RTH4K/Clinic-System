# Audit Log Retention and Monitoring Policy

**Status: DRAFT — NOT APPROVED**

**Document owner:** [Clinic management to assign]

**Effective date:** [Complete after approval]

**Next review date:** [Complete after approval]

## 1. Purpose

This draft proposes how the clinic will govern access to, monitor, retain, archive, investigate, export, and dispose of application audit events. It is intended for clinic management review. It does not state that the policy is legally compliant and does not set a retention period.

## 2. Scope

The application uses its existing activity-log infrastructure for clinical access and change events. The documented clinical access event categories include:

- Patient-detail access.
- Visit-detail access.
- Prescription-history access.
- Prescription PDF export.
- Denied visit-detail and prescription-export requests when an authenticated actor and visit identifier are available.
- Existing clinical change, finalization, amendment, cancellation, and administrative events, where configured.

Events are designed to minimize data: they use actor and record identifiers, event type, authorization outcome, and a request correlation identifier where applicable. They should not contain patient names, contact details, diagnoses, symptoms, medicine directions, clinical notes, request bodies, query strings, passwords, or session tokens.

## 3. Authorized audit viewers

The currently documented application workflow restricts activity-log viewing to Super Admin accounts that also have the explicit `activity_logs.view` permission. The documentation describes no application routes for editing or deleting activity events. This draft does not change application roles or permission assignments.

Management should appoint named audit reviewers and map those responsibilities to accounts that already have authorized access. Role membership by itself is not a substitute for an explicit permission. Audit access should be limited to a defined operational purpose and reviewed when staff responsibilities change.

## 4. Monitoring responsibilities

The application currently treats clinical access audit writes as best effort. A failed access-audit write is reported to the protected application log and does not block a clinical request. A minimal PHP error-log fallback is attempted if the application logger fails.

Management should designate:

- **Audit oversight owner:** [Name/role] — owns periodic review of access and export activity, assigns investigations, and reports unresolved concerns to management.
- **Technical monitoring owner:** [Name/role] — monitors Laravel and host PHP error logs for audit-write warnings and reports gaps or monitoring outages.
- **Clinical escalation contact:** [Name/role] — reviews escalations involving clinical workflow or possible inappropriate chart access.
- **Backup/archive owner:** [Name/role] — verifies that approved audit archives and backups receive the same safeguards as clinical database backups.

The review cadence, alert thresholds, escalation channel, and evidence of completed reviews require clinic approval. Monitoring reports should use event identifiers and counts where possible and avoid copying clinical content into separate logs.

## 5. Retention period and retention triggers

**Retention period: NOT SET — requires clinic management approval.** No legal or regulatory duration is asserted in this draft.

Management must approve, for each event category:

- The retention duration.
- The event or lifecycle point from which the duration is measured.
- Whether differing periods apply to access events, clinical change events, and security events.
- How an active investigation, complaint, legal hold, or clinical review suspends disposal.
- How archived copies and backups are included in the approved retention schedule.

No automatic log deletion, pruning, or purge may be introduced before those decisions are approved and separately implemented and tested.

## 6. Secure archival

If the clinic approves archival, the procedure should require:

1. Encryption during transfer and at rest using clinic-approved key management.
2. Storage outside the public web root and separation from ordinary application runtime access.
3. Least-privilege archive access with named custodians and access records.
4. Integrity verification and documented archive manifests or checksums.
5. Tested restoration to an isolated environment without using real records for routine exercises where synthetic data is sufficient.
6. Protection of archived copies and backup replicas under the same approved retention and disposal schedule.
7. A recorded transfer, verification, and custody history that does not duplicate clinical event content unnecessarily.

## 7. Protection against unauthorized modification

The current application documentation states that no ordinary application routes edit or delete activity events. This is a useful application-level safeguard, but the activity log is stored in the same application database infrastructure and is **not independently tamper-proof**. Privileged infrastructure or database access may be able to alter or remove it. The clinic must not treat the current log as immutable evidence against all administrators or infrastructure compromise.

Management should decide whether independent append-only or separately administered archival controls are required. Any such control is a future design decision and is not implemented by this policy draft.

## 8. Audit-write failures

Audit logging is best effort. Events may be lost if the activity-log write and all fallback logging paths fail. Failed writes do not currently change the authorization result and do not block clinical requests. A failure must never grant access or bypass authorization.

The technical monitoring owner should:

- Monitor application and host PHP error logs for audit-write warnings.
- Escalate a sustained logging outage promptly to the audit oversight owner.
- Record the outage window, affected event categories, investigation, and recovery without adding patient details to the incident record.
- Avoid claiming complete audit coverage for an interval where logging failure is known or suspected.

Management must separately approve whether any future action needs a stricter failure policy. This draft does not change urgent-care behavior.

## 9. Incident investigation

When a suspected inappropriate access, export, or audit gap is raised:

1. The receiving person records the report time, reporter role, and a non-clinical case/reference number.
2. An authorized audit reviewer confirms the purpose and scope of access before searching logs.
3. The reviewer records the event identifiers, relevant actor/resource IDs, outcome, and timestamps needed for the investigation; avoid copying full clinical records.
4. The reviewer preserves relevant logs and backups under an approved hold and limits access to assigned investigators.
5. The clinical escalation contact assesses clinical workflow implications where needed.
6. Management records findings, follow-up actions, and closure approval. Any notification or external escalation follows a separately approved clinic procedure.

Do not alter the source audit record during an investigation. Do not use the investigation process to access unrelated patient charts.

## 10. Audit export authorization

The current documentation establishes restricted audit viewing but does not establish a complete export policy. Management must approve whether audit export is allowed, which existing permission or approved workflow governs it, who reviews each request, and how an export is protected and logged.

If export is permitted, the draft recommends a documented purpose, minimum necessary scope, approval by an authorized reviewer, secure transfer, access-controlled storage, expiry/disposal under the approved retention schedule, and an export record containing no unnecessary clinical content. No new export capability or permission is authorized by this document.

## 11. Secure disposal

Disposal may occur only after the clinic approves the retention schedule and confirms there is no active hold. The approved procedure should identify the authorized approvers, executor, target archive/replicas/backups, secure deletion method supported by the storage system, verification evidence, and completion record. Where deletion cannot be confirmed in a backup generation, its expiry must be governed by the approved schedule.

No automatic deletion or pruning is active or approved by this draft.

## 12. Backup and restoration

Backups containing activity logs remain subject to the same controls as clinical database backups: restricted access, encryption, integrity checks, approved retention, and isolated restore testing. A restore must not overwrite a live application database as an audit-recovery shortcut. Management should approve who may authorize a restore, how restored audit history is reconciled, and how post-backup events are handled.

Backup and restore capability remains a release-readiness item requiring separate verification.

## 13. Policy review schedule

**Proposed review cadence: at least annually and after a material security incident, audit-system change, or major workflow change.** Management must approve the cadence and assign an owner. Reviews should confirm viewer assignments, monitoring coverage, retention decisions, holds, archive tests, disposal evidence, and open logging limitations.

## 14. Approval record

| Approval | Name and role | Signature | Date |
|---|---|---|---|
| Clinic Owner / Management |  |  |  |
| Audit oversight owner |  |  |  |
| Technical monitoring owner |  |  |  |
| Privacy / compliance adviser, if appointed |  |  |  |

### Decisions management must complete

- [ ] Name the audit oversight, technical monitoring, clinical escalation, and backup/archive owners.
- [ ] Approve authorized audit-viewer assignment and review process.
- [ ] Set retention durations and triggers by event category; no duration is prefilled.
- [ ] Approve monitoring cadence, thresholds, and alert routing.
- [ ] Decide whether independent tamper-resistant archival controls are required.
- [ ] Approve audit export conditions, if export is permitted.
- [ ] Approve archive, investigation-hold, restore, and secure-disposal procedures.
- [ ] Approve the policy review cadence.

**Approval status: DRAFT — NOT APPROVED.**
