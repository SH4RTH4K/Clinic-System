import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const METHOD_LABELS = {
    cash: { label: 'Cash (নগদ)', icon: '💵', color: 'emerald' },
    bkash: { label: 'bKash (বিকাশ)', icon: '📱', color: 'pink' },
    nagad: { label: 'Nagad (নগদ)', icon: '📱', color: 'orange' },
    rocket: { label: 'Rocket (রকেট)', icon: '📱', color: 'purple' },
    card: { label: 'Credit/Debit Card', icon: '💳', color: 'blue' },
    bank: { label: 'Bank Transfer', icon: '🏦', color: 'indigo' },
    other: { label: 'Other', icon: '🧾', color: 'gray' },
};

export default function CashRegister({ report = {}, filters = {} }) {
    const [startDate, setStartDate] = useState(filters.start_date || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(filters.end_date || new Date().toISOString().split('T')[0]);

    const handleFilter = (start = startDate, end = endDate) => {
        router.get(
            route('admin.billing.cash_register'),
            { start_date: start, end_date: end },
            { preserveState: true, replace: true }
        );
    };

    const setQuickDate = (period) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (period === 'today') {
            // default today
        } else if (period === 'yesterday') {
            start.setDate(today.getDate() - 1);
            end.setDate(today.getDate() - 1);
        } else if (period === 'this_week') {
            start.setDate(today.getDate() - 7);
        } else if (period === 'this_month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
        }

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        setStartDate(startStr);
        setEndDate(endStr);
        handleFilter(startStr, endStr);
    };

    const summary = report.summary || {};
    const byMethod = report.by_payment_method || {};
    const byCategory = report.by_category || {};
    const recentPayments = report.recent_payments || [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span>📊</span> Daily Cash Register &amp; Closing (ডেইলি ক্যাশ ও হিসাব ক্লোজিং)
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Reconcile daily payments across Cash, bKash, Nagad, and track department revenue breakdown.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                        >
                            <span>🖨️</span> Print Closing Sheet
                        </button>
                        <Link
                            href={route('admin.invoices.index')}
                            className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-black transition"
                        >
                            All Invoices →
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Daily Cash Register" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Date Controls */}
                <div className="no-print rounded-xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={() => setQuickDate('today')}
                            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                        >
                            Today (আজ)
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickDate('yesterday')}
                            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                        >
                            Yesterday
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickDate('this_week')}
                            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                        >
                            Last 7 Days
                        </button>
                        <button
                            type="button"
                            onClick={() => setQuickDate('this_month')}
                            className="rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                        >
                            This Month
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <button
                            type="button"
                            onClick={() => handleFilter()}
                            className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                        >
                            Apply
                        </button>
                    </div>
                </div>

                {/* Closing Period Banner for Print */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                            <span>📅</span> Financial Reconciliation Period: {startDate} {startDate !== endDate ? `to ${endDate}` : '(Today)'}
                        </h3>
                        <p className="text-xs text-emerald-700 mt-0.5">
                            {summary.invoices_count || 0} invoices issued · {summary.paid_invoices_count || 0} fully paid · {summary.unpaid_invoices_count || 0} with outstanding balance
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold text-emerald-600 uppercase">Realized Revenue</span>
                        <p className="text-2xl font-black text-emerald-800">৳{Number(summary.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Key Summary Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Total Billed</span>
                        <p className="mt-2 text-2xl font-bold text-gray-900">৳{Number(summary.total_billed || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Gross billing in period</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-emerald-600 uppercase">Total Collected</span>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">৳{Number(summary.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Cash &amp; digital received</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-rose-600 uppercase">Total Discounts</span>
                        <p className="mt-2 text-2xl font-bold text-rose-700">৳{Number(summary.total_discount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Discounts granted to patients</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <span className="text-xs font-semibold text-amber-600 uppercase">Cumulative Dues</span>
                        <p className="mt-2 text-2xl font-bold text-amber-800">৳{Number(summary.total_outstanding_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Total clinic pending dues</p>
                    </div>
                </div>

                {/* Payment Methods & Revenue Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Collections by Payment Method */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                            <span>💳 Collections by Payment Method</span>
                            <span className="text-[11px] text-emerald-700 font-bold">Total: ৳{Number(summary.total_collected || 0).toFixed(2)}</span>
                        </h3>
                        <div className="space-y-2.5">
                            {Object.entries(METHOD_LABELS).map(([key, config]) => {
                                const amount = Number(byMethod[key] || 0);
                                const percentage = summary.total_collected > 0 ? ((amount / summary.total_collected) * 100).toFixed(1) : 0;
                                return (
                                    <div key={key} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50/70 hover:bg-gray-50 transition">
                                        <div className="flex items-center gap-2">
                                            <span>{config.icon}</span>
                                            <span className="font-semibold text-gray-800">{config.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono font-bold text-gray-900">৳{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[10px] text-gray-400 block">{percentage}% of intake</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Revenue by Department / Category */}
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs space-y-3">
                        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                            <span>🏥 Revenue by Department / Service</span>
                            <span className="text-[11px] text-blue-700 font-bold">Billed Services</span>
                        </h3>
                        <div className="space-y-2.5">
                            {[
                                { key: 'consultation', label: 'Doctor Consultation Fees', icon: '🩺', desc: 'Physician visit fees' },
                                { key: 'medicine', label: 'Pharmacy & Medicines', icon: '💊', desc: 'Homeopathic & allopathic drugs' },
                                { key: 'investigation', label: 'Lab & Diagnostic Tests', icon: '🧪', desc: 'Clinical pathology & imaging' },
                                { key: 'procedure', label: 'Clinical Procedures', icon: '🩹', desc: 'Minor clinical interventions' },
                                { key: 'other', label: 'Other Items & Sundries', icon: '📦', desc: 'Miscellaneous services' },
                            ].map((cat) => {
                                const amount = Number(byCategory[cat.key] || 0);
                                return (
                                    <div key={cat.key} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50/70 hover:bg-gray-50 transition">
                                        <div className="flex items-center gap-2">
                                            <span>{cat.icon}</span>
                                            <div>
                                                <span className="font-semibold text-gray-800 block">{cat.label}</span>
                                                <span className="text-[10px] text-gray-400">{cat.desc}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono font-bold text-gray-900">৳{amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Payments Ledger Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="border-b px-5 py-3 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Daily Cashier Payments Log (কালেকশন লগ)
                        </h3>
                        <span className="text-xs text-gray-500 font-medium">{recentPayments.length} transactions</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                            <thead className="bg-white font-semibold text-gray-600 uppercase">
                                <tr>
                                    <th className="px-5 py-3">Receipt #</th>
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Patient</th>
                                    <th className="px-5 py-3">Invoice #</th>
                                    <th className="px-5 py-3">Payment Method</th>
                                    <th className="px-5 py-3">TrxID / Ref</th>
                                    <th className="px-5 py-3 text-right">Amount</th>
                                    <th className="px-5 py-3">Cashier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {recentPayments.length > 0 ? (
                                    recentPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition">
                                            <td className="px-5 py-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                                                {p.payment_number}
                                            </td>
                                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{p.payment_date}</td>
                                            <td className="px-5 py-3 font-medium text-gray-900">
                                                {p.invoice?.patient?.name || 'Walk-in'}
                                            </td>
                                            <td className="px-5 py-3 font-mono text-emerald-700 whitespace-nowrap">
                                                <Link href={route('admin.invoices.show', p.invoice_id)} className="hover:underline">
                                                    {p.invoice?.invoice_number || `#${p.invoice_id}`}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap">
                                                <span className="capitalize font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px]">
                                                    {p.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 font-mono text-gray-500">{p.transaction_reference || '—'}</td>
                                            <td className="px-5 py-3 text-right font-bold text-emerald-700 font-mono whitespace-nowrap">
                                                ৳{Number(p.amount).toFixed(2)}
                                            </td>
                                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{p.received_by?.name || 'Staff'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-400">
                                            No payment transactions recorded in this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
