# Dashboard Metric Discrepancy Review

**Status:** IMPLEMENTED — RUNTIME NOT VERIFIED

**Project:** Homeopathy Clinic System

**Branch:** `hardening`

**Reviewed commit:** `8490ca7d321acc0cfb96658b004836cf7f404c12`

**Review type:** Frontend-only static inspection

## 1. Metric identification

The affected dashboard card is **Active Doctors**. In `resources/js/Pages/Admin/Dashboard.jsx`, its primary metric key is `active_doctors`, its visible label is `Active Doctors`, and its access key and destination are the Doctors section.

The card's secondary line is configured with `metaKey: 'total_medicines'` and `metaLabel: 'medicines listed'`. As a result, the Active Doctors card presents the number of medicines alongside the doctor count.

## 2. Expected behavior

From the card's label, primary metric key, access key, and destination, the primary value is intended to represent active doctors. Any secondary text in that card should describe a doctor-related measure, or the card should omit secondary text when no such measure is part of the existing frontend contract. A medicine-catalog total is unrelated to the card's stated subject.

This expectation concerns the frontend presentation. This review does not establish whether the server-provided `metrics.active_doctors` value is calculated correctly.

## 3. Observed issue and frontend data flow

`Dashboard` receives a `metrics` object and filters `statCards` by their access key. `StatCard` then renders the primary value from `metrics[card.key]` and the secondary value from `metrics[card.metaKey]` when `metaKey` exists. The affected configuration therefore renders:

- Primary: `metrics.active_doctors`, with the label **Active Doctors**.
- Secondary: `metrics.total_medicines`, with the label **medicines listed**.

The component applies a `?? 0` fallback and performs no calculation or number formatting for either value. The static frontend search found `metrics.total_medicines` also used for the Medicines card, where it is labeled as the total medicine count. It found no doctor-specific secondary metric key such as `total_doctors` or `new_doctors` elsewhere in `resources/js`.

No local calculation, filtering, or status mapping is involved in the Active Doctors card's secondary value. The mismatch is reproducible from the static card configuration and render path; it does not depend on database contents.

## 4. Root-cause classification

**A. Confirmed frontend presentation defect.** The Active Doctors card intentionally reads a medicine metric for its secondary line. The evidence does not show a calculation defect or prove that the primary doctor count is wrong.

Verification of the actual meaning and accuracy of `metrics.active_doctors` would require checking the server data contract, which is outside this investigation's authorization. No PHP or database inspection was performed.

## 5. Implemented frontend-only correction

**File changed:** `resources/js/Pages/Admin/Dashboard.jsx`

Removed `metaKey: 'total_medicines'` and `metaLabel: 'medicines listed'` from the Active Doctors card. `StatCard` now renders a secondary line only when a card has a `metaLabel`. The primary `metrics.active_doctors` value, card access filtering, route, permission, icon, and other cards' existing secondary lines remain unchanged. `StatCard` has one use in this file, so no other consumers were affected.

This uses the existing frontend contract and requires no new prop or metric. If management wants a second doctor-specific count, that should be separately specified and verified against an approved server contract before it is added.

The Active Doctors card now has no secondary line. It no longer implies a relationship between doctor count and medicine count.

## 6. Regression-test requirements

When frontend tests can be run in an approved environment, add or update a rendering test using synthetic metric values that differ, for example `active_doctors: 5` and `total_medicines: 12`. Verify that:

1. The card is labeled **Active Doctors** and displays the active-doctor value.
2. The card does not display the medicine count or **medicines listed** label.
3. The unrelated Medicines card continues to display its existing active and total medicine values.
4. Doctor-card visibility continues to follow its existing access/permission presentation behavior.
5. Missing or null metric behavior remains deliberate and does not falsely claim a verified zero.

These are proposed acceptance tests only. No tests were run and no result is claimed.

## 7. Production impact assessment

This is a dashboard presentation issue. It may mislead staff about what the secondary value describes, but the inspected code does not indicate that it changes records, prescribing, permissions, or clinical calculations. No patient information was used or inspected.

The presentation defect is **IMPLEMENTED — RUNTIME NOT VERIFIED**. The accuracy of the primary `active_doctors` value remains unverified. No frontend build, browser test, or runtime test was performed; npm remains blocked under the previously reported execution restriction.

## 8. Verification scope

Inspected and changed `resources/js/Pages/Admin/Dashboard.jsx`, and reviewed `resources/js/Components/PermissionLink.jsx` and the dashboard finding in `docs/release/step-16h-1-frontend-security-clinical-governance-review.md`. Static searches were limited to `resources/js` and release documentation. No PHP files, database, environment file, patient data, or `public/storage` were accessed. Static diff review completed; JSX compilation and runtime behavior remain unverified.
