# Product Requirements Document (PRD)
## RemediQ - Dual-Purpose Practice Management System
*(Classical Homeopathy, General Medicine & Integrative Clinics)*

**Document Version:** 3.0  
**Target Platform:** Laravel 11 (PHP 8.3) + Inertia.js v2 + React 18 + Tailwind CSS  
**Target Hosting:** Production cPanel Shared Hosting (LiteSpeed / Apache, MySQL 8 / MariaDB)  
**Status Legend:**  
- `[x] Done`: Fully implemented, verified with automated tests, and running in production code.  
- `[ ] Pending`: Identified feature gap, planned enhancement, or backlog requirement.

---

## 1. Executive Summary & Vision
**RemediQ** is a high-performance, practice-adaptive clinical platform designed to support:
1. **Classical & Modern Homeopathy Practices**: Full repertory analysis, rubric-to-remedy grading, dynamic potencies (Centesimal, Decimal, 50-Millesimal LM/Q), and classical dietary restrictions.
2. **General Practice / Allopathic Clinics (MBBS / Specialist)**: Generic and brand-name pharmaceuticals, standardized strengths (mg, ml, IU), dosage forms (Tablet, Capsule, Syrup, Injection), lab investigation orders, and clinical diagnoses.
3. **Integrative / Multi-Disciplinary Polyclinics**: Dual-mode clinics where practitioners can prescribe both conventional and complementary medicine within a unified patient journey.

The system delivers seamless patient intake, longitudinal electronic health records (EHR), bilingual (English & Bengali) prescription generation, doctor profiles, public patient portals, and automated system administration.

---

## 2. Practice Mode Architecture

The clinic's clinical behavior adapts dynamically based on the configured `practice_type` setting:

| Feature / Workspace | Homeopathy Mode | General Practice (Allopathy) Mode | Integrative / Dual Mode |
| :--- | :--- | :--- | :--- |
| **Consultation Header** | Constitutional Case Taking | Clinical Diagnosis & Symptoms | Tabbed: Both available |
| **Symptom Evaluation** | Rubrics Catalog & Repertorization | Chief Complaints & Clinical Signs | Rubrics or Free Complaints |
| **Medication Input** | Remedy Name + Potency + Scale | Brand/Generic + Strength + Form | Dual Selector (Remedy or Drug) |
| **Dosage Vehicle** | Pills, Dilution, Globules, Drops | Tablet, Capsule, Syrup, Injection | Full Spectrum |
| **Clinical Orders** | Food/Lifestyle Restrictions | Lab Tests (CBC, X-Ray, USG, LFT) | Restrictions + Lab Orders |
| **Prescription Output** | Homeopathic Pad Layout | Conventional Rx Pad Layout | Multi-Section Rx Layout |

---

## 3. User Personas & Role Matrix

| Role | Primary Responsibilities | Access Boundaries |
| :--- | :--- | :--- |
| **Super Admin** | System configuration, practice mode setting, staff accounts, role definitions, audit logs, database/git deployment, backups | Unrestricted full system access. Protected against demotion/deletion. |
| **Doctor (Homeopath / Allopath / Integrative)** | Patient consultation, case history, diagnosis, repertory analysis, lab orders, prescription issuance, amendments | Full access to clinical records, visits, medication databases, and patient clinical views. |
| **Receptionist** | Front-desk patient onboarding, queue coordination, appointment scheduling, basic demographics | Read/Write access to patients, appointments, public inquiries; NO clinical access. |
| **Pharmacist / Dispensary** *(Planned)* | Remedy dispensing, stock control, batch tracking, expiry monitoring | Access to pharmacy inventory, dispensing queues, and stock movements. |
| **Accountant** *(Planned)* | Fee collection, pharmacy billing, payment reconciliation, daily financial ledger | Access to invoices, billing, payments, and financial reports. |
| **Patient (Public)** | View clinic info, doctor specializations, submit appointment intake requests | Public website access only; rate-limited request submissions. |

---

## 4. Detailed Functional Modules & Requirements

### Module 1: Authentication, Authorization & Staff Management
- `[x] Done` **Multi-Identifier Login**: Support secure authentication via either email address or unique username.
- `[x] Done` **Role-Based Access Control (RBAC)**: Powered by `spatie/laravel-permission` with granular permissions (`patients.*`, `visits.*`, `medicines.*`, `symptoms.*`, `roles.*`, `users.*`, `system_health.*`).
- `[x] Done` **Super Admin Protection**:
  - Only "Super Admin" can access `/admin/users`, `/admin/roles`, `/admin/permissions`, and `/admin/system-health`.
  - Application prevents deleting, deactivating, or demoting the last remaining active Super Admin.
  - Super Admin permissions cannot be modified or revoked through the UI.
- `[x] Done` **Security Audit Logging**: Powered by `spatie/laravel-activitylog`. Captures all critical actions with non-sensitive metadata.
- `[x] Done` **Staff Profile Management**: Staff users can update name, email, and password. Profile self-deletion is disabled; staff deactivation is strictly reserved for Super Admin.
- `[x] Done` **Dynamic Clinic Branding & Language-Wise Browser Tab Titles**: Browser tab titles and sidebar navigation dynamically display the configured Clinic Name from Clinic Settings (`/admin/settings`) according to active language version (`clinic_name_en` for English and `clinic_name_bn` for Bangla), completely replacing static default titles (`- Laravel`). Includes 1-click Language Switcher (`বাং` / `EN`) in topbar navigation.

---

### Module 2: Patient Registration & Sequential Identification
- `[x] Done` **Configurable Numbering Profiles**: Multi-sequence numbering profiles (`patient_numbering_profiles`) with customizable prefixes, separators, sequence lengths, and reset periods (none, daily, monthly, yearly).
- `[x] Done` **Comprehensive Demographics**: Patient records store full name, primary phone, secondary phone, gender, blood group, address, reference number, date of birth, known allergies, and permanent medical history (`medical_history`).
- `[x] Done` **Permanent Medical History & Auto-Show in Chief Complaints**: Patient master profile stores permanent Medical History with role-based clinical privacy protection (`clinical_records.view`). During New Visit consultations (`/admin/visits/create`), the patient's medical history automatically populates the Chief Complaints field, supported by a 1-click `+ Insert Medical History` action and dedicated clinical background badge.
- `[x] Done` **Consultation Workbench Accelerators**:
  - **Clinical History Drawer**: Slide-over panel on `/admin/visits/create` displaying previous consultations, diagnoses, prescription details, and lab attachments without leaving the consultation page.
  - **1-Click Repeat Last Prescription**: Quickly duplicates the patient's previous finalized remedies, potencies, and instructions to the active Rx pad.
  - **Common Diagnosis Autocomplete**: Pre-built clinical diagnoses dictionary for rapid input.
- `[x] Done` **Longitudinal Clinical Context & Legacy Migration Last Visit Date**: Immediate front-desk and physician visibility of patient visit count (`effective_visits_count`), effective last visit date (`effective_last_visit_date`), and active queue token for today (`today_queue_token`) across the patient registry (`/admin/patients`), patient profile (`/admin/patients/{id}`), and visit consultation (`/admin/visits/create`). Features configurable **Editable Last Visit Date & Past Visits Count (Yes/No)** in Patient Configuration (`/admin/patient-config`) for migrating historical clinic patients from paper cards/Excel without data conflict.
- `[x] Done` **Section-Wise Patient Form Configuration & Dynamic Layout**: Clinic administrators can manage patient form sections at the section level on `/admin/patient-config`: reordering sections (`↑` / `↓`), master section visibility toggling (hide entire sections such as Legacy Migration in 1 click), and customizing section display titles. Patient creation (`/admin/patients/create`) and edit (`/admin/patients/{id}/edit`) forms dynamically render in the configured section sequence.
- `[x] Done` **Production Storage & Backup Hardening Guidance**: System Health Operations (`/admin/system-health`) clarified with cPanel storage architecture guidance: explaining in-app Git deployment checkout size in private storage (`storage/app/private/git-repository`), and guiding resolution of `SYSTEM_HEALTH_BACKUP_PATH` outside `public_html` to prevent `Check permissions` warnings.
- `[x] Done` **Queue-to-Visit Auto-Link & Duplicate Warning**: Automatically links today's waiting queue token to the consultation on `/admin/visits/create` and marks the token `completed` upon visit finalization. Warns staff on token issuance (`/admin/queue/tokens/create`) if the patient already holds an active token today.
- `[x] Done` **Precise Age Calculation**: Captures age in Years, Months, and Days, automatically calculated from Date of Birth or entered manually when DOB is unknown.
- `[x] Done` **Guardian / Primary Contact System**: Full support for guardian name and configurable relationship types (Father, Mother, Spouse, Guardian, Son, Daughter, Other).
- `[x] Done` **Old / Legacy ID Tracking**: Configurable auto-generation and manual recording of legacy clinic serial numbers (`old_or_other_id`).
- `[x] Done` **Customizable Form Layout**: Clinic settings allow enabling, disabling, and ordering demographic fields.
- `[x] Done` **Unified Multi-Factor Search & Filtering**: Instant search matching Name, Phone number, System Patient ID, Series code, Old/Other ID, and Guardian/Contact Name, combined with Gender, Blood Group, and Date Range filters (Today, This Week, This Month).
- `[x] Done` **Patient Management Dashboard & Quick Actions**: Top KPI metrics (Total Patients, Registered Today, In Queue Today, Total Consultations), row-level 1-click Quick Actions (`+ Queue`, `+ Visit`, `OPD Card`, `View`, `Edit`), dynamic queue status indicators, direct WhatsApp (`https://wa.me/...`) and phone (`tel:...`) links, role-guarded blood group privacy (`clinical_records.view`), and streaming CSV export (`/admin/patients/export`).
- `[x] Done` **Patient Photo & Web-Cam Capture**: Allow capturing patient portrait directly via browser webcam or uploading an image file (JPG/PNG/WEBP) stored in protected disk storage.
- `[x] Done` **Printable OPD Card / Patient Pass**: Printable A6/ID-card format with clinic branding, patient photo, patient identifier, and zero-dependency pure SVG Code-128 barcode for instant check-in.
- `[x] Done` **Diagnostic & Lab Attachments**: Secure file upload for past medical reports, blood tests, and ultrasound scans (PDF, JPG, PNG, WEBP) stored in private storage with role-based download/view permissions.

---

### Module 3: Clinical Consultations & Case Taking (Visits)
- `[x] Done` **Auto-Saving Visit Drafts**: Background auto-save to `visit_drafts` table prevents data loss during lengthy medical or homeopathic consultations.
- `[x] Done` **Comprehensive Case History**: Captures Chief Complaints, Present Illness, Past Medical History, Family Medical History, Physical Observations, and Doctor Internal Notes.
- `[x] Done` **Consultation Finalization Workflow**: Transition draft visits to finalized immutable state with doctor signature metadata.
- `[x] Done` **Clinical Amendment Workflow**: Finalized visits cannot be quietly altered. Any modifications create an audited record in `visit_amendments` with doctor rationale.
- `[x] Done` **Prescription Cancellation Audit**: Doctors can mark a prescription as cancelled with mandatory written reason, preserving historical legal integrity.
- `[x] Done` **Practice Mode Adapter for Consultations**:
  - In **Homeopathy Mode**: Displays rubrics multi-select, symptom grading, and repertory remedy recommendations.
  - In **General Practice Mode**: Displays Provisional/Final Diagnosis field (ICD-10 / free-text), clinical examination findings, and Lab Investigation order builder.
  - In **Integrative Mode**: Allows doctors to document both conventional diagnosis and homeopathic repertorization.
- `[x] Done` **Homeopathic Physical Generals**: Structured inputs for Thermal State (Hot/Chilly/Ambithermal), Thirst, Food Cravings & Aversions, Tongue, Sweat, Sleep & Dreams, and Modalities (`<` / `>`).
- `[x] Done` **Diagnostic Lab Test Order Builder**: Interface to order diagnostic investigations (e.g., CBC, Serum Creatinine, USG of Whole Abdomen, Chest X-Ray) with instructions.
- `[x] Done` **Universal Vital Signs Tracking**: Form fields and longitudinal tracking graphs for Blood Pressure (systolic/diastolic), Pulse, Body Temp (°F/°C), Weight (kg), Height (cm), calculated BMI, and Random Blood Sugar (RBS).
- `[x] Done` **Queue-Driven Consultation Picker**: 1-click loading from today's waiting queue tokens ribbon on consultation start.
- `[x] Done` **Inline Medical History Quick-Update**: Doctors can edit permanent medical history, allergies, and blood group inline during consultation without page reload.
- `[x] Done` **Diagnosis to Medical History Sync**: Optional 1-click sync of final diagnosis to patient permanent medical history upon finalization.
- `[x] Done` **Post-Finalization Direct Redirection**: Redirects directly to digitized prescription display (`admin.visits.show`) upon completion.
- `[x] Done` **Flexible Medical Background Field Grid Ordering**: Unified grid styling ensuring individual field ordering (`order`) is respected across `blood_group`, `known_allergies`, and `medical_history`.
- `[x] Done` **Visits Directory & Clinical Log Overhaul (`/admin/visits`)**: Comprehensive search & filtering (patient name, phone, IDs, doctor, diagnosis, complaints, date range, status), executive KPI summary cards (Today's Consultations, Total Consultations, Finalized Prescriptions, Pending Drafts), 1-click POS billing bridge (`+ Create Invoice` & invoice status badge), 1-click WhatsApp prescription sharing, N+1 query optimization, streaming CSV export (`/admin/visits/export`), and high-density mobile touch cards (`block md:hidden`).

---

### Module 4: Dual Medication & Repertory Database

#### 4.1 Homeopathy Domain
- `[x] Done` **Symptom Master Catalog**: Hierarchical Kent Repertory rubrics catalog categorized across 11 classical chapters (`mind`, `head`, `eyes_ent`, `digestion`, `abdomen_stool`, `urinary`, `respiratory`, `extremities`, `skin`, `fever`, `generalities`).
- `[x] Done` **Standardized Rubric Attributes**: Code identifiers (e.g. `MIND-01`, `FEV-01`), bilingual titles (English & Bengali), and clinical modalities (`<` / `>`).
- `[x] Done` **Homeopathic Remedy Database**: Comprehensive catalog containing remedy scientific names, common names, origin, and standard potencies.
- `[x] Done` **Rubric-to-Remedy Mapping**: Grading system (Grades 1 to 4: Ordinary, Moderate, Strong, Keynote) mapping remedies to specific symptoms with classical literature citation (Kent, Boericke, Boger, Allen).
- `[x] Done` **Repertory Knowledge Graph Workstation (`/admin/symptom_medicine_map`)**:
  - Top executive KPI ribbon: Total References, Active in CDSS, Pending Review queue, Drafts, Inactive.
  - Multi-parameter search & filtering: 300ms debounced search matching rubric English/Bengali, code, remedy name, potency, notes, and source citation.
  - Review lifecycle tabs: `All`, `Approved (Active CDSS) ✅`, `Pending Review ⏳`, `Drafts 📝`, `Inactive 🚫`.
  - Kent Repertory chapter and Grade (1–4) dropdown filters.
  - Cross-module deep linking: seamless filter isolation when navigated via `?symptom_id={id}` or `?medicine_id={id}` with dismissible active filter badges.
  - Multi-screen responsive layout: desktop `DataTable` alongside high-density mobile touch cards (`block md:hidden`) with 44px+ touch-friendly actions (`Review`, `Edit`, `Restore`, `Delete`).
  - Collapsible CSV batch ingestion workstation with validation summary and row error inspector.
  - Fast-Track 1-Click Classical Literature Presets in Create and Edit studios (*Kent*, *Boericke*, *Boger*, *Allen*).
- `[x] Done` **Repertory Review & Versioning**: Multi-tier review workflow supporting Draft, Pending Review, Approved, and Deprecated statuses with immutable `SymptomMedicineMapVersion` historical auditing.
- `[x] Done` **Live Repertory Suggestions**: Selecting symptoms dynamically surfaces the most indicated remedies ranked by cumulative grade.
- `[x] Done` **Bulk CSV Import**: Preview and batch import repertory mappings with validation.
- `[x] Done` **Clinical Advice & Lifestyle Instructions Catalog (`/admin/advice_items`)**:
  - Pre-seeded catalog of 25 bilingual clinical advice guidelines across 6 clinical disciplines: Homeopathic Rules (30-min rule, olfactory protection), General Health & Hydration, Diet & Nutrition, Lifestyle & Rest, Hygiene, and Emergency Safety Signs.
  - Auto-selected default presets (`is_default: true`) automatically attaching to Step 5 of new consultations.
  - 300ms debounced search matching Bengali and English instruction text with instant clear (`✕`).
  - 1-click Category Filter Tabs with real-time counters and default preset filter.
  - Multi-screen responsive layout: desktop `DataTable` alongside high-density mobile touch cards (`block md:hidden`).
  - 1-Click Fast-Track Presets Toolbar in Create and Edit studios.
  - Safe deactivation guarding historical prescription references in `visit_advice`.
- `[x] Done` **Responsive Directory & Ergonomics**:
  - Top executive KPI ribbon (Total Symptoms, Active, Mapped to Remedies, Unmapped, Repertory Chapters).
  - 300ms debounced search matching code, English rubric, Bengali rubric, category, and modalities with instant clear (`✕`).
  - 1-click Chapter Tab Pills and Mapping Status filters (`Mapped`, `Unmapped`).
  - High-density mobile touch cards (`block md:hidden`) alongside desktop `DataTable`.
  - 1-Click Kent Rubric Presets Toolbar on creation studio.
- `[ ] Pending` **Homeopathic Scale Specifications**: Native support for Centesimal (CH), Decimal (X), 50-Millesimal (LM/Q), and Mother Tinctures (Q/MT).

#### 4.2 General Medicine / Allopathy Domain
- `[x] Done` **Conventional Pharmaceutical Database**:
  - Generic Name (e.g., Paracetamol, Amoxicillin, Omeprazole).
  - Brand Trade Name (e.g., Napa, Ace, Moxaclav, Seclo).
  - Form & Route (Tablet, Capsule, Syrup, Suspension, Drop, Injection, Ointment, Inhaler).
  - Strength / Concentration (e.g., 500mg, 650mg, 20mg/5ml, 1g).
  - Manufacturer / Pharmaceutical Company.
- `[x] Done` **Lab Investigations Master Catalog**:
  - Pre-seeded catalog of common diagnostic investigations categorized by discipline (Hematology, Biochemistry, Radiology, Ultrasound, Microbiology).
  - Standardized short codes (`CBC`, `FBS`, `LFT`, `USG-WA`), Bengali names, specimen types (`blood`, `urine`, `imaging`), reference ranges, and turnaround times.
  - Standard in-house fees (৳) auto-populating patient billing invoices via `BillingService`.
  - Debounced multi-field search (300ms) matching name, code, Bengali name, specimen, and instructions with instant category pill filtering.
  - Multi-screen responsive layout: desktop data table + high-density mobile touch cards (`block md:hidden`).
  - 1-Click Clinical Presets Toolbar in `Create.jsx` for fast-track package onboarding (Lipid Profile, Thyroid TSH, Dengue NS1, etc.).

---

### Module 5: Bilingual Prescription Engine & PDF Generation
- `[x] Done` **Interactive Medication Builder**: Select remedy or pharmaceutical item, potency/strength, dosage form, frequency, and duration.
- `[x] Done` **Bilingual Dosage Instructions**: Predefined and custom instructions available in both English and Bengali (e.g., "১টি করে ট্যাবলেট দিনে ৩ বার খাবার পর", "৪ ফোঁটা সামান্য পানিতে").
- `[x] Done` **Standard Dietary & Lifestyle Advice**: Configurable dietary restrictions and lifestyle advice (`advice_items`, `food_restrictions`).
  - Pre-seeded with 25 bilingual clinical advice items across 6 categories (Homeopathic, General, Diet, Lifestyle, Hygiene, Warning) and 25 clinical dietary restrictions across 6 categories (Homeopathic Antidotes, Cold & Sour, Spicy & Oily, Allergenic, Metabolic, General).
  - Executive KPI metric ribbon, 300ms debounced search, category pill tabs, and default preset filter (`⭐ Auto-Selected for New Visits`).
  - Dual-mode multi-type presentation: Desktop `DataTable` + High-Density Mobile Touch Cards (`block md:hidden`) with 44px+ touch targets.
  - Safe deactivation pattern (`is_active = false`) for items referenced in historical patient visits, preventing fatal SQL 1451 integrity errors.
  - 1-Click Fast-Track Clinical Presets Toolbar in `Create.jsx` and `Edit.jsx` for rapid onboarding.
- `[x] Done` **High-Fidelity PDF Generation**: Powered by `barryvdh/laravel-dompdf`. Custom configured with self-hosted `NotoSansBengali` TrueType fonts for flawless Bengali conjunct rendering.
- `[x] Done` **Configurable Pad Geometry**: Margins, header offset, font sizing, and signature blocks configurable via admin settings.
- `[x] Done` **Dual-Layout Prescription Styling**:
  - Homeopathy layout: Emphasizes remedy potencies, dilutions, and dietary restrictions.
  - General practice layout: Includes patient vitals block, clinical diagnosis, Rx medications with generic names, and investigation advice.
- `[x] Done` **Clinic Logo & Favicon Uploader**: Settings UI to upload clinic logo image (PNG/SVG/JPG/WEBP) and favicon (ICO/PNG/SVG).
- `[x] Done` **Pre-Printed Stationery Mode**: One-click toggle in prescription print view to hide clinic header and margins when printing on official pre-printed letterheads.
- `[x] Done` **Doctor Digital Signature & Seal**: Upload transparent PNG signature and clinic registration stamp to automatically append to finalized PDF exports.

---

### Module 6: Public Website, Doctor Profiles & Online Inquiries
- `[x] Done` **Responsive Public Portal**: Homepage with Hero banner, About clinic section, Visiting hours grid, and Google Maps location.
- `[x] Done` **Doctor Profiles**: Detailed doctor directory showing credentials, specialization (Homeopathic Physician, General Physician, Specialist), photo, visiting schedule, and contact numbers.
- `[x] Done` **Doctor Profiles & Practitioner Management Workstation (`/admin/doctors`)**: Multi-attribute debounced search (Doctor Name in EN/BN, degrees/credentials in EN/BN, Govt Reg No, specialty in EN/BN, phone, appointment phone, email), multi-screen presentation with responsive Executive KPI Ribbon (Total Doctors, Active in Practice, Linked Login Accounts, Chamber Scheduled), horizontal Status filter tabs (`All`, `Active in Practice 🩺`, `Inactive / On Leave ⏸️`), Account Linkage filter (`All`, `Linked Account 👤`, `Profile Only 📄`), Desktop DataTable with photo preview, registration badges, click-to-call, and fast status toggles, High-Density Mobile Touch Cards (`block md:hidden`), direct 1-click `PATCH /admin/doctors/{doctor}/toggle-status` active toggle, deep-links to Chamber Schedules (`/admin/doctor-schedules?doctor_id=`) and Consultation History (`/admin/reports?doctor_id=`), and historical visit clinical authorship protection against hard deletion.
- `[x] Done` **Online Appointment Request**: Public booking form capturing patient name, phone, preferred doctor, date, and health concerns. Protected with IP rate-limiting (`5,1`).
- `[x] Done` **Bilingual Interface**: Public site language switcher between English and Bengali (`LanguageController`).
- `[x] Done` **Admin Appointment Processing**: Receptionist/Admin can review incoming requests, schedule intakes, link to existing patients, or convert to new patient records.
- `[x] Done` **Interactive Doctor Calendar**: Visual calendar view showing doctor availability, reserved slots, and holiday schedules.
- `[x] Done` **Waiting Room Queue Board**: Live queue display for clinic reception TV showing Token Number, Patient Name (masked for privacy), Assigned Doctor, and Consultation Status.

---

### Module 7: Pharmacy Inventory & Stock Control (Dual Stock)
- `[ ] In Progress` **Homeopathic Medicine Catalog & Master Pharmacopoeia (`/admin/medicines`)**:
  - Comprehensive clinical formulary storing Latin scientific names, homeopathic abbreviations (e.g. *Arn.*, *Nux-v.*, *Lyc.*), Bengali phonetic names, and common vernacular names.
  - Multi-scale potency support across Centesimal (CH), 50-Millesimal (LM/Q), Decimal (X), and Mother Tinctures (MT/Q).
  - Multi-formulation classification: Dilution Drops, Medicated Sugar Globules/Pills, Crude Liquid Tinctures, and Trituration Tablets.
  - Live batch inventory synchronization displaying real-time physical stock counts and low-stock warning indicators directly in the catalog.
  - Responsive multi-screen presentation with tactile mobile touch cards (`block md:hidden`) and high-density desktop pharmacopoeia grid with CSV export.
- `[x] Done` **Allopathic Pharmaceuticals Catalog & General Practice Formulary (`/admin/pharmaceuticals`)**:
  - Central commercial medication formulary maintaining brand names, active generic chemical formulations, strengths, dosage forms (Tablet, Capsule, Syrup, Injection, Drops), and pharmaceutical manufacturers.
  - Multi-parameter search matching brand name, generic name, strength (mg/ml), manufacturer, and Bengali script.
  - 1-click dosage form filter pill strip with contextual medical icons (💊, 🧪, 💉, 🧴).
  - Real-time physical batch stock aggregation across active `medicine_batches` with 1-click restocking shortcut to `/admin/inventory`.
  - Data safety hardening replacing destructive cascade deletions with reversible soft deactivation (`is_active`).
  - Mobile touch cards (`block md:hidden`) and desktop formulary workstation with CSV export.
- `[x] Done` **Allopathic Pharmaceutical Drug Creation & Intake Workflow (`/admin/pharmaceuticals/create`)**:
  - Restoring top header action link (`actions` prop in `PageHeader`) for immediate navigation.
  - Expanded dosage forms (`Gel`, `Lotion`, `Eye Drops`, `Ear Drops`, `Nasal Spray`, `Powder / Sachet`, `IV Infusion`).
  - Therapeutic classification and pharmacological family grouping.
  - Optional atomic initial batch intake allowing opening inventory to be logged during master drug registration.
  - Tactile quick-select chips for strengths (`500mg`, `20mg`, `40mg`, `100ml`) and pharmaceutical manufacturers (`Square`, `Beximco`, `Incepta`).
- `[x] Done` **Pharmaceutical & Remedy Manufacturer Master Management (`/admin/manufacturers`)**:
  - Centralized master directory for pharmaceutical companies, homeopathic laboratories (Schwabe, SBL, Reckeweg), dual-practice suppliers, and surgical vendors.
  - Granular contact management for Medical Representatives (MR), Area Managers, direct hotlines, and order desk emails with 1-click `tel:` calling and WhatsApp messaging.
  - Quick-preset accelerator for top Bangladeshi and international laboratories with instant category pills (`💊 Allopathy Pharma`, `🌿 Homeopathy Lab`, `🏥 Dual Practice`, `🩺 Surgical & Diag.`).
  - Native integration with `/admin/pharmaceuticals/create` and `Edit.jsx` via HTML5 datalist, quick chips, and inline `+ Add New Company` shortcut.
  - Dedicated search autocomplete endpoint (`/admin/manufacturers/search`) and safe reversible deactivation.
- `[ ] In Progress` **Pharmacy Multi-Batch Inventory & Stock Control Workstation (`/admin/inventory`)**:
  - Central operational command center managing Homeopathic potencies (CH, LM, X, MT) and Allopathic pharmaceuticals across active batches.
  - Multi-attribute search matching remedy Latin/common name, pharma brand, generic, potency, strength (mg/ml), batch number, and supplier name.
  - FEFO (First-Expired, First-Out) shelf rotation sorting and lowest stock reorder prioritization.
  - Offline physical audit stocktake CSV export.
  - Safe soft deactivation preventing cascade deletion of stock transactions.
  - Tactile mobile touch cards (`block md:hidden`) replacing horizontal table scrolling.
- `[x] Done` **Dual Stock Management**:
  - Homeopathic inventory: Dilutions, Mother Tinctures (30ml, 100ml, 450ml), Globules, and Biochemic preparations.
  - Allopathic inventory: Box/Strip packaging, tablets, syrups, injections.
  - Interactive polymorphic `SearchableCombobox` for remedies and pharmaceuticals with direct `+ Add Remedy` / `+ Add Drug` links, auto-filling potency, form, strength, and manufacturer.
  - Pre-seeded 45 top classical homeopathic polychrests and acute remedies via `MedicineSeeder`.
- `[x] Done` **Batch & Expiry Tracking**: Track manufacturer batches, purchase dates, and expiry dates with automated alerts for expiring stock.
- `[x] Done` **Prescription Auto-Deduction**: Automatically decrement remedy inventory upon visit finalization (FIFO by earliest expiry) when enabled in clinic settings.
- `[x] Done` **Stock Movement Ledger**: Full audit log for stock receipts, adjustments, dispensing, and wastage.

---

### Module 8: Billing, Invoicing & Financial Accounting
- `[x] Done` **Point of Sale (POS) Billing**: Generate comprehensive patient invoices covering Doctor Consultation Fee, Medicines, and Diagnostic Procedures. One-click auto-generation from clinical visits.
- `[x] Done` **Multi-Channel Payments**: Record payment transactions across Cash, bKash, Nagad, Rocket, Credit/Debit Card, Bank Transfer, or Clinic Discounts.
- `[x] Done` **Printable Receipts**: Dual format receipts (Thermal 80mm POS slip and Standard A5/A4 invoice).
- `[x] Done` **Daily Accounts Ledger & Closing**: Daily cash collection summary, payment methods breakdown (Cash, bKash, Nagad, Card, Bank), department revenue streams, and daily closing reconciliation sheet.
- `[ ] Pending` **Invoices Directory Search, Quick Due Payment & Multi-Screen Touch Transformation (`/admin/invoices`)**: Multi-column debounced smart search (invoice #, patient name, phone, patient code, old ID `3391-A`, series/number, doctor name), quick date range presets (`Today`, `Yesterday`, `This Week`, `This Month`), payment method filter (`Cash`, `bKash`, `Nagad`, `Card`), 1-click `[ 💵 Collect Due ]` quick payment modal, CSV/Excel export for accountant ledger reconciliation, and high-density mobile touch cards (`block md:hidden`).
- `[ ] Pending` **Point-of-Sale (POS) Invoice Creation & Cashier Checkout (`/admin/invoices/create`)**: Async debounced pharmacy catalog & batch search combobox (beyond static 50 items), patient demographics verification card (Photo, ID, Old ID, Age/Gender, Blood Group), built-in cash drawer tender & change calculator (নগদ ফেরত হিসাব), instant 80mm POS slip auto-print workflow, and responsive 2-column POS terminal layout.

---

### Module 9: System Health, In-App Deployments & Backups
- `[x] Done` **System Health Dashboard**: Real-time display of PHP version, server memory limit, disk space, database connection, and cache status.
- `[x] Done` **In-App Private Backups**: Create, list, download, and delete database SQL dumps, media files, or full system backups directly inside private storage.
- `[x] Done` **cPanel Deployment Package**: One-click generation and download of complete cPanel deployment zip bundles.
- `[x] Done` **In-App Git Repository Manager**: Super Admin can check for updates from remote GitHub repository, inspect commits, pull updates, run database migrations, and clear application caches directly from the UI without SSH.
- `[x] Done` **Cryptographic Migration Manifest Verification**: All database migrations strictly verified via SHA-256 manifest (`deploy/cpanel/reviewed-migrations.sha256`) during cPanel split deployments, preventing unverified or broken database mutations.
- `[x] Done` **Rate-Limiting & Security Controls**: All sensitive system health operations protected by strict rate-limiters (`throttle`) and Super Admin role enforcement.

---

### Module 10: Queue Management & Doctor Schedules
- `[x] Done` **Doctor Visual Calendar & Weekly Shifts**: Configurable shifts by day of week, hours, chamber assignment, and holiday/leave management.
- `[x] Done` **Waiting Room TV Signage**: Dedicated full-screen live queue screen (`/queue/display`) with Web Audio chime, digital clock, and patient privacy masking.
- `[x] Done` **Doctor Chamber Queue Workbench**: Desktop/tablet controller with instant calling, recalling, skipping, and direct consultation launch.
- `[x] Done` **Thermal 80mm POS Token Slips**: Instant barcode/number slips issued from reception desk.
- `[x] Done` **Reception Queue Dashboard Search Upgrade & Multi-Screen Touch Transformation (`/admin/queue`)**: Unified smart search (token code, numeric token, patient name, phone, patient ID, old ID, chamber, doctor), keystroke debouncing, live auto-refresh toggle, direct `+ Start Visit` consultation bridge, patient avatar display, fix for `patient_identifier` display, and high-density mobile touch cards (`block md:hidden`).
- `[x] Done` **Token Issuance Workflow, Live Search & Multi-Screen Views (`/admin/queue/tokens/create`)**: Real-time async patient search and barcode scanning, fix for TDZ JavaScript runtime bug, patient demographic verification card (ID, Old ID, Photo, Age/Gender, Guardian, Blood Group, Last Visit Date), active duplicate token conflict resolution (Reprint Slip, Override Checkbox), doctor queue load counters, auto-print 80mm POS slip workflow, and adaptive 2-column desktop / touch-optimized mobile layouts.
- `[ ] Pending` **Doctor Visual Calendar & Appointments Matrix Upgrade (`/admin/calendar`)**: Unified multi-factor search (patient name, phone, patient code, old ID, doctor, chamber), debounced search input, recurring doctor weekly shift roster visibility on calendar day cells, mobile daily agenda timeline view (`block md:hidden`) with day picker ribbon, event type filters (`Appointments`, `Visits`, `Leaves`), interactive day schedule modal with 1-click `+ Issue Token`, `+ Book Appointment`, `+ Add Leave`, and 1-tap phone/WhatsApp reach.
- `[ ] Pending` **Doctor Visiting Schedules, Chamber Roster & Leave Range Upgrade (`/admin/doctor-schedules`)**: Multi-day leave date range support (`from_date` to `to_date`), booking conflict detection with existing appointments/tokens, doctor search filter, 1-click `📋 Copy Sunday Times to Mon-Thu` schedule accelerator, and responsive mobile sub-tab navigation (`[Weekly Shifts]` vs `[Leaves & Off-Days]`).
- `[ ] Pending` **Appointment Requests & Intake Booking Search, Multi-Screen & Triage Upgrade (`/admin/appointment-requests`)**: Universal smart search (patient name, phone, request #ID, message notes), KPI metric counters (Total, Pending, Contacted, Scheduled Today), quick date filters (`Today`, `Tomorrow`, `This Week`), 1-tap phone and WhatsApp communication shortcuts, 1-click `[📞 Mark Contacted]` quick action, today's appointment emerald badge highlight, and high-density mobile touch cards (`block md:hidden`).
- `[ ] Pending` **Staff Appointment Intake & Fast-Track Booking Creation (`/admin/appointment-requests/create`)**: Async registered patient autocomplete combobox (`/admin/patients/search?q=`) with verification card (Photo, ID, Old ID, Blood Group, Age), live Doctor Duty & Roster Card showing weekly consulting shifts and scheduled leaves/holidays, dual-action submit (`Save as Pending` vs `Confirm & Schedule Immediately`), URL parameter pre-filling (`patient_id`, `date`), and responsive 2-column desktop/touch mobile layouts.

---

### Module 11: Automated Patient Communications
- `[x] Done` **Multi-Gateway SMS Service**: Configurable SMS dispatch supporting log, Greenweb Bangladesh, MimSMS Bangladesh, and generic REST endpoints.
- `[x] Done` **Automated Notifications**: Automated dispatches for appointment confirmations, waiting room queue tokens, and digital prescription availability.
- `[x] Done` **WhatsApp Click-to-Chat Prescription Sharing**: Pre-filled bilingual WhatsApp message sharing tokenized prescription link directly to patient phone.
- `[x] Done` **Public Digital Prescription Access**: Secure tokenized web viewer (`/rx/{token}`) and PDF stream (`/rx/{token}/pdf`) for mobile patients without login.
- `[x] Done` **Notification Audit Ledger**: Comprehensive log tracking SMS and WhatsApp dispatches, delivery statuses, metrics, and custom direct SMS modal.
- `[ ] Pending` **Communication Settings, Gateway Balance Check & Template Studio Upgrade (`/admin/communications/settings`)**: Live gateway credit balance checker (`Check Balance`), real-time test SMS dispatch modal, dynamic character & segment counter (English GSM 160 vs Bengali Unicode 70), interactive clickable variable chips (`[+ Patient Name]`, `[+ Token Code]`, `[+ Rx Link]`), automated billing receipt SMS trigger, WhatsApp custom greeting template editor, and responsive studio layout.

---

### Module 12: Mobile Camera Photo Capture & Patient Imaging
- `[x] Done` **Native Mobile Camera Capture**: HTML5 Media Capture integration (`<input type="file" accept="image/*" capture="environment">`) launching the device's native camera app directly with auto-focus, flash, and native camera resolution without browser permission blocks across both HTTP and HTTPS.
- `[x] Done` **Insecure Context (HTTP) Resilient WebRTC Fallback**: Graceful detection of `window.isSecureContext` in `WebcamCaptureModal.jsx` explaining HTTPS requirement cleanly instead of failing or displaying generic permission denied errors.
- `[x] Done` **Rear / Front Facing Camera Toggle**: Multi-camera support allowing doctors to toggle between rear camera (`environment`) for patient photography and front camera (`user`) with mirror mode.
- `[x] Done` **Multi-Tier Patient Photo Integration**: Three complementary photo options provided across `Patients/Create.jsx` and `Patients/Edit.jsx`: `Take Photo (Mobile Camera)`, `Live Webcam`, and `Upload Image File`.

---

### Module 13: Responsive Multi-Screen Patient Directory & Mobile Layout Optimization
- `[x] Done` **Dual-Mode Patient Presentation**: Responsive transformation across viewports where mobile screens (< 768px / 320px-480px) render high-density, touch-friendly patient cards (`block md:hidden`), while desktop and tablet screens (>= 768px) render the structured data table (`hidden md:block`).
- `[x] Done` **High-Density Mobile Patient Cards**: Dedicated touch cards displaying patient avatar (photo or initials circle), blood group badge, name, guardian relationship & name, calculated age & gender, primary ID badge, and Old/Other ID badge.
- `[x] Done` **Mobile 1-Tap Quick Dial & WhatsApp Integration**: Formatted phone number with 1-tap `tel:` call link and dedicated WhatsApp click-to-chat button with country code prefixing (`88`).
- `[x] Done` **Compact KPI & Topbar Layout**: Refined KPI summary statistics card grid (`grid-cols-2 lg:grid-cols-4`) with compact mobile padding (`p-2.5 sm:p-3.5`), optimized typography, and decluttered topbar (`View Website` hidden on mobile with `hidden lg:flex`).
- `[x] Done` **Universal DataTable Minimum Width Safeguard**: Upgraded `DataTable.jsx` with customizable `tableClassName` and default `min-w-[650px]` minimum width to prevent column crushing and unreadable vertical wrapping across all system tables.

---

### Module 14: Clinical, Financial & Operational Analytics Reports
- `[ ] Pending` **Multi-Dimensional Reports Suite & Analytics Dashboard (`/admin/reports`)**: Multi-column smart search (patient name, phone, patient code, diagnosis, complaint), Attending Doctor filter, 1-click tactile date presets (`Today`, `Yesterday`, `This Week`, `This Month`, `This Year`), executive KPI banner tiles (Total Consultations, Unique Patients, Finalized Rx, Daily Average), categorized analytical tabs (`Clinical Consultations & Morbidity`, `Doctor Productivity`, `Pharmacy Top Dispensed Remedies`), CSV / Excel data export, and responsive executive mobile touch cards (`block md:hidden`).
