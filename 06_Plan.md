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
  - Autocomplete search API (`/admin/lab-investigations/search`).
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
