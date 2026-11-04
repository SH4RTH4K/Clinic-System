# Clinical Reference Review and Governance Policy

**Status: DRAFT — NOT APPROVED**

**Policy owner:** [Clinic management to assign]

**Clinical governance lead:** [Qualified professional to appoint]

**Effective date:** [Complete after approval]

**Next review date:** [Complete after approval]

## 1. Purpose and limits

This draft defines proposed responsibilities and review controls for medicine catalog information, symptom terminology, and Symptom Map reference relationships. It does not create, endorse, or modify any treatment recommendation. It does not claim that current reference content has been professionally validated or that the draft is legally compliant.

## 2. Governing principles

1. A reference or suggestion is informational material. It does not establish efficacy, patient suitability, diagnosis, or treatment.
2. A Symptom Map suggestion never adds medicine to a prescription automatically.
3. The treating Doctor remains responsible for independently assessing the patient and making, documenting, and finalizing clinical decisions under the clinic's existing authorization workflow.
4. Catalog maintenance does not grant prescribing, visit-finalization, prescription-cancellation, or clinical-review authority.
5. Super Admin or other administrative status does not automatically grant clinical approval authority.
6. Only a qualified clinical professional appointed by the clinic may approve a reference for clinical use. The clinic must document and periodically confirm the reviewer's qualification and authority.
7. Missing, conflicting, or unverifiable source information remains explicitly uncertain. Staff must not fabricate source details, reviewer identity, approval, or historical attribution.
8. Corrections preserve prior versions and review history. A changed reference is not silently treated as the previously approved version.

## 3. Existing shared-care and prescription controls

This draft is intended to complement the documented shared-care workflow:

- Authorized Doctors may consult shared patient history, while each visit remains assigned to its responsible Doctor.
- A Doctor creates a separate visit when covering care. Another Doctor does not overwrite or finalize the responsible Doctor's draft merely because they can view it.
- Finalization requires the existing clinical permissions, `visits.finalize`, an active linked Doctor profile, responsibility for the visit, and valid clinical/prescription data. The creator, responsible Doctor, actual finalizer, timestamp, and prescription snapshots remain distinct and preserved.
- A Doctor may cancel their own prescription when the existing clinical permissions and `visits.cancel` requirements are met. Cross-Doctor cancellation additionally requires `visits.cancel_other`, the active Doctor and clinical permission checks, and a documented reason. Administrative role membership alone does not authorize clinical cancellation.
- Cancellation and amendment workflows preserve the original prescription snapshot and responsible Doctor identity; they do not create an automatic replacement prescription.
- Historical visits without reliable Doctor attribution remain unassigned. This draft does not authorize retrospective reassignment or fabrication of authorship.

These are summaries of the documented application workflow, not new permissions or a change to server-side authorization. If the clinic's approved policy differs, management must resolve the conflict before production use.

## 4. Responsibilities and workflow

### 4.1 Medicine reference maintenance

An authorized Medicine Manager maintains medicine catalog entries within the existing application permissions. The manager records the available catalog information accurately and refers unclear identity, form, or source questions to the clinic's designated qualified reviewer. Catalog maintenance alone does not approve a Symptom Map relationship or authorize prescribing.

### 4.2 Symptom terminology maintenance

An authorized Symptom Map Expert or other clinic-designated terminology specialist maintains symptom labels and translations within existing permissions. The person documents the accepted term and known synonyms only when supported by the clinic's approved terminology source. Uncertain translations or ambiguous concepts are referred for clinical review; staff must not invent equivalences.

### 4.3 Symptom Map creation and submission

An authorized Symptom Map Expert may create or edit a general reference relationship under the existing workflow. Each proposed entry should include the available source title, author/editor, edition, page/section, and rationale where known. The expert submits the relationship for independent review. A draft or legacy-unreviewed entry is not presumed approved because it exists or contains non-empty data.

### 4.4 Qualified clinical review

The appointed Clinical Reviewer assesses the cited source and the general reference relationship, records the review outcome, reviewer identity, date, and rationale, and approves or rejects through the existing review workflow when authorized. Approval applies to the reviewed version and source as documented; it does not establish treatment efficacy or approve patient-specific use.

Before appointment, management should document the reviewer's relevant qualification, scope, and authority. This verification is an operational prerequisite; the application does not, by itself, establish professional credentials.

### 4.5 Rejection, correction, and reapproval

- Rejection, deactivation, or correction must include a reason appropriate to the workflow.
- A rejected or deactivated entry must not be presented as an approved current reference.
- A material change to the symptom, medicine, source, priority, or clinical rationale requires a new review of the changed version before it is used as an approved reference.
- The prior snapshot, reviewer attribution, status, and ordering remain preserved as recorded. Do not overwrite history to make it appear that an earlier reviewer assessed later content.
- Missing or uncertain historical source details remain identified as unknown and are referred for review; do not reconstruct them from current catalog content.

### 4.6 Periodic reassessment

Management and the Clinical Governance Lead must approve a reassessment cadence. Reassessment should also be triggered when a cited source changes or is withdrawn, a material terminology/catalog change occurs, a reviewer raises a concern, a correction is reported, or a relevant safety issue is escalated. The cadence and evidence required for reassessment remain decisions for clinic approval.

### 4.7 Clinical safety escalation

Any concern that a reference is misleading, unsupported, outdated, or being used as an automatic treatment rule should be raised promptly to the Clinical Governance Lead and clinic management. The affected reference should be handled under the existing review/deactivation controls by an authorized person. Preserve the prior version and document the concern without adding patient-specific data to the general reference record. Patient-specific clinical questions follow the clinic's established care and incident processes, not this catalog workflow.

## 5. Operational responsibility matrix

Application roles and permissions are not changed by this draft. Named people should be assigned by management and matched to existing authorized accounts. One person may hold multiple operational responsibilities only where management approves separation-of-duty controls.

| Role / appointed function | Administrative responsibility | Clinical responsibility | Technical maintenance | Audit oversight |
|---|---|---|---|---|
| Clinic Owner / Management | Approves governance, appointments, retention decisions, escalation and operational procedures. | Appoints qualified clinical reviewers; does not gain clinical authority solely by ownership. | Authorizes approved technical work and release windows; does not handle credentials outside policy. | Approves audit policy, assigns audit oversight, and reviews escalated findings. |
| Super Admin | Manages authorized users, roles, permissions, clinic settings, and other administrative controls under existing policy. | No automatic prescribing, finalization, cancellation, or reference-approval authority. | Performs application administration only through authorized mechanisms. | May view activity logs only under the documented Super Admin plus `activity_logs.view` access. Role status alone is insufficient. |
| Treating Doctor | Maintains their own account and visit workflow within granted permissions. | Independently assesses the patient, authors their visit, selects any treatment, and remains responsible for their prescription and clinical decisions. | No routine catalog or infrastructure maintenance implied. | No access to audit logs unless separately authorized under existing policy. |
| Covering Doctor | Creates a separate visit for a shared patient under the documented shared-care workflow. | Reviews relevant history and makes their own decisions. Does not overwrite another Doctor's draft or finalized record; exceptional cross-Doctor cancellation requires the explicit existing authorization and documented reason. | No routine catalog or infrastructure maintenance implied. | No audit access implied. |
| Receptionist | Registration, demographic updates, and scheduling within assigned permissions. | No diagnosis, visit-note, prescription-history, prescribing, or clinical-review responsibility by default. | No infrastructure maintenance implied. | No audit-log access by default. |
| Medicine Manager | Maintains medicine catalog fields within explicit catalog permissions and escalates source uncertainty. | Catalog maintenance does not confer prescribing or Symptom Map approval authority. | No server or database maintenance implied. | No audit access implied. |
| Symptom Map Expert | Creates and edits proposed general references and records available sources within explicit permissions. | Does not approve their own reference unless separately appointed and the clinic's review policy explicitly permits it. No prescribing authority is implied. | No server or database maintenance implied. | No audit access implied. |
| Clinical Reviewer | Records review decisions and reasons under explicit review permission. | Must be qualified and appointed by management; approves only the version and evidence actually reviewed. | No infrastructure maintenance implied. | No audit access implied unless separately authorized. |
| Audit Reviewer | Does not change application roles or clinical records as part of review. | No treatment or approval authority implied. | Requests technical assistance through approved channels. | Reviews minimum-necessary audit events for an assigned purpose. Must have an account authorized under the current application access model; management must resolve any mismatch between the desired reviewer role and existing permissions before appointment. |

## 6. Training and conflicts

Before assuming a role, personnel should receive role-specific training on privacy, the difference between reference information and treatment, version preservation, reporting uncertainty, and escalation. A reviewer should disclose a relevant conflict of interest to management. Management should decide whether an independent second review is required for a particular reference category or concern.

Training records, reviewer appointments, conflicts, and changes in authority should be retained according to clinic-approved administrative policy. Do not put patient data in these records.

## 7. Approval decisions

Clinic management and the appointed qualified clinical governance lead must approve:

- The qualifications and appointment process for Clinical Reviewers.
- Who may maintain Medicine and Symptom catalogs, mapped to existing permissions.
- The source-quality and citation requirements for each reference type.
- Whether independent second review is required for specified categories.
- The reassessment cadence and event-triggered review process.
- Correction, deactivation, escalation, and communication procedures.
- How the clinic records reviewer qualification evidence and conflicts.
- Whether the existing account/permission model can support the proposed Audit Reviewer assignment without changing roles or permissions.

## 8. Approval record

| Approval | Name and role | Signature | Date |
|---|---|---|---|
| Clinic Owner / Management |  |  |  |
| Clinical Governance Lead |  |  |  |
| Qualified Clinical Reviewer representative |  |  |  |
| Medicine Manager representative |  |  |  |

**Approval status: DRAFT — NOT APPROVED.** This document does not establish that any clinical reference is approved or validated.
