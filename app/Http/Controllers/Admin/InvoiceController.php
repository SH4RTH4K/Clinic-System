<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RecordPaymentRequest;
use App\Http\Requests\Admin\StoreInvoiceRequest;
use App\Http\Requests\Admin\UpdateInvoiceRequest;
use App\Models\ClinicSetting;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Visit;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::query()->with([
            'patient:id,name,patient_no,patient_series,patient_code,phone',
            'visit:id,visit_date,doctor_id',
            'visit.doctor:id,name',
            'createdBy:id,name',
        ]);

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'due') {
                $query->due();
            } else {
                $query->where('status', $request->status);
            }
        }

        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('invoice_number', 'like', "%{$term}%")
                    ->orWhereHas('patient', function ($pq) use ($term) {
                        $pq->where('name', 'like', "%{$term}%")
                            ->orWhere('phone', 'like', "%{$term}%")
                            ->orWhere('patient_code', 'like', "%{$term}%");
                    });
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('invoice_date', [$request->start_date, $request->end_date]);
        }

        $invoices = $query->latest('id')
            ->paginate(15)
            ->withQueryString();

        // Calculate summary metrics
        $metrics = [
            'total_invoiced' => (float) Invoice::sum('total_amount'),
            'total_collected' => (float) Invoice::sum('paid_amount'),
            'total_due' => (float) Invoice::whereNotIn('status', ['cancelled', 'waived'])->sum('due_amount'),
            'unpaid_count' => Invoice::whereIn('status', ['unpaid', 'partially_paid'])->count(),
        ];

        return Inertia::render('Admin/Billing/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['status', 'search', 'start_date', 'end_date']),
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

        return Inertia::render('Admin/Billing/Create', [
            'initialData' => $initialData,
            'selectedPatient' => $selectedPatient,
            'patients' => Patient::query()->select(['id', 'name', 'phone', 'patient_code'])->latest('id')->limit(30)->get(),
            'batches' => $batches,
            'defaultFee' => (float) ($settings?->default_consultation_fee ?? 500.00),
            'generatedInvoiceNumber' => $billingService->generateInvoiceNumber(),
        ]);
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
}
