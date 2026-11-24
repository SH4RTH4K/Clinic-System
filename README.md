# RemediQ — Dual-Purpose Practice Management & Clinical EHR System

<p align="center">
  <img src="https://raw.githubusercontent.com/SH4RTH4K/Clinic-System/main/public/branding/logo.svg" alt="RemediQ Logo" width="220" onerror="this.style.display='none'">
</p>

<p align="center">
  <strong>Comprehensive Electronic Health Records (EHR) & Clinic Management Platform</strong><br>
  <em>Engineered for Classical Homeopathy, Conventional General Practice (Allopathy), and Integrative Polyclinics.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.3-777BB4?style=flat-square&logo=php&logoColor=white" alt="PHP 8.3">
  <img src="https://img.shields.io/badge/Laravel-11%20%7C%2012-FF2D20?style=flat-square&logo=laravel&logoColor=white" alt="Laravel">
  <img src="https://img.shields.io/badge/Inertia.js-v2%20(React%2018)-9553E9?style=flat-square&logo=inertia&logoColor=white" alt="Inertia.js React">
  <img src="https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Database-MySQL%208.0%20%2F%20MariaDB-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL 8">
  <img src="https://img.shields.io/badge/Target-cPanel%20Shared%20Hosting-FF6C2C?style=flat-square&logo=cpanel&logoColor=white" alt="cPanel Hosting">
  <img src="https://img.shields.io/badge/Tests-Passing%20(350%2B)-success?style=flat-square" alt="Tests Passing">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License MIT">
</p>

---

## 1. System Vision: Dual-Purpose Practice

RemediQ is architected from the ground up to solve the operational and clinical requirements of modern healthcare practitioners. Whether running a classical single-doctor homeopathy chamber, a conventional medical dispensary, or an integrative multi-disciplinary polyclinic, RemediQ adapts seamlessly via its configurable **Practice Mode Adapter**:

1. **Homeopathy Mode**: Specialized classical case-taking, repertory rubric scoring with cumulative remedy suggestions, potency grades (CH, LM/Q, Decimal X), dilutions, structured physical generals (thermal reactions, food cravings/aversions, thirst, modalities), and dietary restrictions.
2. **General Practice / Allopathy Mode**: Conventional consultation workflows with ICD/clinical diagnoses (provisional & final), pharmaceutical drug catalog (brand, generic, dosage form, strength in mg/ml, meal relations), and pathology/imaging lab investigation orders.
3. **Integrative / Dual Mode**: Unifies both systems into an integrated workbench, allowing practitioners to prescribe both remedies and conventional medications, or select the clinical modality per consultation.

---

## 2. Key Modules & Functional Capabilities

### 🩺 Clinical Consultation & Bilingual Prescription Engine
- **Practice-Adaptive Workbench**: Real-time interface dynamically switching between Homeopathy, General Practice, and Dual consultation tools.
- **Auto-Saving Drafts**: Debounced background persistence into `visit_drafts`, safeguarding against data loss.
- **Repertory Grading & Suggestion**: Symptom rubrics mapped to homeopathic remedies with cumulative scoring.
- **Bilingual Dompdf Generation**: Pixel-perfect printable prescriptions with embedded, self-hosted `NotoSansBengali` TrueType fonts and strict page-budget geometry.
- **Digital Signatures & Clinic Branding**: Upload doctor digital signatures and clinic seals automatically embedded into finalized prescription PDFs.
- **Pre-Printed Stationery Mode**: One-click toggle that suppresses clinic headers and footers while preserving exact vertical alignment for pre-printed letterhead pads.
- **Prescription Revisions & Audit**: Immutable prescription locking upon finalization, tracked amendment history (`visit_amendments`), and formal cancellation reasons.

### 📊 Patient Vitals & Structured Case Taking
- **Universal Vitals Tracker**: Standard medical vitals capturing Systolic/Diastolic Blood Pressure, Pulse, Body Temperature (°F), Weight (kg), Height (cm), Blood Glucose (RBS/FBS), and SpO2.
- **Instant Clinical Classifications**: Automated real-time BMI calculations and Blood Pressure staging (Normal, Elevated, Stage 1/2 HTN, Crisis).
- **Physical Generals (Homeopathy)**: Interactive chip-based assessment of Thermal Reactions (Chilly, Hot, Ambithermal), Thirst levels, Food Cravings & Aversions, Tongue, Sweat, Sleep/Dreams, and Modalities (`<` Aggravation / `>` Amelioration).

### 🗂 Diagnostic Attachments & Barcoded OPD Cards
- **Webcam Photo Capture**: Built-in HTML5 webcam stream capture (`navigator.mediaDevices.getUserMedia`) with instant avatar generation, plus file upload fallback.
- **Diagnostic Medical Reports**: Secure PDF/JPG report storage with categorization (Blood Test, X-Ray, USG, MRI, Prescription, Other).
- **Printable OPD Card**: Patient registration card with standard Code 128 (Set B) SVG barcodes generated via zero-dependency pure PHP (`BarcodeService`), available in responsive browser view and A4 PDF export.

### 📦 Dual Pharmacy Inventory & Auto-Deductions
- **Batch & Potency Management**: Supports both homeopathic dilutions/potencies and allopathic pharmaceuticals with batch numbers, supplier tracking, and expiry dates.
- **Low-Stock & Expiry Alerts**: Dashboard alerts for expiring batches (within 30 days) and items below reorder thresholds.
- **Prescription Auto-Deduction Engine**: Configurable FIFO auto-deduction that atomically decrements pharmacy inventory when prescriptions are finalized.
- **Stock Audit Ledger**: Full traceability on receipts, manual adjustments, dispensing, and wastage.

### 💳 Patient Billing, Invoicing & Daily POS Cash Register
- **Itemized Patient Invoicing**: Instant line-item billing generated from consultations, prescribed medicines, and lab orders.
- **Multi-Channel Payments**: Supports Cash, bKash, Nagad, Rocket, Credit/Debit Card, Bank Transfer, and authorized discounts.
- **Printable Receipts**: Dual printable formats: Thermal 80mm POS slip and Standard A4/A5 medical tax invoice.
- **Daily Reconciliation Report**: Financial dashboard breaking down collections by payment gateway, department revenue (Consultation, Pharmacy, Lab), and daily cash ledger balancing.

### ⏱ Waiting Room Live TV Queue & Doctor Schedules
- **Doctor Working Shifts & Calendar**: Visual monthly calendar displaying doctor schedules, chamber allocations, holidays, and leaves.
- **Waiting Room Digital Signage (TV Display)**: Fullscreen waiting room TV display (`/queue/display`) with calling cards, digital clock, Web Audio API synthesized hospital chime ("Ding-Dong"), and patient privacy masking (`maskName()`).
- **Doctor Chamber Queue Workbench**: Touch-friendly controller for doctors to call, re-announce, skip, and immediately launch consultations.
- **Thermal 80mm Token Slips**: Instant paper queue slips with barcodes issued from the reception desk.

### 📲 Automated Patient Communications (SMS & WhatsApp)
- **Multi-Driver SMS Gateway**: Pluggable driver architecture supporting:
  - `log`: Local file logging for zero-cost testing.
  - `greenweb`: Greenweb Bangladesh SMS Gateway API.
  - `mimsms`: MimSMS Bangladesh Gateway API.
  - `generic_http`: Custom HTTP REST API endpoints.
- **Automated Event Triggers**: Instant SMS dispatches for Appointment Confirmations, Queue Tokens, and Prescription Readiness.
- **WhatsApp Click-to-Chat Sharing**: 1-click sharing URL generating a pre-filled bilingual WhatsApp message with the verified digital prescription link.
- **Public Digital Prescription Portal**: Mobile-responsive public URL (`/rx/{share_token}`) and PDF stream (`/rx/{share_token}/pdf`) allowing patients to securely view their prescription on mobile devices without logging in.
- **Notification Audit Ledger**: Dashboard tracking delivery statuses, failure responses, volume metrics, and custom direct SMS dispatch.

### 🛡️ Security, RBAC & In-App cPanel Maintenance
- **Granular RBAC**: Multi-guard role and permission enforcement via Spatie Permission with Super Admin account locks.
- **Server-Side Authorization**: Every state-changing route protected by explicit permissions/policies.
- **Sanitized Activity Logging**: Automatic audit trailing with patient sensitive data masking.
- **In-App Zip Backups & cPanel Git Deployments**: In-app private backup generation (DB SQL, Media, Full System) and web-based Git repository manager (pull, migrate, optimize without SSH).

---

## 3. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | Laravel 11 / 12 (PHP 8.3 Target, constructor property promotion, strict typing) |
| **Frontend Framework** | React 18 with Inertia.js v2 (Client-side SPA with zero-API boilerplate) |
| **Styling & Design System** | Tailwind CSS v3, Headless UI, Heroicons SVG (zero external icon runtime dependencies) |
| **Database** | MySQL 8.0+ / MariaDB 10.5+ (Production) \| SQLite 3.35+ (Testing & in-memory suite) |
| **PDF Generation** | Barryvdh DomPDF with embedded `NotoSansBengali` TrueType fonts |
| **Barcode Engine** | Pure PHP zero-dependency Code 128 (Set B) SVG Vector Generator |
| **Audio Synthesis** | HTML5 Web Audio API Synthesizer (browser chime without external audio assets) |
| **Target Deployment** | Shared cPanel Linux Hosting (LiteSpeed / Apache, PHP 8.3, no persistent Node process) |

---

## 4. Canonical Documentation Suite

All system architectural decisions, flows, and schemas are strictly documented in the repository root:

- [01_PRD.md](01_PRD.md): Product Requirements Document (All features and module checklists).
- [02_AppFlow.md](02_AppFlow.md): Application User Journeys, Clinical Consultation Flows, and State Machine diagrams.
- [03_UI_Spec.md](03_UI_Spec.md): Design System, Color Palette, Bengali Typography, and `@media print` Specifications.
- [04_TRD.md](04_TRD.md): Technical Requirements, Practice Type Adapters, Dompdf Bengali setup, and cPanel constraints.
- [05_Schema.md](05_Schema.md): Complete Database Schema, Active Tables, Foreign Keys, and Indexing strategies.
- [06_Plan.md](06_Plan.md): Master Implementation Plan & Completed Roadmap Milestones (13 of 13 Completed).
- [DEPLOYMENT.md](DEPLOYMENT.md): Comprehensive cPanel deployment, permissions, and release guide.
- [AGENTS.md](AGENTS.md): AI Agent rules, Laravel Boost guidelines, and security hardening invariants.

---

## 5. Local Development Setup

### Prerequisites
- **PHP**: `8.3` or newer with extensions: `pdo_mysql`, `mbstring`, `fileinfo`, `gd`, `xml`, `curl`, `sqlite3`.
- **Composer**: `2.x`.
- **Node.js**: `18.x` or `20.x` & `npm`.
- **Database**: MySQL 8.0+ / MariaDB or SQLite.

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SH4RTH4K/Clinic-System.git
   cd Clinic-System
   ```

2. **Install PHP dependencies:**
   ```bash
   composer install
   ```

3. **Install JavaScript dependencies:**
   ```bash
   npm install
   ```

4. **Environment setup:**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Update your `.env` with your database credentials (e.g., `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).*

5. **Run migrations & seeders:**
   ```bash
   php artisan migrate --seed
   ```

6. **Create public storage link:**
   ```bash
   php artisan storage:link
   ```

7. **Compile frontend assets:**
   ```bash
   # Development watcher
   npm run dev

   # Or compile production bundle
   npm run build
   ```

8. **Start development server:**
   ```bash
   php artisan serve
   ```
   *Visit `http://localhost:8000` in your browser.*

---

## 6. Testing & Quality Standards

RemediQ enforces rigorous automated test coverage across all clinical, financial, and administrative routes:

```bash
# Run all feature and unit tests
php artisan test

# Run tests with compact reporting
php artisan test --compact

# Run a specific test suite
php artisan test --filter=AutomatedPatientCommunicationsTest
php artisan test --filter=QueueManagementAndCalendarTest
php artisan test --filter=PatientBillingAndCashRegisterTest
php artisan test --filter=DualPharmacyInventoryTest

# Format code with Laravel Pint (PSR-12 standard)
vendor/bin/pint --dirty --format agent

# Validate frontend compilation
npm run build
```

---

## 7. Production Deployment (cPanel)

For production deployment on shared cPanel hosting:
1. Ensure the domain's document root points to the application's `/public` folder.
2. Build frontend assets locally using `npm run build` before packaging.
3. Keep the application core outside the public root.
4. Verify file permissions: `storage/` and `bootstrap/cache/` must be writable (`775` or `755`).
5. Review the comprehensive step-by-step guide in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 8. License

RemediQ is open-sourced software licensed under the [MIT license](LICENSE).
