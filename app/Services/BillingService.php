<?php

namespace App\Services;

use App\Models\ClinicSetting;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MedicineBatch;
use App\Models\Payment;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Support\Facades\DB;

class BillingService
{
    /**
     * Generate the next sequential invoice number.
     */
    public function generateInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ym').'-';
        $latest = Invoice::withTrashed()
            ->where('invoice_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('invoice_number');

        $nextSeq = $latest ? ((int) substr($latest, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Generate the next sequential payment receipt number.
     */
    public function generatePaymentNumber(): string
    {
        $prefix = 'PAY-'.now()->format('Ym').'-';
        $latest = Payment::query()
            ->where('payment_number', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('payment_number');

        $nextSeq = $latest ? ((int) substr($latest, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Create an invoice with items and optional initial payment.
     *
     * @param  array<string, mixed>  $data
     */
    public function createInvoice(array $data, ?User $user = null): Invoice
    {
        return DB::transaction(function () use ($data, $user): Invoice {
            $invoiceNumber = $data['invoice_number'] ?? $this->generateInvoiceNumber();

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'patient_id' => $data['patient_id'],
                'visit_id' => $data['visit_id'] ?? null,
                'invoice_date' => $data['invoice_date'] ?? now()->toDateString(),
                'discount_amount' => $data['discount_amount'] ?? 0.00,
                'discount_type' => $data['discount_type'] ?? 'fixed',
                'tax_amount' => $data['tax_amount'] ?? 0.00,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user?->id,
            ]);

            $items = $data['items'] ?? [];
            foreach ($items as $item) {
                $qty = (float) ($item['quantity'] ?? 1.00);
                $unitPrice = (float) ($item['unit_price'] ?? 0.00);
                $totalPrice = $qty * $unitPrice;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $item['item_type'] ?? 'other',
                    'item_name' => $item['item_name'],
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                    'medicine_batch_id' => $item['medicine_batch_id'] ?? null,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            $invoice->recalculateTotals();

            // Record initial payment if provided and amount > 0
            if (! empty($data['initial_payment']) && (float) ($data['initial_payment']['amount'] ?? 0) > 0) {
                $this->recordPayment($invoice, $data['initial_payment'], $user);
            }

            return $invoice->fresh(['items', 'payments', 'patient', 'visit']);
        });
    }

    /**
     * Pre-populate line items from a Visit (consultation, prescribed medicines, lab tests).
     *
     * @return array{items: list<array<string, mixed>>, default_consultation_fee: float}
     */
    public function buildItemsFromVisit(Visit $visit): array
    {
        $settings = ClinicSetting::first();
        $consultationFee = (float) ($settings?->default_consultation_fee ?? 500.00);

        $items = [];

        // 1. Doctor Consultation Fee
        $doctorName = $visit->doctor?->name ?? 'Attending Doctor';
        $items[] = [
            'item_type' => 'consultation',
            'item_name' => "Doctor Consultation Fee ({$doctorName})",
            'quantity' => 1,
            'unit_price' => $consultationFee,
            'total_price' => $consultationFee,
            'medicine_batch_id' => null,
            'notes' => 'Clinical consultation and case taking',
        ];

        // 2. Prescribed Medications
        $prescriptionItems = $visit->prescriptionItems()->with(['medicine', 'pharmaceutical'])->get();
        foreach ($prescriptionItems as $pItem) {
            $batch = null;
            $unitPrice = 0.00;
            $name = '';

            if ($pItem->item_type === 'remedy' && $pItem->medicine_id) {
                $name = ($pItem->medicine?->name ?? 'Remedy').' '.($pItem->potency ?? '');
                $batch = MedicineBatch::query()
                    ->where('item_type', 'remedy')
                    ->where('medicine_id', $pItem->medicine_id)
                    ->where('is_active', true)
                    ->where('current_quantity', '>', 0)
                    ->orderBy('expiry_date')
                    ->first();
                $unitPrice = $batch ? (float) $batch->selling_price : 150.00;
            } elseif ($pItem->item_type === 'pharmaceutical' && $pItem->pharmaceutical_id) {
                $name = ($pItem->pharmaceutical?->brand_name ?? 'Medicine').' '.($pItem->pharmaceutical?->strength ?? '');
                $batch = MedicineBatch::query()
                    ->where('item_type', 'pharmaceutical')
                    ->where('pharmaceutical_id', $pItem->pharmaceutical_id)
                    ->where('is_active', true)
                    ->where('current_quantity', '>', 0)
                    ->orderBy('expiry_date')
                    ->first();
                $unitPrice = $batch ? (float) $batch->selling_price : 50.00;
            } else {
                $name = $pItem->brand_name ?: ($pItem->generic_name ?: 'Prescribed Medication');
            }

            $items[] = [
                'item_type' => 'medicine',
                'item_name' => trim($name),
                'quantity' => 1,
                'unit_price' => $unitPrice,
                'total_price' => $unitPrice,
                'medicine_batch_id' => $batch?->id,
                'notes' => 'Prescribed medication',
            ];
        }

        // 3. Ordered Lab Investigations
        $labOrders = $visit->labInvestigations()->get();
        foreach ($labOrders as $order) {
            $items[] = [
                'item_type' => 'investigation',
                'item_name' => $order->test_name,
                'quantity' => 1,
                'unit_price' => 0.00, // Clinic order reference (can be edited by receptionist)
                'total_price' => 0.00,
                'medicine_batch_id' => null,
                'notes' => 'Diagnostic investigation order',
            ];
        }

        return [
            'items' => $items,
            'default_consultation_fee' => $consultationFee,
        ];
    }

    /**
     * Record a payment transaction against an invoice.
     *
     * @param  array<string, mixed>  $paymentData
     */
    public function recordPayment(Invoice $invoice, array $paymentData, ?User $user = null): Payment
    {
        return DB::transaction(function () use ($invoice, $paymentData, $user): Payment {
            $paymentNumber = $paymentData['payment_number'] ?? $this->generatePaymentNumber();

            $payment = Payment::create([
                'payment_number' => $paymentNumber,
                'invoice_id' => $invoice->id,
                'payment_method' => $paymentData['payment_method'] ?? 'cash',
                'amount' => (float) $paymentData['amount'],
                'transaction_reference' => $paymentData['transaction_reference'] ?? null,
                'payment_date' => $paymentData['payment_date'] ?? now()->toDateString(),
                'received_by' => $user?->id,
                'notes' => $paymentData['notes'] ?? null,
            ]);

            $invoice->recalculateTotals();

            return $payment;
        });
    }

    /**
     * Compute financial daily cash register and reconciliation summary.
     *
     * @return array<string, mixed>
     */
    public function getCashRegisterReport(string $startDate, string $endDate): array
    {
        // 1. Invoices in date range
        $invoicesQuery = Invoice::query()
            ->whereDate('invoice_date', '>=', $startDate)
            ->whereDate('invoice_date', '<=', $endDate);
        $totalBilled = (float) (clone $invoicesQuery)->sum('total_amount');
        $totalDiscount = (float) (clone $invoicesQuery)->sum('discount_amount');
        $invoicesCount = (clone $invoicesQuery)->count();
        $paidInvoicesCount = (clone $invoicesQuery)->where('status', 'paid')->count();
        $unpaidInvoicesCount = (clone $invoicesQuery)->whereIn('status', ['unpaid', 'partially_paid'])->count();

        // 2. Payments collected in date range
        $paymentsQuery = Payment::query()
            ->whereDate('payment_date', '>=', $startDate)
            ->whereDate('payment_date', '<=', $endDate);
        $totalCollected = (float) (clone $paymentsQuery)->sum('amount');

        // Collections by payment method
        $methods = ['cash', 'bkash', 'nagad', 'rocket', 'card', 'bank', 'other'];
        $byMethod = [];
        foreach ($methods as $method) {
            $byMethod[$method] = (float) (clone $paymentsQuery)->where('payment_method', $method)->sum('amount');
        }

        // 3. Revenue by Line Item Type
        $itemsQuery = InvoiceItem::query()->whereHas('invoice', function ($q) use ($startDate, $endDate) {
            $q->whereDate('invoice_date', '>=', $startDate)
                ->whereDate('invoice_date', '<=', $endDate);
        });
        $byCategory = [
            'consultation' => (float) (clone $itemsQuery)->where('item_type', 'consultation')->sum('total_price'),
            'medicine' => (float) (clone $itemsQuery)->where('item_type', 'medicine')->sum('total_price'),
            'investigation' => (float) (clone $itemsQuery)->where('item_type', 'investigation')->sum('total_price'),
            'procedure' => (float) (clone $itemsQuery)->where('item_type', 'procedure')->sum('total_price'),
            'other' => (float) (clone $itemsQuery)->where('item_type', 'other')->sum('total_price'),
        ];

        // 4. Overall cumulative dues
        $totalOutstandingDue = (float) Invoice::query()->whereNotIn('status', ['cancelled', 'waived'])->sum('due_amount');

        // 5. Recent payments list
        $recentPayments = Payment::query()
            ->with(['invoice.patient', 'receivedBy:id,name'])
            ->whereDate('payment_date', '>=', $startDate)
            ->whereDate('payment_date', '<=', $endDate)
            ->latest('id')
            ->limit(50)
            ->get();

        return [
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'summary' => [
                'total_billed' => $totalBilled,
                'total_collected' => $totalCollected,
                'total_discount' => $totalDiscount,
                'invoices_count' => $invoicesCount,
                'paid_invoices_count' => $paidInvoicesCount,
                'unpaid_invoices_count' => $unpaidInvoicesCount,
                'total_outstanding_due' => $totalOutstandingDue,
            ],
            'by_payment_method' => $byMethod,
            'by_category' => $byCategory,
            'recent_payments' => $recentPayments,
        ];
    }
}
