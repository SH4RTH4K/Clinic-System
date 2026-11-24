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
