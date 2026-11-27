<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\PrescriptionItem;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Display multi-dimensional clinical and operational reports suite.
     */
    public function index(Request $request): Response
    {
        $this->authorizeAccess($request);

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'doctor_id' => 'nullable',
            'status' => 'nullable|string',
            'tab' => 'nullable|string|in:clinical,doctors,remedies',
            'date_preset' => 'nullable|string|in:today,yesterday,this_week,this_month,this_year,custom',
            'per_page' => 'nullable|integer|min:10|max:100',
        ]);

        [$startDate, $endDate, $preset] = $this->resolveDateRange($request);
        $tab = $request->input('tab', 'clinical');
        $perPage = (int) $request->input('per_page', 25);

        $baseQuery = $this->buildReportQuery($request, $startDate, $endDate);

        // Compute 5-Card Executive KPIs
        $totalConsultations = (clone $baseQuery)->count();
        $uniquePatients = (clone $baseQuery)->distinct('patient_id')->count('patient_id');
        $finalizedPrescriptions = (clone $baseQuery)->where('status', 'finalized')->count();

        $startCarbon = Carbon::parse($startDate);
        $endCarbon = Carbon::parse($endDate);
        $daysSpan = max(1, $startCarbon->diffInDays($endCarbon) + 1);
        $dailyAverage = round($totalConsultations / $daysSpan, 1);

        $visitIdsQuery = (clone $baseQuery)->select('id');
        $totalRemediesPrescribed = PrescriptionItem::query()
            ->whereIn('visit_id', $visitIdsQuery)
            ->count();

        $metrics = [
            'total_consultations' => $totalConsultations,
            'unique_patients' => $uniquePatients,
            'finalized_prescriptions' => $finalizedPrescriptions,
            'daily_average' => $dailyAverage,
            'total_remedies_prescribed' => $totalRemediesPrescribed,
        ];

        // Tab 1: Clinical Consultations & Morbidity
        $visits = null;
        $topDiagnoses = [];
        if ($tab === 'clinical') {
            $visits = (clone $baseQuery)
                ->select([
                    'id', 'patient_id', 'doctor_id', 'visit_date', 'status',
                    'chief_complaint', 'provisional_diagnosis', 'final_diagnosis',
                    'created_at',
                ])
                ->with([
                    'patient:id,name,phone,patient_no,patient_series,patient_code,old_or_other_id,gender,dob,age_years,photo_path',
                    'doctor:id,name,name_bn,specialty',
                    'vital:id,visit_id,blood_pressure_systolic,blood_pressure_diastolic,pulse_rate,temperature',
                ])
                ->withCount('prescriptionItems as prescribed_items_count')
                ->orderBy('visit_date', 'desc')
                ->orderBy('id', 'desc')
                ->paginate($perPage)
                ->withQueryString();

            $topDiagnoses = (clone $baseQuery)
                ->where(function ($q): void {
                    $q->where(function ($sq): void {
                        $sq->whereNotNull('final_diagnosis')->where('final_diagnosis', '!=', '');
                    })->orWhere(function ($sq): void {
                        $sq->whereNotNull('provisional_diagnosis')->where('provisional_diagnosis', '!=', '');
                    });
                })
                ->selectRaw('COALESCE(NULLIF(final_diagnosis, ""), provisional_diagnosis) as diagnosis, count(*) as count')
                ->groupBy('diagnosis')
                ->orderByDesc('count')
                ->limit(6)
                ->get()
                ->map(fn ($row): array => [
                    'diagnosis' => (string) $row->diagnosis,
                    'count' => (int) $row->count,
                ])
                ->values()
                ->all();
        }

        // Tab 2: Doctor Productivity Breakdown
        $doctorBreakdown = [];
        if ($tab === 'doctors') {
            $doctorBreakdown = (clone $baseQuery)
                ->selectRaw('doctor_id, count(*) as total_visits, count(case when status = "finalized" then 1 end) as finalized_visits, count(distinct patient_id) as unique_patients')
                ->groupBy('doctor_id')
                ->with('doctor:id,name,name_bn,specialty,phone')
                ->get()
                ->map(function ($row): array {
                    $total = (int) $row->total_visits;
                    $finalized = (int) $row->finalized_visits;

                    return [
                        'doctor_id' => $row->doctor_id,
                        'doctor_name' => $row->doctor?->name ?? 'Unassigned / Clinic Staff',
                        'doctor_name_bn' => $row->doctor?->name_bn,
                        'specialty' => $row->doctor?->specialty ?? 'General Practice',
                        'phone' => $row->doctor?->phone,
                        'total_visits' => $total,
                        'finalized_visits' => $finalized,
                        'unique_patients' => (int) $row->unique_patients,
                        'completion_rate' => $total > 0 ? round(($finalized / $total) * 100, 1) : 0,
                    ];
                })
                ->values()
                ->all();
        }

        // Tab 3: Top Prescribed Remedies & Formulary Breakdown
        $topRemedies = [];
        if ($tab === 'remedies') {
            $topRemedies = PrescriptionItem::query()
                ->whereIn('visit_id', $visitIdsQuery)
                ->with([
                    'medicine:id,name,potency,form',
                    'pharmaceutical:id,brand_name,generic_name,strength,dosage_form',
                ])
                ->selectRaw('item_type, medicine_id, pharmaceutical_id, brand_name, count(*) as times_prescribed, count(distinct visit_id) as unique_visits')
                ->groupBy('item_type', 'medicine_id', 'pharmaceutical_id', 'brand_name')
                ->orderByDesc('times_prescribed')
                ->limit(20)
                ->get()
                ->map(function (PrescriptionItem $item): array {
                    $isPharma = $item->item_type === 'pharmaceutical';
                    $name = $isPharma
                        ? ($item->pharmaceutical?->brand_name ?? $item->brand_name ?? 'Pharmaceutical')
                        : ($item->medicine?->name ?? 'Homeopathic Remedy');

                    $subText = $isPharma
                        ? ($item->pharmaceutical?->generic_name ?? $item->pharmaceutical?->strength ?? 'Pharma')
                        : ($item->medicine?->potency ?? 'Potency');

                    return [
                        'item_type' => $item->item_type,
                        'name' => $name,
                        'sub_text' => $subText,
                        'times_prescribed' => (int) $item->times_prescribed,
                        'unique_visits' => (int) $item->unique_visits,
                    ];
                })
                ->values()
                ->all();
        }

        $doctorsList = Doctor::query()
            ->select(['id', 'name', 'specialty'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Reports/Index', [
            'visits' => $visits,
            'topDiagnoses' => $topDiagnoses,
            'doctorBreakdown' => $doctorBreakdown,
            'topRemedies' => $topRemedies,
            'doctorsList' => $doctorsList,
            'metrics' => $metrics,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'date_preset' => $preset,
                'search' => $request->input('search', ''),
                'doctor_id' => $request->input('doctor_id', 'all'),
                'status' => $request->input('status', 'all'),
                'tab' => $tab,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Stream CSV export of clinical consultation reports.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorizeAccess($request);

        abort_unless(
            $request->user()?->can('reports.export') || $request->user()?->hasRole('Super Admin'),
            403,
            'Unauthorized to export clinical reports.'
        );

        [$startDate, $endDate] = $this->resolveDateRange($request);
        $query = $this->buildReportQuery($request, $startDate, $endDate)
            ->with([
                'patient:id,name,phone,patient_no,patient_series,patient_code,gender,age_years',
                'doctor:id,name',
            ])
            ->withCount('prescriptionItems')
            ->orderBy('visit_date', 'desc')
            ->orderBy('id', 'desc');

        $fileName = 'clinical_reports_export_'.now()->format('Y_m_d_His').'.csv';

        return response()->streamDownload(function () use ($query): void {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");

            fputcsv($handle, [
                'Visit Date',
                'Visit ID',
                'Patient Name',
                'Patient Code',
                'Phone',
                'Gender',
                'Age',
                'Attending Doctor',
                'Status',
                'Chief Complaint',
                'Provisional Diagnosis',
                'Final Diagnosis',
                'Prescribed Items Count',
            ]);

            $query->chunk(200, function ($chunk) use ($handle): void {
                foreach ($chunk as $v) {
                    $patient = $v->patient;
                    $code = $patient?->patient_code ?? "{$patient?->patient_no}{$patient?->patient_series}";

                    fputcsv($handle, [
                        $v->visit_date ? $v->visit_date->format('Y-m-d') : '',
                        $v->id,
                        $patient?->name ?? 'Unknown',
                        $code,
                        $patient?->phone ?? '',
                        $patient?->gender ?? '',
                        $v->age_summary ?? $patient?->age_years ?? '',
                        $v->doctor?->name ?? 'Unassigned',
                        ucfirst((string) $v->status),
                        $v->chief_complaint ?? '',
                        $v->provisional_diagnosis ?? '',
                        $v->final_diagnosis ?? '',
                        $v->prescription_items_count ?? 0,
                    ]);
                }
            });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }

    /**
     * Enforce strict role-based authorization for clinical reports.
     */
    protected function authorizeAccess(Request $request): void
    {
        abort_unless(
            $request->user()?->can('clinical_records.view')
                && $request->user()?->can('patients.view')
                && $request->user()?->can('visits.view')
                && $request->user()?->can('reports.view'),
            403,
            'Unauthorized clinical reports access.'
        );
    }

    /**
     * Resolve start and end dates from presets or inputs.
     *
     * @return array{0: string, 1: string, 2: string|null}
     */
    protected function resolveDateRange(Request $request): array
    {
        $preset = $request->input('date_preset');

        if ($preset) {
            $range = match ($preset) {
                'today' => [Carbon::today()->toDateString(), Carbon::today()->toDateString()],
                'yesterday' => [Carbon::yesterday()->toDateString(), Carbon::yesterday()->toDateString()],
                'this_week' => [Carbon::now()->startOfWeek()->toDateString(), Carbon::now()->endOfWeek()->toDateString()],
                'this_month' => [Carbon::now()->startOfMonth()->toDateString(), Carbon::now()->endOfMonth()->toDateString()],
                'this_year' => [Carbon::now()->startOfYear()->toDateString(), Carbon::now()->endOfYear()->toDateString()],
                default => null,
            };

            if ($range !== null) {
                return [$range[0], $range[1], $preset];
            }
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            return [
                (string) $request->input('start_date'),
                (string) $request->input('end_date'),
                'custom',
            ];
        }

        if ($request->filled('start_date')) {
            return [
                (string) $request->input('start_date'),
                now()->toDateString(),
                'custom',
            ];
        }

        if ($request->filled('end_date')) {
            return [
                now()->subDays(30)->toDateString(),
                (string) $request->input('end_date'),
                'custom',
            ];
        }

        // Default: Last 30 days
        return [
            now()->subDays(30)->toDateString(),
            now()->toDateString(),
            'this_month',
        ];
    }

    /**
     * Build the filtered base query for visits in the reporting scope.
     */
    protected function buildReportQuery(Request $request, string $startDate, string $endDate): Builder
    {
        $query = Visit::query()
            ->whereDate('visit_date', '>=', $startDate)
            ->whereDate('visit_date', '<=', $endDate);

        if ($request->filled('doctor_id') && $request->input('doctor_id') !== 'all') {
            $query->where('doctor_id', $request->input('doctor_id'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(function (Builder $q) use ($term): void {
                $q->where('chief_complaint', 'like', "%{$term}%")
                    ->orWhere('provisional_diagnosis', 'like', "%{$term}%")
                    ->orWhere('final_diagnosis', 'like', "%{$term}%")
                    ->orWhereHas('patient', function (Builder $pq) use ($term): void {
                        $pq->where('name', 'like', "%{$term}%")
                            ->orWhere('phone', 'like', "%{$term}%")
                            ->orWhere('patient_code', 'like', "%{$term}%")
                            ->orWhere('patient_no', 'like', "%{$term}%")
                            ->orWhere('old_or_other_id', 'like', "%{$term}%");
                    })
                    ->orWhereHas('doctor', function (Builder $dq) use ($term): void {
                        $dq->where('name', 'like', "%{$term}%")
                            ->orWhere('name_bn', 'like', "%{$term}%");
                    });
            });
        }

        return $query;
    }
}
