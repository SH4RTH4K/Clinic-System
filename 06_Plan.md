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
  - Section re-ordering (`↑` / `↓`), master section visibility toggling (`visible: false`), and custom title customization in `Admin/PatientConfig/Edit.jsx`.
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
  - Added a 1-click Language Switcher toggle (`বাং` / `EN`) in the admin topbar.
- [x] **Verification**: Added `ClinicBrandingAndLanguageTitleTest` (3 tests, 68 assertions) covering English/Bangla titles, setting updates, and server-rendered HTML tags. All 50 related tests passing. Pint formatted and Vite build completed.

### Phase 17: Mobile Camera Native Capture & Insecure Context Hardening (`[x] COMPLETED`)
- [x] **Task 17.1**: Native HTML5 Mobile Camera Integration
  - Added dedicated `Take Photo (Mobile Camera)` input with `capture="environment"` and `accept="image/*"` in `Patients/Create.jsx` and `Patients/Edit.jsx`.
  - Enables direct one-tap opening of the smartphone's native camera app on Android and iOS over both plain HTTP and HTTPS without triggering browser WebRTC permission restrictions.
- [x] **Task 17.2**: WebRTC Modal Insecure Context & Multi-Camera Hardening
  - Updated `WebcamCaptureModal.jsx` with `window.isSecureContext` detection to identify non-SSL / HTTP origins (such as `8-119-134.cpanel.site`) cleanly.
  - Added facing-mode selection defaulting to rear camera (`environment`) on mobile devices.
  - Added `🔄 Flip Camera` button (`Rear Cam` / `Front Cam`) in the live viewfinder overlay.
  - Added progressive constraint fallback from 1280x720 ideal constraints to basic video constraint.
  - Upgraded modal fallback UI with a primary `📸 Snap with Mobile Camera` action button.
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
  - Added Clinical Diagnosis & Chief Complaints column, Prescribed Remedy/Drug counts, Vitals preview, and dynamic Billing Status badge (`✓ Paid`, `⚠ Due`, `+ Create Bill`).
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
  - Added live queue auto-refresh toggle (15s / 30s / Off) with visual countdown pill and 1-click `🔄 Refresh Queue` action (`router.reload`).
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

### Phase 23: Doctor Visual Calendar, Multi-Screen Agenda & Search Upgrade (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 23.1**: Backend Multi-Factor Search & Shift Roster Aggregation
  - Upgrade `CalendarController::index` to accept `search` / `q`, querying across `AppointmentRequest` (name, phone, message) and `Visit` (patient name, phone, patient code, old ID, doctor name).
  - Aggregate recurring doctor weekly schedules (`DoctorSchedule`) to render active physician duty shifts on each day of the month without losing clinic appointments when a doctor filter is applied.
- [ ] **Task 23.2**: Desktop & Tablet Calendar Experience
  - Implement debounced search input (350ms) with reset and matching event highlights.
  - Add Event Type filter tabs (`All Events`, `Appointments`, `Visits`, `Doctor Leaves`).
  - Render recurring doctor shift badges (e.g. `👨‍⚕️ Chamber 1 (09:00-14:00)`) on active calendar weekdays.
  - Upgrade Day Schedule Modal with 1-click action triggers: `[+ Issue Token]`, `[+ Book Appointment]`, `[+ Add Doctor Leave]`, and 1-tap phone/WhatsApp contact links.
- [ ] **Task 23.3**: Mobile Responsive Agenda Timeline View
  - Implement dual-mode presentation: high-density **Mobile Daily Agenda Timeline View** (`block md:hidden`) with horizontal date picker ribbon and vertical chronological cards.
  - Structured 7-column calendar matrix on desktop/tablets (`hidden md:block`).
- [ ] **Task 23.4**: Verification & Testing
  - Add feature tests in `QueueManagementAndCalendarTest.php` verifying calendar search parameters, doctor shift roster aggregation, and day schedule endpoints. Pint formatting and Vite build verification.

### Phase 24: Doctor Visiting Schedules, Chamber Roster & Leave Range Upgrade (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 24.1**: Backend Leave Date Range Support & Conflict Detection (`DoctorScheduleController.php`, `StoreDoctorLeaveRequest.php`)
  - Extend `StoreDoctorLeaveRequest` to validate optional `leave_date_end` (date, `>=:leave_date`).
  - In `DoctorScheduleController::storeLeave`, handle multi-day date range insertion in a database transaction, generating daily records automatically.
  - Add conflict detection helper returning warning counts for existing appointments (`AppointmentRequest`) and tokens (`QueueToken`) on the requested leave dates.
- [ ] **Task 24.2**: Schedule Copy Accelerator & Chamber Management
  - Add 1-click `📋 Copy Sunday Times to Mon-Thu` schedule accelerator in `Schedules.jsx` to pre-fill standard clinic shifts across active working days.
  - Add quick chamber selector pills (`Chamber 1`, `Chamber 2`, `Chamber 3`).
- [ ] **Task 24.3**: Mobile Sub-Tab Navigation & Responsive UI
  - On mobile screens (< 768px), introduce top sub-tabs: `[ 🕒 Weekly Visiting Hours ]` and `[ 🏖️ Leaves & Off-Days ]` to prevent excessive vertical scrolling.
  - Implement doctor search filter for clinics with multiple physicians/consultants.
- [ ] **Task 25.4**: Verification & Testing
  - Add feature tests in `AppointmentRequestWorkflowTest.php` covering search by name, phone, ID, date presets, and quick status actions. Pint formatting and Vite build verification.

### Phase 26: Invoices Directory Search, Quick Due Payment & Multi-Screen Transformation (`/admin/invoices`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 26.1**: Backend Multi-Column Smart Search, Quick Date Presets & CSV Export
  - Upgrade `InvoiceController::index` to search across `invoice_number`, `patient.name`, `patient.phone`, `patient.patient_code`, `patient.old_or_other_id`, `patient.patient_no`, and `visit.doctor.name`.
  - Add date presets filter (`today`, `yesterday`, `this_week`, `this_month`) and payment method filter (`cash`, `bkash`, `nagad`, `rocket`, `card`, `bank`).
  - Add CSV export endpoint (`GET /admin/invoices/export`) to stream filtered invoice records for accounting reconciliation.
- [ ] **Task 26.2**: Desktop & Tablet Experience
  - Implement 350ms debounced search bar with reset (`✕`) button and active filter chips.
  - Add tactile date preset pill buttons (`[ Today ]`, `[ Yesterday ]`, `[ This Week ]`, `[ This Month ]`).
  - Add 1-click `[ 💵 Collect Due ]` modal allowing cashiers to record full or partial payments directly from the directory without navigating to the detail page.
- [ ] **Task 26.3**: Mobile Responsive Touch Cards
  - Implement dual-mode presentation: high-density **Mobile Touch Cards** (`block md:hidden`) displaying invoice #, status badge, patient name with 1-tap call, color-coded financial pills (Total, Paid, Due), and 1-tap thermal POS receipt printing.
- [ ] **Task 26.4**: Verification & Testing
  - Feature test coverage in `PatientBillingAndCashRegisterTest.php` verifying search by old ID, doctor name, date presets, CSV export, and quick payment recording. Pint formatting and Vite build verification.

### Phase 27: Point-of-Sale (POS) Invoice Creation & Cashier Checkout (`/admin/invoices/create`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 27.1**: Backend Pharmacy Catalog & Inventory Search Endpoint
  - Implement `/admin/inventory/batches/search?q=...` to support fast debounced lookup across all active medicine batches, remedies, potencies, and pharmaceuticals with live stock and selling prices.
  - Upgrade `InvoiceController::store` to accept optional `auto_print_pos` boolean and return appropriate redirect/print metadata.
- [ ] **Task 27.2**: Frontend POS Terminal Transformation
  - Upgrade patient selection with rich Demographics Verification Card (Photo, IDs, Old ID, Blood Group, Age) and barcode scanner listener.
  - Replace static 50-item batch dropdown with async debounced Pharmacy Stock Search Combobox.
  - Add built-in POS Cash Drawer Calculator with cash tendered input, quick denomination chips (`[ Exact ]`, `[ ৳500 ]`, `[ ৳1,000 ]`, `[ ৳2,000 ]`), and live change return indicator (ফেরত দিন).
  - Add `[x] Automatically open 80mm POS Thermal Slip print dialog` toggle with fast-track `[ + Create Next Invoice ]` action.
- [ ] **Task 27.3**: Mobile Responsive Touch POS Layout
  - Implement 2-column POS Terminal layout on Desktop/Tablet (Left: Items & Patient, Right: Calculation, Tender & Payment).
  - High-density mobile touch card stream (`block md:hidden`) with tactile `+` / `-` quantity steppers and sticky bottom summary.
- [ ] **Task 27.4**: Verification & Testing
  - Add feature tests in `PatientBillingAndCashRegisterTest.php` covering batch search, change calculation, and POS auto-print redirection. Pint formatting and Vite build verification.

### Phase 28: Communication Settings, Gateway Balance Check & Template Studio Upgrade (`/admin/communications/settings`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 28.1**: Backend Live Gateway Diagnostics & Balance Check Endpoints
  - Add `/admin/communications/check-balance` endpoint querying vendor balance API (Greenweb balance API, MimSMS balance API) and returning credit status.
  - Add `/admin/communications/test-ping` endpoint allowing admin to dispatch a test SMS to a specified phone number and view real-time HTTP response.
  - Extend `UpdateSmsSettingsRequest` and `CommunicationService` to support `auto_sms_billing` trigger and `billing_receipt` template.
- [ ] **Task 28.2**: Frontend Template Studio & Live Counter Transformation
  - Implement real-time character & segment counter distinguishing GSM 7-bit English (160 chars) from Unicode Bengali (70 chars) with amber billing cost alerts.
  - Add clickable variable chips (`[+ Patient Name]`, `[+ Doctor Name]`, `[+ Token Code]`, `[+ Date]`, `[+ Rx Link]`) inserting placeholders at cursor position.
  - Add live Mobile Phone Preview rendering message text in a smartphone simulator frame.
  - Add WhatsApp sharing template customization editor.
- [ ] **Task 28.3**: Mobile Responsive Studio Layout
  - Implement tactile accordion / tabbed view on mobile (`[ 📡 Gateway ]`, `[ ⚡ Triggers ]`, `[ 📝 Templates ]`) preventing long vertical scrolling.
- [ ] **Task 28.4**: Verification & Testing
  - Add feature tests in `AutomatedPatientCommunicationsTest.php` verifying balance checking, test ping dispatch, billing receipt SMS triggering, and template saving. Pint formatting and Vite build verification.

### Phase 29: Clinical, Financial & Operational Analytics Reports Suite (`/admin/reports`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 29.1**: Backend Multi-Dimensional Analytics Aggregation & Search
  - Upgrade `ReportController::index` to support multi-column search (`search` / `q`) across patient name, phone, patient code, and chief complaint / diagnosis.
  - Implement filters for `doctor_id`, `status` (`finalized`, `draft`, `amended`), and `date_preset` (`today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`).
  - Calculate executive KPI summary statistics: total consultations, unique patients seen, finalized prescriptions, and average daily patient volume.
  - Provide domain-specific aggregations: Doctor Productivity metrics and Top Dispensed Remedies.
  - Add CSV export endpoint (`GET /admin/reports/export`) to stream filtered clinical activity records for external statistical analysis.
- [ ] **Task 29.2**: Frontend Analytical Studio & Multi-Tab Dashboard
  - Implement top executive KPI tiles with visual icons and comparative statistics.
  - Add 3 dedicated analytical tabs: `[ 📋 Consultations & Morbidity ]`, `[ 👨‍⚕️ Doctor Productivity ]`, and `[ 💊 Top Dispensed Remedies ]`.
  - Add tactile date preset pill buttons (`[ Today ]`, `[ This Week ]`, `[ This Month ]`, `[ This Year ]`).
  - Add 350ms debounced search bar with reset (`✕`) button and Doctor filter dropdown.
- [ ] **Task 29.3**: Mobile Responsive Analytics Layout
  - Implement high-density mobile touch summary cards (`block md:hidden`) with expandable complaint and diagnosis details.
- [ ] **Task 29.4**: Verification & Testing
  - Feature test coverage in `PatientClinicalAccessTest.php` verifying multi-dimensional report filters, doctor aggregation, CSV export, and permissions. Pint formatting and Vite build verification.

### Phase 30: Homeopathic Medicine Catalog, Pharmacopoeia Search & Batch Inventory Integration (`/admin/medicines`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 30.1**: Backend Multi-Nomenclature Search & Inventory Aggregation
  - Upgrade `MedicineController::index` to support multi-field search (`search` / `q`) matching against Latin name, common name, Bengali phonetic name, and abbreviation.
  - Implement potency scale filtering (`potency_scale`: `all`, `ch`, `lm`, `x`, `q`), formulation filter (`form`: `drops`, `pills`, `liquid`), and status filter (`status`: `active`, `inactive`, `all`).
  - Calculate real-time aggregate physical stock across active `medicine_batches` (`item_type = 'remedy'`) using `withSum('batches as total_batch_stock', 'current_quantity')`.
  - Add configurable pagination (`per_page`: 15, 25, 50, 100) and default alphabetical ordering (`orderBy('name', 'asc')`).
  - Add CSV export endpoint (`GET /admin/medicines/export`) streaming remedies, potencies, formulations, and active inventory stock levels.
- [ ] **Task 30.2**: Frontend Clinical Pharmacopoeia Studio & Filter Pill Strip
  - Implement 300ms debounced search bar with instant reset button (`✕`).
  - Add 1-click potency scale pill strip: `[ All Scales ]`, `[ Centesimal (CH) ]`, `[ 50-Millesimal (LM/Q) ]`, `[ Decimal (X) ]`, and `[ Mother Tinctures (Q) ]`.
  - Add live inventory stock badge (`In Stock (XX)`, `Low Stock (XX)`, `Out of Stock`) with a direct 1-click shortcut to `/admin/inventory?search={name}`.
  - Update deactivation modal to accurately reflect reversible status toggle rather than permanent deletion.
- [ ] **Task 30.3**: Mobile Responsive Pharmacopoeia Touch Cards
  - Implement high-density mobile touch cards (`block md:hidden`) featuring remedy name, Bengali script, potency pill with scale-specific color coding (CH = blue, LM = purple, X = emerald, Q = amber), form icon (💧 Drops, ⚪ Pills, 🧪 Liquid), live stock badge, and 44px+ touch-friendly actions.
- [ ] **Task 30.4**: Verification & Testing
  - Add feature test suite `tests/Feature/MedicineCatalogTest.php` verifying multi-nomenclature search, potency scale filters, batch stock aggregation, soft deactivation, and permissions.

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
  - Implement 300ms debounced search bar with instant reset button (`✕`).
  - Add 1-click horizontal dosage form pill strip: `[ All Forms ]`, `[ Tablet 💊 ]`, `[ Capsule 💊 ]`, `[ Syrup 🧪 ]`, `[ Suspension 🧪 ]`, `[ Injection 💉 ]`, `[ Drops 🧴 ]`, `[ Inhaler / Ointment 🧴 ]`.
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

### Phase 33: Pharmacy Multi-Batch Inventory, FEFO Sorting & Mobile Workstation (`/admin/inventory`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 33.1**: Backend Multi-Attribute Search, FEFO Sorting & Stocktake CSV Export
  - Upgrade `InventoryController::index` to search across `batch_number`, `supplier_name`, `form`, `potency`, `medicine.name`, `pharmaceutical.brand_name`, `pharmaceutical.generic_name`, and `pharmaceutical.strength`.
  - Implement sort selector: `latest` (default), `expiry_asc` (FEFO - earliest expiry first), `stock_asc` (reorder priority), `stock_desc`, `name_asc`.
  - Add supplier filter and configurable pagination (`per_page`: 15, 25, 50, 100).
  - Add CSV export endpoint (`GET /admin/inventory/export`) streaming physical stocktake sheet with batch details, location, current quantity, expiry, cost, and selling valuation.
- [ ] **Task 33.2**: Audit Protection & Cascade Deletion Hardening
  - Upgrade `InventoryController::destroy` to perform safe deactivation (`is_active = false`) if stock transactions exist, protecting the transaction ledger and invoice records.
- [ ] **Task 33.3**: Frontend Workstation & FEFO Sort Controls
  - Implement 300ms debounced instant search with clear (`✕`) button.
  - Add FEFO / Reorder priority sort dropdown and per-page selector.
  - Add `📥 Export Stocktake CSV` action in header.
  - Replace browser `confirm()` with RemediQ's standard `ConfirmDialog` component.
- [ ] **Task 33.4**: Mobile Responsive Inventory Batch Touch Cards
  - Implement high-density mobile touch cards (`block md:hidden`) featuring item title, potency/strength tag, stock balance with reorder indicator, expiry urgency pill, buy/sell valuation chips, and 44px+ touch-friendly action buttons (`Adjust Stock`, `Edit`, `Deactivate`).
- [ ] **Task 33.5**: Verification & Testing
  - Add feature test suite `tests/Feature/PharmacyInventoryTest.php` verifying multi-attribute search, FEFO sorting, CSV export, safe deactivation, and mobile touch cards.
  - Run Pint code formatting and build Vite production assets.

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
  - Implement `resources/js/Pages/Admin/Manufacturers/Index.jsx` with KPI tiles, 300ms debounced search, category filter pills (`All`, `Allopathy 💊`, `Homeopathy 🌿`, `Dual 🏥`, `Surgical 🩺`), desktop DataTable, and mobile touch cards (`block md:hidden`).
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
  - `Symptoms/Index.jsx`: Header KPI ribbon (Total, Active, Mapped, Repertory Chapters), 300ms debounced search with `✕`, 1-click Chapter Tab Pills, Mapping Status dropdown, Desktop DataTable with `💊 X Meds ↗` link, and Mobile High-Density Touch Cards (`block md:hidden`).
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
  - Added 300ms debounced search bar with instant clear (`✕`) button.
  - Implemented Review status tabs (`All`, `Approved ✅`, `Pending Review ⏳`, `Drafts 📝`, `Inactive 🚫`) with real-time counter badges.
  - Implemented Kent Chapter and Grade (1–4) selector dropdowns.
  - Added active filter dismiss banners for cross-module deep links from `/admin/symptoms` and `/admin/medicines`.
  - Upgraded batch CSV import workstation with collapsible toggle to preserve screen space.
- [x] **Task 37.3**: Multi-Screen Responsive Touch Cards (`Index.jsx`)
  - Implemented high-density mobile touch cards (`block md:hidden`) alongside desktop `DataTable` with rubric/remedy tags, grade stars, source citations, status badges, and 44px+ touch-friendly action buttons (`Review`, `Edit`, `Restore`, `Delete`).
- [x] **Task 37.4**: Creation & Editing Studio Upgrades (`Create.jsx` & `Edit.jsx`)
  - Integrated with RemediQ design system and standard `PageHeader`.
  - Added filterable selectors for symptoms and homeopathic medicines.
  - Added visual Grade 1–4 radio selector with clinical descriptions (Ordinary, Moderate, Strong, Keynote).
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
  - `AdviceItems/Index.jsx`: Executive KPI ribbon, 300ms debounced search with `✕`, horizontal Category Filter Tabs, default preset filter, Desktop DataTable, and Mobile High-Density Touch Cards (`block md:hidden`).
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
  - `FoodRestrictions/Index.jsx`: Executive KPI ribbon (5 cards), 300ms debounced search with `✕`, horizontal Category Filter Tabs, default preset filter, Desktop DataTable, and Mobile High-Density Touch Cards (`block md:hidden`).
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
  - `Doctors/Index.jsx`: Executive KPI ribbon (4 tiles), 300ms debounced search bar with `✕` clear button, horizontal Status filter tabs (`All`, `Active in Practice 🩺`, `Inactive / On Leave ⏸️`), Account Linkage filter (`All`, `Linked Account 👤`, `Profile Only 📄`).
  - Desktop `DataTable` (`hidden md:table`): Practitioner avatar thumbnail, active status dot, degrees/credentials, government registration badge (`govt_reg_no`), click-to-call phone links, linked system username badge, and quick action buttons (`View`, `Edit`, `📅 Schedule`, `Toggle Status`, `Delete/Deactivate`).
  - Mobile High-Density Touch Cards (`block md:hidden`): Touch-optimized 44px+ buttons, doctor credentials, specialty, phone links, and schedule deep-links.
  - Clinical Authorship Protection: Smart `ConfirmDialog` warning if a doctor has consultation history (`visits_count > 0`), disabling hard deletion and offering safe deactivation.
- [x] **Task 40.4**: Automated Verification & Regression Testing
  - Authored comprehensive test suite `tests/Feature/DoctorManagementWorkstationTest.php` with 7 feature tests passing (96 assertions).
  - Verified zero regressions in `DoctorControllerTest` and full suite (100 tests passed, 788 assertions).
  - Code formatted with Pint (`vendor/bin/pint --dirty --format agent`) and frontend production assets compiled with Vite (`npm run build`).

### Phase 41: Prescription Options & Clinical Presets Workstation (`/admin/prescription-options`) (`[x] COMPLETED`)
- [x] **Task 41.1**: Domain Model & Clinical Catalog Hardening
  - Updated `ClinicSetting::defaultPrescriptionConfig()` with classical succussion & dilution templates (*১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন*, *শিশি ১০ বার ঝাঁকিয়ে নিবেন*, *চিনির বড়িতে করে সেব্য*, etc.) and expanded dual-practice medication units (`capsules`, `sachets`, `puffs`, `30_min_before`, `as_needed`).
- [x] **Task 41.2**: Backend Controller & KPI Aggregation
  - Upgraded `PrescriptionOptionController@edit` with real-time KPI metrics (`total_timings`, `total_dose_units`, `total_meal_relations`, `total_instructions`, `total_duration_presets`, `default_duration_days`, `default_dose_unit`).
  - Validated clean updates through `UpdatePrescriptionOptionsRequest` and protected by RBAC permissions (`prescription_options.view`, `create`, `update`, `delete`).
- [x] **Task 41.3**: WYSIWYG Clinical Prescription Line Simulator
  - Built an interactive live preview simulator in `Admin/PrescriptionOptions/Edit.jsx` rendering dynamic bilingual (English & Bengali) prescription sentences with customizable remedy, dose quantity, unit, timing, meal relation, and dilution.
- [x] **Task 41.4**: Multi-Screen Touch Ergonomics & Real-Time Preset Search
  - Upgraded `PrescriptionConfigModal.jsx` with real-time keyword search across all 4 tabs (English keys, English labels, Bengali script, instructions, durations).
  - Added 1-Click Fast-Track Clinical Preset Packs toolbar (*🌿 Classical Homeopathy Pack*, *💊 General Practice Pack*, *🔄 Reset Safe Defaults*).
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
  - Added instant search bar with match count indicator and one-click clear button (`✕`) matching category names, codes, and prefixes.
  - Added status filter pills (`All`, `Active`, `Inactive`) for quick category isolation.
- [x] **Task 42.3**: Multi-Screen Responsive Layout & Touch Ergonomics
  - Implemented High-Density Mobile Touch Cards (`block sm:hidden`) with 44px+ touch targets for Edit and Deactivate actions.
  - Added smooth auto-scroll to the editor form container when initiating an edit on mobile devices.
- [x] **Task 42.4**: Fast-Track Clinical Presets & Old ID Business Logic Preservation
  - Added 1-Click Fast-Track Presets toolbar (`🩺 General Patients`, `👶 Pediatric Clinic`, `🧓 Senior Citizens`, `🏕️ Free Camp`).
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
  - Integrated RemediQ `PageHeader` with quick links (`👨‍⚕️ Doctors`, `📅 Calendar`, `🎟️ Queue`, `📝 Requests`).
  - Added 5-card Executive KPI summary ribbon.
  - Implemented real-time Doctor Search Bar with instant filtering and mobile quick-switch `<select>` dropdown.
  - Built 1-Click Fast-Track Schedule Accelerators (`📋 Copy Sunday to Working Days`, `⚡ Apply Sunday to All Active Days`, `🕌 Set Friday Off`).
  - Added Chamber Quick Pills (`Chamber 1`, `Chamber 2`, `Chamber 3`, `OPD Room 1`, `Consultation Room`).
  - Built Multi-Day Leave Range Picker with quick reason chips (*Annual Vacation*, *Medical Leave*, *Conference*, *Emergency*).
  - Added Mobile Sub-Tab Switcher (`[ 🕒 Weekly Visiting Hours ]` vs `[ 🏖️ Leaves & Holidays ]`) with 44px+ touch targets on screens < 768px.
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
  - Integrated RemediQ `PageHeader` with quick links (`👨‍⚕️ Doctors`, `🕒 Schedules`, `🎟️ Queue`, `📝 Requests`).
  - Added 5-card Executive Monthly KPI summary ribbon.
  - Implemented real-time Search Bar with active cell emerald glow highlights and match counter.
  - Added 1-Click Event Category Filter Toolbar (`All Events`, `🕒 Appointments`, `🩺 Visits`, `🏖️ Doctor Leaves`).
  - Integrated recurring doctor shift badges on calendar day cells with automatic strikethrough for approved leaves.
  - Implemented Mobile Daily Agenda Timeline View (`block md:hidden`) with an interactive day-picker ribbon and chronological agenda feed.
  - Upgraded Day Details Studio with 1-tap phone dialing (`tel:`), WhatsApp click-to-chat (`https://wa.me/...`), 1-click token issuance bridge, and fast-track booking link.
- [x] **Task 44.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/CalendarWorkstationTest.php` with 6 feature tests passing (74 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).
- [ ] **Task 25.5**: Staff Intake Creation & Fast-Track Booking Workflow (`/admin/appointment-requests/create`)
  - Pass active doctors with weekly schedules and leaves in `AdminApptController::create`.
  - Implement debounced async patient autocomplete combobox (`/admin/patients/search?q=`) and demographic verification card in `Create.jsx`.
  - Add dual-submission actions: `[ 📝 Save as Pending Request ]` and `[ ⚡ Confirm & Schedule Slot Immediately ]` with automatic SMS dispatch.
  - Add live Doctor Duty & Roster Card showing consulting shifts and off-days/leaves on selected dates.
  - Support pre-filling via URL parameters: `?patient_id=X` and `?date=YYYY-MM-DD`.

### Phase 25: Appointment Requests, Intake Search & Triage Operations Upgrade (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 25.1**: Backend Universal Search, Date Range Filter & KPI Aggregates
  - Upgrade `AdminApptController::index` to accept `search` / `q` matching patient name, phone, request #ID, and message notes.
  - Implement date preset filter (`today`, `tomorrow`, `this_week`, `pending_unactioned`) and custom `scheduled_date` / date range.
  - Compute KPI summary aggregates (`total`, `pending_action`, `contacted`, `scheduled_today`) and return with Inertia payload.
  - Add quick status update route (`PATCH /admin/appointment-requests/{id}/quick-status`) for 1-click status transitions (e.g. marking `contacted`).
- [ ] **Task 25.2**: Desktop & Tablet Experience
  - Implement top KPI metric banner cards with clear operational counts.
  - Add debounced search input (350ms) with reset (`✕`) button and status filter tabs.
  - Display prominent `[ ⏰ Today's Appointment ]` highlight badges and prioritize the `[ 🎟️ Issue Token ]` action for today's arrivals.
- [ ] **Task 25.3**: Mobile Responsive Touch Cards
  - Implement dual-mode presentation: high-density **Mobile Touch Cards** (`block md:hidden`) with 1-tap call (`tel:`) and 1-tap WhatsApp (`wa.me`) reach.
  - Add quick status toggle pill and 1-click `[ 🎟️ Issue Token ]` action bar with touch targets >= 44px.
- [ ] **Task 25.4**: Verification & Testing
  - Add feature tests in `AppointmentRequestWorkflowTest.php` covering search by name, phone, ID, date presets, and quick status actions. Pint formatting and Vite build verification.

### Phase 26: Invoices Directory Search, Quick Due Payment & Multi-Screen Transformation (`/admin/invoices`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 26.1**: Backend Multi-Column Smart Search, Quick Date Presets & CSV Export
  - Upgrade `InvoiceController::index` to search across `invoice_number`, `patient.name`, `patient.phone`, `patient.patient_code`, `patient.old_or_other_id`, `patient.patient_no`, and `visit.doctor.name`.
  - Add date presets filter (`today`, `yesterday`, `this_week`, `this_month`) and payment method filter (`cash`, `bkash`, `nagad`, `rocket`, `card`, `bank`).
  - Add CSV export endpoint (`GET /admin/invoices/export`) to stream filtered invoice records for accounting reconciliation.
- [ ] **Task 26.2**: Desktop & Tablet Experience
  - Implement 350ms debounced search bar with reset (`✕`) button and active filter chips.
  - Add tactile date preset pill buttons (`[ Today ]`, `[ Yesterday ]`, `[ This Week ]`, `[ This Month ]`).
  - Add 1-click `[ 💵 Collect Due ]` modal allowing cashiers to record full or partial payments directly from the directory without navigating to the detail page.
- [ ] **Task 26.3**: Mobile Responsive Touch Cards
  - Implement dual-mode presentation: high-density **Mobile Touch Cards** (`block md:hidden`) displaying invoice #, status badge, patient name with 1-tap call, color-coded financial pills (Total, Paid, Due), and 1-tap thermal POS receipt printing.
- [ ] **Task 26.4**: Verification & Testing
  - Feature test coverage in `PatientBillingAndCashRegisterTest.php` verifying search by old ID, doctor name, date presets, CSV export, and quick payment recording. Pint formatting and Vite build verification.

### Phase 27: Point-of-Sale (POS) Invoice Creation & Cashier Checkout (`/admin/invoices/create`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 27.1**: Backend Pharmacy Catalog & Inventory Search Endpoint
  - Implement `/admin/inventory/batches/search?q=...` to support fast debounced lookup across all active medicine batches, remedies, potencies, and pharmaceuticals with live stock and selling prices.
  - Upgrade `InvoiceController::store` to accept optional `auto_print_pos` boolean and return appropriate redirect/print metadata.
- [ ] **Task 27.2**: Frontend POS Terminal Transformation
  - Upgrade patient selection with rich Demographics Verification Card (Photo, IDs, Old ID, Blood Group, Age) and barcode scanner listener.
  - Replace static 50-item batch dropdown with async debounced Pharmacy Stock Search Combobox.
  - Add built-in POS Cash Drawer Calculator with cash tendered input, quick denomination chips (`[ Exact ]`, `[ ৳500 ]`, `[ ৳1,000 ]`, `[ ৳2,000 ]`), and live change return indicator (ফেরত দিন).
  - Add `[x] Automatically open 80mm POS Thermal Slip print dialog` toggle with fast-track `[ + Create Next Invoice ]` action.
- [ ] **Task 27.3**: Mobile Responsive Touch POS Layout
  - Implement 2-column POS Terminal layout on Desktop/Tablet (Left: Items & Patient, Right: Calculation, Tender & Payment).
  - High-density mobile touch card stream (`block md:hidden`) with tactile `+` / `-` quantity steppers and sticky bottom summary.
- [ ] **Task 27.4**: Verification & Testing
  - Add feature tests in `PatientBillingAndCashRegisterTest.php` covering batch search, change calculation, and POS auto-print redirection. Pint formatting and Vite build verification.

### Phase 28: Communication Settings, Gateway Balance Check & Template Studio Upgrade (`/admin/communications/settings`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 28.1**: Backend Live Gateway Diagnostics & Balance Check Endpoints
  - Add `/admin/communications/check-balance` endpoint querying vendor balance API (Greenweb balance API, MimSMS balance API) and returning credit status.
  - Add `/admin/communications/test-ping` endpoint allowing admin to dispatch a test SMS to a specified phone number and view real-time HTTP response.
  - Extend `UpdateSmsSettingsRequest` and `CommunicationService` to support `auto_sms_billing` trigger and `billing_receipt` template.
- [ ] **Task 28.2**: Frontend Template Studio & Live Counter Transformation
  - Implement real-time character & segment counter distinguishing GSM 7-bit English (160 chars) from Unicode Bengali (70 chars) with amber billing cost alerts.
  - Add clickable variable chips (`[+ Patient Name]`, `[+ Doctor Name]`, `[+ Token Code]`, `[+ Date]`, `[+ Rx Link]`) inserting placeholders at cursor position.
  - Add live Mobile Phone Preview rendering message text in a smartphone simulator frame.
  - Add WhatsApp sharing template customization editor.
- [ ] **Task 28.3**: Mobile Responsive Studio Layout
  - Implement tactile accordion / tabbed view on mobile (`[ 📡 Gateway ]`, `[ ⚡ Triggers ]`, `[ 📝 Templates ]`) preventing long vertical scrolling.
- [ ] **Task 28.4**: Verification & Testing
  - Add feature tests in `AutomatedPatientCommunicationsTest.php` verifying balance checking, test ping dispatch, billing receipt SMS triggering, and template saving. Pint formatting and Vite build verification.

### Phase 29: Clinical, Financial & Operational Analytics Reports Suite (`/admin/reports`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 29.1**: Backend Multi-Dimensional Analytics Aggregation & Search
  - Upgrade `ReportController::index` to support multi-column search (`search` / `q`) across patient name, phone, patient code, and chief complaint / diagnosis.
  - Implement filters for `doctor_id`, `status` (`finalized`, `draft`, `amended`), and `date_preset` (`today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`).
  - Calculate executive KPI summary statistics: total consultations, unique patients seen, finalized prescriptions, and average daily patient volume.
  - Provide domain-specific aggregations: Doctor Productivity metrics and Top Dispensed Remedies.
  - Add CSV export endpoint (`GET /admin/reports/export`) to stream filtered clinical activity records for external statistical analysis.
- [ ] **Task 29.2**: Frontend Analytical Studio & Multi-Tab Dashboard
  - Implement top executive KPI tiles with visual icons and comparative statistics.
  - Add 3 dedicated analytical tabs: `[ 📋 Consultations & Morbidity ]`, `[ 👨‍⚕️ Doctor Productivity ]`, and `[ 💊 Top Dispensed Remedies ]`.
  - Add tactile date preset pill buttons (`[ Today ]`, `[ This Week ]`, `[ This Month ]`, `[ This Year ]`).
  - Add 350ms debounced search bar with reset (`✕`) button and Doctor filter dropdown.
- [ ] **Task 29.3**: Mobile Responsive Analytics Layout
  - Implement high-density mobile touch summary cards (`block md:hidden`) with expandable complaint and diagnosis details.
- [ ] **Task 29.4**: Verification & Testing
  - Feature test coverage in `PatientClinicalAccessTest.php` verifying multi-dimensional report filters, doctor aggregation, CSV export, and permissions. Pint formatting and Vite build verification.

### Phase 30: Homeopathic Medicine Catalog, Pharmacopoeia Search & Batch Inventory Integration (`/admin/medicines`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 30.1**: Backend Multi-Nomenclature Search & Inventory Aggregation
  - Upgrade `MedicineController::index` to support multi-field search (`search` / `q`) matching against Latin name, common name, Bengali phonetic name, and abbreviation.
  - Implement potency scale filtering (`potency_scale`: `all`, `ch`, `lm`, `x`, `q`), formulation filter (`form`: `drops`, `pills`, `liquid`), and status filter (`status`: `active`, `inactive`, `all`).
  - Calculate real-time aggregate physical stock across active `medicine_batches` (`item_type = 'remedy'`) using `withSum('batches as total_batch_stock', 'current_quantity')`.
  - Add configurable pagination (`per_page`: 15, 25, 50, 100) and default alphabetical ordering (`orderBy('name', 'asc')`).
  - Add CSV export endpoint (`GET /admin/medicines/export`) streaming remedies, potencies, formulations, and active inventory stock levels.
- [ ] **Task 30.2**: Frontend Clinical Pharmacopoeia Studio & Filter Pill Strip
  - Implement 300ms debounced search bar with instant reset button (`✕`).
  - Add 1-click potency scale pill strip: `[ All Scales ]`, `[ Centesimal (CH) ]`, `[ 50-Millesimal (LM/Q) ]`, `[ Decimal (X) ]`, and `[ Mother Tinctures (Q) ]`.
  - Add live inventory stock badge (`In Stock (XX)`, `Low Stock (XX)`, `Out of Stock`) with a direct 1-click shortcut to `/admin/inventory?search={name}`.
  - Update deactivation modal to accurately reflect reversible status toggle rather than permanent deletion.
- [ ] **Task 30.3**: Mobile Responsive Pharmacopoeia Touch Cards
  - Implement high-density mobile touch cards (`block md:hidden`) featuring remedy name, Bengali script, potency pill with scale-specific color coding (CH = blue, LM = purple, X = emerald, Q = amber), form icon (💧 Drops, ⚪ Pills, 🧪 Liquid), live stock badge, and 44px+ touch-friendly actions.
- [ ] **Task 30.4**: Verification & Testing
  - Add feature test suite `tests/Feature/MedicineCatalogTest.php` verifying multi-nomenclature search, potency scale filters, batch stock aggregation, soft deactivation, and permissions.

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
  - Implement 300ms debounced search bar with instant reset button (`✕`).
  - Add 1-click horizontal dosage form pill strip: `[ All Forms ]`, `[ Tablet 💊 ]`, `[ Capsule 💊 ]`, `[ Syrup 🧪 ]`, `[ Suspension 🧪 ]`, `[ Injection 💉 ]`, `[ Drops 🧴 ]`, `[ Inhaler / Ointment 🧴 ]`.
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

### Phase 33: Pharmacy Multi-Batch Inventory, FEFO Sorting & Mobile Workstation (`/admin/inventory`) (`[ ] PENDING USER CONFIRMATION`)
- [ ] **Task 33.1**: Backend Multi-Attribute Search, FEFO Sorting & Stocktake CSV Export
  - Upgrade `InventoryController::index` to search across `batch_number`, `supplier_name`, `form`, `potency`, `medicine.name`, `pharmaceutical.brand_name`, `pharmaceutical.generic_name`, and `pharmaceutical.strength`.
  - Implement sort selector: `latest` (default), `expiry_asc` (FEFO - earliest expiry first), `stock_asc` (reorder priority), `stock_desc`, `name_asc`.
  - Add supplier filter and configurable pagination (`per_page`: 15, 25, 50, 100).
  - Add CSV export endpoint (`GET /admin/inventory/export`) streaming physical stocktake sheet with batch details, location, current quantity, expiry, cost, and selling valuation.
- [ ] **Task 33.2**: Audit Protection & Cascade Deletion Hardening
  - Upgrade `InventoryController::destroy` to perform safe deactivation (`is_active = false`) if stock transactions exist, protecting the transaction ledger and invoice records.
- [ ] **Task 33.3**: Frontend Workstation & FEFO Sort Controls
  - Implement 300ms debounced instant search with clear (`✕`) button.
  - Add FEFO / Reorder priority sort dropdown and per-page selector.
  - Add `📥 Export Stocktake CSV` action in header.
  - Replace browser `confirm()` with RemediQ's standard `ConfirmDialog` component.
- [ ] **Task 33.4**: Mobile Responsive Inventory Batch Touch Cards
  - Implement high-density mobile touch cards (`block md:hidden`) featuring item title, potency/strength tag, stock balance with reorder indicator, expiry urgency pill, buy/sell valuation chips, and 44px+ touch-friendly action buttons (`Adjust Stock`, `Edit`, `Deactivate`).
- [ ] **Task 33.5**: Verification & Testing
  - Add feature test suite `tests/Feature/PharmacyInventoryTest.php` verifying multi-attribute search, FEFO sorting, CSV export, safe deactivation, and mobile touch cards.
  - Run Pint code formatting and build Vite production assets.

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
  - Implement `resources/js/Pages/Admin/Manufacturers/Index.jsx` with KPI tiles, 300ms debounced search, category filter pills (`All`, `Allopathy 💊`, `Homeopathy 🌿`, `Dual 🏥`, `Surgical 🩺`), desktop DataTable, and mobile touch cards (`block md:hidden`).
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
  - `Symptoms/Index.jsx`: Header KPI ribbon (Total, Active, Mapped, Repertory Chapters), 300ms debounced search with `✕`, 1-click Chapter Tab Pills, Mapping Status dropdown, Desktop DataTable with `💊 X Meds ↗` link, and Mobile High-Density Touch Cards (`block md:hidden`).
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
  - Added 300ms debounced search bar with instant clear (`✕`) button.
  - Implemented Review status tabs (`All`, `Approved ✅`, `Pending Review ⏳`, `Drafts 📝`, `Inactive 🚫`) with real-time counter badges.
  - Implemented Kent Chapter and Grade (1–4) selector dropdowns.
  - Added active filter dismiss banners for cross-module deep links from `/admin/symptoms` and `/admin/medicines`.
  - Upgraded batch CSV import workstation with collapsible toggle to preserve screen space.
- [x] **Task 37.3**: Multi-Screen Responsive Touch Cards (`Index.jsx`)
  - Implemented high-density mobile touch cards (`block md:hidden`) alongside desktop `DataTable` with rubric/remedy tags, grade stars, source citations, status badges, and 44px+ touch-friendly action buttons (`Review`, `Edit`, `Restore`, `Delete`).
- [x] **Task 37.4**: Creation & Editing Studio Upgrades (`Create.jsx` & `Edit.jsx`)
  - Integrated with RemediQ design system and standard `PageHeader`.
  - Added filterable selectors for symptoms and homeopathic medicines.
  - Added visual Grade 1–4 radio selector with clinical descriptions (Ordinary, Moderate, Strong, Keynote).
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
  - `AdviceItems/Index.jsx`: Executive KPI ribbon, 300ms debounced search with `✕`, horizontal Category Filter Tabs, default preset filter, Desktop DataTable, and Mobile High-Density Touch Cards (`block md:hidden`).
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
  - `FoodRestrictions/Index.jsx`: Executive KPI ribbon (5 cards), 300ms debounced search with `✕`, horizontal Category Filter Tabs, default preset filter, Desktop DataTable, and Mobile High-Density Touch Cards (`block md:hidden`).
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
  - `Doctors/Index.jsx`: Executive KPI ribbon (4 tiles), 300ms debounced search bar with `✕` clear button, horizontal Status filter tabs (`All`, `Active in Practice 🩺`, `Inactive / On Leave ⏸️`), Account Linkage filter (`All`, `Linked Account 👤`, `Profile Only 📄`).
  - Desktop `DataTable` (`hidden md:table`): Practitioner avatar thumbnail, active status dot, degrees/credentials, government registration badge (`govt_reg_no`), click-to-call phone links, linked system username badge, and quick action buttons (`View`, `Edit`, `📅 Schedule`, `Toggle Status`, `Delete/Deactivate`).
  - Mobile High-Density Touch Cards (`block md:hidden`): Touch-optimized 44px+ buttons, doctor credentials, specialty, phone links, and schedule deep-links.
  - Clinical Authorship Protection: Smart `ConfirmDialog` warning if a doctor has consultation history (`visits_count > 0`), disabling hard deletion and offering safe deactivation.
- [x] **Task 40.4**: Automated Verification & Regression Testing
  - Authored comprehensive test suite `tests/Feature/DoctorManagementWorkstationTest.php` with 7 feature tests passing (96 assertions).
  - Verified zero regressions in `DoctorControllerTest` and full suite (100 tests passed, 788 assertions).
  - Code formatted with Pint (`vendor/bin/pint --dirty --format agent`) and frontend production assets compiled with Vite (`npm run build`).

### Phase 41: Prescription Options & Clinical Presets Workstation (`/admin/prescription-options`) (`[x] COMPLETED`)
- [x] **Task 41.1**: Domain Model & Clinical Catalog Hardening
  - Updated `ClinicSetting::defaultPrescriptionConfig()` with classical succussion & dilution templates (*১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন*, *শিশি ১০ বার ঝাঁকিয়ে নিবেন*, *চিনির বড়িতে করে সেব্য*, etc.) and expanded dual-practice medication units (`capsules`, `sachets`, `puffs`, `30_min_before`, `as_needed`).
- [x] **Task 41.2**: Backend Controller & KPI Aggregation
  - Upgraded `PrescriptionOptionController@edit` with real-time KPI metrics (`total_timings`, `total_dose_units`, `total_meal_relations`, `total_instructions`, `total_duration_presets`, `default_duration_days`, `default_dose_unit`).
  - Validated clean updates through `UpdatePrescriptionOptionsRequest` and protected by RBAC permissions (`prescription_options.view`, `create`, `update`, `delete`).
- [x] **Task 41.3**: WYSIWYG Clinical Prescription Line Simulator
  - Built an interactive live preview simulator in `Admin/PrescriptionOptions/Edit.jsx` rendering dynamic bilingual (English & Bengali) prescription sentences with customizable remedy, dose quantity, unit, timing, meal relation, and dilution.
- [x] **Task 41.4**: Multi-Screen Touch Ergonomics & Real-Time Preset Search
  - Upgraded `PrescriptionConfigModal.jsx` with real-time keyword search across all 4 tabs (English keys, English labels, Bengali script, instructions, durations).
  - Added 1-Click Fast-Track Clinical Preset Packs toolbar (*🌿 Classical Homeopathy Pack*, *💊 General Practice Pack*, *🔄 Reset Safe Defaults*).
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
  - Added instant search bar with match count indicator and one-click clear button (`✕`) matching category names, codes, and prefixes.
  - Added status filter pills (`All`, `Active`, `Inactive`) for quick category isolation.
- [x] **Task 42.3**: Multi-Screen Responsive Layout & Touch Ergonomics
  - Implemented High-Density Mobile Touch Cards (`block sm:hidden`) with 44px+ touch targets for Edit and Deactivate actions.
  - Added smooth auto-scroll to the editor form container when initiating an edit on mobile devices.
- [x] **Task 42.4**: Fast-Track Clinical Presets & Old ID Business Logic Preservation
  - Added 1-Click Fast-Track Presets toolbar (`🩺 General Patients`, `👶 Pediatric Clinic`, `🧓 Senior Citizens`, `🏕️ Free Camp`).
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
  - Integrated RemediQ `PageHeader` with quick links (`👨‍⚕️ Doctors`, `📅 Calendar`, `🎟️ Queue`, `📝 Requests`).
  - Added 5-card Executive KPI summary ribbon.
  - Implemented real-time Doctor Search Bar with instant filtering and mobile quick-switch `<select>` dropdown.
  - Built 1-Click Fast-Track Schedule Accelerators (`📋 Copy Sunday to Working Days`, `⚡ Apply Sunday to All Active Days`, `🕌 Set Friday Off`).
  - Added Chamber Quick Pills (`Chamber 1`, `Chamber 2`, `Chamber 3`, `OPD Room 1`, `Consultation Room`).
  - Built Multi-Day Leave Range Picker with quick reason chips (*Annual Vacation*, *Medical Leave*, *Conference*, *Emergency*).
  - Added Mobile Sub-Tab Switcher (`[ 🕒 Weekly Visiting Hours ]` vs `[ 🏖️ Leaves & Holidays ]`) with 44px+ touch targets on screens < 768px.
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
  - Integrated RemediQ `PageHeader` with quick links (`👨‍⚕️ Doctors`, `🕒 Schedules`, `🎟️ Queue`, `📝 Requests`).
  - Added 5-card Executive Monthly KPI summary ribbon.
  - Implemented real-time Search Bar with active cell emerald glow highlights and match counter.
  - Added 1-Click Event Category Filter Toolbar (`All Events`, `🕒 Appointments`, `🩺 Visits`, `🏖️ Doctor Leaves`).
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
  - Built real-time 300ms debounced search bar with instant clear button (`✕`) and match counter.
  - Added 1-Click Date Preset Filter Pills (`All Requests`, `📅 Today's Bookings`, `🌅 Tomorrow`, `🗓️ This Week`, `⏳ Pending Triage`).
  - Added Today's Appointment highlight badge (`📅 TODAY`) with emerald border and soft emerald background.
  - Added 1-Click `[ 📞 Contacted ]` action button with live server-side update.
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
  - Integrated RemediQ `PageHeader` with quick navigation links (`🔢 Patient Numbering`, `📝 Rx Presets`, `👨‍⚕️ Doctors`, `🎟️ Queue`).
  - Added 5-card Executive KPI summary ribbon with real-time operational status.
  - Implemented real-time in-page search bar (300ms debounce) matching all setting titles, labels, descriptions, and values with clear button (`✕`) and visual emerald glow highlighting.
  - Added Category Filter Tabs Strip (`All Settings`, `🩺 Practice Mode`, `📦 Stock & Pharmacy`, `🧾 Billing & bKash`, `🎨 Branding`, `🏥 General Info`, `🕒 Visiting Hours`, `🌐 Website & About`).
  - Added dedicated bKash / Mobile Financial Services (MFS) card in Billing section for token and POS invoice cashless payments.
  - Added 1-Click Fast-Track Practice Mode Presets Toolbar (`🌿 Classical Pack`, `💊 General Pack`, `⚖️ Dual Pack`).
  - Added 1-Click Visiting Hours schedule accelerators (`📋 Copy Sunday to Working Days`, `🕌 Set Friday Closed`, `⚡ Standard 9am-9pm OPD`).
  - Implemented responsive multi-screen layout with adaptive input stacking (`grid-cols-1 sm:grid-cols-2`) and floating Sticky Bottom Save Drawer on mobile viewports (< 640px).
- [x] **Task 46.3**: Automated Testing & Suite Verification
  - Authored comprehensive test suite `tests/Feature/ClinicSettingsWorkstationTest.php` with 5 feature tests passing (47 assertions).
  - Verified full settings test suite with zero regressions (50 tests passed, 250 assertions).
  - Formatted PHP code with Laravel Pint (`vendor/bin/pint --dirty --format agent`).
  - Compiled production frontend assets with Vite (`npm run build`).
