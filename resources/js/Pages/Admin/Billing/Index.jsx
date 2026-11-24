import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const statusBadge = {
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    partially_paid: 'bg-amber-100 text-amber-800 border-amber-200',
    unpaid: 'bg-rose-100 text-rose-800 border-rose-200',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
    waived: 'bg-purple-100 text-purple-800 border-purple-200',
};

export default function Index({ invoices, filters = {}, metrics = {} }) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');

    const handleFilter = (newStatus = status) => {
        router.get(
            route('admin.invoices.index'),
            {
                search: search || undefined,
                status: newStatus !== 'all' ? newStatus : undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        handleFilter();
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatus('all');
        setStartDate('');
        setEndDate('');
        router.get(route('admin.invoices.index'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span>🧾</span> Patient Invoicing &amp; Billing (বিলিং ও ক্যাশিয়ার)
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Manage patient invoices, consultation fees, medicine sales, payments, and financial closing.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.billing.cash_register')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                        >
                            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Cash Register (ডেইলি ক্যাশ)
                        </Link>
                        <Link
                            href={route('admin.invoices.create')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            New Invoice (নতুন বিল)
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Billing & Invoicing" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Total Billed</span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-sm">৳</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">৳{Number(metrics.total_invoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Gross revenue invoiced</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-600 uppercase">Total Collected</span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-sm">✓</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-700">৳{Number(metrics.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Realized cash &amp; digital payments</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-rose-600 uppercase">Outstanding Due</span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 text-sm">⚠️</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-rose-700">৳{Number(metrics.total_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="mt-1 text-[11px] text-rose-600 font-medium">Pending patient collections</p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-600 uppercase">Unpaid Invoices</span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 text-sm">📄</span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-800">{metrics.unpaid_count || 0}</p>
                        <p className="mt-1 text-[11px] text-gray-500">Invoices requiring payment</p>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Status Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                            {[
                                { key: 'all', label: 'All Invoices' },
                                { key: 'unpaid', label: 'Unpaid' },
                                { key: 'partially_paid', label: 'Partial' },
                                { key: 'paid', label: 'Paid' },
                                { key: 'due', label: 'Has Due' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => {
                                        setStatus(tab.key);
                                        handleFilter(tab.key);
                                    }}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                        status === tab.key
                                            ? 'bg-gray-900 text-white shadow-2xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input & Date Range */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Search invoice, patient, phone..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full sm:w-60 rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                            />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                title="Start Date"
                            />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                title="End Date"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-black transition"
                            >
                                Filter
                            </button>
                            {(search || status !== 'all' || startDate || endDate) && (
                                <button
                                    type="button"
                                    onClick={handleClearFilters}
                                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Invoices Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Invoice #</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Patient</th>
                                    <th className="px-4 py-3">Doctor / Ref</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right">Paid</th>
                                    <th className="px-4 py-3 text-right">Due</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {invoices?.data?.length > 0 ? (
                                    invoices.data.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                                            <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                <Link
                                                    href={route('admin.invoices.show', inv.id)}
                                                    className="text-emerald-700 hover:underline flex items-center gap-1"
                                                >
                                                    <span>🧾</span> {inv.invoice_number}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                {inv.invoice_date}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-gray-900">{inv.patient?.name || 'Walk-in Patient'}</div>
                                                <div className="text-[11px] text-gray-500">
                                                    {inv.patient?.phone || 'No phone'} · ID: {inv.patient?.patient_code || inv.patient?.id}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {inv.visit?.doctor?.name ? (
                                                    <span className="font-medium text-gray-800">{inv.visit.doctor.name}</span>
                                                ) : (
                                                    <span className="text-gray-400">Direct Desk Bill</span>
                                                )}
                                                {inv.visit_id && (
                                                    <span className="block text-[10px] text-gray-400">Visit #{inv.visit_id}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                                                ৳{Number(inv.total_amount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                                                ৳{Number(inv.paid_amount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                {Number(inv.due_amount) > 0 ? (
                                                    <span className="font-bold text-rose-700">৳{Number(inv.due_amount).toFixed(2)}</span>
                                                ) : (
                                                    <span className="text-gray-400">৳0.00</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusBadge[inv.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                    {inv.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Link
                                                        href={route('admin.invoices.show', inv.id)}
                                                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                                                    >
                                                        View
                                                    </Link>
                                                    <Link
                                                        href={route('admin.invoices.print', inv.id)}
                                                        target="_blank"
                                                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                                                        title="Print Standard A4/A5"
                                                    >
                                                        🖨️
                                                    </Link>
                                                    <Link
                                                        href={route('admin.invoices.pos_receipt', inv.id)}
                                                        target="_blank"
                                                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                                                        title="Thermal 80mm Slip"
                                                    >
                                                        🧾
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-4xl mb-2">🧾</span>
                                                <p className="text-sm font-semibold text-gray-700">No invoices found</p>
                                                <p className="text-xs text-gray-400 mt-1">Create an invoice from a consultation visit or desk cashier.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {invoices?.links && (
                        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                            <Pagination links={invoices.links} />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
