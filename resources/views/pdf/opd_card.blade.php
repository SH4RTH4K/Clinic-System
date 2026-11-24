<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>OPD Card - {{ $patient['patient_identifier'] }}</title>
    <style>
        @font-face {
            font-family: 'BanglaFont';
            font-style: normal;
            font-weight: normal;
            src: url({{ storage_path('fonts/NotoSansBengali-Regular.ttf') }}) format('truetype');
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'BanglaFont', Arial, sans-serif;
            background: #ffffff;
            color: #1f2937;
            font-size: 11px;
            padding: 10px;
        }
        .card-container {
            border: 2px solid #0d9488;
            border-radius: 8px;
            padding: 12px;
            background: #ffffff;
            position: relative;
        }
        .clinic-header {
            border-bottom: 2px solid #0d9488;
            padding-bottom: 8px;
            margin-bottom: 10px;
            text-align: center;
        }
        .clinic-name {
            font-size: 15px;
            font-weight: bold;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .clinic-meta {
            font-size: 9px;
            color: #4b5563;
            margin-top: 2px;
        }
        .card-badge {
            background-color: #0d9488;
            color: #ffffff;
            font-size: 8px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            margin-top: 4px;
        }
        .content-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        .photo-cell {
            width: 75px;
            vertical-align: top;
            text-align: center;
        }
        .photo-img {
            width: 70px;
            height: 80px;
            object-fit: cover;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
        }
        .photo-placeholder {
            width: 70px;
            height: 80px;
            background-color: #f1f5f9;
            border: 1px dashed #94a3b8;
            border-radius: 4px;
            line-height: 80px;
            text-align: center;
            font-size: 8px;
            color: #64748b;
        }
        .info-cell {
            vertical-align: top;
            padding-left: 10px;
        }
        .id-badge {
            background-color: #f0fdfa;
            border: 1px solid #ccfbf1;
            color: #0f766e;
            font-size: 11px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
            margin-bottom: 4px;
        }
        .patient-name {
            font-size: 13px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 4px;
        }
        .details-grid {
            width: 100%;
            font-size: 9.5px;
            line-height: 1.4;
        }
        .details-grid td {
            padding: 1px 0;
        }
        .label {
            color: #6b7280;
            width: 65px;
        }
        .value {
            color: #1f2937;
            font-weight: 500;
        }
        .barcode-section {
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
            margin-top: 6px;
            text-align: center;
        }
        .barcode-img {
            height: 38px;
            max-width: 90%;
            margin: 0 auto;
            display: block;
        }
        .barcode-code {
            font-family: monospace;
            font-size: 9px;
            color: #4b5563;
            letter-spacing: 1.5px;
            margin-top: 2px;
            font-weight: bold;
        }
        .footer-note {
            font-size: 8px;
            color: #6b7280;
            text-align: center;
            margin-top: 6px;
            border-top: 1px solid #f1f5f9;
            padding-top: 4px;
        }
    </style>
</head>
<body>
    <div class="card-container">
        <div class="clinic-header">
            @if(!empty($logoBase64))
                <img src="{{ $logoBase64 }}" style="max-height: 28px; margin-bottom: 2px;" alt="Logo" /><br>
            @endif
            <div class="clinic-name">{{ $clinic['name'] }}</div>
            <div class="clinic-meta">
                @if($clinic['address']){{ $clinic['address'] }} @endif
                @if($clinic['phone']) | Tel: {{ $clinic['phone'] }}@endif
            </div>
            <div class="card-badge">Patient OPD & Registration Card</div>
        </div>

        <table class="content-table">
            <tr>
                <td class="photo-cell">
                    @if(!empty($photoBase64))
                        <img src="{{ $photoBase64 }}" class="photo-img" alt="Patient Photo" />
                    @else
                        <div class="photo-placeholder">PHOTO</div>
                    @endif
                </td>
                <td class="info-cell">
                    <div class="id-badge">ID: {{ $patient['patient_identifier'] }}</div>
                    <div class="patient-name">{{ $patient['name'] }}</div>

                    <table class="details-grid">
                        <tr>
                            <td class="label">Age / Sex:</td>
                            <td class="value">
                                @if($patient['age_years'] !== null){{ $patient['age_years'] }}Y @endif
                                @if($patient['age_months'] !== null){{ $patient['age_months'] }}M @endif
                                / {{ ucfirst($patient['gender'] ?? 'N/A') }}
                            </td>
                        </tr>
                        @if($patient['blood_group'])
                        <tr>
                            <td class="label">Blood Group:</td>
                            <td class="value" style="color: #b91c1c; font-weight: bold;">{{ $patient['blood_group'] }}</td>
                        </tr>
                        @endif
                        @if($patient['phone'])
                        <tr>
                            <td class="label">Phone:</td>
                            <td class="value">{{ $patient['phone'] }}</td>
                        </tr>
                        @endif
                        @if($patient['guardian_name'])
                        <tr>
                            <td class="label">{{ ucfirst($patient['guardian_relationship'] ?? 'Guardian') }}:</td>
                            <td class="value">{{ $patient['guardian_name'] }}</td>
                        </tr>
                        @endif
                        <tr>
                            <td class="label">Reg. Date:</td>
                            <td class="value">{{ $patient['created_at'] ?? $issuedAt }}</td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>

        <div class="barcode-section">
            @if(!empty($barcodeBase64))
                <img src="{{ $barcodeBase64 }}" class="barcode-img" alt="Barcode" />
            @endif
            <div class="barcode-code">{{ $patient['patient_identifier'] }}</div>
        </div>

        <div class="footer-note">
            Please present this card at every visit. For appointment or emergency: {{ $clinic['phone'] ?: 'Clinic Desk' }}
        </div>
    </div>
</body>
</html>
