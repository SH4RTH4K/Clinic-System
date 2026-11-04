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

    <div class="header">
        <h1>{{ $settings->clinic_name_en }} @if(!empty($settings->clinic_name_bn)) ({{ $settings->clinic_name_bn }}) @endif</h1>
        <h3>{{ $docName }}</h3>
        <p>{{ $docCred }} @if(!empty($docReg)) | Reg. No: {{ $docReg }} @endif</p>
        <p>{{ $clinicAddress }} @if(!empty($clinicPhone)) | Phone: {{ $clinicPhone }} @endif</p>
    </div>

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
                <strong>Patient No:</strong> {{ $patientSnapshot['patient_identifier'] ?? $visit->patient->patient_identifier }} &nbsp;|&nbsp;
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

    <table class="main-layout">
        <tr>
            <td class="left-col">
                @if(!empty($visit->chief_complaint))
                    <h4>C/C & Notes</h4>
                    <p style="margin: 4px 0 10px 0; font-size: 12px;">{{ $visit->chief_complaint }}</p>
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
                            $medicineName = $snapshot['medicine_name'] ?? $item->medicine?->name ?? 'Medicine';
                            $potency = $snapshot['potency'] ?? $item->medicine?->potency;
                            $formulation = $snapshot['formulation'] ?? $item->medicine?->form;
                            $mealText = $beforeAfterLabels[$beforeAfter] ?? ($beforeAfter . ' meal');
                            $unitText = $doseUnitLabels[$doseUnit] ?? $doseUnit;
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
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
