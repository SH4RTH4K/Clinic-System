import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

const statusBadge = {
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    partially_paid: 'bg-amber-100 text-amber-800 border-amber-200',
    unpaid: 'bg-rose-100 text-rose-800 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
    waived: 'bg-purple-100 text-purple-800 border-purple-200',
};

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash (নগদ টাকা)', icon: '💵' },
    { value: 'bkash', label: 'bKash (বিকাশ)', icon: '📱' },
    { value: 'nagad', label: 'Nagad (নগদ)', icon: '📱' },
    { value: 'rocket', label: 'Rocket (রকেট)', icon: '📱' },
    { value: 'card', label: 'Debit / Credit Card (কার্ড)', icon: '💳' },
    { value: 'bank', label: 'Bank Transfer (ব্যাংক)', icon: '🏦' },
    { value: 'other', label: 'Other Method', icon: '🧾' },
];

export default function Show({ invoice, clinic = {} }) {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const consultationItem = invoice.items?.find((i) => i.item_type === 'consultation');
    const consultationDoctor = consultationItem?.notes?.startsWith('Doctor:')
        ? consultationItem.notes.replace('Doctor: ', '')
        : (consultationItem?.item_name?.includes('(') ? consultationItem.item_name.match(/\((.*?)\)/)?.[1] : null);
    const doctorDisplayName = invoice.visit?.doctor?.name || consultationDoctor || 'General Clinic Desk';

    const { data, setData, post, processing, reset, errors } = useForm({
        amount: Number(invoice.due_amount) > 0 ? Number(invoice.due_amount) : '',
        payment_method: 'cash',
        transaction_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const handleRecordPayment = (e) => {
        e.preventDefault();
        post(route('admin.invoices.payments.store', invoice.id), {
            onSuccess: () => {
                setIsPaymentModalOpen(false);
                reset();
            },
        });
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete invoice ${invoice.invoice_number}?`)) {
            router.delete(route('admin.invoices.destroy', invoice.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('admin.invoices.index')}
                            className="rounded-lg border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 transition"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900 font-mono">
                                    {invoice.invoice_number}
                                </h2>
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusBadge[invoice.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {invoice.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Invoiced on {invoice.invoice_date} · Created by {invoice.created_by?.name || 'Staff'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {Number(invoice.due_amount) > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                            >
                                <span>💵</span> Collect Payment (পেমেন্ট গ্রহণ)
                            </button>
                        )}
                        <Link
                            href={route('admin.invoices.print', invoice.id)}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                        >
                            <span>🖨️</span> Print A4/A5
                        </Link>
                        <Link
                            href={route('admin.invoices.pos_receipt', invoice.id)}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition"
                        >
                            <span>🧾</span> 80mm POS Slip
                        </Link>
                        <Link
                            href={route('admin.invoices.edit', invoice.id)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Edit
                        </Link>
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Invoice"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Invoice #${invoice.invoice_number}`} />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Due Banner if unpaid */}
                {Number(invoice.due_amount) > 0 && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-700 font-bold">
                                ৳
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-rose-900">Payment Due: ৳{Number(invoice.due_amount).toFixed(2)}</h4>
                                <p className="text-xs text-rose-700 mt-0.5">
                                    Total ৳{Number(invoice.total_amount).toFixed(2)} · Paid so far ৳{Number(invoice.paid_amount).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 transition shrink-0"
                        >
                            Receive ৳{Number(invoice.due_amount).toFixed(2)} Now
                        </button>
                    </div>
                )}

                {/* Patient & Clinic Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Patient Information */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>👤</span> Patient Information
                        </h3>
                        <div>
                            <p className="text-base font-bold text-gray-900">{invoice.patient?.name || 'Walk-in Patient'}</p>
                            <p className="text-xs text-gray-600 mt-1">
                                Patient ID: <span className="font-mono font-semibold text-gray-800">{invoice.patient?.patient_code || invoice.patient?.id}</span>
                            </p>
                            <p className="text-xs text-gray-600">Mobile Phone: {invoice.patient?.phone || 'Not recorded'}</p>
                            <p className="text-xs text-gray-600">Address: {invoice.patient?.address || 'Not recorded'}</p>
                        </div>
                        {invoice.visit && (
                            <div className="pt-2 border-t text-xs text-blue-700 flex items-center justify-between">
                                <span>Clinical Visit #{invoice.visit.id}</span>
                                <Link
                                    href={route('admin.visits.show', invoice.visit.id)}
                                    className="font-semibold underline hover:text-blue-900"
                                >
                                    View Visit Prescription →
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Clinic & Attending Doctor */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🏥</span> Clinic &amp; Attending Doctor
                        </h3>
                        <div>
                            <p className="text-base font-bold text-gray-900">{clinic.name}</p>
                            {clinic.name_bn && <p className="text-xs text-gray-500">{clinic.name_bn}</p>}
                            <p className="text-xs text-gray-600 mt-1">Phone: {clinic.phone}</p>
                            <p className="text-xs text-gray-600">Location: {clinic.address}</p>
                        </div>
                        <div className="pt-2 border-t text-xs text-gray-700">
                            Attending Doctor: <span className="font-bold text-gray-900">{doctorDisplayName}</span>
                        </div>
                    </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="border-b px-5 py-3 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Invoice Line Items (বিলকৃত পণ্যাদি ও সেবাসমূহ)
                        </h3>
                        <span className="text-xs text-gray-500 font-medium">{invoice.items?.length || 0} line items</span>
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                        <thead className="bg-white font-semibold text-gray-600 uppercase">
                            <tr>
                                <th className="px-5 py-3 w-12 text-center">#</th>
                                <th className="px-5 py-3">Description</th>
                                <th className="px-5 py-3 w-28">Category</th>
                                <th className="px-5 py-3 text-right w-20">Qty</th>
                                <th className="px-5 py-3 text-right w-28">Unit Price</th>
                                <th className="px-5 py-3 text-right w-32">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {invoice.items?.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50/60 transition">
                                    <td className="px-5 py-3 text-center text-gray-400 font-mono">{index + 1}</td>
                                    <td className="px-5 py-3">
                                        <p className="font-bold text-gray-900">{item.item_name}</p>
                                        {item.notes && <p className="text-[11px] text-gray-400 mt-0.5">{item.notes}</p>}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="capitalize rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                                            {item.item_type}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-medium text-gray-700">{Number(item.quantity)}</td>
                                    <td className="px-5 py-3 text-right text-gray-700 font-mono">৳{Number(item.unit_price).toFixed(2)}</td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-900 font-mono">৳{Number(item.total_price).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Financial Summary Breakdown */}
                    <div className="border-t border-gray-200 bg-gray-50/50 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                            <div className="text-xs text-gray-500 max-w-sm">
                                {invoice.notes && (
                                    <div>
                                        <span className="font-semibold text-gray-700">Notes:</span>
                                        <p className="mt-0.5 text-gray-600 italic">{invoice.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full sm:w-72 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-gray-600">
                                    <span>Subtotal:</span>
                                    <span className="font-semibold text-gray-900 font-mono">৳{Number(invoice.subtotal).toFixed(2)}</span>
                                </div>
                                {Number(invoice.discount_amount) > 0 && (
                                    <div className="flex items-center justify-between text-rose-600">
                                        <span>Discount ({invoice.discount_type === 'percentage' ? `${invoice.discount_amount}%` : 'Fixed'}):</span>
                                        <span className="font-semibold font-mono">-৳{Number(invoice.discount_amount).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t flex items-center justify-between text-sm font-bold text-gray-900">
                                    <span>Net Payable:</span>
                                    <span className="text-base font-extrabold text-emerald-800 font-mono">৳{Number(invoice.total_amount).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-emerald-700 font-medium">
                                    <span>Total Paid:</span>
                                    <span className="font-mono">৳{Number(invoice.paid_amount).toFixed(2)}</span>
                                </div>
                                <div className="pt-1 border-t flex items-center justify-between text-sm font-bold">
                                    <span className={Number(invoice.due_amount) > 0 ? 'text-rose-700' : 'text-gray-500'}>
                                        Balance Due:
                                    </span>
                                    <span className={`font-mono text-base ${Number(invoice.due_amount) > 0 ? 'text-rose-700 font-extrabold' : 'text-gray-500'}`}>
                                        ৳{Number(invoice.due_amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payments History Ledger */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="border-b px-5 py-3 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                            <span>💳</span> Payment History &amp; Receipts (পরিশোধের ইতিহাস)
                        </h3>
                        {Number(invoice.due_amount) > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="text-xs font-bold text-emerald-700 hover:underline"
                            >
                                + Record Payment
                            </button>
                        )}
                    </div>

                    <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                        <thead className="bg-white font-semibold text-gray-600 uppercase">
                            <tr>
                                <th className="px-5 py-3">Receipt #</th>
                                <th className="px-5 py-3">Date</th>
                                <th className="px-5 py-3">Method</th>
                                <th className="px-5 py-3">Reference / TrxID</th>
                                <th className="px-5 py-3 text-right">Amount</th>
                                <th className="px-5 py-3">Received By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {invoice.payments?.length > 0 ? (
                                invoice.payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/60 transition">
                                        <td className="px-5 py-3 font-mono font-bold text-gray-900">{p.payment_number}</td>
                                        <td className="px-5 py-3 text-gray-600">{p.payment_date}</td>
                                        <td className="px-5 py-3">
                                            <span className="capitalize font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                {p.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 font-mono text-gray-600">{p.transaction_reference || 'N/A'}</td>
                                        <td className="px-5 py-3 text-right font-bold text-emerald-700 font-mono">৳{Number(p.amount).toFixed(2)}</td>
                                        <td className="px-5 py-3 text-gray-600">{p.received_by?.name || 'Staff'}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-6 text-center text-gray-400">
                                        No payments recorded yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <span>💵</span> Record Patient Payment
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRecordPayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Payment Method (পদ্ধতি) <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    value={data.payment_method}
                                    onChange={(e) => setData('payment_method', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    {PAYMENT_METHODS.map((m) => (
                                        <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-gray-700">
                                        Amount to Collect (টাকা) <span className="text-rose-600">*</span>
                                    </label>
                                    <span className="text-[11px] text-gray-500">
                                        Max Due: ৳{Number(invoice.due_amount).toFixed(2)}
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-sm font-bold text-gray-900 shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                    required
                                />
                                {errors.amount && <p className="text-xs text-rose-600 mt-1">{errors.amount}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Transaction Reference / TrxID
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. bKash TrxID or Bank Slip #"
                                    value={data.transaction_reference}
                                    onChange={(e) => setData('transaction_reference', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Payment Date (তারিখ)
                                </label>
                                <input
                                    type="date"
                                    value={data.payment_date}
                                    onChange={(e) => setData('payment_date', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.amount || Number(data.amount) <= 0}
                                    className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                                >
                                    {processing ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
