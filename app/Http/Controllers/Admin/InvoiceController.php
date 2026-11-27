<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RecordPaymentRequest;
use App\Http\Requests\Admin\StoreInvoiceRequest;
use App\Http\Requests\Admin\UpdateInvoiceRequest;
use App\Models\ClinicSetting;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Visit;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Invoice::query()->with([
            'patient:id,name,patient_no,patient_series,patient_code,phone',
            'visit:id,visit_date,doctor_id',
            'visit.doctor:id,name',
            'createdBy:id,name',
            'payments.receivedBy:id,name',
        ]);

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'due') {
                $query->due();
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'all') {
            $query->whereHas('payments', function ($pq) use ($request): void {
                $pq->where('payment_method', $request->payment_method);
            });
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term): void {
                $q->where('invoice_number', 'like', "%{$term}%")
                    ->orWhereHas('patient', function ($pq) use ($term): void {
                        $pq->where('name', 'like', "%{$term}%")
                            ->orWhere('phone', 'like', "%{$term}%")
                            ->orWhere('patient_code', 'like', "%{$term}%")
                            ->orWhere('patient_no', 'like', "%{$term}%");
                    })
                    ->orWhereHas('visit.doctor', function ($dq) use ($term): void {
                        $dq->where('name', 'like', "%{$term}%");
                    })
                    ->orWhereHas('createdBy', function ($cq) use ($term): void {
                        $cq->where('name', 'like', "%{$term}%");
                    });
            });
        }

        if ($preset = $request->input('date_preset')) {
            match ($preset) {
                'today' => $query->whereDate('invoice_date', Carbon::today()),
                'yesterday' => $query->whereDate('invoice_date', Carbon::yesterday()),
                'this_week' => $query->whereBetween('invoice_date', [Carbon::now()->startOfWeek()->toDateString(), Carbon::now()->endOfWeek()->toDateString()]),
                'this_month' => $query->whereBetween('invoice_date', [Carbon::now()->startOfMonth()->toDateString(), Carbon::now()->endOfMonth()->toDateString()]),
                'this_year' => $query->whereBetween('invoice_date', [Carbon::now()->startOfYear()->toDateString(), Carbon::now()->endOfYear()->toDateString()]),
                default => null,
            };
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('invoice_date', [$request->start_date, $request->end_date]);
        } elseif ($request->filled('start_date')) {
            $query->whereDate('invoice_date', '>=', $request->start_date);
        } elseif ($request->filled('end_date')) {
            $query->whereDate('invoice_date', '<=', $request->end_date);
        }

        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'oldest' => $query->oldest('id'),
            'due_desc' => $query->orderByDesc('due_amount')->orderByDesc('id'),
            'amount_desc' => $query->orderByDesc('total_amount')->orderByDesc('id'),
            default => $query->latest('id'),
        };

        $perPage = (int) $request->input('per_page', 15);
        $perPage = in_array($perPage, [10, 15, 25, 50, 100], true) ? $perPage : 15;

        $invoices = $query->paginate($perPage)->withQueryString();

        // 5 Executive Financial KPIs
        $metrics = [
            'total_invoiced' => (float) Invoice::whereNotIn('status', ['cancelled', 'waived'])->sum('total_amount'),
            'total_collected' => (float) Invoice::sum('paid_amount'),
            'total_due' => (float) Invoice::whereNotIn('status', ['cancelled', 'waived'])->sum('due_amount'),
            'due_invoices_count' => Invoice::whereNotIn('status', ['cancelled', 'waived'])->where('due_amount', '>', 0)->count(),
            'unpaid_count' => Invoice::whereIn('status', ['unpaid', 'partially_paid'])->count(),
            'paid_invoices_count' => Invoice::where('status', 'paid')->count(),
            'today_collected' => (float) Payment::whereDate('payment_date', Carbon::today())->sum('amount'),
        ];

        return Inertia::render('Admin/Billing/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['status', 'payment_method', 'search', 'date_preset', 'start_date', 'end_date', 'sort', 'per_page']),
            'metrics' => $metrics,
        ]);
    }

    public function create(Request $request, BillingService $billingService)
    {
        $initialData = [
            'patient_id' => $request->input('patient_id'),
            'visit_id' => $request->input('visit_id'),
            'items' => [],
            'default_consultation_fee' => 500.00,
        ];

        $selectedPatient = null;
        if ($request->filled('patient_id')) {
            $selectedPatient = Patient::find($request->patient_id);
        }

        if ($request->filled('visit_id')) {
            $visit = Visit::with(['patient', 'doctor', 'prescriptionItems.medicine', 'prescriptionItems.pharmaceutical', 'labInvestigations'])
                ->find($request->visit_id);

            if ($visit) {
                $selectedPatient = $visit->patient;
                $initialData['patient_id'] = $visit->patient_id;
                $initialData['visit_id'] = $visit->id;
                $built = $billingService->buildItemsFromVisit($visit);
                $initialData['items'] = $built['items'];
                $initialData['default_consultation_fee'] = $built['default_consultation_fee'];
            }
        }

        // Active batches for quick item picker
        $batches = MedicineBatch::active()
            ->with(['medicine:id,name', 'pharmaceutical:id,brand_name,strength'])
            ->where('current_quantity', '>', 0)
            ->limit(50)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->item_name.' ('.$b->batch_number.')',
                'selling_price' => (float) $b->selling_price,
                'item_type' => 'medicine',
            ]);

        $settings = ClinicSetting::first();
        $doctors = Doctor::query()->where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'name_bn', 'specialty', 'credentials']);

        $patientRecentVisits = [];
        if ($selectedPatient) {
            $patientRecentVisits = Visit::query()
                ->with('doctor:id,name,specialty')
                ->where('patient_id', $selectedPatient->id)
                ->where('status', 'finalized')
                ->latest('id')
                ->limit(5)
                ->get()
                ->map(fn ($v) => [
                    'id' => $v->id,
                    'visit_date' => $v->visit_date?->format('d M Y') ?? 'N/A',
                    'doctor_name' => $v->doctor?->name ?? 'Attending Doctor',
                    'chief_complaint' => $v->chief_complaint,
                ]);
        }

        return Inertia::render('Admin/Billing/Create', [
            'initialData' => $initialData,
            'selectedPatient' => $selectedPatient,
            'patientRecentVisits' => $patientRecentVisits,
            'patients' => Patient::query()->select(['id', 'name', 'phone', 'patient_no', 'patient_series', 'patient_code'])->latest('id')->limit(50)->get(),
            'doctors' => $doctors,
            'batches' => $batches,
            'defaultFee' => (float) ($settings?->default_consultation_fee ?? 500.00),
            'generatedInvoiceNumber' => $billingService->generateInvoiceNumber(),
        ]);
    }

    /**
     * Retrieve recent finalized visits for a patient for billing import.
     */
    public function patientVisits(Patient $patient): JsonResponse
    {
        $visits = Visit::query()
            ->with('doctor:id,name,specialty')
            ->where('patient_id', $patient->id)
            ->where('status', 'finalized')
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn ($v) => [
                'id' => $v->id,
                'visit_date' => $v->visit_date?->format('d M Y') ?? 'N/A',
                'doctor_name' => $v->doctor?->name ?? 'Attending Doctor',
                'chief_complaint' => $v->chief_complaint,
            ]);

        return response()->json($visits);
    }

    /**
     * Async debounced batch search for POS billing terminal combobox.
     */
    public function searchBatches(Request $request): JsonResponse
    {
        $term = trim((string) $request->input('q', ''));
        $query = MedicineBatch::query()
            ->active()
            ->with(['medicine:id,name,potency,form', 'pharmaceutical:id,brand_name,generic_name,strength,dosage_form,manufacturer'])
            ->where('current_quantity', '>', 0);

        if ($term !== '') {
            $query->where(function ($q) use ($term): void {
                $q->where('batch_number', 'like', "%{$term}%")
                    ->orWhere('supplier_name', 'like', "%{$term}%")
                    ->orWhere('potency', 'like', "%{$term}%")
                    ->orWhereHas('medicine', fn ($m) => $m->where('name', 'like', "%{$term}%"))
                    ->orWhereHas('pharmaceutical', fn ($p) => $p->where('brand_name', 'like', "%{$term}%")
                        ->orWhere('generic_name', 'like', "%{$term}%")
                        ->orWhere('strength', 'like', "%{$term}%"));
            });
        }

        $results = $query->orderBy('current_quantity', 'desc')
            ->limit(25)
            ->get()
            ->map(function (MedicineBatch $b) {
                $subLabel = $b->item_type === 'remedy'
                    ? ($b->potency ?? $b->medicine?->potency ?? 'Remedy')
                    : ($b->pharmaceutical?->strength ?? $b->pharmaceutical?->generic_name ?? 'Pharma');

                return [
                    'id' => $b->id,
                    'batch_number' => $b->batch_number,
                    'item_name' => $b->item_name,
                    'item_type' => $b->item_type,
                    'sub_label' => $subLabel,
                    'selling_price' => (float) $b->selling_price,
                    'current_quantity' => (float) $b->current_quantity,
                    'expiry_date' => $b->expiry_date?->format('Y-m-d') ?? 'No Expiry',
                ];
            });

        return response()->json($results);
    }

    public function store(StoreInvoiceRequest $request, BillingService $billingService)
    {
        $invoice = $billingService->createInvoice($request->validated(), $request->user());

        return redirect()->route('admin.invoices.show', $invoice)
            ->with('success', "Invoice {$invoice->invoice_number} created successfully.");
    }

    public function show(Invoice $invoice)
    {
        $invoice->load([
            'patient',
            'visit.doctor',
            'items.medicineBatch',
            'payments.receivedBy',
            'createdBy:id,name',
        ]);

        $settings = ClinicSetting::first();

        return Inertia::render('Admin/Billing/Show', [
            'invoice' => $invoice,
            'clinic' => [
                'name' => $settings?->clinic_name_en ?? 'RemediQ Health',
                'name_bn' => $settings?->clinic_name_bn ?? '',
                'phone' => $settings?->phone ?? '',
                'address' => $settings?->address ?? '',
                'logo_url' => $settings?->logo_path ? route('clinic.logo') : null,
                'footer_note' => $settings?->invoice_footer_note ?? 'Thank you for choosing us for your healthcare.',
            ],
        ]);
    }

    public function edit(Invoice $invoice)
    {
        $invoice->load(['items', 'patient', 'visit']);

        return Inertia::render('Admin/Billing/Edit', [
            'invoice' => $invoice,
        ]);
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice)
    {
        $validated = $request->validated();

        $invoice->update([
            'invoice_date' => $validated['invoice_date'],
            'discount_amount' => $validated['discount_amount'] ?? 0.00,
            'discount_type' => $validated['discount_type'] ?? 'fixed',
            'notes' => $validated['notes'] ?? null,
            'updated_by' => $request->user()?->id,
        ]);

        // Replace items
        $invoice->items()->delete();
        foreach ($validated['items'] as $item) {
            $qty = (float) ($item['quantity'] ?? 1.00);
            $unitPrice = (float) ($item['unit_price'] ?? 0.00);

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'item_type' => $item['item_type'] ?? 'other',
                'item_name' => $item['item_name'],
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'total_price' => $qty * $unitPrice,
                'medicine_batch_id' => $item['medicine_batch_id'] ?? null,
                'notes' => $item['notes'] ?? null,
            ]);
        }

        $invoice->recalculateTotals();

        return redirect()->route('admin.invoices.show', $invoice)
            ->with('success', 'Invoice details updated successfully.');
    }

    public function destroy(Request $request, Invoice $invoice)
    {
        abort_unless($request->user()?->can('billing.delete'), 403);

        $invoice->delete();

        return redirect()->route('admin.invoices.index')
            ->with('success', "Invoice {$invoice->invoice_number} has been deleted.");
    }

    public function recordPayment(RecordPaymentRequest $request, Invoice $invoice, BillingService $billingService)
    {
        $payment = $billingService->recordPayment($invoice, $request->validated(), $request->user());

        return back()->with('success', "Payment receipt {$payment->payment_number} recorded successfully.");
    }

    public function print(Invoice $invoice)
    {
        $invoice->load([
            'patient',
            'visit.doctor',
            'items',
            'payments.receivedBy',
            'createdBy:id,name',
        ]);

        $settings = ClinicSetting::first();

        return Inertia::render('Admin/Billing/Print', [
            'invoice' => $invoice,
            'clinic' => [
                'name' => $settings?->clinic_name_en ?? 'RemediQ Health',
                'name_bn' => $settings?->clinic_name_bn ?? '',
                'phone' => $settings?->phone ?? '',
                'address' => $settings?->address ?? '',
                'logo_url' => $settings?->logo_path ? route('clinic.logo') : null,
                'footer_note' => $settings?->invoice_footer_note ?? 'Thank you for choosing us for your healthcare.',
            ],
            'mode' => 'standard',
        ]);
    }

    public function posReceipt(Invoice $invoice)
    {
        $invoice->load([
            'patient',
            'visit.doctor',
            'items',
            'payments.receivedBy',
            'createdBy:id,name',
        ]);

        $settings = ClinicSetting::first();

        return Inertia::render('Admin/Billing/Print', [
            'invoice' => $invoice,
            'clinic' => [
                'name' => $settings?->clinic_name_en ?? 'RemediQ Health',
                'name_bn' => $settings?->clinic_name_bn ?? '',
                'phone' => $settings?->phone ?? '',
                'address' => $settings?->address ?? '',
                'logo_url' => $settings?->logo_path ? route('clinic.logo') : null,
                'footer_note' => $settings?->invoice_footer_note ?? 'Get well soon!',
            ],
            'mode' => 'thermal_pos',
        ]);
    }

    public function cashRegister(Request $request, BillingService $billingService)
    {
        $startDate = $request->input('start_date', Carbon::today()->toDateString());
        $endDate = $request->input('end_date', Carbon::today()->toDateString());

        $report = $billingService->getCashRegisterReport($startDate, $endDate);

        return Inertia::render('Admin/Billing/CashRegister', [
            'report' => $report,
            'filters' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $query = Invoice::query()->with([
            'patient:id,name,patient_no,patient_series,patient_code,phone',
            'visit:id,visit_date,doctor_id',
            'visit.doctor:id,name',
            'createdBy:id,name',
            'payments.receivedBy:id,name',
        ]);

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'due') {
                $query->due();
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'all') {
            $query->whereHas('payments', function ($pq) use ($request): void {
                $pq->where('payment_method', $request->payment_method);
            });
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term): void {
                $q->where('invoice_number', 'like', "%{$term}%")
                    ->orWhereHas('patient', function ($pq) use ($term): void {
                        $pq->where('name', 'like', "%{$term}%")
                            ->orWhere('phone', 'like', "%{$term}%")
                            ->orWhere('patient_code', 'like', "%{$term}%");
                    })
                    ->orWhereHas('visit.doctor', function ($dq) use ($term): void {
                        $dq->where('name', 'like', "%{$term}%");
                    });
            });
        }

        if ($preset = $request->input('date_preset')) {
            match ($preset) {
                'today' => $query->whereDate('invoice_date', Carbon::today()),
                'yesterday' => $query->whereDate('invoice_date', Carbon::yesterday()),
                'this_week' => $query->whereBetween('invoice_date', [Carbon::now()->startOfWeek()->toDateString(), Carbon::now()->endOfWeek()->toDateString()]),
                'this_month' => $query->whereBetween('invoice_date', [Carbon::now()->startOfMonth()->toDateString(), Carbon::now()->endOfMonth()->toDateString()]),
                'this_year' => $query->whereBetween('invoice_date', [Carbon::now()->startOfYear()->toDateString(), Carbon::now()->endOfYear()->toDateString()]),
                default => null,
            };
        } elseif ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('invoice_date', [$request->start_date, $request->end_date]);
        }

        $sort = $request->input('sort', 'latest');
        match ($sort) {
            'oldest' => $query->oldest('id'),
            'due_desc' => $query->orderByDesc('due_amount')->orderByDesc('id'),
            'amount_desc' => $query->orderByDesc('total_amount')->orderByDesc('id'),
            default => $query->latest('id'),
        };

        $invoices = $query->get();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="invoices-billing-ledger-'.now()->format('Y-m-d').'.csv"',
        ];

        return response()->stream(function () use ($invoices): void {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF"); // UTF-8 BOM

            fputcsv($file, [
                'Invoice Number',
                'Invoice Date',
                'Patient ID',
                'Patient Name',
                'Patient Phone',
                'Attending Doctor',
                'Subtotal (BDT)',
                'Discount (BDT)',
                'Total Invoiced (BDT)',
                'Paid Amount (BDT)',
                'Due Amount (BDT)',
                'Payment Status',
                'Payment Methods',
                'Created By',
            ]);

            foreach ($invoices as $inv) {
                $methods = $inv->payments->pluck('payment_method')->unique()->map(fn ($m) => strtoupper($m))->join(', ');
                fputcsv($file, [
                    $inv->invoice_number,
                    $inv->invoice_date?->format('Y-m-d') ?? '',
                    $inv->patient?->patient_code ?? ($inv->patient?->id ? (string) $inv->patient->id : 'Walk-in'),
                    $inv->patient?->name ?? 'Walk-in Patient',
                    $inv->patient?->phone ?? '—',
                    $inv->visit?->doctor?->name ?? 'Direct Desk Bill',
                    number_format((float) $inv->subtotal, 2, '.', ''),
                    number_format((float) $inv->discount_amount, 2, '.', ''),
                    number_format((float) $inv->total_amount, 2, '.', ''),
                    number_format((float) $inv->paid_amount, 2, '.', ''),
                    number_format((float) $inv->due_amount, 2, '.', ''),
                    ucwords(str_replace('_', ' ', $inv->status)),
                    $methods ?: 'Unpaid',
                    $inv->createdBy?->name ?? 'System',
                ]);
            }

            fclose($file);
        }, 200, $headers);
    }
}
