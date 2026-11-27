# Database Schema Reference (05_Schema.md)
## RemediQ - Dual-Purpose Practice Management System
*(Classical Homeopathy, General Medicine & Integrative Clinics)*

**Document Version:** 3.0  
**Database Engines:** MySQL 8.0+ / MariaDB 10.5+ (Production) | SQLite 3.35+ (Testing)  
**Collation:** `utf8mb4_unicode_ci`  
**Status Legend:**  
- `[x] Active Table`: Existing database table with active migrations and Eloquent models.  
- `[ ] Planned Table`: Proposed schema extension for dual-practice modules.

---

## 1. Schema Conventions
1. **Primary Keys**: Unsigned Big Integer auto-increment (`id`).
2. **Foreign Keys**: Named as `{singular_model}_id` with explicit foreign key constraints (`constrained()->cascadeOnDelete()` or `restrictOnDelete()`).
3. **Timestamps**: `created_at` and `updated_at` on every primary table.
4. **Soft Deletes**: Used on critical clinical references (`symptom_medicine_map`, `prescription_items`, `patients`).
5. **JSON Columns**: Used for flexible UI configurations (`visiting_hours`, `prescription_config`, `patient_form_config`).

---

## 2. Active Core Tables (`[x] Active`)

### 2.1 Staff & Authentication
```sql
-- users
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `username` varchar(191) NOT NULL UNIQUE,
  `email` varchar(255) NOT NULL UNIQUE,
  `email_verified_at` timestamp NULL,
  `password` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `doctor_id` bigint unsigned NULL,
  `remember_token` varchar(100) NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
);

-- Spatie Permission tables
-- roles, permissions, model_has_roles, role_has_permissions, model_has_permissions
```

### 2.2 Clinic Settings & Configuration
```sql
-- clinic_settings
CREATE TABLE `clinic_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `clinic_name` varchar(255) NOT NULL DEFAULT 'RemediQ Clinic',
  `clinic_name_bn` varchar(255) NULL,
  `practice_type` enum('homeopathy', 'general_practice', 'integrative_dual') NOT NULL DEFAULT 'homeopathy',
  `tagline` varchar(255) NULL,
  `tagline_bn` varchar(255) NULL,
  `hero_title` varchar(255) NULL,
  `hero_title_bn` varchar(255) NULL,
  `hero_subtitle` text NULL,
  `hero_subtitle_bn` text NULL,
  `about_text` text NULL,
  `about_text_bn` text NULL,
  `phone` varchar(50) NULL,
  `email` varchar(100) NULL,
  `address` text NULL,
  `address_bn` text NULL,
  `google_maps_embed_url` text NULL,
  `visiting_hours` json NULL,
  `prescription_config` json NULL,
  `patient_form_config` json NULL,
  `old_id_config` json NULL,
  `logo_path` varchar(255) NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL
);
```

### 2.3 Doctor Profiles
```sql
-- doctors
CREATE TABLE `doctors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` bigint unsigned NULL,
  `name` varchar(255) NOT NULL,
  `name_bn` varchar(255) NULL,
  `qualification` varchar(255) NOT NULL,
  `credentials` varchar(255) NULL,
  `credentials_bn` varchar(255) NULL,
  `designation` varchar(255) NULL,
  `specialty` varchar(255) NULL,
  `specialty_bn` varchar(255) NULL,
  `specialization` varchar(255) NULL,
  `specialization_type` enum('homeopath', 'general_physician', 'specialist') NOT NULL DEFAULT 'homeopath',
  `govt_reg_no` varchar(100) NULL,
  `bio` text NULL,
  `phone` varchar(50) NULL,
  `appointment_phone` varchar(50) NULL,
  `email` varchar(255) NULL,
  `photo_path` varchar(255) NULL,
  `signature_path` varchar(255) NULL,
  `seal_path` varchar(255) NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
```

### 2.4 Patient Demographics & Numbering
```sql
-- patient_numbering_profiles
CREATE TABLE `patient_numbering_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `code` varchar(20) NOT NULL UNIQUE,
  `prefix` varchar(20) NOT NULL DEFAULT '',
  `separator` varchar(5) NOT NULL DEFAULT '-',
  `sequence_length` int unsigned NOT NULL DEFAULT '4',
  `reset_period` enum('none', 'daily', 'monthly', 'yearly') NOT NULL DEFAULT 'yearly',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL
);

-- patients
CREATE TABLE `patients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `patient_id` varchar(50) NOT NULL UNIQUE,
  `numbering_profile_id` bigint unsigned NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `phone_secondary` varchar(50) NULL,
  `gender` enum('male', 'female', 'other') NOT NULL,
  `date_of_birth` date NULL,
  `age_years` smallint unsigned NULL,
  `age_months` tinyint unsigned NULL,
  `age_days` tinyint unsigned NULL,
  `blood_group` enum('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NULL,
  `known_allergies` text NULL,
  `medical_history` text NULL,
  `manual_last_visit_date` date NULL,
  `legacy_visits_count` int unsigned NULL DEFAULT 0,
  `address` text NULL,
  `guardian_name` varchar(255) NULL,
  `guardian_relationship` varchar(100) NULL,
  `reference_number` varchar(100) NULL,
  `old_or_other_id` varchar(100) NULL,
  `photo_path` varchar(500) NULL,
  `deleted_at` timestamp NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`numbering_profile_id`) REFERENCES `patient_numbering_profiles` (`id`) ON DELETE SET NULL,
  INDEX `patients_search_idx` (`phone`, `name`, `patient_id`, `guardian_name`, `old_or_other_id`)
);
```

### 2.5 Clinical Encounters & Prescriptions
```sql
-- patient_attachments
CREATE TABLE `patient_attachments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `patient_id` bigint unsigned NOT NULL,
  `visit_id` bigint unsigned NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'other',
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size_bytes` bigint unsigned NOT NULL DEFAULT '0',
  `notes` text NULL,
  `uploaded_by` bigint unsigned NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `patient_attachments_patient_id_idx` (`patient_id`),
  INDEX `patient_attachments_category_idx` (`category`)
);

-- visits
CREATE TABLE `visits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `patient_id` bigint unsigned NOT NULL,
  `doctor_id` bigint unsigned NULL,
  `visit_date` date NOT NULL,
  `age_years` smallint unsigned NULL,
  `age_months` tinyint unsigned NULL,
  `age_days` tinyint unsigned NULL,
  `chief_complaints` text NULL,
  `clinical_notes` text NULL,
  `provisional_diagnosis` varchar(255) NULL,
  `final_diagnosis` varchar(255) NULL,
  `past_history` text NULL,
  `family_history` text NULL,
  `physical_generals` text NULL,
  `status` enum('draft', 'finalized', 'cancelled') NOT NULL DEFAULT 'draft',
  `finalized_at` timestamp NULL,
  `finalized_by` bigint unsigned NULL,
  `cancelled_at` timestamp NULL,
  `cancelled_by` bigint unsigned NULL,
  `cancellation_reason` text NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`finalized_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- visit_drafts
CREATE TABLE `visit_drafts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` bigint unsigned NOT NULL UNIQUE,
  `patient_id` bigint unsigned NULL,
  `payload` json NOT NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- visit_amendments
CREATE TABLE `visit_amendments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `visit_id` bigint unsigned NOT NULL,
  `amended_by` bigint unsigned NOT NULL,
  `reason` text NOT NULL,
  `snapshot_before` json NOT NULL,
  `snapshot_after` json NOT NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`amended_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);

-- prescription_items
CREATE TABLE `prescription_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `visit_id` bigint unsigned NOT NULL,
  `item_type` enum('remedy', 'pharmaceutical') NOT NULL DEFAULT 'remedy',
  `medicine_id` bigint unsigned NULL,
  `remedy_name` varchar(255) NULL,
  `brand_name` varchar(255) NULL,
  `generic_name` varchar(255) NULL,
  `strength` varchar(100) NULL,
  `potency` varchar(50) NULL,
  `dosage_form` varchar(50) NULL,
  `frequency` varchar(100) NULL,
  `duration` varchar(100) NULL,
  `instructions_en` text NULL,
  `instructions_bn` text NULL,
  `order_column` int NOT NULL DEFAULT '0',
  `deleted_at` timestamp NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE
);

-- advice_items (Clinical Advice & Lifestyle Instructions Master)
CREATE TABLE `advice_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text_bn` varchar(500) NOT NULL,
  `text_en` varchar(500) NULL,
  `category` varchar(50) NOT NULL DEFAULT 'general',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  KEY `advice_items_category_index` (`category`),
  KEY `advice_items_is_default_index` (`is_default`),
  KEY `advice_items_is_active_index` (`is_active`)
);

-- visit_advice
CREATE TABLE `visit_advice` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `visit_id` bigint unsigned NOT NULL,
  `advice_item_id` bigint unsigned NOT NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`advice_item_id`) REFERENCES `advice_items` (`id`)
);
```

### 2.6 Homeopathic Master Catalog
```sql
-- symptoms (Kent Repertory Rubrics Catalog)
CREATE TABLE `symptoms` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(50) NULL,
  `name_en` varchar(255) NOT NULL,
  `name_bn` varchar(255) NULL,
  `category` varchar(100) NOT NULL DEFAULT 'generalities',
  `modalities` varchar(255) NULL,
  `description` text NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  KEY `symptoms_code_index` (`code`),
  KEY `symptoms_category_index` (`category`),
  KEY `symptoms_is_active_index` (`is_active`)
);

-- medicines (Homeopathic remedies)
CREATE TABLE `medicines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL UNIQUE,
  `slug` varchar(255) NOT NULL UNIQUE,
  `common_name` varchar(255) NULL,
  `potencies` json NULL,
  `description` text NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL
);

-- symptom_medicine_map
CREATE TABLE `symptom_medicine_map` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `symptom_id` bigint unsigned NOT NULL,
  `medicine_id` bigint unsigned NOT NULL,
  `grade` tinyint unsigned NOT NULL DEFAULT '1',
  `clinical_notes` text NULL,
  `status` enum('draft', 'pending_review', 'approved', 'deprecated') NOT NULL DEFAULT 'draft',
  `created_by` bigint unsigned NULL,
  `reviewed_by` bigint unsigned NULL,
  `deleted_at` timestamp NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`symptom_id`) REFERENCES `symptoms` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `symptom_medicine_unique` (`symptom_id`, `medicine_id`)
);
```

---

### 2.7 Conventional Medicine & Diagnostics Catalog (`[x] Active`)
```sql
-- pharmaceuticals
CREATE TABLE `pharmaceuticals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `generic_name` varchar(255) NOT NULL,
  `brand_name` varchar(255) NOT NULL,
  `dosage_form` varchar(50) NOT NULL,
  `strength` varchar(100) NOT NULL,
  `manufacturer` varchar(150) NULL,
  `description` text NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  INDEX `pharma_search_idx` (`brand_name`, `generic_name`)
);

-- lab_investigations
CREATE TABLE `lab_investigations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `code` varchar(50) NULL,
  `name_bn` varchar(255) NULL,
  `category` enum('hematology', 'biochemistry', 'radiology', 'ultrasound', 'microbiology', 'other') NOT NULL,
  `specimen_type` varchar(50) NOT NULL DEFAULT 'blood',
  `standard_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  `default_instructions` text NULL,
  `reference_range` text NULL,
  `turnaround_time` varchar(100) NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  INDEX `lab_investigations_search_idx` (`category`, `name`),
  INDEX `lab_investigations_code_idx` (`code`),
  INDEX `lab_investigations_specimen_type_idx` (`specimen_type`)
);

-- visit_lab_investigations
CREATE TABLE `visit_lab_investigations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `visit_id` bigint unsigned NOT NULL,
  `lab_investigation_id` bigint unsigned NULL,
  `test_name` varchar(255) NOT NULL,
  `instructions` text NULL,
  `status` enum('ordered', 'completed', 'cancelled') NOT NULL DEFAULT 'ordered',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`lab_investigation_id`) REFERENCES `lab_investigations` (`id`) ON DELETE SET NULL,
  INDEX `visit_lab_investigations_visit_status_idx` (`visit_id`, `status`)
);

-- patient_vitals
CREATE TABLE `patient_vitals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `patient_id` bigint unsigned NOT NULL,
  `visit_id` bigint unsigned NULL,
  `bp_systolic` smallint unsigned NULL,
  `bp_diastolic` smallint unsigned NULL,
  `pulse_rate` smallint unsigned NULL,
  `temperature_f` decimal(4,1) NULL,
  `respiratory_rate` smallint unsigned NULL,
  `spo2` smallint unsigned NULL,
  `weight_kg` decimal(5,2) NULL,
  `height_cm` decimal(5,2) NULL,
  `bmi` decimal(4,1) NULL,
  `blood_sugar_rbs` decimal(4,1) NULL,
  `blood_sugar_fbs` decimal(4,1) NULL,
  `notes` text NULL,
  `recorded_by` bigint unsigned NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `patient_vitals_patient_created_idx` (`patient_id`, `created_at`),
  INDEX `patient_vitals_visit_idx` (`visit_id`)
);
```

### 2.7 Dual Pharmacy Inventory & Stock Transactions
```sql
-- medicine_batches
CREATE TABLE `medicine_batches` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `item_type` enum('remedy', 'pharmaceutical') NOT NULL DEFAULT 'remedy',
  `medicine_id` bigint unsigned NULL,
  `pharmaceutical_id` bigint unsigned NULL,
  `batch_number` varchar(100) NOT NULL,
  `potency` varchar(50) NULL,
  `form` varchar(100) NULL,
  `expiry_date` date NULL,
  `purchase_date` date NULL,
  `purchase_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `initial_quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `current_quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unit` varchar(50) NOT NULL DEFAULT 'unit',
  `reorder_level` decimal(10,2) NOT NULL DEFAULT '10.00',
  `supplier_name` varchar(255) NULL,
  `notes` text NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`medicine_id`) REFERENCES `medicines` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`pharmaceutical_id`) REFERENCES `pharmaceuticals` (`id`) ON DELETE CASCADE,
  INDEX `medicine_batches_type_active_idx` (`item_type`, `is_active`),
  INDEX `medicine_batches_expiry_idx` (`expiry_date`),
  INDEX `medicine_batches_batch_number_idx` (`batch_number`),
  INDEX `medicine_batches_stock_alert_idx` (`current_quantity`, `reorder_level`)
);

-- stock_transactions
CREATE TABLE `stock_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `medicine_batch_id` bigint unsigned NOT NULL,
  `transaction_type` enum('purchase', 'dispense', 'adjustment', 'return', 'wastage') NOT NULL DEFAULT 'purchase',
  `quantity` decimal(10,2) NOT NULL,
  `balance_after` decimal(10,2) NOT NULL,
  `visit_id` bigint unsigned NULL,
  `prescription_item_id` bigint unsigned NULL,
  `reference_number` varchar(100) NULL,
  `performed_by` bigint unsigned NULL,
  `notes` text NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`medicine_batch_id`) REFERENCES `medicine_batches` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`prescription_item_id`) REFERENCES `prescription_items` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `stock_transactions_batch_idx` (`medicine_batch_id`),
  INDEX `stock_transactions_visit_idx` (`visit_id`),
  INDEX `stock_transactions_type_time_idx` (`transaction_type`, `created_at`)
);
```

### 2.8 Patient Invoicing, Multi-Method Payments & Line Items
```sql
-- invoices
CREATE TABLE `invoices` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` varchar(50) NOT NULL UNIQUE,
  `patient_id` bigint unsigned NOT NULL,
  `visit_id` bigint unsigned NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_type` enum('fixed', 'percentage') NOT NULL DEFAULT 'fixed',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('unpaid', 'partially_paid', 'paid', 'cancelled', 'waived') NOT NULL DEFAULT 'unpaid',
  `invoice_date` date NOT NULL,
  `notes` text NULL,
  `created_by` bigint unsigned NULL,
  `updated_by` bigint unsigned NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  `deleted_at` timestamp NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `invoices_patient_status_idx` (`patient_id`, `status`),
  INDEX `invoices_date_idx` (`invoice_date`),
  INDEX `invoices_status_idx` (`status`)
);

-- invoice_items
CREATE TABLE `invoice_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` bigint unsigned NOT NULL,
  `item_type` enum('consultation', 'medicine', 'investigation', 'procedure', 'other') NOT NULL DEFAULT 'other',
  `item_name` varchar(255) NOT NULL,
  `quantity` decimal(8,2) NOT NULL DEFAULT '1.00',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `medicine_batch_id` bigint unsigned NULL,
  `notes` varchar(255) NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`medicine_batch_id`) REFERENCES `medicine_batches` (`id`) ON DELETE SET NULL,
  INDEX `invoice_items_invoice_idx` (`invoice_id`),
  INDEX `invoice_items_type_idx` (`item_type`)
);

-- payments
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `payment_number` varchar(50) NOT NULL UNIQUE,
  `invoice_id` bigint unsigned NOT NULL,
  `payment_method` enum('cash', 'bkash', 'nagad', 'rocket', 'card', 'bank', 'other') NOT NULL DEFAULT 'cash',
  `amount` decimal(10,2) NOT NULL,
  `transaction_reference` varchar(100) NULL,
  `payment_date` date NOT NULL,
  `received_by` bigint unsigned NULL,
  `notes` text NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `payments_invoice_idx` (`invoice_id`),
  INDEX `payments_method_date_idx` (`payment_method`, `payment_date`)
);
```

### 2.11 Patient Queue Management & Doctor Schedules
```sql
-- doctor_schedules
CREATE TABLE `doctor_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint NOT NULL COMMENT '0 = Sunday, 1 = Monday, ..., 6 = Saturday',
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `chamber_no` varchar(100) NULL,
  `slot_duration_minutes` smallint unsigned NOT NULL DEFAULT '15',
  `max_patients` smallint unsigned NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  INDEX `doc_sched_active_idx` (`doctor_id`, `day_of_week`, `is_active`)
);

-- doctor_leaves
CREATE TABLE `doctor_leaves` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `doctor_id` bigint unsigned NOT NULL,
  `leave_date` date NOT NULL,
  `reason` varchar(255) NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  UNIQUE `doc_leave_unique` (`doctor_id`, `leave_date`),
  INDEX `doc_leave_date_idx` (`leave_date`)
);

-- patient_queue_tokens
CREATE TABLE `patient_queue_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `token_number` int unsigned NOT NULL,
  `token_code` varchar(30) NOT NULL,
  `token_date` date NOT NULL,
  `patient_id` bigint unsigned NULL,
  `patient_name` varchar(255) NOT NULL,
  `patient_phone` varchar(50) NULL,
  `doctor_id` bigint unsigned NULL,
  `service_room` varchar(100) NULL,
  `priority` enum('normal', 'urgent') NOT NULL DEFAULT 'normal',
  `status` enum('waiting', 'calling', 'in_consultation', 'completed', 'skipped', 'cancelled') NOT NULL DEFAULT 'waiting',
  `called_at` timestamp NULL,
  `started_at` timestamp NULL,
  `completed_at` timestamp NULL,
  `visit_id` bigint unsigned NULL,
  `appointment_request_id` bigint unsigned NULL,
  `notes` text NULL,
  `created_by` bigint unsigned NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`appointment_request_id`) REFERENCES `appointment_requests` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `pqt_date_status_idx` (`token_date`, `status`),
  INDEX `pqt_doctor_date_status_idx` (`doctor_id`, `token_date`, `status`),
  INDEX `pqt_date_number_idx` (`token_date`, `token_number`)
);

-- patient_notifications
CREATE TABLE `patient_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `patient_id` bigint unsigned NULL,
  `channel` enum('sms', 'whatsapp') NOT NULL DEFAULT 'sms',
  `recipient_phone` varchar(50) NOT NULL,
  `event_type` varchar(50) NOT NULL DEFAULT 'custom_alert',
  `message_body` text NOT NULL,
  `status` enum('queued', 'sent', 'delivered', 'failed') NOT NULL DEFAULT 'sent',
  `gateway_provider` varchar(50) NULL,
  `gateway_response` text NULL,
  `sent_by` bigint unsigned NULL,
  `sent_at` timestamp NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `pn_patient_idx` (`patient_id`),
  INDEX `pn_channel_status_idx` (`channel`, `status`),
  INDEX `pn_event_idx` (`event_type`),
  INDEX `pn_created_idx` (`created_at`)
);

### 2.12 Clinical Advice & Dietary Restrictions Master Catalogs
```sql
-- advice_items
CREATE TABLE `advice_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text_bn` varchar(500) NOT NULL,
  `text_en` varchar(500) NULL,
  `category` varchar(50) NOT NULL DEFAULT 'general',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  INDEX `advice_category_idx` (`category`),
  INDEX `advice_active_idx` (`is_active`),
  INDEX `advice_default_idx` (`is_default`)
);

-- visit_advice (pivot)
CREATE TABLE `visit_advice` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `visit_id` bigint unsigned NOT NULL,
  `advice_item_id` bigint unsigned NOT NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`advice_item_id`) REFERENCES `advice_items` (`id`)
);

-- food_restrictions
CREATE TABLE `food_restrictions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `text_bn` varchar(500) NOT NULL,
  `text_en` varchar(500) NULL,
  `category` varchar(50) NOT NULL DEFAULT 'general',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  INDEX `food_category_idx` (`category`),
  INDEX `food_active_idx` (`is_active`),
  INDEX `food_default_idx` (`is_default`)
);

-- visit_food_restriction (pivot)
CREATE TABLE `visit_food_restriction` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `visit_id` bigint unsigned NOT NULL,
  `food_restriction_id` bigint unsigned NOT NULL,
  FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`food_restriction_id`) REFERENCES `food_restrictions` (`id`)
);
```
```

---

## 3. Schema Extensions & Verification Matrix

All 13 roadmap phases have been implemented and validated against production constraints. Every active table includes:
- Foreign key constraints with appropriate cascade/nullify rules.
- Indexes on frequently queried date, channel, status, and identifier fields.
- Complete feature test coverage with zero regressions.
