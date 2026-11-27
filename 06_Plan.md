# Master Implementation Plan & Roadmap (06_Plan.md)
## RemediQ - Dual-Purpose Practice Management System
*(Classical Homeopathy, General Medicine & Integrative Clinics)*

**Document Version:** 3.0  
**Current Progress:** All 13 Phases Completed (Comprehensive Dual-Purpose Healthcare System Operational)  
**Status Legend:**  
- `[x] COMPLETED`: Tested, verified, and operational in production code.  
- `[ ] PENDING`: Scheduled for upcoming implementation sprints.

---

## Phase Overview & Progress Matrix

| Phase | Domain | Status | Key Deliverables |
| :---: | :--- | :---: | :--- |
| **01** | Core Foundation & RBAC | `[x] COMPLETED` | Multi-guard Auth, Spatie Permissions, Super Admin Lock |
| **02** | Patient Registry & Numbering | `[x] COMPLETED` | Multi-sequence profiles, Guardian search, Old ID tracking |
| **03** | Clinical Workbench & Prescriptions | `[x] COMPLETED` | Auto-save drafts, Repertory suggestion, Bengali Dompdf |
| **04** | Public Portal & Appointments | `[x] COMPLETED` | Doctor profiles, Intake booking, Rate-limited converter |
| **05** | Health, In-App Deploy & Backups | `[x] COMPLETED` | Zip packaging, SPA download stream, Git manager, Migrations |
| **06** | Clinic Branding & Identity | `[x] COMPLETED` | Logo/Favicon upload, Doctor signature, Pre-printed pad mode |
| **07** | Dual Practice Mode Adapter | `[x] COMPLETED` | Practice toggle (Homeo / General / Dual), Pharma drugs, Lab orders |
| **08** | Clinical Vitals & Structured History | `[x] COMPLETED` | Vitals strip (BP/Pulse/Temp/Sugar/BMI), Physical Generals |
| **09** | Diagnostic Attachments & OPD Pass | `[x] COMPLETED` | Lab report PDF/JPG uploads, Photo capture, Barcode/QR OPD card |
| **10** | Dual Pharmacy Stock & Dispensing | `[x] COMPLETED` | Homeo potencies + conventional stock, Auto-deduction |
| **11** | Billing, Invoicing & Daily POS | `[x] COMPLETED` | Fees, Medicine billing, bKash/Cash, 80mm receipts, Cash ledger |
| **12** | Waiting Room Queue & Calendar | `[x] COMPLETED` | Interactive calendar, TV Queue screen, Token calling chime |
| **13** | Automated Patient Communications | `[x] COMPLETED` | SMS appointment confirmation, WhatsApp prescription share |
| **34** | Manufacturers & Suppliers Master | `[x] COMPLETED` | Company directory, MR contacts, inventory intake combobox |
| **35** | Diagnostic Lab Investigations | `[x] COMPLETED` | 35 pre-seeded tests, specimen types, fees, responsive cards |
| **36** | Kent Repertory Symptoms Catalog | `[x] COMPLETED` | 50 Kent rubrics, 11 chapters, CDSS links, responsive touch cards |
| **37** | Repertory Knowledge Graph | `[x] COMPLETED` | Multi-filter search, Grade 1-4, review queue, responsive cards |
| **38** | Clinical Advice & Instructions Master | `[x] COMPLETED` | 25 seeded guidelines, 6 categories, default presets, mobile touch cards |

---

## Detailed Milestone Checklist

### Phase 1: Core Foundation & Multi-Guard Security (`[x] COMPLETED`)
- [x] **Multi-Identifier Login**: Email or username authentication with rate-limiting.
- [x] **Granular RBAC**: Role and permission matrices implemented with Spatie.
- [x] **Super Admin Invariant**: Protection against removing, demoting, or locking the last Super Admin.
- [x] **Sanitized Audit Trails**: `spatie/laravel-activitylog` logging with sensitive data masking.
- [x] **Verification**: All authentication and permission tests passing.

### Phase 2: Sequential Patient Identification & Search (`[x] COMPLETED`)
- [x] **Numbering Engine**: Daily, monthly, and yearly sequence resets with custom prefixes.
- [x] **Demographic Profiles**: Age in years, months, and days with calendar calculation.
- [x] **Guardian Relationship Mapping**: Linked parent/guardian names with configurable relation catalog.
- [x] **Unified Multi-Factor Search**: Instant search matching Name, Phone, ID, Old ID, and Guardian Name.
- [x] **Patient Management Dashboard & 1-Click Actions**: Top KPI metrics (Total Patients, Registered Today, In Queue Today, Total Consultations), row-level 1-click Quick Actions (`+ Queue`, `+ Visit`, `OPD Card`), longitudinal visit counts and live queue indicators, role-guarded blood group display (`clinical_records.view`), and streaming CSV export.
- [x] **Longitudinal Clinical Context & Legacy Migration Last Visit Date**: Dual-layer resolution engine on Patient model (`effective_last_visit_date`, `effective_visits_count`), configurable Yes/No in Patient Configuration (`/admin/patient-config`), table status badges on `/admin/patients`, overview card on `/admin/patients/{id}`, Step 1 context & token auto-linking on `/admin/visits/create`, and duplicate token warning on `/admin/queue/tokens/create`.
- [x] **Verification**: `PatientGuardianRelationshipTest` and patient sequence tests verified.

### Phase 3: Clinical Consultations & Bilingual Prescription Engine (`[x] COMPLETED`)
- [x] **Draft Auto-Saving**: Background debounced saving to `visit_drafts`.
- [x] **Patient Medical History Auto-Population**: Automatic population of permanent medical history and allergies into Chief Complaints on `/admin/visits/create`.
- [x] **Consultation Workbench Accelerators**: Longitudinal clinical history slide-over drawer, 1-click "Repeat Last Prescription", and common diagnoses autocomplete.
- [x] **Repertory Grading & Suggestion**: Symptom rubrics mapped to remedies with cumulative scores.
- [x] **Finalization & Amendments**: Record lock upon finalize, revision history in `visit_amendments`.
- [x] **Prescription Cancellation**: Formal cancellation reason workflow with audit trail.
- [x] **Bilingual Dompdf Output**: Embedded `NotoSansBengali` TrueType fonts with table geometry.
- [x] **Verification**: All visit and clinical record feature tests passing.

### Phase 4: Public Clinic Website & Appointment Intake (`[x] COMPLETED`)
- [x] **Public Landing Portal**: Hero section, Visiting hours, Clinic about, and Contact details.
- [x] **Doctor Profiles**: Public credentials and photo management.
- [x] **Appointment Request Form**: Rate-limited public intake with CSRF protection.
- [x] **Intake Processing**: Admin review, link to existing patient, or convert to new patient.
- [x] **Verification**: Appointment request feature tests and throttle validation passing.

### Phase 5: System Health, In-App Deployments & Backups (`[x] COMPLETED`)
- [x] **Diagnostics Dashboard**: Server memory, PHP version, disk usage, database connection.
- [x] **In-App Zip Backups**: DB SQL, Media, and Full package generation.
- [x] **SPA Download Stream**: Prevent browser binary character rendering; direct file download link.
- [x] **In-App Git Checkout & Migrations**: GitHub fetch, commit review, pull, and cache rebuild without SSH.
- [x] **Verification**: System health tests and download routes verified.

---

### Phase 6: Clinic Branding & Identity Management (`[x] COMPLETED`)
- [x] **Task 6.1**: Clinic Logo File Upload UI
  - Upload PNG/SVG in `ClinicSettingController`.
  - Store in `storage/app/public/branding/`.
  - Dynamically replace logos on Admin Header, Public Portal, and Prescription PDF.
- [x] **Task 6.2**: Dynamic Favicon Upload & Head Tag Replacement
  - Upload `.ico` / `.png` favicon in clinic settings.
  - Render dynamically in `app.blade.php`.
- [x] **Task 6.3**: Doctor Digital Signature & Clinic Seal Upload
  - Add `signature_path` to `doctors` table.
  - Image uploader in Doctor Edit form.
  - Automatically place signature and seal at the bottom of finalized prescription PDFs.
- [x] **Task 6.4**: Pre-Printed Stationery Pad Mode
  - Add "Pre-printed Pad Mode" button/toggle in prescription print view.
  - Hides clinic header and footer when active, preserving exact vertical offset.
- [x] **Verification**: All 5 feature tests in `ClinicBrandingTest` passing.

### Phase 7: Dual Practice Mode Adapter (`[x] COMPLETED`)
- [x] **Task 7.1**: Practice Mode Setting Toggle
  - Add `practice_type` enum (`homeopathy`, `general_practice`, `integrative_dual`) to `clinic_settings`.
  - Settings UI to switch mode.
  - Global Inertia sharing of `clinic.practice_type`.
- [x] **Task 7.2**: General Practice Medication Schema & Builder
  - Table, Model, FormRequests, Controller, and UI for `pharmaceuticals`.
  - Support for Generic & Brand names, Strength (mg/ml), Dosage Forms (Tablet, Syrup, Injection).
  - Autocomplete search API (`/admin/pharmaceuticals/search`).
- [x] **Task 7.3**: Clinical Diagnosis & Lab Investigation Orders
  - Diagnosis fields (`provisional_diagnosis`, `final_diagnosis`) in Visit consultation and PDF.
  - Lab test catalog & investigation order picker (CBC, Lipid, LFT, X-Ray, USG).
  - Autocomplete search API (`/admin/lab-investigations/search`) with clinical codes, specimens, and standard fees.
  - Enhanced Lab Investigation Catalog (`/admin/lab-investigations`) with short codes, Bengali names, specimen types, standard fees, reference ranges, and turnaround times.
  - Debounced real-time multi-field search (300ms) and category pill filter tabs with live metrics.
  - Responsive multi-screen view: desktop `DataTable` + high-density mobile touch cards (`block md:hidden`).
  - 1-Click Clinical Presets Toolbar in `Create.jsx` for rapid package onboarding.
  - Automated Billing integration in `BillingService` populating standard fees for advised investigations.
  - Full test coverage with 10 dedicated tests in `LabInvestigationManagementTest.php` (113 assertions).
- [x] **Task 7.4**: Practice-Adaptive Doctor Consultation Workbench & Prescription PDF
  - Dynamic consultation workbench adapting to Homeopathy, General Practice, and Dual modes in `Visits/Create.jsx` and `Visits/Edit.jsx`.
  - Dynamic layout switching in `prescription.blade.php` based on `practice_type`.
- [x] **Verification**: All 5 feature tests in `DualPracticeModeTest` passing.

### Phase 8: Clinical Vitals & Structured Case Taking (`[x] COMPLETED`)
- [x] **Task 8.1**: Universal Patient Vitals
  - Migration for `patient_vitals` (BP Systolic/Diastolic, Pulse, Temp, Weight, Height, auto-calculated BMI, SpO2, Blood Sugar RBS/FBS).
  - Model `PatientVital` with BMI and BP category accessors.
  - Vitals tracker card in `Visits/Create.jsx` and `Visits/Edit.jsx` with real-time BMI and BP classification.
  - Vitals summary in `Visits/Show.jsx` and longitudinal history table in `Patients/Show.jsx`.
  - Professional vitals banner rendered in prescription PDF (`prescription.blade.php`).
- [x] **Task 8.2**: Homeopathic Structured Physical Generals
  - Migration adding `physical_generals` JSON column to `visits`.
  - Interactive case taking component `PhysicalGeneralsCard.jsx` with Thermal reaction (Chilly/Hot/Ambithermal), Thirst, Food Cravings chips, Food Aversions chips, Tongue, Sweat, Sleep & Dreams, and Modalities (`<` Aggravation / `>` Amelioration).
  - Physical generals rendered in `Visits/Show.jsx` and prescription PDF.
- [x] **Verification**: All 3 feature tests in `ClinicalVitalsAndCaseTakingTest` passing (38 assertions).

### Phase 9: Diagnostic Attachments & Printable OPD Cards (`[x] DONE`)
- [x] **Task 9.1**: Patient Photo Webcam Capture & Upload
  - Migration adding `photo_path` to `patients` table.
  - Browser HTML5 webcam capture component (`WebcamCaptureModal.jsx`) using `navigator.mediaDevices.getUserMedia` with fallback image file picker.
  - Automatic base64 decoding and storage to `storage/app/public/patients/photos/`.
  - Display avatars across `Patients/Index.jsx`, `Patients/Show.jsx`, `Patients/Edit.jsx`, and `Visits/Create.jsx`.
- [x] **Task 9.2**: Medical Reports & Diagnostic File Upload
  - Migration creating `patient_attachments` table with foreign keys, category, file metadata, and indexes.
  - Model `PatientAttachment` and FormRequest `StorePatientAttachmentRequest`.
  - Controller `PatientAttachmentController` with secure inline viewing (`show`), downloading (`download`), and deletion (`destroy`).
  - Diagnostic reports card in `Patients/Show.jsx` with category tags (Blood Test, X-Ray, USG, MRI, Prescription, Other) and quick upload modal.
- [x] **Task 9.3**: Printable OPD / Patient ID Card
  - Zero-dependency pure PHP SVG Barcode Generator (`BarcodeService`) generating standard Code 128 (Set B) barcodes.
  - Dedicated route `/admin/patients/{patient}/opd-card` with browser print layout (`OpdCard.jsx`) and DomPDF export (`?format=pdf` using `resources/views/pdf/opd_card.blade.php`).
- [x] **Verification**: All 7 feature tests in `PatientAttachmentsAndOpdCardTest` passing (46 assertions). Full regression suite (20 tests, 158 assertions) passing.

### Phase 10: Dual Pharmacy Inventory & Auto-Deduction Engine (`[x] DONE`)
- [x] **Task 10.1**: Stock Management for Homeo Potencies & Allopathic Drugs
  - Migrations `medicine_batches` and `stock_transactions`, with `auto_deduct_inventory` setting.
  - Eloquent models `MedicineBatch`, `StockTransaction`, and `InventoryService` handling intake, adjustment, and deduction.
  - Full UI: `Admin/Inventory/Index.jsx`, `Create.jsx`, `Edit.jsx`, and `Transactions.jsx` (Stock Ledger).
  - Polymorphic `SearchableCombobox` with live substring search, keyboard navigation, clear buttons, and direct `+ Add Remedy` / `+ Add Drug` modal links.
  - Smart auto-fill for potency, preparation form, strength, and manufacturer upon selecting remedy or drug.
  - Pre-seeded 45 classical homeopathic polychrests and acute remedies via `MedicineSeeder`.
- [x] **Task 10.2**: Expiry & Low-Stock Alerts
  - Real-time stock status calculations: low-stock (`current_quantity <= reorder_level`), expiring soon (within 30 days), and expired stock.
  - Prominent alert banner on Admin Dashboard linking directly to filtered views (`status=low_stock`, `status=expiring`).
- [x] **Task 10.3**: Prescription Auto-Deduction
  - Toggle setting on Clinic Settings: `auto_deduct_inventory`.
  - Atomic FIFO auto-deduction hook during visit prescription finalization in `VisitController::finalize()`.
- [x] **Verification**: All 9 feature tests in `DualPharmacyInventoryTest` passing (61 assertions). Full regression suite (29 tests, 219 assertions) passing. Pint formatted cleanly and Vite build succeeded.

### Phase 11: Billing, Invoicing & Cash Register (`[x] DONE`)
- [x] **Task 11.1**: Patient Invoice Generation (Consultation fees + Medicines + Tests)
  - Database schema: `invoices` and `invoice_items` with sequential numbering (`INV-YYYYMM-XXXX`).
  - Automated line items pre-population from clinical visits in `BillingService::buildItemsFromVisit()`.
  - Full React UI: `Admin/Billing/Index.jsx`, `Create.jsx`, `Show.jsx`, and `Edit.jsx`.
- [x] **Task 11.2**: Multi-Channel Payment Recording (Cash, bKash, Nagad, Rocket, Card, Bank)
  - `payments` table and `Payment` model with receipt numbers (`PAY-YYYYMM-XXXX`).
  - Partial payments, downpayments, and full payment recording with instant balance due recalculation.
- [x] **Task 11.3**: Thermal 80mm & A5 Printable Receipts
  - Dual printable view in `Admin/Billing/Print.jsx` supporting Standard A4/A5 medical invoices and compact 80mm POS slip format.
- [x] **Task 11.4**: Daily Cash Register Reconciliation Report
  - Dedicated financial dashboard `Admin/Billing/CashRegister.jsx`.
  - Date filtering (Today, Yesterday, Last 7 Days, Month, Custom).
  - Breakdown by payment method (Cash, bKash, Nagad, Card, Bank) and revenue by department (Consultation, Pharmacy, Pathology/Imaging).
- [x] **Verification**: All 7 feature tests in `PatientBillingAndCashRegisterTest` passing (92 assertions). Full regression suite (36 tests, 311 assertions) passing. Pint formatted cleanly and Vite build succeeded.

### Phase 12: Queue Management & Doctor Schedule Calendar (`[x] DONE`)
- [x] **Task 12.1**: Doctor Visual Calendar & Working Shifts
  - Database schema: `doctor_schedules` (weekly shifts by day of week, hours, chamber, max tokens) and `doctor_leaves` (off-days & holidays).
  - Models `DoctorSchedule` and `DoctorLeave` with full relationship bindings.
  - Interactive monthly visual calendar `Admin/Calendar/Index.jsx` rendering appointments, clinical visits, and doctor leaves with day-detail inspector.
  - Doctor shift & chamber configuration management in `Admin/Calendar/Schedules.jsx`.
- [x] **Task 12.2**: Waiting Room Live TV Queue & Doctor Chamber Controller
  - Database schema: `patient_queue_tokens` supporting daily sequential codes (`T-001`, `T-002`), priority levels (Normal / Urgent), and lifecycle statuses (`waiting`, `calling`, `in_consultation`, `completed`, `skipped`, `cancelled`).
  - Fullscreen waiting room digital signage TV view `Admin/Queue/Display.jsx` (`/queue/display`) featuring real-time calling hero card, patient name privacy masking (`maskName()`), digital clock, offline Web Audio API synthesized hospital chime ("Ding-Dong"), and optional speech synthesis.
  - Dedicated doctor chamber queue workbench `Admin/Queue/Workbench.jsx` for desktop/tablet with 1-click calling, recall, and direct visit creation.
  - Reception queue manager `Admin/Queue/Index.jsx`, token issuance `Admin/Queue/Create.jsx`, and thermal 80mm POS token slip `Admin/Queue/PrintToken.jsx`.
- [x] **Verification**: All 9 feature tests in `QueueManagementAndCalendarTest` passing (53 assertions). Core regression suite (31 tests, 251 assertions) passing. Pint formatted cleanly and Vite build succeeded.

### Phase 13: Automated Patient Communications (`[x] COMPLETED`)
- [x] **Task 13.1**: Multi-Driver SMS Gateway Engine
  - Driver-based service `CommunicationService` supporting `log` (zero cost offline development), `greenweb` (Bangladesh), `mimsms` (Bangladesh), and `generic_http` (custom REST endpoints).
  - Encapsulated phone number sanitization for Bangladesh numbers (`01XXXXXXXXX` to `8801XXXXXXXXX`).
  - Automated triggers on appointment scheduled, queue token issued, and prescription ready.
- [x] **Task 13.2**: WhatsApp Digital Prescription Click-to-Chat Sharing
  - Pre-filled bilingual WhatsApp message generator (`generateWhatsAppShareUrl()`) with direct link to verified digital prescription.
  - One-click "WhatsApp Share" action in clinical consultation workbench and visit show page.
- [x] **Task 13.3**: Tokenized Public Digital Prescription Viewer & PDF Download
  - Migration adding 32-character unique `share_token` to `visits`.
  - Public mobile-responsive view `/rx/{share_token}` and on-demand PDF stream `/rx/{share_token}/pdf` for patients without requiring system login.
- [x] **Task 13.4**: Communication Audit Ledger & Notification Center
  - Database schema: `patient_notifications` with channel (`sms`, `whatsapp`), recipient phone, event type, message body, gateway provider, and status (`sent`, `failed`).
  - Notification center UI `Admin/Communications/Index.jsx` with volume metrics, quick filter toolbar, and custom direct SMS modal.
- [x] **Task 13.5**: SMS Gateway & Template Settings
  - Dedicated configuration UI `Admin/Communications/Settings.jsx` to toggle SMS, choose gateway providers, configure credentials/masking, and customize message templates with dynamic placeholders (`{patient_name}`, `{doctor_name}`, `{clinic_name}`, `{date}`, `{token_code}`, `{prescription_url}`).
- [x] **Verification**: All 9 feature tests in `AutomatedPatientCommunicationsTest` passing (77 assertions). Full regression suite (54 tests, 416 assertions) passing. Pint formatted cleanly and Vite build succeeded.

### Phase 14: Section-Wise Patient Form Configuration & Storage Backup Guidance (`[x] COMPLETED`)
- [x] **Task 14.1**: Section-Level Patient Configuration Engine
  - Added `defaultPatientFormSections()`, `currentPatientFormSections()`, and `getPatientFormSections()` in `ClinicSetting.php`.
  - Added validation rules for `sections` array in `UpdatePatientFormConfigRequest.php`.
  - Section re-ordering (`â†‘` / `â†“`), master section visibility toggling (`visible: false`), and custom title customization in `Admin/PatientConfig/Edit.jsx`.
  - Enforced clinical core safety invariant preventing deactivation of the core `Identity` section (`is_core: true`).
- [x] **Task 14.2**: Dynamic Section Rendering in Patient Forms
  - Updated `Patients/Create.jsx` and `Patients/Edit.jsx` to dynamically respect section orders (`style={{ order: getSectionOrder(...) }}`) and section visibility (`isSectionVisible(...)`).
  - Skipping non-core field validation when containing section is toggled inactive in `PatientDataRequest.php`.
- [x] **Task 14.3**: System Health Operations & Storage Clarification
  - Documented cPanel private storage architecture: clarified ~141 MB / ~26,000 files in private storage as in-app Git deployment checkout repository (`storage/app/private/git-repository/source`).
  - Added cPanel guidance in `SystemHealth.jsx` for setting `SYSTEM_HEALTH_BACKUP_PATH` outside `public_html` to prevent `Check permissions` warnings.
- [x] **Verification**: All 20 tests in `PatientFormConfigurationTest` and all 128 tests across Patient and System Health suites passing (1,181 assertions). Pint formatted and Vite build completed.

### Phase 15: Visit Consultation Workflow Hardening & Medical Field Ordering (`[x] COMPLETED`)
- [x] **Task 15.1**: Consultation Patient Disambiguation & Queue Integration
  - Integrated today's waiting queue tokens quick-picker ribbon (`todayWaitingQueueTokens`) in `Admin/Visits/Create.jsx` for 1-click patient loading.
  - Enhanced patient search combobox with avatar/photo, Old/Other ID badge, age, gender, and guardian details for safe disambiguation while preserving search privacy boundaries.
- [x] **Task 15.2**: Inline Clinical Medical History Quick-Update & Diagnosis Sync
  - Added modal `<QuickMedicalHistoryModal>` and backend endpoint `POST /admin/patients/{patient}/quick-medical-update` (`patients.quick_medical_update`) to allow doctors to update permanent medical history, allergies, and blood group inline during consultation without page reload.
  - Added `sync_diagnosis_to_medical_history` checkbox on consultation finalization to automatically append final diagnosis to patient permanent medical history.
  - Added `redirect_to: 'show'` support on `admin.visits.finalize` to navigate directly to the finalized visit digital prescription view (`admin.visits.show`).
- [x] **Task 15.3**: Medical Background Field Grid Ordering Fix
  - Unified `blood_group`, `known_allergies`, and `medical_history` into a shared CSS grid container in `Patients/Create.jsx` and `Patients/Edit.jsx` so that individual field ordering (`style={{ order: field(...).order }}`) strictly takes effect when `medical_history` is moved ahead of blood group or allergies.
- [x] **Verification**: All 5 feature tests in `VisitConsultationWorkflowTest` and all 64 related visit integrity, authorization, case taking, and configuration tests passing (431 assertions). Pint formatted and Vite build completed.

### Phase 16: Dynamic Clinic Branding & Language-Wise Page Title (`[x] COMPLETED`)
- [x] **Task 16.1**: Backend Clinic Branding & Language Provider
  - Updated `HandleInertiaRequests.php` to share `locale` and dynamic `clinic.name` based on active locale (`clinic_name_bn` for Bengali, `clinic_name_en` for English).
  - Updated `resources/views/app.blade.php` to dynamically generate server-rendered `<title inertia>` using `ClinicSetting` according to active locale.
  - Updated `config/app.php` fallback app name from `Laravel` to `RemediQ Clinic`.
- [x] **Task 16.2**: Dynamic Frontend Page Title Resolution
  - Updated `resources/js/app.jsx` title callback to resolve clinic branding language-wise (`resolveClinicName(title)`), eliminating the `- Laravel` fallback across all pages.
  - Updated `AuthenticatedLayout.jsx` sidebar branding to dynamically display the configured clinic name and logo rather than static text.
  - Added a 1-click Language Switcher toggle (`à¦¬à¦¾à¦‚` / `EN`) in the admin topbar.
- [x] **Verification**: Added `ClinicBrandingAndLanguageTitleTest` (3 tests, 68 assertions) covering English/Bangla titles, setting updates, and server-rendered HTML tags. All 50 related tests passing. Pint formatted and Vite build completed.

### Phase 17: Mobile Camera Native Capture & Insecure Context Hardening (`[x] COMPLETED`)
- [x] **Task 17.1**: Native HTML5 Mobile Camera Integration
  - Added dedicated `Take Photo (Mobile Camera)` input with `capture="environment"` and `accept="image/*"` in `Patients/Create.jsx` and `Patients/Edit.jsx`.
  - Enables direct one-tap opening of the smartphone's native camera app on Android and iOS over both plain HTTP and HTTPS without triggering browser WebRTC permission restrictions.
- [x] **Task 17.2**: WebRTC Modal Insecure Context & Multi-Camera Hardening
  - Updated `WebcamCaptureModal.jsx` with `window.isSecureContext` detection to identify non-SSL / HTTP origins (such as `8-119-134.cpanel.site`) cleanly.
  - Added facing-mode selection defaulting to rear camera (`environment`) on mobile devices.
  - Added `ðŸ”„ Flip Camera` button (`Rear Cam` / `Front Cam`) in the live viewfinder overlay.
  - Added progressive constraint fallback from 1280x720 ideal constraints to basic video constraint.
  - Upgraded modal fallback UI with a primary `ðŸ“¸ Snap with Mobile Camera` action button.
- [x] **Task 17.3**: Automated Feature Verification & Testing
  - Added `test_user_can_store_and_update_patient_with_mobile_camera_photo_upload()` in `PatientAttachmentsAndOpdCardTest.php` testing high-resolution mobile camera snaps (`image/jpeg`), storage persistence, URL generation, and automatic old photo cleanup upon update.
- [x] **Verification**: All 11 tests in `PatientAttachmentsAndOpdCardTest` and related test suites passing (130 assertions). Pint formatted and Vite build completed.

### Phase 18: In-App Git Deployment Cryptographic Checksum Audit & Migration Workflow Hardening (`[x] COMPLETED`)
- [x] **Task 18.1**: Cryptographic Migration Audit Manifest Registration
  - Audited all 92 migrations in `database/migrations/` and registered the SHA-256 signatures for `2026_11_25_001500_add_medical_history_to_patients_table.php` and `2026_11_25_004500_add_migration_fields_to_patients_table.php` in `deploy/cpanel/reviewed-migrations.sha256`.
  - Resolved `New migration needs review` cPanel deployment stop.
- [x] **Task 18.2**: Explicit Migration Allowance on Deployment Pull
  - Updated `GitRepositoryController::pull` and `GitRepositoryService::pull` to accept optional `run_migrations` parameter and pass `CLINIC_DEPLOY_ALLOW_MIGRATIONS=1` during split deployments when approved by the operator.
  - Enhanced `incomingChangesAreSafe` to report clear actionable notices when pending migrations require operator review.
- [x] **Task 18.3**: Deployment Step 03 UI & Confirmation Prompts
  - Added inline `[x] Run database migrations with this update` toggle in Step 03 of `GitRepository.jsx` when migrations are disabled in settings.
  - Enhanced deployment confirmation alert dialog to specify migration status.
- [x] **Verification**: Added `test_pull_is_rejected_in_automated_tests_with_or_without_migration_flag` in `GitRepositoryTest.php`. All 30 tests in `GitRepositoryTest` and `DatabaseMigrationManagementTest` passing (199 assertions). Pint formatted and Vite build completed.

### Phase 19: Mobile Responsive Patient Directory & Multi-Screen Card Transformation (`[x] COMPLETED`)
- [x] **Task 19.1**: Responsive Multi-Screen Patient Architecture
  - Transformed `/admin/patients` to support dual-mode presentation: high-density touch cards on mobile screens (< 768px / 320px-480px width) and full data table on desktop/tablet screens (>= 768px).
  - Upgraded `DataTable.jsx` with `tableClassName` prop and default `min-w-[650px]` horizontal scrolling container to prevent column crushing on narrow screens across all system tables.
- [x] **Task 19.2**: High-Density Mobile Patient Cards
  - Created touch-optimized patient card rendering avatar (photo or initial), name, blood group badge, guardian relationship & name, age & gender, patient ID badge, and old/other ID badge.
  - Built compact info strip displaying 1-tap call & WhatsApp chat, visit count badge, last attendance date, and today's live queue token status badge.
  - Built two-row thumb-friendly quick action button grid: Row 1 (`+ Queue`, `+ Visit`, `OPD Card`), Row 2 (`View`, `Edit`, `Delete`).
- [x] **Task 19.3**: Responsive Topbar, KPI Grid & Action Controls
  - Refined KPI summary card grid to `grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5` with compact mobile padding (`p-2.5 sm:p-3.5`) and icons.
  - Refined PageHeader actions (`Export CSV` and `+ New Patient`) with full-width responsive flex stacking on mobile.
  - Cleaned up topbar navigation in `AuthenticatedLayout.jsx` by hiding `View Website` link on mobile/tablets (`hidden lg:flex`).
- [x] **Verification**: Tested against Patient test suites (`PatientFeatureTest`, `PatientAttachmentsAndOpdCardTest`), Vite asset compilation (`npm run build`) succeeded in 1.81s, Pint formatting confirmed clean. All 38 tests passing (261 assertions).

### Phase 20: Clinical Visits Directory & Consultation Log Overhaul (`[x] COMPLETED`)
- [x] **Task 20.1**: Backend Scopes, Relationships & Optimized Eager Loading
  - Added `invoice(): HasOne` relationship in `Visit.php`.
  - Overhauled `VisitController::index` with unified multi-field search (patient name, phone, patient number, series, old ID, diagnosis, complaints), date filters (Today, Yesterday, This Week, This Month, custom date range), doctor filters (with "My Consultations" toggle), and status filters.
  - Implemented executive KPI metrics calculation (`total_visits`, `visits_today`, `finalized_visits`, `draft_visits`).
  - Implemented streaming CSV export endpoint `admin.visits.export` respecting all active search/date/doctor filters.
- [x] **Task 20.2**: Desktop Data Table & Clinical Diagnosis Presentation
  - Redesigned `resources/js/Pages/Admin/Visits/Index.jsx` with 4 KPI summary cards.
  - Added Search & Filter form with single unified search bar, date presets (`Today`, `This Week`, `This Month`), collapsible filters tray, and reset toggle.
  - Added Clinical Diagnosis & Chief Complaints column, Prescribed Remedy/Drug counts, Vitals preview, and dynamic Billing Status badge (`âœ“ Paid`, `âš  Due`, `+ Create Bill`).
  - Replaced hardcoded doctor name fallback (`v.doctor?.name ?? 'Dr. Fazlul Karim'`) with dynamic settings fallback.
  - Added 1-click WhatsApp share action, direct PDF view/print, and 1-click POS invoice generation bridge (`/admin/billing/invoices/create?visit_id=X`).
- [x] **Task 20.3**: Mobile Responsive Touch Card Architecture
  - Implemented dual-mode presentation: high-density mobile consultation cards (`block md:hidden`) and structured table (`hidden md:block`).
  - Mobile cards display patient avatar, age, gender, diagnosis, vitals, prescribed items count, 1-tap call & WhatsApp links, billing badge, and touch action buttons.
- [x] **Verification**: Added 5 comprehensive feature tests in `VisitsDirectoryFeatureTest.php` covering search, date/doctor/status filters, CSV export, and clinical authorization boundaries (111 assertions). Pint formatted and Vite build verified (all 87 visit tests passing).

### Phase 21: Waiting Room Queue Multi-Screen Optimization & Search Upgrade (`[x] COMPLETED`)
- [x] **Task 21.1**: Upgraded Unified Smart Search & Query Optimization
  - Upgraded `QueueController::index` search query to match `token_code`, numeric `token_number` (`4`, `#4`), `patient_name`, `patient_phone`, `service_room`, and eager-loaded `patient` (`name`, `phone`, `patient_no`, `patient_code`, `patient_series`, `old_or_other_id`, `guardian_name`) and `doctor` (`name`, `name_bn`).
  - Eager-loaded `patient:id,name,phone,patient_no,patient_series,patient_code,old_or_other_id,photo_path,gender,age_years` to supply avatars, identifiers, and demographic summaries.
- [x] **Task 21.2**: Desktop & Tablet Dashboard Experience
  - Implemented debounced search input (350ms) with dedicated `Search` button, Enter key trigger, and instant `Reset Filters` button.
  - Added live queue auto-refresh toggle (15s / 30s / Off) with visual countdown pill and 1-click `ðŸ”„ Refresh Queue` action (`router.reload`).
  - Added 1-click **`+ Start Visit`** direct consultation launcher (`/admin/visits/create?patient_id=X&token_id=Y`) for calling and in-consultation tokens.
  - Fixed `patient_identifier` display bug (using `patient_identifier` or `patient_code` with Old ID badge).
  - Added 1-tap phone dialer (`tel:`) and direct WhatsApp alert links for calling/waiting patients.
  - Wrapped desktop table in `min-w-[850px]` container to protect tablet screens from column crushing.
- [x] **Task 21.3**: Mobile Responsive Touch Card Architecture
  - Implemented dual-mode presentation: high-density mobile queue cards (`block md:hidden`) and structured table (`hidden md:block`).
  - Refined mobile counter banner to a compact 3-column / 2-row grid to reduce vertical scroll distance by 50%.
  - Touch-friendly mobile cards displaying token number badge (`T-004`), patient avatar, patient name, priority pill (`Urgent`), status badge, doctor & chamber, issued/called time, phone with 1-tap call & WhatsApp, and thumb-friendly action buttons.
- [x] **Task 21.4**: Verification & Testing
  - Added feature tests in `QueueManagementAndCalendarTest.php` verifying patient code search, old ID search, numeric token search, and doctor search (13 tests, 147 assertions passing). Pint formatted and Vite build verified.

### Phase 22: Queue Token Issuance Workflow, Live Search & Multi-Screen Views (`[x] COMPLETED`)
- [x] **Task 22.1**: Runtime Bug Fix & Search Parameter Upgrade
  - Resolved Temporal Dead Zone ReferenceError in `Create.jsx` (`activeTokenToday` accessed before `useForm`).
  - Upgraded `QueueController::create` to accept `search` / `q` parameters, query matching `name`, `phone`, `patient_no`, `patient_code`, `old_or_other_id`, and ensure `$selectedPatient` is always included in the patient list.
  - Implemented debounced async patient autocomplete / live combobox leveraging `/admin/patients/search?q=...` with OPD card barcode scan support.
- [x] **Task 22.2**: Patient Demographics Verification Card & Conflict Actions
  - Displayed rich Patient Demographics Verification Card upon patient selection (photo/avatar, `A-2026-000004`, `3391-A`, father/guardian, age/gender, phone, blood group, last visit date, total visits).
  - Upgraded active duplicate token conflict alert with interactive actions (`[Reprint Slip]`, `[View in Queue]`) and `[ ] Confirm & Issue Additional Token` confirmation gate.
  - Calculated real-time doctor queue load counts (e.g. `2 waiting today`) and auto-selected chamber based on today's active schedule.
- [x] **Task 22.3**: Multi-Screen Responsive Layout & POS Slip Print Workflow
  - Refactored to adaptive 2-column desktop layout (Left: Patient Search & Demographics; Right: Doctor, Chamber, Priority & Print Options).
  - Optimized mobile phone layout (<768px) with tactile touch pills for Patient Type and Priority, compact card spacing, and full-width stacked actions.
  - Supported automatic 80mm POS slip redirection and print window on token issue, added "+ Issue Next" button on print screen, plus secondary fast-track `[+ Issue & Start Consultation]` action.
- [x] **Task 22.4**: Verification & Testing
  - Added feature tests in `QueueManagementAndCalendarTest.php` covering token issuance search parameters, duplicate token guard, print slip redirection, and doctor load calculation (12 tests, 91 assertions passing). Pint formatting and Vite build verified.

### Phase 23: Doctor Visual Calendar, Multi-Screen Agenda & Search Upgrade (`[x] COMPLETED - Merged into Phase 44`)
- [x] **Task 23.1**: Backend Multi-Factor Search & Shift Roster Aggregation (Completed in Phase 44)
- [x] **Task 23.2**: Desktop & Tablet Calendar Experience (Completed in Phase 44)
- [x] **Task 23.3**: Mobile Responsive Agenda Timeline View (Completed in Phase 44)
- [x] **Task 23.4**: Verification & Testing (Completed in Phase 44)

### Phase 24: Doctor Visiting Schedules, Chamber Roster & Leave Range Upgrade (`[x] COMPLETED - Merged into Phase 43`)
- [x] **Task 24.1**: Backend Leave Date Range Support & Conflict Detection (Completed in Phase 43)
- [x] **Task 24.2**: Schedule Copy Accelerator & Chamber Management (Completed in Phase 43)
- [x] **Task 24.3**: Mobile Sub-Tab Navigation & Responsive UI (Completed in Phase 43)
- [x] **Task 24.4**: Verification & Testing (Completed in Phase 43)

### Phase 26: Invoices Directory Search, Quick Due Payment & Multi-Screen Transformation (`/admin/invoices`) (`[x] COMPLETED - Merged into Phase 55`)
- [x] **Task 26.1**: Backend Multi-Column Smart Search, Quick Date Presets & CSV Export (Completed in Phase 55)
- [x] **Task 26.2**: Desktop & Tablet Experience (Completed in Phase 55)
- [x] **Task 26.3**: Mobile Responsive Touch Cards (Completed in Phase 55)
- [x] **Task 26.4**: Verification & Testing (Completed in Phase 55)

### Phase 27: Point-of-Sale (POS) Invoice Creation & Cashier Checkout (`/admin/invoices/create`) (`[x] COMPLETED - Merged into Phase 56`)
- [x] **Task 27.1**: Backend Pharmacy Catalog & Inventory Search Endpoint (Completed in Phase 56)
- [x] **Task 27.2**: Frontend POS Terminal Transformation (Completed in Phase 56)
- [x] **Task 27.3**: Mobile Responsive Touch POS Layout (Completed in Phase 56)
- [x] **Task 27.4**: Verification & Testing (Completed in Phase 56)

### Phase 28: Communication Settings, Gateway Balance Check & Template Studio Upgrade (`/admin/communications/settings`) (`[x] COMPLETED - Merged into Phase 58`)
- [x] **Task 28.1**: Backend Live Gateway Diagnostics & Balance Check Endpoints (Completed in Phase 58)
- [x] **Task 28.2**: Frontend Template Studio & Live Counter Transformation (Completed in Phase 58)
- [x] **Task 28.3**: Mobile Responsive Studio Layout (Completed in Phase 58)
- [x] **Task 28.4**: Verification & Testing (Completed in Phase 58)

### Phase 29: Clinical, Financial & Operational Analytics Reports Suite (`/admin/reports`) (`[x] COMPLETED - Merged into Phase 57`)
- [x] **Task 29.1**: Backend Multi-Dimensional Analytics Aggregation & Search (Completed in Phase 57)
- [x] **Task 29.2**: Frontend Analytical Studio & Multi-Tab Dashboard (Completed in Phase 57)
- [x] **Task 29.3**: Mobile Responsive Analytics Layout (Completed in Phase 57)
- [x] **Task 29.4**: Verification & Testing (Completed in Phase 57)

### Phase 30: Homeopathic Medicine Catalog, Pharmacopoeia Search & Batch Inventory Integration (`/admin/medicines`) (`[x] COMPLETED - Merged into Phase 53`)
- [x] **Task 30.1**: Backend Multi-Nomenclature Search & Inventory Aggregation (Completed in Phase 53)
- [x] **Task 30.2**: Frontend Clinical Pharmacopoeia Studio & Filter Pill Strip (Completed in Phase 53)
- [x] **Task 30.3**: Mobile Responsive Pharmacopoeia Touch Cards (Completed in Phase 53)
- [x] **Task 30.4**: Verification & Testing (Completed in Phase 53)

### Phase 31: Allopathic Pharmaceuticals Catalog, Multi-Parameter Search & Batch Inventory Integration (`/admin/pharmaceuticals`) (`[x] COMPLETED`)
- [x] **Task 31.1**: Backend Multi-Parameter Search, Strength Matching & Inventory Aggregation
  - Upgrade `PharmaceuticalController::index` to support multi-column search (`search` / `q`) matching simultaneously across `brand_name`, `generic_name`, `strength`, and `manufacturer`.
  - Implement dosage form filtering (`dosage_form`), status filter (`status`: `active`, `inactive`, `all`), and stock level filter (`stock_status`: `in_stock`, `low_stock`, `out_of_stock`).
  - Add `batches()` relationship on `Pharmaceutical` and calculate aggregate physical stock quantity across active `medicine_batches` (`item_type = 'pharmaceutical'`) using `withSum(['batches as total_batch_stock' => fn ($q) => $q->active()], 'current_quantity')`.
  - Add configurable pagination (`per_page`: 15, 25, 50, 100) and preserve alphabetical sorting by brand name.
  - Add CSV export endpoint (`GET /admin/pharmaceuticals/export`) streaming all registered pharmaceutical drugs, generics, strengths, manufacturers, and active inventory stock counts.
- [x] **Task 31.2**: Data Loss Prevention & Cascade Deletion Hardening
  - Upgrade `PharmaceuticalController::destroy` to perform safe reversible deactivation (`is_active = false`), preventing accidental cascading deletion of historical batch inventory in `medicine_batches`.
  - Block hard deletion if active batches or prescription items are linked.
- [x] **Task 31.3**: Frontend Clinical Formulary Studio & Dosage Form Pill Strip
  - Implement 300ms debounced search bar with instant reset button (`âœ•`).
  - Add 1-click horizontal dosage form pill strip: `[ All Forms ]`, `[ Tablet ðŸ’Š ]`, `[ Capsule ðŸ’Š ]`, `[ Syrup ðŸ§ª ]`, `[ Suspension ðŸ§ª ]`, `[ Injection ðŸ’‰ ]`, `[ Drops ðŸ§´ ]`, `[ Inhaler / Ointment ðŸ§´ ]`.
  - Add live inventory stock badge (`In Stock: XX`, `Low Stock: XX`, `Out of Stock`) with a direct 1-click shortcut to `/admin/inventory?search={brand_name}` for rapid stock replenishment.
  - Update confirmation dialog to accurately reflect safe status deactivation rather than permanent deletion.
- [x] **Task 31.4**: Mobile Responsive Formulary Touch Cards
  - Implement high-density mobile touch cards (`block md:hidden`) featuring brand name + strength title, generic formulation subtitle, dosage form pill with icon, manufacturer tag, real-time batch stock badge, and 44px+ touch-friendly actions.
- [x] **Task 31.5**: Verification & Testing
  - Add feature test suite `tests/Feature/PharmaceuticalCatalogTest.php` verifying multi-parameter search, strength matching, dosage form filtering, batch stock aggregation, safe deactivation, and mobile touch cards.
  - Run Pint code formatting and build Vite production assets.

### Phase 32: Allopathic Pharmaceutical Drug Creation, Header Action Fix & Atomic Inventory Intake (`/admin/pharmaceuticals/create`) (`[x] COMPLETED`)
- [x] **Task 32.1**: Header Navigation Prop Bug Fix & Direct Action Restoration
  - Correct `action` -> `actions` and `description` -> `subtitle` prop mismatch in `resources/js/Pages/Admin/Pharmaceuticals/Index.jsx` so the `+ Add Pharmaceutical Drug` button renders immediately.
- [x] **Task 32.2**: Backend Validation & Atomic Batch Receiving Support
  - Expand `StorePharmaceuticalRequest` to validate expanded dosage forms (`Gel`, `Lotion`, `Eye Drops`, `Ear Drops`, `Nasal Spray`, `Powder / Sachet`, `IV Infusion`).
  - Add support for optional opening batch creation (`initial_batch`: `batch_number`, `expiry_date`, `purchase_price`, `selling_price`, `initial_quantity`).
  - Upgrade `PharmaceuticalController::store` with database transaction to atomically create drug master and opening `MedicineBatch` when requested.
- [x] **Task 32.3**: Frontend Intake Studio & Mobile Ergonomics
  - Add quick-select chips for common strengths (`500mg`, `650mg`, `20mg`, `40mg`, `100ml`) and leading manufacturers (`Square`, `Beximco`, `Incepta`, `Renata`, `ACI`, `Opsonin`).
  - Add collapsible `[ ] Receive Opening Batch Now` intake section.
  - Add real-time duplicate drug combination warning.
- [x] **Task 32.4**: Verification & Testing
  - Add feature tests in `tests/Feature/PharmaceuticalCatalogTest.php` covering drug creation, opening batch creation, and validation rules.
  - Run Pint code formatting and build Vite production assets.

### Phase 33: Pharmacy Multi-Batch Inventory, FEFO Sorting & Mobile Workstation (`/admin/inventory`) (`[x] COMPLETED - Merged into Phase 54`)
- [x] **Task 33.1**: Backend Multi-Attribute Search, FEFO Sorting & Stocktake CSV Export (Completed in Phase 54)
- [x] **Task 33.2**: Audit Protection & Cascade Deletion Hardening (Completed in Phase 54)
- [x] **Task 33.3**: Frontend Workstation & FEFO Sort Controls (Completed in Phase 54)
- [x] **Task 33.4**: Mobile Responsive Inventory Batch Touch Cards (Completed in Phase 54)
- [x] **Task 33.5**: Verification & Testing (Completed in Phase 54)

### Phase 34: Pharmaceutical & Remedy Manufacturer Master Management (`/admin/manufacturers`) (`[x] COMPLETED`)
- [x] **Task 34.1**: Database Schema & Eloquent Architecture
  - Create `manufacturers` database table with fields: `name` (unique), `short_name`, `name_bn`, `type` (`allopathic`, `homeopathic`, `dual`, `surgical`), `contact_person` (MR name), `phone`, `email`, `address`, `website`, `notes`, `is_active`.
  - Create `Manufacturer` Eloquent model with local scopes: `active()`, `type()`, `search()` and `display_name` accessor.
  - Create and assign `manufacturers.*` permissions (`view`, `create`, `update`, `delete`) to Super Admin and Doctor roles.
- [x] **Task 34.2**: Backend Form Requests, Controller & Search API
  - Create dedicated `StoreManufacturerRequest` and `UpdateManufacturerRequest` validating company identity and unique constraint.
  - Implement `ManufacturerController` with `index`, `create`, `store`, `edit`, `update`, `destroy` (safe deactivation), and `search` JSON API endpoint.
  - Register RESTful and search routes under `routes/admin.php`.
- [x] **Task 34.3**: Frontend Directory, Responsive Workstation & Mobile Touch Cards (`/admin/manufacturers`)
  - Implement `resources/js/Pages/Admin/Manufacturers/Index.jsx` with KPI tiles, 300ms debounced search, category filter pills (`All`, `Allopathy ðŸ’Š`, `Homeopathy ðŸŒ¿`, `Dual ðŸ¥`, `Surgical ðŸ©º`), desktop DataTable, and mobile touch cards (`block md:hidden`).
  - Add click-to-call `tel:` MR links and deactivation modal.
- [x] **Task 34.4**: Frontend Entry & Edit Studios (`Create.jsx` & `Edit.jsx`)
  - Create `resources/js/Pages/Admin/Manufacturers/Create.jsx` with 1-click Bangladeshi & international presets (`Square`, `Beximco`, `Incepta`, `Renata`, `Schwabe Germany`, `SBL India`, `Dr. Reckeweg`).
  - Create `resources/js/Pages/Admin/Manufacturers/Edit.jsx` with full company profile editing.
- [x] **Task 34.5**: Cross-Module Integration with Drug Formulary (`/admin/pharmaceuticals/create` & `Edit.jsx`)
  - Pass registered manufacturers to `PharmaceuticalController@create` and `@edit`.
  - Update `Pharmaceuticals/Create.jsx` and `Edit.jsx` with HTML5 datalist autocomplete, registered manufacturer quick chips, and inline `+ Add New Company` shortcut link.
- [x] **Task 34.6**: Verification, Testing & Asset Compilation
  - Create test suite `tests/Feature/ManufacturerManagementTest.php` (9 tests passed, 86 assertions).
  - Verify zero regressions in `PharmaceuticalCatalogTest` (6 tests passed, 71 assertions) and `DualPharmacyInventoryTest` (9 tests passed, 61 assertions).
  - Format code with Laravel Pint and build Vite production bundle (`npm run build`).
- [x] **Task 34.7**: Cross-Module Integration with Pharmacy Stock Intake (`/admin/inventory/create` & `Edit.jsx`)
  - Pass registered manufacturers to `InventoryController@create` and `@edit`.
  - Upgrade `supplier_name` into a Category-Aware Datalist Combobox dynamically prioritizing homeopathic vs allopathic suppliers based on selected item category.
  - Add quick-select chips and inline `+ Add Company` shortcut link to `/admin/manufacturers/create`.

### Phase 35: Diagnostic Lab Investigations Master Catalog (`/admin/lab-investigations`) (`[x] COMPLETED`)
- [x] **Task 35.1**: Schema & Model Architecture
  - Database table `lab_investigations` with code, name_en, name_bn, category, specimen, standard_fee, turnaround_hours, instructions, is_active.
  - Model `LabInvestigation` with scopes and Spatie activity logging.
  - FormRequests `StoreLabInvestigationRequest` and `UpdateLabInvestigationRequest`.
- [x] **Task 35.2**: Pre-Seeded Diagnostic Catalog
  - Seeded 35 high-yield clinical investigations across Hematology, Biochemistry, Imaging/Radiology, Ultrasound, Urine, and Serology via `LabInvestigationSeeder`.
- [x] **Task 35.3**: Responsive Workstation & Clinical Presets
  - Index view with KPI ribbon, 300ms debounced search, category filter pills, desktop DataTable, and mobile touch cards (`block md:hidden`).
  - Create view with 1-Click Clinical Presets Toolbar (Lipid Profile, Thyroid Panel, Dengue NS1, etc.).
- [x] **Task 35.4**: Automated Verification & Regression Testing
  - Feature test suite `tests/Feature/LabInvestigationManagementTest.php` passing all 10 tests (91 assertions).

### Phase 36: Homeopathic Symptoms & Kent Repertory Rubrics Catalog (`/admin/symptoms`) (`[x] COMPLETED`)
- [x] **Task 36.1**: Database Schema & Clinical Attribute Migration
  - Migration `2026_11_27_182001_add_clinical_attributes_to_symptoms_table.php` adding `code`, `modalities`, and database indexes on `code` and `category`.
  - Hardened `Symptom` model with `medicines()` BelongsToMany, `symptomMedicineMaps()` HasMany, `visits()` BelongsToMany, local query scopes (`search`, `category`, `active`), and Spatie activity logging.
- [x] **Task 36.2**: Kent Repertory Seeders & Clinical Knowledge Graph
  - Created `SymptomSeeder` pre-seeding 50 classical Kent repertory rubrics across 11 chapters (`Mind`, `Head`, `Eyes/ENT`, `Digestion`, `Abdomen/Stool`, `Urinary`, `Respiratory`, `Extremities`, `Skin`, `Fever`, `Generalities`).
  - Created `SymptomMedicineMapSeeder` linking rubrics to top 45 homeopathic polychrests with Grade 1-3 priorities and Kent Repertory citation.
- [x] **Task 36.3**: Form Requests & Controller Hardening
  - Created `StoreSymptomRequest` and `UpdateSymptomRequest` with strict validation for `name_en`, `code`, `name_bn`, `category`, `modalities`, and `is_active`.
  - Upgraded `SymptomController`: eager-loads `withCount('medicines')`, calculates executive KPI metrics, supports debounced multi-field search and chapter filtering, and enforces safe deactivation if linked to visits or remedy mappings.
- [x] **Task 36.4**: Responsive Multi-Screen Workstation & Ergonomics
  - `Symptoms/Index.jsx`: Header KPI ribbon (Total, Active, Mapped, Repertory Chapters), 300ms debounced search with `âœ•`, 1-click Chapter Tab Pills, Mapping Status dropdown, Desktop DataTable with `ðŸ’Š X Meds â†—` link, and Mobile High-Density Touch Cards (`block md:hidden`).
  - `Symptoms/Create.jsx`: RemediQ PageHeader, 1-Click Kent Rubric Presets Toolbar (auto-fills English, Bengali, chapter, modalities), and chapter selector.
  - `Symptoms/Edit.jsx`: Mapped remedies banner with direct link to knowledge graph (`/admin/symptom-medicine-map?symptom_id={id}`), chapter selector, and modalities editor.
- [x] **Task 36.5**: Automated Verification & Regression Testing
  - Created `tests/Feature/SymptomManagementTest.php` with 10 comprehensive tests covering index KPI metrics, search, chapter filters, validation, deactivation safety, and CDSS repertorization suggestions.
  - Verified zero regressions across `SymptomMedicineMapGovernanceTest` and `DoctorDefaultPermissionsTest`.
  - Formatted with Pint and compiled assets with Vite (`npm run build`).

### Phase 37: Homeopathic Repertory Knowledge Graph & Mapping Workstation (`/admin/symptom_medicine_map`) (`[x] COMPLETED`)
- [x] **Task 37.1**: Backend Controller & Local Query Scopes
  - Added query scopes to `SymptomMedicineMap.php`: `scopeSearch`, `scopeFilterStatus`, `scopeFilterPriority`, `scopeFilterChapter`, `scopeFilterSymptom`, `scopeFilterMedicine`.
  - Upgraded `SymptomMedicineMapController::index` with multi-field debounced search, status tabs, grade filtering, chapter filtering, active filter detection, and KPI metrics aggregation (`total`, `approved`, `pending_review`, `draft`, `inactive`).
  - Added pre-selection support on `create()` (`preselectedSymptomId`, `preselectedMedicineId`).
- [x] **Task 37.2**: Responsive Workstation & Filter Controls (`Index.jsx`)
  - Built executive KPI metric ribbon displaying Total References, Active in CDSS, Pending Review, Drafts, and Inactive.
  - Added 300ms debounced search bar with instant clear (`âœ•`) button.
  - Implemented Review status tabs (`All`, `Approved âœ…`, `Pending Review â³`, `Drafts ðŸ“`, `Inactive ðŸš«`) with real-time counter badges.
  - Implemented Kent Chapter and Grade (1â€“4) selector dropdowns.
  - Added active filter dismiss banners for cross-module deep links from `/admin/symptoms` and `/admin/medicines`.
  - Upgraded batch CSV import workstation with collapsible toggle to preserve screen space.
- [x] **Task 37.3**: Multi-Screen Responsive Touch Cards (`Index.jsx`)
  - Implemented high-density mobile touch cards (`block md:hidden`) alongside desktop `DataTable` with rubric/remedy tags, grade stars, source citations, status badges, and 44px+ touch-friendly action buttons (`Review`, `Edit`, `Restore`, `Delete`).
- [x] **Task 37.4**: Creation & Editing Studio Upgrades (`Create.jsx` & `Edit.jsx`)
  - Integrated with RemediQ design system and standard `PageHeader`.
  - Added filterable selectors for symptoms and homeopathic medicines.
  - Added visual Grade 1â€“4 radio selector with clinical descriptions (Ordinary, Moderate, Strong, Keynote).
  - Added 1-Click Classical Literature Presets toolbar (*Kent Repertory*, *Boericke Materia Medica*, *Boger Boenninghausen*, *Allen's Keynotes*).
- [x] **Task 37.5**: Automated Feature Verification & Testing
  - Expanded `SymptomMedicineMapGovernanceTest.php` with 3 new comprehensive tests verifying search, status filtering, deep linking, chapter filtering, and grade filtering.
  - All 16 tests in `SymptomMedicineMapGovernanceTest` passing (205 assertions).
  - All 10 tests in `SymptomManagementTest` passing (119 assertions).
  - Code formatted with Pint (`vendor/bin/pint --dirty --format agent`).
  - Frontend production assets compiled with Vite (`npm run build`).

### Phase 38: Clinical Advice Items & Prescription Instructions Master (`/admin/advice_items`) (`[x] COMPLETED`)
- [x] **Task 38.1**: Database Schema & Migration
  - Migration `2026_11_27_205501_add_clinical_attributes_to_advice_items_table.php` adding `category`, `is_active`, `sort_order`, with indexes on `category`, `is_default`, and `is_active`.
  - Updated `create_advice_items_table` so `text_en` is nullable.
- [x] **Task 38.2**: Clinical Advice Master Seeder
  - Authored `AdviceItemSeeder.php` pre-seeding 25 clinical advice items across 6 categories (`homeopathic`, `general`, `diet`, `lifestyle`, `hygiene`, `warning`).
  - Registered in `DatabaseSeeder.php`. Seeded 25 records with 9 auto-selected default presets.
- [x] **Task 38.3**: Model Hardening & FormRequests
  - Upgraded `AdviceItem.php` with `visits()` BelongsToMany, query scopes (`search`, `category`, `active`, `default`), casts, and Spatie activity logging.
  - Authored `StoreAdviceItemRequest.php` and `UpdateAdviceItemRequest.php`.
- [x] **Task 38.4**: Controller Hardening with Safe Deactivation
  - Upgraded `AdviceItemController.php` with debounced search, category tabs, default filter, active filter, KPI metrics aggregation (`total`, `default`, `homeopathic`, `general`, `diet`, `lifestyle`, `hygiene`, `warning`, `active`).
  - Implemented safe deactivation in `destroy()` if an item is referenced in `visit_advice`, protecting historical clinical records.
- [x] **Task 38.5**: Responsive Multi-Screen Workstation & Ergonomics
  - `AdviceItems/Index.jsx`: Executive KPI ribbon, 300ms debounced search with `âœ•`, horizontal Category Filter Tabs, default preset filter, Desktop DataTable, and Mobile High-Density Touch Cards (`block md:hidden`).
  - `AdviceItems/Create.jsx`: RemediQ PageHeader, 1-Click Fast-Track Presets Toolbar, structured category select, default toggle card, and validation error displays.
  - `AdviceItems/Edit.jsx`: RemediQ PageHeader, linked visit count protection advisory, category select, and active status toggle.
- [x] **Task 38.6**: Automated Verification & Regression Testing
  - Authored test suite `tests/Feature/AdviceItemManagementTest.php` with 10 feature tests passing (90 assertions).
  - Verified zero regressions in `SettingsAuditAuthorizationTest` (21 tests passed, 50 assertions).
  - Code formatted with Pint and frontend production assets compiled with Vite (`npm run build`).

### Phase 39: Dietary & Food Restrictions Master Catalog (`/admin/food_restrictions`) (`[x] COMPLETED`)
- [x] **Task 39.1**: Database Schema & Migration
  - Migration `2026_11_27_151209_add_category_is_active_sort_order_to_food_restrictions_table.php` adding `category` (default `general`), `is_active` (default `true`), and `sort_order` (default `0`), with indexes on `category`, `is_default`, and `is_active`.
  - Updated base migration `create_food_restrictions_table` so `text_en` is nullable.
- [x] **Task 39.2**: Clinical Dietary Restrictions Master Seeder
  - Authored `FoodRestrictionSeeder.php` pre-seeding 25 clinical dietary rules across 6 categories (`homeopathic_antidote`, `sour_cold`, `spicy_oily`, `allergic_histamine`, `chronic_metabolic`, `general`).
  - Registered in `DatabaseSeeder.php`. Seeded 25 records with 8 auto-selected default presets.
- [x] **Task 39.3**: Model Hardening & FormRequests
  - Upgraded `FoodRestriction.php` with `visits()` BelongsToMany, query scopes (`search`, `category`, `active`, `default`), casts, and Spatie activity logging.
  - Authored `StoreFoodRestrictionRequest.php` and `UpdateFoodRestrictionRequest.php` with authorization and category fallback.
- [x] **Task 39.4**: Controller Hardening with Safe Deactivation
  - Upgraded `FoodRestrictionController.php` with debounced search, category tabs, default filter, active filter, KPI metrics aggregation (`total`, `default`, `antidote`, `sour_cold`, `spicy_oily`, `allergic`, `metabolic`, `general`, `active`).
  - Implemented safe deactivation in `destroy()` if an item is referenced in `visit_food_restriction`, protecting historical clinical records.
  - Added `toggleStatus` and `toggleDefault` endpoints.
- [x] **Task 39.5**: Responsive Multi-Screen Workstation & Ergonomics
  - `FoodRestrictions/Index.jsx`: Executive KPI ribbon (5 cards), 300ms debounced search with `âœ•`, horizontal Category Filter Tabs, default preset filter, Desktop DataTable, and Mobile High-Density Touch Cards (`block md:hidden`).
  - `FoodRestrictions/Create.jsx`: RemediQ PageHeader, 1-Click Fast-Track Presets Toolbar (Antidotes, Cold/Sour, Spicy/Oily, Allergic, Salt/Sugar), structured category select, default toggle card, and validation error displays.
  - `FoodRestrictions/Edit.jsx`: RemediQ PageHeader, linked visit count protection advisory, category select, fast-track presets toolbar, and active status toggle.
- [x] **Task 39.6**: Automated Verification & Regression Testing
  - Authored test suite `tests/Feature/FoodRestrictionManagementTest.php` with 12 feature tests passing (106 assertions).
  - Verified zero regressions in `SettingsAuditAuthorizationTest`, `RolePermissionManagementTest`, `ProductionSetupSeederTest`, and `AdviceItemManagementTest` (45 tests passed, 228 assertions).
  - Code formatted with Pint and frontend production assets compiled with Vite (`npm run build`).

### Phase 40: Doctor Profiles & Practitioner Management Workstation (`/admin/doctors`) (`[x] COMPLETED`)
- [x] **Task 40.1**: Model Hardening & Relationship Fixes
  - Added missing `visits(): HasMany` relationship to `App\Models\Doctor`, linking historical patient clinical visits directly to the practitioner.
  - Implemented query scopes on `Doctor.php`: `scopeSearch` (matching name EN/BN, degrees/credentials EN/BN, specialty EN/BN, govt_reg_no, phone, appointment_phone, email), `scopeActive`, and `scopeAccount` (linked login vs unlinked profile).
- [x] **Task 40.2**: Controller Modernization & KPI Aggregation
  - Upgraded `DoctorController@index` with query filtering, eager loaded `visits_count`, `schedules_count`, and user accounts.
  - Computed executive KPI metrics: `total`, `active`, `inactive`, `linked_account`, `scheduled`, and `total_visits`.
  - Registered `PATCH /admin/doctors/{doctor}/toggle-status` under RBAC `role_or_permission:Super Admin|doctors.update` for instantaneous 1-click status toggling.
  - Upgraded `DoctorController@show` with consultation counts, schedule counts, and secure clinic branding URLs (`photo_url`, `signature_url`, `seal_url`).
- [x] **Task 40.3**: Responsive Multi-Screen Workstation & Ergonomics
  - `Doctors/Index.jsx`: Executive KPI ribbon (4 tiles), 300ms debounced search bar with `âœ•` clear button, horizontal Status filter tabs (`All`, `Active in Practice ðŸ©º`, `Inactive / On Leave â¸ï¸`), Account Linkage filter (`All`, `Linked Account ðŸ‘¤`, `Profile Only ðŸ“„`).
  - Desktop `DataTable` (`hidden md:table`): Practitioner avatar thumbnail, active status dot, degrees/credentials, government registration badge (`govt_reg_no`), click-to-call phone links, linked system username badge, and quick action buttons (`View`, `Edit`, `ðŸ“… Schedule`, `Toggle Status`, `Delete/Deactivate`).
  - Mobile High-Density Touch Cards (`block md:hidden`): Touch-optimized 44px+ buttons, doctor credentials, specialty, phone links, and schedule deep-links.
  - Clinical Authorship Protection: Smart `ConfirmDialog` warning if a doctor has consultation history (`visits_count > 0`), disabling hard deletion and offering safe deactivation.
- [x] **Task 40.4**: Automated Verification & Regression Testing
  - Authored comprehensive test suite `tests/Feature/DoctorManagementWorkstationTest.php` with 7 feature tests passing (96 assertions).
  - Verified zero regressions in `DoctorControllerTest` and full suite (100 tests passed, 788 assertions).
  - Code formatted with Pint (`vendor/bin/pint --dirty --format agent`) and frontend production assets compiled with Vite (`npm run build`).

### Phase 41: Prescription Options & Clinical Presets Workstation (`/admin/prescription-options`) (`[x] COMPLETED`)
- [x] **Task 41.1**: Domain Model & Clinical Catalog Hardening
  - Updated `ClinicSetting::defaultPrescriptionConfig()` with classical succussion & dilution templates (*à§§à§¦ à¦à¦¾à¦à¦•à¦¿à¦¸à¦¹ à¦†à¦§à¦¾ à¦•à¦¾à¦ª à¦ªà¦¾à¦¨à¦¿à¦° à¦¸à¦¾à¦¥à§‡ à¦–à¦¾à¦¬à§‡à¦¨*, *à¦¶à¦¿à¦¶à¦¿ à§§à§¦ à¦¬à¦¾à¦° à¦à¦¾à¦à¦•à¦¿à¦¯à¦¼à§‡ à¦¨à¦¿à¦¬à§‡à¦¨*, *à¦šà¦¿à¦¨à¦¿à¦° à¦¬à§œà¦¿à¦¤à§‡ à¦•à¦°à§‡ à¦¸à§‡à¦¬à§à¦¯*, etc.) and expanded dual-practice medication units (`capsules`, `sachets`, `puffs`, `30_min_before`, `as_needed`).
- [x] **Task 41.2**: Backend Controller & KPI Aggregation
  - Upgraded `PrescriptionOptionController@edit` with real-time KPI metrics (`total_timings`, `total_dose_units`, `total_meal_relations`, `total_instructions`, `total_duration_presets`, `default_duration_days`, `default_dose_unit`).
  - Validated clean updates through `UpdatePrescriptionOptionsRequest` and protected by RBAC permissions (`prescription_options.view`, `create`, `update`, `delete`).
- [x] **Task 41.3**: WYSIWYG Clinical Prescription Line Simulator
  - Built an interactive live preview simulator in `Admin/PrescriptionOptions/Edit.jsx` rendering dynamic bilingual (English & Bengali) prescription sentences with customizable remedy, dose quantity, unit, timing, meal relation, and dilution.
- [x] **Task 41.4**: Multi-Screen Touch Ergonomics & Real-Time Preset Search
  - Upgraded `PrescriptionConfigModal.jsx` with real-time keyword search across all 4 tabs (English keys, English labels, Bengali script, instructions, durations).
  - Added 1-Click Fast-Track Clinical Preset Packs toolbar (*ðŸŒ¿ Classical Homeopathy Pack*, *ðŸ’Š General Practice Pack*, *ðŸ”„ Reset Safe Defaults*).
  - Added responsive dual-screen presentation: Desktop tabular rows with keyboard shortcuts (Enter to save, Esc to cancel) and Mobile High-Density Touch Cards (`block md:hidden`) with 44px+ tap targets.
  - Implemented Default Dependency Guard preventing accidental deletion of the active `default_dose_unit`.
- [x] **Task 41.5**: Automated Testing & Verification
  - Authored comprehensive test suite `tests/Feature/PrescriptionOptionsWorkstationTest.php` with 5 feature tests passing (35 assertions).
  - Verified zero regressions in `PrescriptionConfigTest` (16 total tests passed, 97 assertions).
  - Code formatted with Pint and frontend production assets compiled with Vite (`npm run build`).

### Phase 42: General Settings & Patient Numbering Workstation (`/admin/general-settings`) (`[x] COMPLETED`)
- [x] **Task 42.1**: Backend Controller & KPI Aggregation
  - Updated `ClinicSettingController@editGeneral` to calculate and return executive KPIs: `total_profiles`, `active_profiles`, `default_profile_name`, `default_profile_preview`, `old_id_mode`, and `total_registered_patients`.
  - Preserved RBAC authorization guards (`general_settings.view`, `general_settings.create`, `general_settings.update`, `general_settings.delete`, and Super Admin).
- [x] **Task 42.2**: Category Real-Time Search & Status Filtering
  - Added instant search bar with match count indicator and one-click clear button (`âœ•`) matching category names, codes, and prefixes.
  - Added status filter pills (`All`, `Active`, `Inactive`) for quick category isolation.
- [x] **Task 42.3**: Multi-Screen Responsive Layout & Touch Ergonomics
  - Implemented High-Density Mobile Touch Cards (`block sm:hidden`) with 44px+ touch targets for Edit and Deactivate actions.
  - Added smooth auto-scroll to the editor form container when initiating an edit on mobile devices.
- [x] **Task 42.4**: Fast-Track Clinical Presets & Old ID Business Logic Preservation
  - Added 1-Click Fast-Track Presets toolbar (`ðŸ©º General Patients`, `ðŸ‘¶ Pediatric Clinic`, `ðŸ§“ Senior Citizens`, `ðŸ•ï¸ Free Camp`).
  - Preserved 100% of Old / Other ID Numbering business rules (Auto vs Manual mode, prefix, padding, max_length, and staff override permissions).
  - Maintained minimum 1 active profile invariant safeguard.
- [x] **Task 42.5**: Automated Testing & Verification
  - Authored test suite `tests/Feature/GeneralSettingsWorkstationTest.php` (6 tests passing, 43 assertions).
  - Verified regression test `tests/Feature/PatientNumberingWorkflowTest.php` (5 tests passing, 66 assertions; combined 11/11 tests passing, 109 assertions).
  - Formatted code with Pint and compiled frontend assets with Vite (`npm run build`).

### Phase 43: Doctor Visiting Schedules, Chamber Roster & Leave Range Workstation (`/admin/doctor-schedules`) (`[x] COMPLETED`)
- [x] **Task 43.1**: Backend Multi-Day Leave Ranges & Conflict Detection
  - Extended `StoreDoctorLeaveRequest` with optional `leave_date_end` (`nullable`, `date`, `after_or_equal:leave_date`).
  - Implemented multi-day date range insertion within an atomic database transaction in `DoctorScheduleController@storeLeave`.
  - Added conflict detection checking active `PatientQueueToken` (`waiting`, `in_consultation`) and `AppointmentRequest` (`pending`, `scheduled`) records, returning flash warning with reschedule advice.
  - Calculated and returned Executive KPI metrics (`total_doctors`, `active_days`, `weekly_hours`, `assigned_chamber`, `upcoming_leaves`).
- [x] **Task 43.2**: Schedules Workstation Modernization (`resources/js/Pages/Admin/Calendar/Schedules.jsx`)
  - Integrated RemediQ `PageHeader` with quick links (`ðŸ‘¨â€âš•ï¸ Doctors`, `ðŸ“… Calendar`, `ðŸŽŸï¸ Queue`, `ðŸ“ Requests`).
  - Added 5-card Executive KPI summary ribbon.
  - Implemented real-time Doctor Search Bar with instant filtering and mobile quick-switch `<select>` dropdown.
  - Built 1-Click Fast-Track Schedule Accelerators (`ðŸ“‹ Copy Sunday to Working Days`, `âš¡ Apply Sunday to All Active Days`, `ðŸ•Œ Set Friday Off`).
  - Added Chamber Quick Pills (`Chamber 1`, `Chamber 2`, `Chamber 3`, `OPD Room 1`, `Consultation Room`).
  - Built Multi-Day Leave Range Picker with quick reason chips (*Annual Vacation*, *Medical Leave*, *Conference*, *Emergency*).
  - Added Mobile Sub-Tab Switcher (`[ ðŸ•’ Weekly Visiting Hours ]` vs `[ ðŸ–ï¸ Leaves & Holidays ]`) with 44px+ touch targets on screens < 768px.
- [x] **Task 43.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/DoctorScheduleWorkstationTest.php` with 8 feature tests passing (38 assertions).
  - Verified full Doctor test suite with zero regressions (109 tests passed, 827 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 44: Doctor Visual Calendar & Appointments Matrix Workstation (`/admin/calendar`) (`[x] COMPLETED`)
- [x] **Task 44.1**: Backend Controller & Metric Aggregation (`CalendarController.php`)
  - Upgraded `CalendarController@index` to accept universal `search` parameter, matching across patient name, phone number, patient code, and doctor name.
  - Computed recurring weekly doctor shift rosters (`doctorShifts`) across all days of the week (Sun-Sat) with chamber assignments and duty hours.
  - Aggregated monthly Executive KPI metrics (`total_appointments`, `total_visits`, `total_leaves`, `today_activity`, `active_doctors`).
- [x] **Task 44.2**: Modernized Visual Calendar Workstation (`resources/js/Pages/Admin/Calendar/Index.jsx`)
  - Integrated RemediQ `PageHeader` with quick links (`ðŸ‘¨â€âš•ï¸ Doctors`, `ðŸ•’ Schedules`, `ðŸŽŸï¸ Queue`, `ðŸ“ Requests`).
  - Added 5-card Executive Monthly KPI summary ribbon.
  - Implemented real-time Search Bar with active cell emerald glow highlights and match counter.
  - Added 1-Click Event Category Filter Toolbar (`All Events`, `ðŸ•’ Appointments`, `ðŸ©º Visits`, `ðŸ–ï¸ Doctor Leaves`).
  - Integrated recurring doctor shift badges on calendar day cells with automatic strikethrough for approved leaves.
  - Implemented Mobile Daily Agenda Timeline View (`block md:hidden`) with an interactive day-picker ribbon and chronological agenda feed.
  - Upgraded Day Details Studio with 1-tap phone dialing (`tel:`), WhatsApp click-to-chat (`https://wa.me/...`), 1-click token issuance bridge, and fast-track booking link.
- [x] **Task 44.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/CalendarWorkstationTest.php` with 6 feature tests passing (74 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 45: Appointment Requests & Intake Triage Workstation (`/admin/appointment-requests`) (`[x] COMPLETED`)
- [x] **Task 45.1**: Backend Controller & Fast-Track Triage API (`AppointmentRequestController.php`)
  - Upgraded `AppointmentRequestController@index` with universal `search` across patient name, phone, request ID, and notes.
  - Implemented 1-click `date_preset` filters (`all`, `today`, `tomorrow`, `this_week`, `pending`).
  - Added executive KPI metric counters: `total_requests`, `pending_triage`, `contacted`, `scheduled_today`, and `converted_patients`.
  - Added `PATCH /admin/appointment-requests/{appointmentRequest}/quick-status` (`appointment_requests.quick_status`) with database transaction and audit event logging (`AppointmentRequestEvent`).
- [x] **Task 45.2**: Modernized Intake Triage Workstation (`resources/js/Pages/Admin/AppointmentRequests/Index.jsx`)
  - Integrated RemediQ `PageHeader` with contextual action (`+ New Request`) and navigation tabs.
  - Added 5-card Executive KPI summary ribbon with responsive grid layout.
  - Built real-time 300ms debounced search bar with instant clear button (`âœ•`) and match counter.
  - Added 1-Click Date Preset Filter Pills (`All Requests`, `ðŸ“… Today's Bookings`, `ðŸŒ… Tomorrow`, `ðŸ—“ï¸ This Week`, `â³ Pending Triage`).
  - Added Today's Appointment highlight badge (`ðŸ“… TODAY`) with emerald border and soft emerald background.
  - Added 1-Click `[ ðŸ“ž Contacted ]` action button with live server-side update.
  - Added 1-Tap phone dialing (`tel:`) and pre-filled WhatsApp click-to-chat links (`https://wa.me/...`).
  - Implemented High-Density Mobile Touch Cards (`block md:hidden`) with 44px+ touch targets and expandable triage notes.
- [x] **Task 45.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/AppointmentRequestWorkstationTest.php` with 6 feature tests passing (44 assertions).
  - Verified full appointment test suite with zero regressions (34 tests passed, 359 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 46: Clinic Master Settings, Practice Mode & Multi-Screen Workstation (`/admin/settings`) (`[x] COMPLETED`)
- [x] **Task 46.1**: FormRequest & Controller Hardening (`UpdateClinicSettingsRequest.php`, `ClinicSettingController.php`)
  - Added validation rule for `bkash_number` (`nullable|string|max:50`) in `UpdateClinicSettingsRequest`.
  - Upgraded `ClinicSettingController@edit` to calculate and return executive KPI metrics: `practice_type`, `practice_label`, `auto_deduct_inventory`, `default_consultation_fee`, `has_custom_logo`, `has_custom_favicon`, `schedule_mode`, and `active_days_count`.
  - Preserved strict Super Admin protection and authorization checks (`role:Super Admin`, `permission:clinic_settings.view|update`).
- [x] **Task 46.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Settings/Edit.jsx`)
  - Integrated RemediQ `PageHeader` with quick navigation links (`ðŸ”¢ Patient Numbering`, `ðŸ“ Rx Presets`, `ðŸ‘¨â€âš•ï¸ Doctors`, `ðŸŽŸï¸ Queue`).
  - Added 5-card Executive KPI summary ribbon with real-time operational status.
  - Implemented real-time in-page search bar (300ms debounce) matching all setting titles, labels, descriptions, and values with clear button (`âœ•`) and visual emerald glow highlighting.
  - Added Category Filter Tabs Strip (`All Settings`, `ðŸ©º Practice Mode`, `ðŸ“¦ Stock & Pharmacy`, `ðŸ§¾ Billing & bKash`, `ðŸŽ¨ Branding`, `ðŸ¥ General Info`, `ðŸ•’ Visiting Hours`, `ðŸŒ Website & About`).
  - Added dedicated bKash / Mobile Financial Services (MFS) card in Billing section for token and POS invoice cashless payments.
  - Added 1-Click Fast-Track Practice Mode Presets Toolbar (`ðŸŒ¿ Classical Pack`, `ðŸ’Š General Pack`, `âš–ï¸ Dual Pack`).
  - Added 1-Click Visiting Hours schedule accelerators (`ðŸ“‹ Copy Sunday to Working Days`, `ðŸ•Œ Set Friday Closed`, `âš¡ Standard 9am-9pm OPD`).
  - Implemented responsive multi-screen layout with adaptive input stacking (`grid-cols-1 sm:grid-cols-2`) and floating Sticky Bottom Save Drawer on mobile viewports (< 640px).
- [x] **Task 46.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/ClinicSettingsWorkstationTest.php` with 5 feature tests passing (47 assertions).
  - Verified full settings test suite with zero regressions (50 tests passed, 250 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 47: Patient Registration Form Configuration Workstation (`/admin/patient-config`) (`[x] COMPLETED`)
- [x] **Task 47.1**: Controller Hardening & KPI Metric Aggregation (`PatientConfigController.php`)
  - Upgraded `PatientConfigController@edit` to compute executive KPI metrics: `total_sections`, `active_sections`, `total_fields`, `visible_fields`, `required_fields`, `total_relationships`, and `is_migration_active`.
  - Preserved RBAC security guards (`role_or_permission:Super Admin|patient_config.view|create|update|order|delete`).
  - Preserved foreign database usage checks on relationship deletion preventing accidental orphan states in `Patient` records.
- [x] **Task 47.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/PatientConfig/Edit.jsx`)
  - Integrated RemediQ standard `PageHeader` with title *"Patient Registration Form Configuration (à¦°à§‹à¦—à§€ à¦¨à¦¿à¦¬à¦¨à§à¦§à¦¨ à¦«à¦°à§à¦® à¦¬à¦¿à¦¨à§à¦¯à¦¾à¦¸)"* and quick navigation links (`ðŸ‘¥ Patients`, `âž• Register Patient`, `ðŸ”¢ Numbering Profiles`, `âš™ï¸ Clinic Settings`).
  - Added 5-card Executive KPI summary ribbon with real-time operational status.
  - Implemented real-time in-page search bar (300ms debounce) matching all field names, keys, custom labels, section names, and relationships with clear button (`âœ•`) and visual emerald glow highlighting.
  - Added Category Navigation Tabs Strip (`All Sections`, `ðŸ‘¤ Identity`, `ðŸ©º Medical`, `ðŸ“ž Contact`, `ðŸ“œ Migration`, `ðŸ‘¨â€ðŸ‘©â€ðŸ‘¦ Relationships`).
  - Added 1-Click Clinical Form Presets Toolbar (`ðŸŒ¿ Standard OPD Intake`, `âš¡ Fast-Track Minimal OPD`, `ðŸ“œ Historical Migration Pack`).
  - Added Quick-Add Relationship Chips (`+ Step-Father`, `+ Step-Mother`, `+ Foster Parent`, `+ Hostel Warden`, `+ Colleague`).
  - Implemented responsive touch card layout with generous 44px+ tap targets and floating Mobile Sticky Save Drawer on viewports < 640px.
- [x] **Task 47.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/PatientConfigWorkstationTest.php` with 6 feature tests passing (42 assertions).
  - Verified full patient form config test suite with zero regressions (26 tests passed, 169 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 48: Staff Users & Access Control Workstation (`/admin/users`) (`[x] COMPLETED`)
- [x] **Task 48.1**: Model & Controller Hardening (`User.php`, `UserController.php`, `routes/admin.php`)
  - Added query scopes on `User.php`: `scopeSearch` (name, username, email, phone), `scopeRoleFilter`, and `scopeStatus`.
  - Upgraded `UserController@index` to accept `search`, `role`, and `status`, computing executive KPI counters (`total_users`, `active_users`, `super_admins_count`, `doctors_count`, `support_staff_count`).
  - Added `toggleStatus(Request $request, User $user)` method with database transaction, row-locking (`lockForUpdate()`), and strict defense preventing deactivation of the last remaining active Super Admin.
  - Registered route `PATCH /admin/users/{user}/toggle-status` under `role:Super Admin`.
- [x] **Task 48.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Users/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with navigation links (`ðŸ›¡ï¸ Roles & Permissions`, `ðŸ“œ Security Logs`, `ðŸ¥ System Health`, `âž• Create User`).
  - Added 5-card Executive KPI summary ribbon with real-time operational metrics.
  - Implemented 300ms debounced search bar matching user name, username, email, and phone with match counter and `âœ•` clear button.
  - Added 1-Click Role & Status Filter Pills Strip (`All Staff`, `Active ðŸŸ¢`, `Inactive â¸ï¸`, `Super Admin ðŸ‘‘`, `Doctor ðŸ©º`, `Receptionist ðŸ“‹`, `Accountant ðŸ’µ`).
  - Implemented 1-Click Fast-Track Status Toggle action with optimistic feedback.
  - Built responsive dual presentation: Desktop structured `DataTable` (`hidden md:block`) alongside High-Density **Mobile Touch Cards** (`block md:hidden`) with avatar initials, role pills, 1-tap phone `tel:`, email `mailto:`, and 44px+ touch-friendly action buttons.
- [x] **Task 48.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/UserManagementWorkstationTest.php` with 6 feature tests passing (92 assertions).
  - Verified full user authorization test suite with zero regressions (22 tests passed, 133 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 49: Role Management & Access Control Workstation (`/admin/roles`) (`[x] COMPLETED`)
- [x] **Task 49.1**: Controller Hardening & KPI Aggregation (`RoleController.php`)
  - Upgraded `RoleController@index` to accept `search` and `filter` query parameters (`all`, `protected`, `custom`, `assigned`, `unassigned`).
  - Added real-time database query filtering using `where('name', 'like', ...)`, `has('users')`, and `doesntHave('users')`.
  - Aggregated 5 system-wide KPI metrics (`total_roles`, `total_assignments`, `custom_roles_count`, `unassigned_roles_count`, `protected_roles_count`) passed directly into Inertia props.
  - Upgraded `Admin/Permissions/Index.jsx` to honor incoming `?role={id}` query parameter, automatically pre-selecting the target role in the Permissions Matrix tab.
- [x] **Task 49.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Roles/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with quick links (`ðŸ‘¥ Staff Users`, `ðŸ”‘ Permissions Matrix`, `ðŸ“œ Security Logs`, `âž• Create Role`).
  - Embedded standard `AccessControlNavigation` tab navigation.
  - Implemented 5-card Executive KPI summary ribbon with responsive grid layout and semantic tones (`Sky`, `Emerald`, `Violet`, `Amber`, `Rose`).
  - Added 300ms debounced real-time search with clear (`âœ•`) action and match indicator.
  - Implemented 1-Click Fast-Track Filter Pills Strip (`All Roles`, `ðŸ‘‘ Protected`, `ðŸ›¡ï¸ Custom Roles`, `ðŸ‘¥ Assigned`, `âšª Unassigned`).
  - Built Dual-Mode Presentation: Desktop structured table (`hidden md:block`) with Avatar badge, staff user link (`admin.users.index?role={name}`), permissions count, and deep-link to Matrix (`admin.permissions.index?role={id}`) alongside High-Density **Mobile Touch Cards** (`block md:hidden`) with 44px+ touch-friendly buttons.
  - Upgraded `ConfirmDialog` to provide actionable guidance and 1-click CTA button (`[ ðŸ‘¥ View & Reassign Staff Users â†’ ]`) when role deletion is blocked by assigned users.
- [x] **Task 49.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/RoleManagementWorkstationTest.php` with 8 feature tests passing (25 assertions).
  - Verified full role and user permission management test suite with zero regressions (179 tests passed, 1261 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 50: Permission Matrix & Module Access Workstation (`/admin/permissions`) (`[x] COMPLETED`)
- [x] **Task 50.1**: Request Hardening & Controller Optimization (`UpdateRolePermissionsRequest.php`, `PermissionController.php`)
  - Increased array limit in `UpdateRolePermissionsRequest.php` from `max:100` to `max:500`, permanently resolving the validation ceiling trap for high-permission clinical roles.
  - Upgraded `PermissionController@index` to accept query parameter `role` and compute executive KPI summary counters (`total_roles`, `total_permissions`, `total_assignments`).
- [x] **Task 50.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Permissions/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with quick links (`ðŸ‘¥ Staff Users`, `ðŸ›¡ï¸ Roles Directory`, `ðŸ“œ Security Logs`, `ðŸ¥ System Health`, `âž• Create Role`).
  - Mapped all 29 modules cleanly into 5 clinical domains (`Clinical Care & OPD`, `Pharmacy, Medicines & Repertory`, `Diagnostics & Lab Tests`, `Billing & Cash Register`, `Clinic Administration & Governance`).
  - Added 5-card Executive KPI summary ribbon with live metrics and percentage coverage indicator.
  - Implemented 300ms debounced search, category navigation tabs, and 1-click status filter pills (`All (129)`, `âœ… Granted (N)`, `âšª Revoked (N)`).
  - Added category-level bulk grant/revoke controls and 1-Click Fast Clinical Presets (`Doctor`, `Front Desk`, `Pharmacist`, `Cashier`).
  - Implemented Dual-Mode Presentation: Desktop sticky sidebar with live role search input alongside high-density **Horizontal Touch Role Carousel** on mobile/tablet viewports (< xl) with 44px+ tap targets.
  - Added real-time staff impact alert warning when editing roles with active users.
- [x] **Task 50.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/PermissionMatrixWorkstationTest.php` with 6 feature tests passing (95 assertions).
  - Verified full role, permission, and user test suite with zero regressions (248 tests passed, 1790 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 51: Activity Logs & Security Audit Workstation (`/admin/activity-logs`) (`[x] COMPLETED`)
- [x] **Task 51.1**: Controller Hardening & Streaming CSV Export (`ActivityLogController.php`, `routes/admin.php`)
  - Upgraded `ActivityLogController@index` to accept multi-parameter search, fast filter pills (`denied`, `clinical_access`, `mutations`, `system_health`, `today`), actor filter (`causer_id`), event type filter (`event`), and date ranges (`date_from`, `date_to`).
  - Computed 5 executive KPI summary counters (`total_logs`, `today_logs`, `clinical_access_count`, `denied_alerts_count`, `active_actors_today`).
  - Added streaming CSV export method `export(Request $request)` and registered route `GET /admin/activity-logs/export` protected by `permission:activity_logs.export` and `role:Super Admin`.
  - Maintained 100% strict clinical privacy whitelisting, preventing exposure of raw patient changes or sensitive diagnostic values.
- [x] **Task 51.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/ActivityLogs/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with navigation links (`ðŸ‘¥ Staff Users`, `ðŸ›¡ï¸ Roles`, `ðŸ”‘ Permissions`, `ðŸ¥ System Health`) and `ðŸ“¥ Export CSV` action.
  - Added 5-card Executive KPI summary ribbon with responsive grid layout and semantic tones (`Sky`, `Emerald`, `Violet`, `Rose`, `Amber`).
  - Implemented 300ms debounced search bar with clear (`âœ•`) button and reset filters action.
  - Implemented 1-Click Fast-Track Filter Pills Strip with live count badges.
  - Added filter dropdowns for Staff Actor (`causer_id`), Event Type, and Date Range.
  - Built Dual-Mode Presentation: Desktop structured `DataTable` (`hidden md:block`) with color-coded event badges, access outcome indicators, and direct clickable Patient/Visit links alongside High-Density **Mobile Audit Cards** (`block md:hidden`) with 44px+ touch-friendly layout.
- [x] **Task 51.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/ActivityLogWorkstationTest.php` with 6 feature tests passing (398 assertions in suite).
  - Verified full clinical access audit and patient privacy test suite with zero regressions.
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 52: System Health, Backups & Disaster Recovery Workstation (`/admin/system-health`) (`[x] COMPLETED`)
- [x] **Task 52.1**: Controller Hardening & Health KPI Aggregation (`SystemHealthController.php`)
  - Enriched `SystemHealthController@index` to compute consolidated executive health KPI metrics (`overall_status`, `database_healthy`, `storage_healthy`, `migrations_healthy`, `total_backups_count`, `total_backups_bytes`, `database_size_bytes`, `uploads_size_bytes`, `uploads_files_count`, `scheduler_enabled`, `scheduler_time`, `scheduler_timezone`).
  - Maintained strict security invariants: cPanel bundle creation and download guarded for Super Admin; disaster recovery restore and `reset_as_new` strictly role-restricted.
- [x] **Task 52.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/SystemHealth.jsx`)
  - Integrated RemediQ standard `PageHeader` with sibling governance links (`ðŸ‘¥ Staff Users`, `ðŸ›¡ï¸ Roles`, `ðŸ”‘ Permissions`, `ðŸ“œ Security Logs`).
  - Built 5-card Executive KPI summary ribbon with live status badges (`Overall System Health ðŸ¥`, `Database Engine ðŸ—„ï¸`, `Media & Uploads ðŸ“`, `Backup Archive ðŸ“¦`, `Automated Backup ðŸ•’`).
  - Implemented Segmented Workstation Navigation Tabs (`ðŸ“Š Diagnostics`, `âš¡ Backup & Archive`, `ðŸ”„ Disaster Recovery`, `ðŸ§¹ Maintenance & Reset`) to eliminate long vertical scrolling.
  - Added real-time 300ms debounced search and 1-click filter pills (`All Backups`, `ðŸ—„ï¸ Database`, `ðŸ“ Media`, `ðŸ“¦ Full Archive`, `âš¡ cPanel Bundle`) for saved backup archives.
  - Built Dual-Mode Presentation: Desktop structured data table alongside High-Density **Mobile Touch Cards** with 44px+ hit targets for touch screen tablets and phones.
  - Refined safety callouts and visual feedback for disaster recovery restores (`Restore to Empty Target` vs `Overwrite Existing Target` with safety recovery backup) and `Reset As New`.
- [x] **Task 52.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/SystemHealthWorkstationTest.php` with 6 feature tests passing (51 assertions).
  - Verified full system health suite with zero regressions (65 tests passed, 380 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 53: Homeopathic Medicine Catalog, Pharmacopoeia Search & Batch Inventory Integration (`/admin/medicines`) (`[x] COMPLETED`)
- [x] **Task 53.1**: Controller Hardening, Potency Scopes & Batch Stock Aggregation (`MedicineController.php`, `Medicine.php`)
  - Added `batches()` relationship on `Medicine` and aggregated active physical batch stock using `withSum(['batches as total_stock' => fn ($q) => $q->active()], 'current_quantity')` and active batches count.
  - Added `scopeSearch` supporting multi-nomenclature search (Latin scientific name, potency, formulation, default instruction) and `scopeScale` categorizing potencies into Centesimal (CH), 50-Millesimal (LM/Q), Decimal (X), and Mother Tinctures (Q/MT).
  - Computed 5 executive KPI summary counters (`total_remedies`, `ch_count`, `lm_count`, `x_count`, `mother_tincture_count`, `in_stock_count`).
  - Added streaming CSV export endpoint (`GET /admin/medicines/export`) protected by `permission:medicines.view`.
- [x] **Task 53.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Medicines/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with quick links (`ðŸ’Š Pharmaceuticals`, `ðŸ“¦ Pharmacy Inventory`, `ðŸ­ Manufacturers`, `ðŸ“¥ Export CSV`, `âž• New Medicine`).
  - Implemented 5-card Executive KPI summary ribbon with responsive grid layout and semantic tones (`Sky`, `Blue`, `Purple`, `Amber`, `Emerald`).
  - Added 300ms debounced search bar with instant reset button (`âœ•`).
  - Added 1-Click Potency Scale filter pills strip (`All Scales`, `ðŸ”µ Centesimal / CH`, `ðŸŸ£ 50-Millesimal / LM`, `ðŸŸ¢ Decimal / X`, `ðŸŸ¡ Mother Tincture / Q`).
  - Added formulation filter pills strip (`ðŸ’§ Drops`, `âšª Pills / Globules`, `ðŸ§ª Liquid Dilution`) and dropdown filters for Status, Stock Status, and Per Page pagination.
  - Added live batch inventory stock badge (`In Stock: XX units`, `Out of Stock`) with a direct 1-click shortcut to `/admin/inventory?search={name}` for rapid stock replenishment.
  - Built Dual-Mode Presentation: Desktop structured `DataTable` (`hidden md:block`) alongside High-Density **Mobile Touch Cards** (`block md:hidden`) with 44px+ touch-friendly actions (`Edit Remedy`, `View Batches`, `Deactivate`).
- [x] **Task 53.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/MedicineWorkstationTest.php` with 7 feature tests passing (94 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 54: Pharmacy Multi-Batch Inventory, FEFO Sorting & Stocktake Audit Workstation (`/admin/inventory`) (`[x] COMPLETED`)
- [x] **Task 54.1**: Controller Hardening, FEFO Sorting Engine & Stocktake CSV Export (`app/Http/Controllers/Admin/InventoryController.php`, `routes/admin.php`)
  - Implemented multi-parameter search matching batch number, supplier name, remedy Latin name, pharmaceutical brand, generic molecule, strength, and manufacturer.
  - Added FEFO (First-Expired, First-Out) sorting engine (`expiry_asc`) ordering earliest expiring batches first with null expiry dates sorted last.
  - Added multi-level filtering (`type`, `status`, `stock_level`, `expiry_status`, `sort`, `per_page`).
  - Added streaming CSV stocktake audit export (`GET /admin/inventory/export`) with UTF-8 BOM, purchase cost valuation, and retail selling valuation.
- [x] **Task 54.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Inventory/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with direct quick links (`[ ðŸŒ¿ Homeo Remedies ]`, `[ ðŸ’Š Pharmaceuticals ]`, `[ ðŸ­ Manufacturers ]`, `[ ðŸ“œ Stock Ledger ]`, `[ ðŸ“¥ Stocktake CSV ]`, `[ âž• Receive Stock ]`).
  - Implemented 5-Card Inventory KPI Summary Ribbon (`Active Batches ðŸ“¦`, `Stock Valuation ðŸ’°`, `Low Stock Items âš ï¸`, `Near Expiry (â‰¤30d) â³`, `Expired Batches ðŸ›‘`).
  - Implemented 300ms debounced search bar with instant clear button (`âœ•`).
  - Added 1-Click Dispensary Filter Pills strip (`All Batches`, `ðŸŒ¿ Homeopathic Remedies`, `ðŸ’Š Conventional Pharma`, `â³ Near Expiry`, `âš ï¸ Low Stock`, `ðŸ›‘ Expired`).
  - Retained fast-action Quick Stock Adjustment modal with reason and movement type.
  - Built Dual-Mode Presentation: Desktop structured table alongside High-Density **Mobile Touch Cards** (`block md:hidden`) with 44px+ touch-friendly actions (`Adjust Stock`, `Edit Batch`, `Delete`).
- [x] **Task 54.3**: Permissions Matrix Category Layout Hardening (`resources/js/Pages/Admin/Permissions/Index.jsx`)
  - Replaced horizontal pill row with a 6-Card Responsive Grid (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2`) resolving text clipping (`Billing & Cash Re...`), harsh black stadium styling, and multi-screen layout breakage.
  - Added clinical domain icons, clean titles, live granted/total badges, and micro progress bars for each category.
- [x] **Task 54.4**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/InventoryWorkstationTest.php` with 6 feature tests passing (52 assertions).
  - Validated permission test suite (105 tests passing, 727 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 55: Patient Invoicing & Due Collection Workstation (`/admin/invoices`) (`[x] COMPLETED`)
- [x] **Task 55.1**: Controller Hardening, 5 Financial KPIs & Ledger CSV Export (`app/Http/Controllers/Admin/InvoiceController.php`, `routes/admin.php`)
  - Implemented multi-parameter search matching invoice number, patient name, phone, patient code, series/number, attending doctor, and creator.
  - Added payment status filters (`all`, `paid`, `partially_paid`, `unpaid`, `due`), payment method filters (`cash`, `bkash`, `nagad`, `rocket`, `card`, `bank`), date presets (`today`, `yesterday`, `this_week`, `this_month`, `this_year`), custom date pickers, sort modes (`latest`, `oldest`, `due_desc`, `amount_desc`), and per-page selector.
  - Computed 5 executive financial KPIs (`total_invoiced`, `total_collected`, `total_due`, `due_invoices_count`, `paid_invoices_count`, and `today_collected`).
  - Added streaming CSV ledger export (`GET /admin/invoices/export`) with UTF-8 BOM for accountant reconciliation.
- [x] **Task 55.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Billing/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with direct quick links (`[ ðŸ§¾ Cash Register ]`, `[ ðŸ“¥ Export Ledger CSV ]`, `[ âž• New POS Invoice ]`).
  - Implemented 5-Card Financial KPI Summary Ribbon with revenue realization percentage badge.
  - Added 300ms debounced search bar with instant reset button (`âœ•`).
  - Added 1-Click Fast Filter Pills strip (`All Invoices`, `âš ï¸ Has Due`, `âœ… Fully Paid`, `ðŸ›‘ Unpaid`, `ðŸ“± bKash MFS`, `ðŸ’µ Cash Desk`).
  - Built Quick Due Collection Modal allowing cashiers to record partial or full due settlements with instant balance recalculation without leaving the directory.
  - Built Dual-Mode Presentation: Desktop structured table alongside High-Density **Mobile Touch Cards** (`block md:hidden`) with 44px+ touch-friendly actions (`Collect Due`, `View Details`, `POS Slip`, `A4 Print`).
- [x] **Task 55.3**: Automated Testing & Suite Verification
  - Authored comprehensive feature test suite `tests/Feature/InvoiceWorkstationTest.php` with 7 feature tests passing (82 assertions).
  - Verified regression safety with existing `PatientBillingAndCashRegisterTest.php` (7 tests, 93 assertions, 14 total passing tests).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 56: Point-of-Sale (POS) Invoice Creation & Cashier Checkout (`/admin/invoices/create`) (`[x] COMPLETED`)
- [x] **Task 56.1**: Backend Pharmacy Stock Search API (`app/Http/Controllers/Admin/InvoiceController.php`, `routes/admin.php`)
  - Added async debounced batch search endpoint `searchBatches(Request $request)` returning active inventory with item name, potency / strength, supplier, current stock count, and retail selling price.
  - Registered route `GET /admin/invoices/search-batches` (`admin.invoices.search_batches`) guarded by `permission:billing.create`.
- [x] **Task 56.2**: Frontend POS Terminal Transformation (`resources/js/Pages/Admin/Billing/Create.jsx`)
  - Integrated RemediQ standard `PageHeader` with title *"New POS Invoice Terminal (à¦¨à¦—à¦¦ à¦¬à¦¿à¦•à§à¦°à¦¯à¦¼ à¦“ à¦°à¦¶à¦¿à¦¦ à¦ªà§à¦°à¦¸à§à¦¤à§à¦¤à¦•à¦°à¦£)"* and quick links (`[ ðŸ“‹ Invoices Directory ]`, `[ ðŸ§¾ Cash Register ]`, `[ ðŸ“¦ Pharmacy Inventory ]`).
  - Added rich Patient Demographics Verification Card on patient selection (photo/avatar, code, old ID, phone, age/gender, blood group, last visit link).
  - Implemented 1-Click Fast Line Item Presets toolbar (`[ ðŸ©º Doctor Consultation ]`, `[ ðŸ”„ Follow-up Visit ]`, `[ ðŸ”¬ Diagnostic Investigation ]`, `[ ðŸ©¹ Clinical Procedure ]`, `[ âž• Custom Line Item ]`).
  - Replaced static batch select with async debounced Pharmacy Stock Search Combobox with live stock count and price badges.
  - Built integrated **Live Cash Drawer Tender & Change Calculator** (`Tendered Cash à§³`, quick chips `[ Exact ]`, `[ à§³500 ]`, `[ à§³1,000 ]`, `[ à§³2,000 ]`, dynamic green return callout `Change to Return: à§³X` or amber callout `Remaining Due: à§³X`).
  - Added toggle `[x] Automatically open 80mm POS thermal print dialog after saving` and fast-track dual actions (`Create & Print POS Slip` vs `Create & View Invoice`).
  - Built responsive 2-column POS layout on Desktop/Tablet and streamlined vertical flow on mobile screens.
- [x] **Task 56.3**: Automated Testing & Suite Verification
  - Expanded `tests/Feature/InvoiceWorkstationTest.php` to 9 passing feature tests (103 assertions).
  - Verified full billing suite with zero regressions.
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 57: Multi-Dimensional Clinical & Financial Analytics Reports Suite (`/admin/reports`) (`[x] COMPLETED`)
- [x] **Task 57.1**: Controller Hardening, 5-Card KPIs & Streaming CSV Export (`app/Http/Controllers/Admin/ReportController.php`, `routes/admin.php`)
  - Upgraded `ReportController@index` to support multi-parameter search (patient name, phone, code, diagnosis, complaint, doctor), attending doctor filtering (`doctor_id`), and 1-click tactile date presets (`today`, `yesterday`, `this_week`, `this_month`, `this_year`, `custom`).
  - Computed 5 executive KPI summary counters (`total_consultations`, `unique_patients`, `finalized_prescriptions`, `daily_average`, `total_remedies_prescribed`).
  - Implemented Segmented Analytics Data Engines:
    - Tab 1: Clinical Consultations & Morbidity (paginated visits with vitals and Rx count, plus top 6 diagnoses morbidity breakdown).
    - Tab 2: Doctor Productivity Breakdown (consultation volume, finalized Rx count, unique patients treated, completion rate %).
    - Tab 3: Prescribed Remedies & Formulary Breakdown (top 20 prescribed homeopathic potencies and allopathic pharmaceuticals with times prescribed and unique patient counts).
  - Added streaming CSV data export (`GET /admin/reports/export`) with UTF-8 BOM, protected by `permission:reports.export` and `role:Super Admin`.
- [x] **Task 57.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Reports/Index.jsx`)
  - Integrated RemediQ standard `PageHeader` with title *"Clinical & Operational Reports (à¦•à§à¦²à¦¿à¦¨à¦¿à¦•à§à¦¯à¦¾à¦² à¦“ à¦…à¦ªà¦¾à¦°à§‡à¦¶à¦¨à¦¾à¦² à¦°à¦¿à¦ªà§‹à¦°à§à¦Ÿ)"* and quick navigation links (`[ ðŸ©º Visits ]`, `[ ðŸ‘¥ Patients ]`, `[ ðŸ“‹ Invoices ]`, `[ ðŸ“¥ Export CSV ]`, `[ ðŸ–¨ï¸ Print ]`).
  - Built 5-card Executive Clinical KPI Ribbon (`Consultations ðŸ©º`, `Unique Patients ðŸ‘¤`, `Finalized Rx âœ…`, `Daily Average ðŸ“ˆ`, `Rx Items Dispensed ðŸ’Š`).
  - Implemented 300ms debounced search bar with clear button (`âœ•`), Doctor selector dropdown, Status selector, and 1-Click Date Presets strip (`Today`, `Yesterday`, `This Week`, `This Month`, `This Year`, `Custom Range`).
  - Implemented Segmented Analytical Tabs Navigation (`[ ðŸ©º Consultations & Morbidity ]`, `[ ðŸ‘¨â€âš•ï¸ Doctor Productivity & Workload ]`, `[ ðŸ’Š Prescribed Remedies & Formulary ]`).
  - Built Dual-Mode Presentation: Desktop structured data tables alongside High-Density **Mobile Touch Cards** (`block md:hidden`) with 44px+ hit targets.
  - Added clean `@media print` styling for executive browser report printing.
- [x] **Task 57.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/ReportWorkstationTest.php` with 9 passing feature tests (142 assertions).
  - Verified regression safety with `PatientClinicalAccessTest.php` (9 tests, 269 assertions passing).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 58: Gateway Balance Check & Template Studio Upgrade (`/admin/communications/settings`) (`[x] COMPLETED`)
- [x] **Task 58.1**: Gateway Balance Engine, Test SMS Dispatch API & Dynamic WhatsApp Generator (`app/Services/CommunicationService.php`, `app/Http/Controllers/Admin/CommunicationController.php`, `routes/admin.php`)
  - Added live gateway credit balance checker `CommunicationService::checkBalance()` querying Greenweb and MimSMS balance endpoints with graceful fallback for local log drivers and custom gateways.
  - Registered route `GET /admin/communications/gateway-balance` (`admin.communications.gateway_balance`).
  - Added live single test SMS dispatch endpoint `POST /admin/communications/test-sms` (`admin.communications.test_sms`).
  - Added customizable WhatsApp digital prescription template `'whatsapp_prescription'` in `ClinicSetting::defaultSmsConfig()` and `CommunicationService::generateWhatsAppShareUrl`.
  - Added `communications.manage` security guards across all gateway management and balance inspection endpoints.
- [x] **Task 58.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/Communications/Settings.jsx`)
  - Integrated RemediQ standard `PageHeader` with title *"SMS Gateway & Communication Studio (à¦¯à§‹à¦—à¦¾à¦¯à§‹à¦— à¦“ à¦à¦¸à¦à¦®à¦à¦¸ à¦—à§‡à¦Ÿà¦“à¦¯à¦¼à§‡)"* and quick links (`[ ðŸ“œ Notification Logs ]`, `[ âš™ï¸ Clinic Settings ]`, `[ ðŸ§ª Send Test SMS ]`).
  - Added 5-Card Communication KPI Ribbon (`Total Dispatches ðŸ“¡`, `SMS Dispatches ðŸ’¬`, `WhatsApp Alerts ðŸ“±`, `Delivery Rate % âœ…`, `Today Dispatched ðŸ•’`).
  - Implemented Live Gateway Balance Card with real-time balance indicator, active status badge, and `[ ðŸ”„ Refresh Balance ]` action.
  - Built interactive Live Test SMS Modal with custom test number input, message editor, and live result feedback.
  - Built Interactive Message Template Studio with 1-click tactile variable chips toolbar (`+ Patient Name`, `+ Doctor Name`, `+ Clinic Name`, `+ Date`, `+ Time`, `+ Token Code`, `+ Service Room`, `+ Rx Link`, `+ Phone`).
  - Added Dynamic Character & Segment Counter detecting GSM 7-bit (160 chars/part) vs Unicode/Bengali (70 chars/part) with visual multi-part SMS indicator.
- [x] **Task 58.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/CommunicationGatewayTest.php` with 6 feature tests passing (52 assertions).
  - Verified regression safety with existing `AutomatedPatientCommunicationsTest.php` (9 tests, 77 assertions passing).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 59: Staff Fast-Track Appointment Booking & Duty Roster Preview (`/admin/appointment-requests/create`) (`[x] COMPLETED`)
- [x] **Task 59.1**: Controller Hardening, Roster Eager-Loading & Dual-Action Submission Engine (`app/Http/Controllers/Admin/AppointmentRequestController.php`, `app/Http/Requests/Admin/StoreAppointmentIntakeRequest.php`, `app/Models/AppointmentRequest.php`)
  - Enriched `AppointmentRequestController@create` to supply active doctors with their weekly consulting shifts (`DoctorSchedule`) and upcoming leaves/holidays, recent clinic patients, and clinic visiting hours.
  - Upgraded `StoreAppointmentIntakeRequest` to accept `patient_id`, `doctor_id`, `schedule_immediately`, `scheduled_date`, and `scheduled_time`.
  - Added `'converted_patient_id'` to `$fillable` in `AppointmentRequest.php`.
  - Upgraded `AppointmentRequestController@store` with dual-submission engine: saves as `'pending'` enquiry for triage OR instantly confirms and schedules as `'scheduled'`, creates appropriate lifecycle event, and triggers automated SMS confirmation dispatch via `CommunicationService`.
- [x] **Task 59.2**: Frontend Workstation Modernization (`resources/js/Pages/Admin/AppointmentRequests/Create.jsx`)
  - Integrated RemediQ standard `PageHeader` with title *"Book Appointment Request (à¦¨à¦¤à§à¦¨ à¦…à§à¦¯à¦¾à¦ªà¦¯à¦¼à§‡à¦¨à§à¦Ÿà¦®à§‡à¦¨à§à¦Ÿ à¦¬à§à¦•à¦¿à¦‚)"* and quick link (`[ ðŸ“‹ Back to Requests ]`).
  - Implemented 2-Column Responsive Layout:
    - Left Column: Mode Toggle (`Registered Patient` vs `+ New Patient`), async debounced patient lookup combobox (`/admin/patients/search?q=`), Recent Clinic Patients quick chips, and rich Patient Demographics Card (avatar, name, phone, code, gender, age).
    - Right Column: Attending Doctor selector, Live Doctor Duty & Roster Card showing weekly consulting shifts and upcoming leaves/off-days, requested appointment date with 1-click quick presets (`Today`, `Tomorrow`, `+2 Days`, `+1 Week`), time picker, and Dual Submit Action buttons (`[ âš¡ Confirm & Schedule Immediately ]` vs `[ ðŸ’¾ Save as Pending Enquiry ]`).
  - Streamlined mobile touch layout (< 768px) with 44px+ hit targets on buttons and chips.
- [x] **Task 59.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/FastTrackAppointmentBookingTest.php` with 4 feature tests passing (36 assertions).
  - Verified regression safety with `AppointmentRequestWorkstationTest.php` (7 tests, 72 assertions) and `AppointmentRequestWorkflowTest.php` (17 tests, 197 assertions; 28 total passing tests).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).

### Phase 60: Executive Command Dashboard & 1-Click Launchers Modernization (`/admin/dashboard`) (`[x] COMPLETED`)
- [x] **Task 60.1**: Controller Hardening, Metric Expansion & Practice Type Metadata (`app/Http/Controllers/Admin/DashboardController.php`)
  - Enriched `DashboardController@index` with operational metrics for Queue (`waiting_queue_count`), Billing (`today_revenue`, `due_invoices_count`), and Reports.
  - Added strict server-side authorization gates (`access.queue`, `access.billing`, `access.reports`) ensuring staff without proper permissions cannot inspect operational or financial data.
  - Passed `practice_type` and `clinic_name` from `ClinicSetting` to enable dynamic clinical interface branding.
  - Preserved strict clinical chart privacy invariants (`clinical_records.view` + `visits.view`).
- [x] **Task 60.2**: Frontend Dashboard Modernization & 1-Click Launchers (`resources/js/Pages/Admin/Dashboard.jsx`)
  - Replaced legacy interface with standard RemediQ `PageHeader` featuring clinic branding and practice mode badge (`ðŸŒ¿ Classical Homeopathy`, `ðŸ©º Allopathy`, `ðŸŒ Integrative Dual Practice`).
  - Implemented 6-Tile Operational KPI Ribbon (`Waiting in Queue â³`, `Today's Consultations ðŸ©º`, `Pending Enquiries ðŸ“…`, `Today's Revenue ðŸ’µ`, `Inventory Low Stock âš ï¸`, `Total Registered Patients ðŸ‘¥`).
  - Built 1-Click Clinical Action Launchers Strip (`+ New Consultation`, `ðŸŽ« Issue Token`, `ðŸ‘¤ New Patient`, `ðŸ’³ POS Billing`, `ðŸ“… Book Appointment`, `ðŸ“Š View Reports`).
  - Built responsive consultation trend visualizer, high-density appointment triage feed, and touch-optimized layout for mobile and tablet screens.
- [x] **Task 60.3**: Automated Testing & Suite Verification
  - Authored dedicated feature test `tests/Feature/ExecutiveDashboardTest.php` (2 tests, 51 assertions passing).
  - Verified regression safety with `DashboardAuthorizationTest.php` (6 tests, 148 assertions passing).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).





