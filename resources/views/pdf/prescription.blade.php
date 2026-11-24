<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Prescription - {{ $visit->patient_snapshot['name'] ?? $visit->patient->name }}</title>
    <style>
        @font-face {
            font-family: 'BanglaFont';
            font-style: normal;
            font-weight: normal;
            src: url({{ storage_path('fonts/NotoSansBengali-Regular.ttf') }}) format('truetype');
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: 'BanglaFont', sans-serif;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            color: #111;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #147a96;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            color: #147a96;
        }
        .header h3 {
            margin: 4px 0;
            font-size: 16px;
            color: #222;
        }
        .header p {
            margin: 2px 0;
            font-size: 11px;
            color: #555;
        }
        .document-status {
            margin: 0 0 12px;
            padding: 8px 12px;
            text-align: center;
            border: 1px solid #147a96;
            color: #147a96;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .patient-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 1px dashed #bbb;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .patient-table td {
            vertical-align: top;
            font-size: 12px;
            padding: 3px 0;
            border: none;
        }
        .main-layout {
            width: 100%;
            border-collapse: collapse;
            border: none;
        }
        .left-col {
            width: 32%;
            vertical-align: top;
            border: none;
            border-right: 1px solid #147a96;
            padding-right: 12px;
        }
        .right-col {
            width: 68%;
            vertical-align: top;
            border: none;
            padding-left: 15px;
        }
        h4 {
            margin: 8px 0 4px 0;
            font-size: 13px;
            color: #147a96;
            text-transform: uppercase;
            border-bottom: 1px solid #eee;
            padding-bottom: 2px;
        }
        .rx-title {
            margin-top: 0;
            font-size: 20px;
            font-family: serif;
            font-weight: bold;
            color: #147a96;
            border-bottom: 1px solid #ddd;
            padding-bottom: 2px;
        }
        ol.rx-list {
            margin: 8px 0 0 0;
            padding-left: 20px;
        }
        ol.rx-list li {
            margin-bottom: 12px;
            line-height: 1.5;
        }
        .footer-section {
            margin-top: 25px;
            border-top: 1px dashed #bbb;
            padding-top: 10px;
        }
        ul.bullet-list {
            margin: 4px 0 10px 0;
            padding-left: 18px;
        }
        ul.bullet-list li {
            margin-bottom: 2px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    @php
        $doc = $visit->doctor ?? null;
        $patientSnapshot = $visit->patient_snapshot ?? [];
        $prescriber = $visit->prescription_authorizer_snapshot ?? $visit->prescriber_snapshot ?? [];
        $docName = $prescriber['doctor_name'] ?? $doc?->name ?? ($settings->doctor_name ?? 'Doctor');
        $docCred = $prescriber['credentials'] ?? $doc?->credentials ?? ($settings->doctor_credentials ?? '');
        $docReg = $prescriber['registration_number'] ?? $doc?->govt_reg_no ?? ($settings->govt_reg_no ?? '');
        $clinicPhone = $doc?->phone ?: ($settings->phone ?? '');
        $clinicAddress = $settings->address ?? '';

        $timingLabels = [];
        foreach ($prescriptionConfig['timing_options'] ?? [] as $t) {
            $timingLabels[$t['key']] = $t['label_bn'] ?: $t['label_en'];
        }
        if (empty($timingLabels)) {
            $timingLabels = ['morning' => 'সকাল', 'noon' => 'দুপুর', 'afternoon' => 'বিকাল', 'night' => 'রাত্রি'];
        }

        $beforeAfterLabels = [];
        foreach ($prescriptionConfig['meal_relations'] ?? [] as $m) {
            $beforeAfterLabels[$m['key']] = $m['label_bn'] ?: $m['label_en'];
        }
        if (empty($beforeAfterLabels)) {
            $beforeAfterLabels = ['before' => 'খাবারের আগে', 'after' => 'খাবারের পরে'];
        }

        $doseUnitLabels = [];
        foreach ($prescriptionConfig['dose_units'] ?? [] as $u) {
            $doseUnitLabels[$u['key']] = $u['label_bn'] ?: $u['label_en'];
        }
    @endphp

    @if(empty($isPrePrinted))
    <div class="header">
        <table style="width: 100%; border-collapse: collapse; border: none;">
            <tr>
                @if(!empty($logoBase64))
                    <td style="width: 15%; vertical-align: middle; text-align: left; border: none; padding-right: 10px;">
                        <img src="{{ $logoBase64 }}" style="max-height: 60px; max-width: 90px;" alt="Logo" />
                    </td>
                @endif
                <td style="width: {{ !empty($logoBase64) ? '85%' : '100%' }}; vertical-align: middle; text-align: center; border: none;">
                    <h1>{{ $settings?->clinic_name_en ?? 'RemediQ Clinic' }} @if(!empty($settings?->clinic_name_bn)) ({{ $settings->clinic_name_bn }}) @endif</h1>
                    <h3>{{ $docName }}</h3>
                    <p>{{ $docCred }} @if(!empty($docReg)) | Reg. No: {{ $docReg }} @endif</p>
                    <p>{{ $clinicAddress }} @if(!empty($clinicPhone)) | Phone: {{ $clinicPhone }} @endif</p>
                </td>
            </tr>
        </table>
    </div>
    @else
    <div style="height: 38mm; margin-bottom: 10px;"></div>
    @endif

    @if(empty($prescriber['authorized_at']) || empty($patientSnapshot['patient_id']))
        <div class="document-status">LEGACY COPY — AUTHORIZATION DETAILS NOT RECORDED</div>
    @elseif($visit->prescription_status === 'amended')
        <div class="document-status">AMENDED PRESCRIPTION — Version {{ $visit->prescriptionItems->max('prescription_version') }}</div>
    @else
        <div class="document-status">AUTHORIZED PRESCRIPTION</div>
    @endif

    <!-- Patient info row formatted with standard HTML table for dompdf -->
    <table class="patient-table">
        <tr>
            <td style="width: 50%;">
                <strong>Patient No:</strong> {{ $patientSnapshot['patient_identifier'] ?? $visit->patient->patient_identifier }}
                @if(!empty($patientSnapshot['old_or_other_id'] ?? $visit->patient->old_or_other_id))
                    <span style="color: #555;">(Old ID: {{ $patientSnapshot['old_or_other_id'] ?? $visit->patient->old_or_other_id }})</span>
                @endif
                &nbsp;|&nbsp;
                <strong>Name:</strong> {{ $patientSnapshot['name'] ?? $visit->patient->name }} <br>
                <strong>Age:</strong> {{ $visit->age_summary ?? ($visit->age_at_visit ? $visit->age_at_visit . ' Y' : 'N/A') }} &nbsp;|&nbsp;
                <strong>Gender:</strong> {{ ucfirst($patientSnapshot['gender'] ?? $visit->patient->gender ?? 'N/A') }}
            </td>
            <td style="width: 50%; text-align: right;">
                <strong>Date:</strong> {{ $visit->visit_date ? $visit->visit_date->format('d/m/Y') : date('d/m/Y') }} <br>
                <strong>Phone:</strong> {{ $patientSnapshot['phone'] ?? $visit->patient->phone ?? 'N/A' }}
            </td>
        </tr>
    </table>

    @if(!empty($vital) && ($vital->bp_systolic || $vital->pulse_rate || $vital->temperature_f || $vital->weight_kg || $vital->blood_sugar_rbs))
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px 8px;">
        <tr>
            <td style="padding: 3px 6px; line-height: 1.5;">
                @if($vital->bp_systolic && $vital->bp_diastolic)
                    <strong>BP:</strong> {{ $vital->bp_systolic }}/{{ $vital->bp_diastolic }} mmHg &nbsp;|&nbsp;
                @endif
                @if($vital->pulse_rate)
                    <strong>Pulse:</strong> {{ $vital->pulse_rate }} bpm &nbsp;|&nbsp;
                @endif
                @if($vital->temperature_f)
                    <strong>Temp:</strong> {{ $vital->temperature_f }} °F &nbsp;|&nbsp;
                @endif
                @if($vital->weight_kg)
                    <strong>Wt:</strong> {{ $vital->weight_kg }} kg &nbsp;|&nbsp;
                @endif
                @if($vital->height_cm)
                    <strong>Ht:</strong> {{ $vital->height_cm }} cm &nbsp;|&nbsp;
                @endif
                @if($vital->bmi)
                    <strong>BMI:</strong> {{ $vital->bmi }} kg/m² &nbsp;|&nbsp;
                @endif
                @if($vital->spo2)
                    <strong>SpO2:</strong> {{ $vital->spo2 }}% &nbsp;|&nbsp;
                @endif
                @if($vital->blood_sugar_rbs)
                    <strong>Sugar (RBS):</strong> {{ $vital->blood_sugar_rbs }} mmol/L
                @endif
            </td>
        </tr>
    </table>
    @endif

    <table class="main-layout">
        <tr>
            <td class="left-col">
                @if(!empty($visit->chief_complaint))
                    <h4>C/C & Notes</h4>
                    <p style="margin: 4px 0 10px 0; font-size: 12px;">{{ $visit->chief_complaint }}</p>
                @endif

                @if(!empty($visit->final_diagnosis) || !empty($visit->provisional_diagnosis))
                    <h4>Diagnosis</h4>
                    @if(!empty($visit->final_diagnosis))
                        <p style="margin: 2px 0 4px 0; font-size: 12px; font-weight: bold; color: #111;">{{ $visit->final_diagnosis }}</p>
                    @endif
                    @if(!empty($visit->provisional_diagnosis))
                        <p style="margin: 2px 0 6px 0; font-size: 11px; color: #555;">(Prov: {{ $visit->provisional_diagnosis }})</p>
                    @endif
                @endif

                @php
                    $pg = $visit->physical_generals ?? [];
                @endphp
                @if(!empty($pg['thermal_state']) || !empty($pg['thirst']) || !empty($pg['modalities_aggravation']) || !empty($pg['modalities_amelioration']))
                    <h4>Physical Generals</h4>
                    <p style="margin: 2px 0 6px 0; font-size: 11px; color: #333; line-height: 1.4;">
                        @if(!empty($pg['thermal_state']))
                            <strong>Thermal:</strong> {{ ucfirst($pg['thermal_state']) }}<br>
                        @endif
                        @if(!empty($pg['thirst']))
                            <strong>Thirst:</strong> {{ $pg['thirst'] }}<br>
                        @endif
                        @if(!empty($pg['modalities_aggravation']))
                            <strong>&lt; Agg:</strong> {{ $pg['modalities_aggravation'] }}<br>
                        @endif
                        @if(!empty($pg['modalities_amelioration']))
                            <strong>&gt; Amel:</strong> {{ $pg['modalities_amelioration'] }}<br>
                        @endif
                    </p>
                @endif

                @if(!empty($visit->bp_symptoms_notes))
                    <p style="margin: 4px 0 10px 0; font-size: 12px; color: #444;">{{ $visit->bp_symptoms_notes }}</p>
                @endif

                @if($visit->symptoms && $visit->symptoms->count() > 0)
                    <h4>Symptoms</h4>
                    <ul class="bullet-list">
                        @foreach($visit->symptoms as $sym)
                            <li>{{ $sym->name_en }} {{ $sym->name_bn ? '('.$sym->name_bn.')' : '' }}</li>
                        @endforeach
                    </ul>
                @endif

                @if($visit->labInvestigations && $visit->labInvestigations->count() > 0)
                    <h4>Investigations (পরীক্ষা)</h4>
                    <ul class="bullet-list">
                        @foreach($visit->labInvestigations as $lab)
                            <li>
                                <strong>{{ $lab->test_name }}</strong>
                                @if(!empty($lab->instructions))
                                    <br><span style="font-size: 10px; color: #555;"><em>{{ $lab->instructions }}</em></span>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </td>
            <td class="right-col">
                <div class="rx-title">℞</div>

                <ol class="rx-list">
                    @foreach($visit->prescriptionItems as $item)
                        @php
                            $snapshot = $item->prescription_snapshot ?? [];
                            $snapshotDirections = $snapshot['directions'] ?? [];
                            $timingArray = $snapshotDirections['timing'] ?? (is_array($item->timing) ? $item->timing : []);
                            $banglaTimings = array_map(fn($t) => $timingLabels[$t] ?? $t, $timingArray);
                            $timingText = implode(' + ', $banglaTimings);
                            $beforeAfter = $snapshotDirections['before_after'] ?? $item->before_after;
                            $doseUnit = $snapshotDirections['dose_unit'] ?? $item->dose_unit;
                            $doseQty = $snapshotDirections['dose_qty'] ?? $item->dose_qty;
                            $dilutionNote = $snapshotDirections['dilution_note'] ?? $item->dilution_note;
                            $durationDays = $snapshotDirections['duration_days'] ?? $item->duration_days;
                            $mealText = $beforeAfterLabels[$beforeAfter] ?? ($beforeAfter . ' meal');
                            $unitText = $doseUnitLabels[$doseUnit] ?? $doseUnit;

                            $isPharma = ($snapshot['item_type'] ?? $item->item_type) === 'pharmaceutical'
                                || !empty($item->pharmaceutical_id)
                                || !empty($snapshot['brand_name'])
                                || !empty($item->brand_name);
                        @endphp
                        @if($isPharma)
                            @php
                                $brand = $snapshot['brand_name'] ?? $item->brand_name ?? $item->pharmaceutical?->brand_name ?? 'Medicine';
                                $generic = $snapshot['generic_name'] ?? $item->generic_name ?? $item->pharmaceutical?->generic_name;
                                $strength = $snapshot['strength'] ?? $item->strength ?? $item->pharmaceutical?->strength;
                                $dosageForm = $snapshot['dosage_form'] ?? $item->dosage_form ?? $item->pharmaceutical?->dosage_form ?? 'Tab.';
                            @endphp
                            <li>
                                <strong>{{ $dosageForm }} {{ $brand }}</strong>
                                @if(!empty($strength)) <span style="font-size: 12px; color: #222;">({{ $strength }})</span> @endif
                                @if(!empty($generic)) <span style="font-size: 11px; color: #555;"> &mdash; {{ $generic }}</span> @endif
                                <br>
                                <span style="color: #222;">
                                    {{ $timingText }} &mdash; {{ $mealText }}
                                </span>
                                @if(!empty($durationDays))
                                    <span style="font-size: 11px; color: #555;"> &mdash; {{ $durationDays }} দিন</span>
                                @endif
                            </li>
                        @else
                            @php
                                $medicineName = $snapshot['medicine_name'] ?? $item->medicine?->name ?? 'Medicine';
                                $potency = $snapshot['potency'] ?? $item->medicine?->potency;
                                $formulation = $snapshot['formulation'] ?? $item->medicine?->form;
                            @endphp
                            <li>
                                <strong>{{ $medicineName }}</strong>
                                @if(!empty($potency)) ({{ $potency }}) @endif
                                @if(!empty($formulation)) — {{ ucfirst($formulation) }} @endif
                                <br>
                                <span style="color: #222;">
                                    {{ $doseQty }} {{ $unitText }} &mdash; {{ $timingText }} ({{ $mealText }})
                                </span>
                                @if(!empty($dilutionNote) || !empty($durationDays))
                                    <br>
                                    <span style="font-size: 11px; color: #555;">
                                        @if(!empty($dilutionNote)) <em>{{ $dilutionNote }}</em> @endif
                                        @if(!empty($dilutionNote) && !empty($durationDays)) &mdash; @endif
                                        @if(!empty($item->duration_days)) {{ $durationDays }} দিন @endif
                                    </span>
                                @endif
                            </li>
                        @endif
                    @endforeach
                </ol>

                <div class="footer-section">
                    @if(!empty($prescriber['authorized_at']))
                        <p style="margin: 0 0 10px; font-size: 10px; color: #555;">
                            Authorized by {{ $prescriber['authorized_by_name'] ?? $docName }} on {{ \Illuminate\Support\Carbon::parse($prescriber['authorized_at'])->format('d/m/Y H:i') }}
                        </p>
                    @endif
                    @if($visit->adviceItems && $visit->adviceItems->count() > 0)
                        <h4>পরামর্শ / Advice</h4>
                        <ul class="bullet-list">
                            @foreach($visit->adviceItems as $adv)
                                <li>{{ $adv->text_bn ?: $adv->text_en }}</li>
                            @endforeach
                        </ul>
                    @endif

                    @if($visit->foodRestrictions && $visit->foodRestrictions->count() > 0)
                        <h4>নিষেধ / Restrictions</h4>
                        <ul class="bullet-list">
                            @foreach($visit->foodRestrictions as $food)
                                <li>{{ $food->text_bn ?: $food->text_en }}</li>
                            @endforeach
                        </ul>
                    @endif

                    @if($visit->follow_up_date)
                        <p style="margin-top: 15px; font-weight: bold; font-size: 12px; color: #147a96;">
                            পরবর্তী সাক্ষাত / Follow-up Date: {{ $visit->follow_up_date->format('d/m/Y') }}
                        </p>
                    @endif

                    <table style="width: 100%; border: none; border-collapse: collapse; margin-top: 25px;">
                        <tr>
                            <td style="width: 50%; vertical-align: bottom; text-align: left; border: none;">
                                @if(!empty($sealBase64))
                                    <img src="{{ $sealBase64 }}" style="max-height: 65px; max-width: 65px; opacity: 0.9;" alt="Seal" />
                                @endif
                            </td>
                            <td style="width: 50%; vertical-align: bottom; text-align: center; border: none;">
                                @if(!empty($signatureBase64))
                                    <div style="margin-bottom: 2px;">
                                        <img src="{{ $signatureBase64 }}" style="max-height: 45px; max-width: 130px;" alt="Signature" />
                                    </div>
                                @else
                                    <div style="height: 35px;"></div>
                                @endif
                                <div style="border-top: 1px solid #777; padding-top: 3px; font-size: 11px; font-weight: bold; color: #222;">
                                    {{ $docName }}
                                </div>
                                <div style="font-size: 10px; color: #555;">
                                    {{ $docCred }}
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
