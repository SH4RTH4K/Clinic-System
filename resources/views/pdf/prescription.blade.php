<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        @font-face {
            font-family: 'BanglaFont';
            font-style: normal;
            font-weight: normal;
            /* Will be replaced with actual path or omitted if built-in used */
            src: url({{ storage_path('fonts/NotoSansBengali-Regular.ttf') }}) format('truetype');
        }
        body {
            font-family: 'BanglaFont', sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 14px;
        }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header h3 { margin: 5px 0; font-size: 18px; }
        .patient-info { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 20px; }
        .patient-info div { display: inline-block; width: 48%; }
        .content { display: flex; }
        .left-panel { width: 30%; border-right: 1px solid #ccc; padding-right: 10px; }
        .right-panel { width: 70%; padding-left: 10px; }
        table { w-full: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
        .footer { margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $settings->clinic_name_en }} ({{ $settings->clinic_name_bn }})</h1>
        <h3>{{ $settings->doctor_name }}</h3>
        <p>{{ $settings->doctor_credentials }} | Reg No: {{ $settings->govt_reg_no }}</p>
        <p>{{ $settings->address }} | Phone: {{ $settings->phone }}</p>
    </div>

    <div class="patient-info">
        <div>
            <strong>Patient No:</strong> {{ $visit->patient->patient_no }} {{ $visit->patient->patient_series }} <br>
            <strong>Name:</strong> {{ $visit->patient->name }} <br>
            <strong>Age:</strong> {{ $visit->age_at_visit ?? 'N/A' }}
        </div>
        <div>
            <strong>Date:</strong> {{ $visit->visit_date->format('d/m/Y') }} <br>
            <strong>Phone:</strong> {{ $visit->patient->phone ?? 'N/A' }}
        </div>
    </div>

    <div style="clear:both;"></div>

    <table style="width: 100%; border:none;">
        <tr>
            <td style="width: 30%; vertical-align: top; border:none; border-right:1px solid #000;">
                <h4>C/C & Notes</h4>
                <p>{{ $visit->chief_complaint }}</p>
                <p>{{ $visit->bp_symptoms_notes }}</p>
                
                <h4>Symptoms</h4>
                <ul>
                    @foreach($visit->symptoms as $sym)
                        <li>{{ $sym->name_en }} {{ $sym->name_bn ? '('.$sym->name_bn.')' : '' }}</li>
                    @endforeach
                </ul>
            </td>
            <td style="width: 70%; vertical-align: top; border:none; padding-left:15px;">
                <h3 style="margin-top:0;">Rx</h3>
                <ol style="margin-top:0; padding-left:20px;">
                    @foreach($visit->prescriptionItems as $item)
                        <li style="margin-bottom:15px;">
                            <strong>{{ $item->medicine->name }} ({{ $item->medicine->potency }})</strong> <br>
                            {{ $item->dose_qty }} {{ $item->dose_unit }} - {{ implode(', ', $item->timing) }} ({{ $item->before_after }} meal) <br>
                            <em>{{ $item->dilution_note }}</em> - {{ $item->duration_days }} days
                        </li>
                    @endforeach
                </ol>

                <div class="footer">
                    <h4>Advice / পরামর্শ</h4>
                    <ul style="padding-left:20px;">
                        @foreach($visit->adviceItems as $adv)
                            <li>{{ $adv->text_bn ?: $adv->text_en }}</li>
                        @endforeach
                    </ul>

                    <h4>Restrictions / নিষেধ</h4>
                    <ul style="padding-left:20px;">
                        @foreach($visit->foodRestrictions as $food)
                            <li>{{ $food->text_bn ?: $food->text_en }}</li>
                        @endforeach
                    </ul>
                    
                    @if($visit->follow_up_date)
                        <p style="margin-top:20px;"><strong>Follow-up Date:</strong> {{ $visit->follow_up_date->format('d/m/Y') }}</p>
                    @endif
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
