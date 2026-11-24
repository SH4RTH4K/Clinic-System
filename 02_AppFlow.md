# Application Flow & User Journeys (02_AppFlow.md)
## RemediQ - Dual-Purpose Practice Management System
*(Classical Homeopathy, General Medicine & Integrative Clinics)*

**Document Version:** 3.0  
**Target Environment:** Laravel 11 + Inertia.js v2 + React 18  
**Status Legend:**  
- `[x] Done`: Implemented, tested, and active in production code.  
- `[ ] Planned`: Planned workflow gap to be implemented.

---

## 1. High-Level System Architecture Flow

```mermaid
graph TD
    Client[Browser / Client] -->|HTTP / HTTPS| WebServer[Apache / LiteSpeed / cPanel]
    WebServer -->|PHP 8.3 FastCGI| LaravelCore[Laravel 11 Kernel]
    
    LaravelCore --> RouteMiddleware{Route Middleware}
    RouteMiddleware -->|Public Routes| PublicControllers[Public / Appointment Controllers]
    RouteMiddleware -->|Auth + Spatie RBAC| AdminControllers[Admin Controllers]
    
    PublicControllers --> PublicReact[Inertia React Public Pages]
    AdminControllers --> AdminReact[Inertia React Admin Pages]
    
    AdminControllers --> PracticeAdapter{Practice Mode Engine}
    PracticeAdapter -->|Homeopathy| HomeoEngine[Repertory & Potency Engine]
    PracticeAdapter -->|General Practice| GeneralEngine[Diagnosis & Pharma Engine]
    PracticeAdapter -->|Integrative| DualEngine[Combined Multi-Rx Engine]
    
    AdminControllers --> Database[(MySQL / SQLite)]
    AdminControllers --> PrivateStorage[App Private Storage / Backups / PDFs]
    AdminControllers --> Dompdf[Dompdf + NotoSansBengali]
```

---

## 2. Receptionist & Patient Intake Journey (`[x] Done`)

Universal intake journey for all practice types (Homeopathy, General Practice, Dental, Polyclinic).

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    actor Receptionist
    participant UI as Inertia React UI
    participant PatientCtrl as PatientController
    participant DB as MySQL Database

    Patient->>Receptionist: Arrives at front desk with Name / Phone / Old ID
    Receptionist->>UI: Types query in Multi-Factor Search
    UI->>PatientCtrl: GET /admin/patients/search?q={query}
    PatientCtrl->>DB: Query Patients (Name, Phone, ID, Old ID, Guardian)
    DB-->>PatientCtrl: Return matching records
    PatientCtrl-->>UI: Display matching patient results

    alt Patient Exists
        Receptionist->>UI: Clicks "View / New Visit"
        UI->>Receptionist: Redirects to Patient Profile or Visit Creation
    else Patient New
        Receptionist->>UI: Clicks "Register New Patient"
        UI->>Receptionist: Displays Patient Registration Form
        Receptionist->>UI: Enters Demographics (Name, Phone, Age Y/M/D, Guardian, Profile)
        UI->>PatientCtrl: POST /admin/patients
        PatientCtrl->>DB: Calculate next sequential Patient ID based on profile
        PatientCtrl->>DB: INSERT into patients
        DB-->>PatientCtrl: Patient created successfully
        PatientCtrl-->>UI: Flash success & redirect to Patient Overview
    end
```

---

## 3. Dual Clinical Consultation Journeys

The doctor's consultation experience adapts dynamically to the clinic's configured practice mode or doctor specialty:

```mermaid
flowchart TD
    StartConsult([Doctor Starts Consultation]) --> CheckMode{Practice Mode}
    
    %% Homeopathy Path
    CheckMode -- Homeopathy Mode --> HomeoWorkbench[Homeopathic Consultation]
    HomeoWorkbench --> CollectGenerals[Physical Generals & Modalities]
    HomeoWorkbench --> SelectRubrics[Select Rubrics from Symptoms Catalog]
    SelectRubrics --> AutoRepertorize[System Suggests Remedies by Grade]
    AutoRepertorize --> PrescribeRemedy[Add Remedies, Potency 30C/200C/LM, Dosage]
    PrescribeRemedy --> AddDietary[Add Food Restrictions & Dietary Advice]
    AddDietary --> FinalizeCommon[Review & Finalize Consultation]

    %% General Practice / Allopathy Path
    CheckMode -- General Practice Mode --> AllopathWorkbench[General Medicine Consultation]
    AllopathWorkbench --> RecordVitals[Record Vitals: BP, Pulse, Temp, Sugar, Weight]
    RecordVitals --> RecordDiagnosis[Enter Clinical Diagnosis ICD/Free Text]
    RecordDiagnosis --> PrescribePharma[Prescribe Generic/Brand Drug + Strength + Form]
    PrescribePharma --> OrderLabs[Order Diagnostic Lab Tests CBC, USG, X-Ray]
    OrderLabs --> FinalizeCommon

    %% Integrative Path
    CheckMode -- Integrative Mode --> DualWorkbench[Dual Integrative Consultation]
    DualWorkbench --> RecordVitals
    DualWorkbench --> SelectRubrics
    DualWorkbench --> RecordDiagnosis
    DualWorkbench --> PrescribeCombined[Prescribe Homeopathic Remedies & Conventional Rx]
    DualWorkbench --> FinalizeCommon

    %% Finalization
    FinalizeCommon --> LockRecord[Write to visits + prescription_items]
    LockRecord --> AuditTrail[Log activity in activity_log]
    AuditTrail --> PDFGen[Render Bilingual PDF with NotoSansBengali]
    PDFGen --> PDFOutput([Official Printed Prescription])
```

---

## 4. Prescription Amendment & Cancellation Workflow (`[x] Done`)

Preserves legal clinical integrity across all practice types.

```mermaid
stateDiagram-v2
    [*] --> Draft : Visit auto-saving
    Draft --> Finalized : Doctor finalizes consultation
    
    state Finalized {
        [*] --> Active : Prescription valid & active
        Active --> AmendmentRequested : Doctor amends notes / medications
        AmendmentRequested --> Active : Snapshot recorded with reason in visit_amendments
        Active --> Cancelled : Doctor cancels prescription
    }
    
    Cancelled --> [*] : Locked with mandatory cancellation reason
```

---

## 5. Online Appointment Request to Patient Conversion (`[x] Done`)

Unified appointment triage supporting doctors across all specialties.

```mermaid
flowchart LR
    PublicUser([Public Visitor]) -->|Fill booking form| SubmitForm[POST /appointment-requests]
    SubmitForm --> RateLimit{Rate Limit Check}
    RateLimit -- >5 req/min --> Reject[429 Too Many Requests]
    RateLimit -- OK --> SaveReq[Insert appointment_requests status=pending]
    
    SaveReq --> AdminView[Receptionist views /admin/appointment-requests]
    AdminView --> ActionChoice{Admin Action}
    
    ActionChoice -- Confirm --> SetSchedule[Set appointment date & status=confirmed]
    ActionChoice -- Link Existing --> LinkPatient[Search & link existing patient_id]
    ActionChoice -- Convert to New --> ConvertNew[Auto-fill patient form & create new patient]
    ActionChoice -- Cancel --> RejectReq[Set status=cancelled]
```

---

## 6. System Health, In-App Backup & Deployment Flow (`[x] Done`)

Server administration workflow tailored for cPanel hosting without SSH.

```mermaid
sequenceDiagram
    autonumber
    actor SuperAdmin as Super Admin
    participant UI as Inertia React UI
    participant SysCtrl as SystemHealth / GitRepository Controller
    participant Storage as Server Filesystem & DB
    participant GitHub as Remote GitHub Repository

    SuperAdmin->>UI: Visits /admin/system-health or /admin/system/git-repository
    UI->>SysCtrl: Fetch system diagnostics (Disk, PHP, MySQL, Git HEAD)
    SysCtrl-->>UI: Render status badges & available actions

    alt In-App Backup Download
        SuperAdmin->>UI: Selects "cPanel package" or "Database SQL"
        UI->>SysCtrl: POST /admin/system-health/backups
        SysCtrl->>Storage: Generate zip / SQL dump in private storage
        SysCtrl-->>UI: Return download URL
        UI->>SuperAdmin: Direct browser file download triggers
    else In-App Git Deployment
        SuperAdmin->>UI: Clicks "Check GitHub"
        UI->>SysCtrl: POST /admin/system/git-repository/check
        SysCtrl->>GitHub: Fetch remote commits
        GitHub-->>SysCtrl: Return incoming commits
        SysCtrl-->>UI: Display incoming commits
        SuperAdmin->>UI: Clicks "Deploy reviewed update"
        UI->>SysCtrl: POST /admin/system/git-repository/pull
        SysCtrl->>Storage: Fast-forward git working copy
        SysCtrl->>Storage: Run pending migrations & rebuild caches
        SysCtrl-->>UI: Deployment complete with verified checks
    end
```

---

## 7. Pharmacy Dispensing & Inventory Deduction Flow (`[x] Done`)

Dual pharmacy dispensing workflow handling both homeopathic and conventional medications:

```mermaid
flowchart TD
    DoctorFinalizes[Doctor Finalizes Prescription] --> CheckItemType{Prescription Item Type}
    
    CheckItemType -- Homeopathic Remedy --> DeductHomeo[Deduct Dilution/Globules from medicine_batches]
    CheckItemType -- Conventional Drug --> DeductPharma[Deduct Tablets/Strips from pharmaceutical_batches]
    
    DeductHomeo --> StockLedger[Record in stock_transactions]
    DeductPharma --> StockLedger
    
    StockLedger --> LowStockCheck{Remaining < Reorder Level?}
    LowStockCheck -- Yes --> AlertBadge[Display Low Stock Alert on Admin Dashboard]
    LowStockCheck -- No --> FinishDispense([Medicine Handed to Patient])
```

---

## 8. Billing, Invoicing & Cash Register Flow (`[x] Done`)

Universal point-of-sale workflow for consultation fees, medicines, and lab tests:

```mermaid
flowchart TD
    PatientVisits([Patient Finishes Consultation / Dispensary]) --> BillingCounter[Front Desk / Billing Desk]
    BillingCounter --> CreateInvoice[Open /admin/billing/create?patient_id=...]
    
    CreateInvoice --> PopulateItems[Load items: Doctor Consultation + Medicines + Ordered Tests]
    PopulateItems --> AdjustDiscounts[Apply discounts or waivers if authorized]
    
    AdjustDiscounts --> SelectPayment{Payment Method}
    SelectPayment -- Cash --> RecordCash[Record Cash Received & Tendered Change]
    SelectPayment -- bKash / Nagad --> RecordMFS[Record Transaction ID & Phone]
    SelectPayment -- Card --> RecordCard[Record Card Authorization Code]
    
    RecordCash --> SaveInvoice[Save Invoice status=PAID]
    RecordMFS --> SaveInvoice
    RecordCard --> SaveInvoice
    
    SaveInvoice --> PrintSlip[Print 80mm Thermal Receipt or A5 Invoice]
    PrintSlip --> DailyLedger[Invoice added to Daily Cash Reconciliation Report]
```

---

## 9. Patient Queue Management & Digital Signage Flow (`[x] Done`)

Waiting room live queue and digital TV display workflow:

```mermaid
flowchart TD
    PatientArrives([Patient Arrives / Appointment Checked-in]) --> ReceptionDesk[Front Desk Receptionist]
    ReceptionDesk --> IssueToken[Issue Queue Token: Sequential T-001 + Chamber]
    IssueToken --> PrintSlip[Print 80mm Thermal Token Slip for Patient]
    
    IssueToken --> TVDisplay[Waiting Room Live TV Board: /queue/display]
    TVDisplay --> WaitQueue[Token Listed in 'Next In Line / অপেক্ষমাণ']
    
    DoctorChamber([Doctor at Workbench]) --> ClickCall[Doctor Clicks 'Call Next Patient']
    ClickCall --> StateCalling[Token Status = calling]
    StateCalling --> TVHeroCall[TV Display Pulses 'NOW CALLING' with Chime & Speech]
    StateCalling --> MaskedName[Patient Name Displayed with Privacy Masking]
    
    PatientEnters([Patient Enters Chamber]) --> StartConsult[Doctor Clicks 'Patient Entered Chamber']
    StartConsult --> StateConsult[Token Status = in_consultation]
    StartConsult --> OpenRx[Doctor Opens Prescription Builder]
    
    FinishRx([Prescription Finalized]) --> AutoComplete[Token Status = completed]
```
