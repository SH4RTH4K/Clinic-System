# UI Specifications & Design System (03_UI_Spec.md)
## RemediQ - Dual-Purpose Practice Management System
*(Classical Homeopathy, General Medicine & Integrative Clinics)*

**Document Version:** 3.0  
**Design Framework:** Tailwind CSS v3/v4 + React 18 + Inertia.js v2  
**Primary Typography:** Inter (English) + Noto Sans Bengali (Bengali)  
**Status Legend:**  
- `[x] Done`: Implemented and active in production UI.  
- `[ ] Planned`: Planned UI component or layout specification.

---

## 1. Design Principles & Practice Adaptivity
1. **Clinical Clarity**: Dense yet readable layouts designed for rapid entry during fast-paced consultations.
2. **Practice-Aware Workbench**: The consultation screen adapts dynamically depending on whether the clinic operates in **Homeopathy**, **General Medicine**, or **Integrative** mode.
3. **Bilingual Harmony**: Native support for English and Bengali script typography without broken glyphs, misaligned baselines, or clipping.
4. **Resilient Feedback**: Immediate visual states for background auto-saving, drafts, validation errors, and mutation loading indicators.

---

## 2. Color Palette & Token Hierarchy

```
Primary (Clinical Teal / Cyan):
  - 50:  #f0fdfa (Soft backgrounds)
  - 100: #ccfbf1 (Badges, active pills)
  - 500: #14b8a6 (Primary brand buttons, active tabs)
  - 600: #0d9488 (Interactive hover states)
  - 900: #134e4a (Deep headings, dark mode accents)

Neutral (Slate):
  - 50:  #f8fafc (App background light mode)
  - 100: #f1f5f9 (Card borders, dividers)
  - 200: #e2e8f0 (Form input borders)
  - 600: #475569 (Secondary body text)
  - 900: #0f172a (Primary text, high-contrast badges)

Status Accents:
  - Success (Emerald): #10b981 (Finalized visits, valid backups, migrated DB)
  - Warning (Amber):   #f59e0b (Draft visits, review pending, unsaved inputs)
  - Danger (Rose):     #f43f5e (Cancelled prescriptions, deletions, failed checks)
  - Info (Sky):        #0284c7 (Appointments, scheduled intakes, lab tests)
```

---

## 3. Practice-Adaptive Doctor Consultation Workbench

The Doctor Workbench (`resources/js/Pages/Visits/Create.jsx` and `Edit.jsx`) incorporates adaptive clinical blocks based on `practice_type`:

### 3.1 Mode 1: Homeopathy Workbench
- **Clinical Left Column**:
  - Chief complaints textarea.
  - Symptoms multi-select combobox with live rubric search.
  - Ranked remedy recommendation cards showing repertory scores (Grades 1 to 4).
  - Physical Generals accordion (Thermal reaction, Thirst, Cravings, Aversions, Sleep).
- **Prescription Right Column**:
  - Remedy selector (Autocomplete against `medicines` table).
  - Potency selector (e.g., 30C, 200C, 1M, LM-01).
  - Dosage vehicle (Pills, Dilution, Globules, Biochemic).
  - Frequency & Duration pills.
  - Bengali instructions & Dietary restrictions checklist.

### 3.2 Mode 2: General Practice (Allopathy) Workbench (`[x] Implemented`)
- **Clinical Left Column**:
  - Patient Vitals Strip: BP (`120/80 mmHg`), Pulse (`76 bpm`), Temp (`98.4 °F`), Weight (`68 kg`), Blood Sugar (`6.2 mmol/L`).
  - Chief complaints & Onset duration.
  - Clinical Examination & Findings.
  - Provisional / Final Diagnosis field with ICD-10 search or free-text tagger.
  - Diagnostic Lab Investigation Order builder (Multi-select chip picker for CBC, Lipid Profile, LFT, X-Ray, etc.).
- **Prescription Right Column**:
  - Drug Search Combobox: Autocomplete matching Generic Name (e.g., *Paracetamol*) or Brand Name (e.g., *Napa*).
  - Strength indicator (e.g., *500mg*, *650mg*, *20mg/5ml*).
  - Dosage Form selector (Tablet, Capsule, Syrup, Suspension, Drop, Injection, Inhaler).
  - Frequency presets: Standard `1+0+1`, `1+1+1`, `0+0+1`, `1+0+0` or dropdowns.
  - Meal relation: Before meal / After meal / With meal (Bilingual English/Bengali).
  - General lifestyle advice.

### 3.3 Mode 3: Integrative / Dual Workbench (`[x] Implemented`)
- Tabbed interface allowing the practitioner to switch between "Homeopathic Repertorization" and "Conventional Clinical Diagnosis".
- The prescription items grid allows adding both conventional medications and homeopathic remedies in designated sections.

---

## 4. Component Library Standards

### 4.1 Buttons
```jsx
// Primary Action
<button className="inline-flex items-center px-4 py-2 bg-teal-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-teal-700 focus:bg-teal-700 active:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition">
  Finalize Visit
</button>

// Destructive Action
<button className="inline-flex items-center px-4 py-2 bg-rose-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-rose-700 active:bg-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 transition">
  Cancel Prescription
</button>
```

### 4.2 Badges & Status Indicators
- **Draft**: `bg-amber-100 text-amber-800 border border-amber-200`
- **Finalized**: `bg-emerald-100 text-emerald-800 border border-emerald-200`
- **Cancelled**: `bg-rose-100 text-rose-800 border border-rose-200 line-through`
- **Lab Ordered**: `bg-sky-100 text-sky-800 border border-sky-200`

---

## 5. Print Specifications (`@media print`)

### 5.1 Official Prescription Pad Layout
- **Page Size**: A4 (`210mm x 297mm`), Portrait orientation.
- **Page Margins**: Configurable from `clinic_settings` (default: 20mm top/bottom, 15mm left/right).
- **Layout Adaptivity**:
  - **Homeopathy Prescription**:
    - Patient Info Header -> Chief Complaints -> Rx Remedies (Name, Potency, Dosage, Bengali instructions) -> Dietary Restrictions -> Signature.
  - **General Practice Prescription (`[x] Implemented`)**:
    - Patient Info Header & Vitals Bar -> Clinical Diagnosis -> Rx Medications (Brand/Generic, Strength, Form, Frequency, Duration, Instructions) -> Advised Lab Tests -> Next Visit Follow-up Date -> Signature.
- **Pre-Printed Stationery Mode (`[x] Implemented`)**:
  ```css
  @media print {
    body.pre-printed-pad .clinic-header-block {
      visibility: hidden;
      height: var(--header-offset-height, 45mm);
    }
    body.pre-printed-pad .clinic-footer-block {
      visibility: hidden;
    }
  }
  ```
- **Watermark for Cancelled Prescriptions**:
  ```css
  @media print {
    .watermark-cancelled {
      position: fixed;
      top: 40%;
      left: 20%;
      transform: rotate(-35deg);
      font-size: 72pt;
      color: rgba(225, 29, 72, 0.15);
      text-transform: uppercase;
      font-weight: 900;
      pointer-events: none;
    }
  }
  ```

### 5.2 OPD Card / Registration Slip (`[x] Implemented`)
- **Dimensions**: A6 (`105mm x 148mm`) or standard 85.6mm x 53.98mm plastic ID card cardstock.
- **Content**: Clinic Logo, Patient Full Name, Age, Gender, Blood Group, Patient Number + Zero-dependency pure PHP SVG Code-128 Barcode.
- **Components**: `resources/js/Pages/Admin/Patients/OpdCard.jsx` and PDF template `resources/views/pdf/opd_card.blade.php`.

### 5.3 Thermal POS Money Receipt & Token Slips (`[x] Implemented`)
- **Dimensions**: Continuous 80mm roll width (`72mm` printable area).
- **Structure**: Clinic Header, Receipt/Token #, Date/Time, Line items (Consultation Fee + Medicine total + Lab tests), Net Amount, Tendered Amount, Change Due.
- **Components**:
  - Billing Receipts: `resources/js/Pages/Admin/Billing/Print.jsx` (Dual 80mm POS slip and A5 medical invoice).
  - Queue Tokens: `resources/js/Pages/Admin/Queue/PrintToken.jsx` (80mm instant thermal slip with sequential code `T-001`).

### 5.4 Waiting Room Live Queue TV Signage (`[x] Implemented`)
- **Viewport**: 16:9 full-screen digital signage (`1920x1080` / `1366x768`) optimized for wall-mounted reception TV displays (`/queue/display`).
- **Layout**:
  - Real-time "NOW CALLING" hero panel pulsing emerald green with current token code and chamber number.
  - Patient privacy masking (e.g. `Md. R****l I***m`).
  - Upcoming queue list ("Next In Line / অপেক্ষমাণ").
  - Digital wall clock and clinic brand header.
  - Offline hospital chime sound generated via Web Audio API oscillators and speech synthesis calling announcement.

### 5.5 Tokenized Mobile Digital Prescription Viewer (`[x] Implemented`)
- **Viewport**: Mobile-first responsive view (`/rx/{share_token}`) for smartphone screens.
- **Security**: 32-character high-entropy cryptographic token; zero authentication required for patients.
- **Features**: Live clinic contact toolbar, WhatsApp quick action, responsive clinical summary cards, and 1-tap authentic PDF download stream (`/rx/{share_token}/pdf`).
