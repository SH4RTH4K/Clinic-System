import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusBadge = {
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    partially_paid: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    unpaid: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    cancelled: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
    waived: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
};

const methodIcons = {
    cash: '💵 Cash',
    bkash: '📱 bKash',
    nagad: '📱 Nagad',
    rocket: '📱 Rocket',
    card: '💳 Card',
    bank: '🏦 Bank',
    other: '🏷️ Other',
};

export default function Index({ invoices = { data: [] }, filters = {}, metrics = {} }) {
    const can = usePermission();
    const canCreate = can('billing.create');
    const canUpdate = can('billing.update');

    // Filter states
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedMethod, setSelectedMethod] = useState(filters.payment_method || 'all');
    const [selectedPreset, setSelectedPreset] = useState(filters.date_preset || '');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [selectedSort, setSelectedSort] = useState(filters.sort || 'latest');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    // Quick Due Collection Modal state
    const [payingInvoice, setPayingInvoice] = useState(null);
    const { data: payData, setData: setPayData, post: postPay, processing: payProcessing, reset: resetPay, errors: payErrors } = useForm({
        amount: '',
        payment_method: 'cash',
        transaction_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const isInitialMount = useRef(true);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
            payment_method: overrides.payment_method !== undefined ? overrides.payment_method : selectedMethod,
            date_preset: overrides.date_preset !== undefined ? overrides.date_preset : selectedPreset,
            start_date: overrides.start_date !== undefined ? overrides.start_date : startDate,
            end_date: overrides.end_date !== undefined ? overrides.end_date : endDate,
            sort: overrides.sort !== undefined ? overrides.sort : selectedSort,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        if (!query.search) delete query.search;
        if (query.status === 'all') delete query.status;
        if (query.payment_method === 'all') delete query.payment_method;
        if (!query.date_preset) delete query.date_preset;
        if (!query.start_date) delete query.start_date;
        if (!query.end_date) delete query.end_date;
        if (query.sort === 'latest') delete query.sort;
        if (query.per_page === '15') delete query.per_page;

        router.get(route('admin.invoices.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounced search trigger (300ms)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const timeoutId = setTimeout(() => {
            applyFilters({ search: searchTerm });
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleStatusPill = (statusKey) => {
        setSelectedStatus(statusKey);
        applyFilters({ status: statusKey });
    };

    const handleMethodPill = (methodKey) => {
        setSelectedMethod(methodKey);
        applyFilters({ payment_method: methodKey });
    };

    const handleDatePreset = (presetKey) => {
        setSelectedPreset(presetKey);
        setStartDate('');
        setEndDate('');
        applyFilters({ date_preset: presetKey, start_date: '', end_date: '' });
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedMethod('all');
        setSelectedPreset('');
        setStartDate('');
        setEndDate('');
        setSelectedSort('latest');
        setPerPage('15');
        router.get(route('admin.invoices.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    // Open Due Collection Modal
    const openCollectDueModal = (invoice) => {
        setPayingInvoice(invoice);
        setPayData({
            amount: Number(invoice.due_amount).toFixed(2),
            payment_method: 'cash',
            transaction_reference: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: `Due settlement for invoice ${invoice.invoice_number}`,
        });
    };

    const closeCollectDueModal = () => {
        setPayingInvoice(null);
        resetPay();
    };

    const submitDueCollection = (e) => {
        e.preventDefault();
        if (!payingInvoice) return;

        postPay(route('admin.invoices.payments.store', payingInvoice.id), {
            preserveScroll: true,
            onSuccess: () => {
                closeCollectDueModal();
            },
        });
    };

    // Export query string builder
    const exportParams = new URLSearchParams();
    if (searchTerm) exportParams.set('search', searchTerm);
    if (selectedStatus !== 'all') exportParams.set('status', selectedStatus);
    if (selectedMethod !== 'all') exportParams.set('payment_method', selectedMethod);
    if (selectedPreset) exportParams.set('date_preset', selectedPreset);
    if (startDate) exportParams.set('start_date', startDate);
    if (endDate) exportParams.set('end_date', endDate);
    if (selectedSort !== 'latest') exportParams.set('sort', selectedSort);
    const exportUrl = `${route('admin.invoices.export')}${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

    const collectionPercent = metrics.total_invoiced > 0
        ? Math.min(100, Math.round(((metrics.total_collected || 0) / metrics.total_invoiced) * 100))
        : 100;

    return (
        <AuthenticatedLayout>
            <Head title="Patient Invoices & Cash Register" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-20">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Patient Invoicing & Cash Register (বিলিং ও ক্যাশিয়ার)"
                    subtitle="Manage patient billing, consultation fees, medicine sales, fast due payment settlement, and cash closing"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.billing.cash_register')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🧾</span> Cash Register (ডেইলি ক্যাশ)
                            </Link>
                            <a
                                href={exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                            >
                                <span>📥</span> Export Ledger CSV
                            </a>
                            {canCreate && (
                                <Link
                                    href={route('admin.invoices.create')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700"
                                >
                                    <span>➕</span> New POS Invoice
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive 5-Card Financial KPI Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Financial Metrics Overview">
                    {/* Card 1: Total Invoiced */}
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Total Billed 💰</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            ৳{Number(metrics.total_invoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">মোট প্রদেয় বিলকৃত রাজস্ব</div>
                    </div>

                    {/* Card 2: Collected Revenue */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Realized Revenue ✅</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                {collectionPercent}%
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">
                            ৳{Number(metrics.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">নগদ ও ডিজিটাল আদায়কৃত</div>
                    </div>

                    {/* Card 3: Outstanding Due */}
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Outstanding Due ⚠️</div>
                        <div className="text-2xl font-bold text-rose-800 mt-1">
                            ৳{Number(metrics.total_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-rose-600 mt-0.5 font-medium">রোগীদের নিকট বকেয়া পাওনা</div>
                    </div>

                    {/* Card 4: Due Invoices Count */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Due Invoices 📄</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{metrics.due_invoices_count || 0}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">বকেয়া সমন্বয় বাকি বিল</div>
                    </div>

                    {/* Card 5: Fully Paid Invoices */}
                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Fully Settled 🏆</div>
                        <div className="text-2xl font-bold text-purple-900 mt-1">{metrics.paid_invoices_count || 0}</div>
                        <div className="text-[11px] text-purple-600 mt-0.5">১০০% পরিশোধিত ইনভয়েস</div>
                    </div>
                </section>

                {/* Universal Search & Multi-Parameter Filter Studio */}
                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-4">
                    {/* Row 1: Search & Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by invoice #, patient name, phone, patient ID..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Date Presets Strip */}
                        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => handleDatePreset('')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    !selectedPreset && !startDate && !endDate
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All Time
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDatePreset('today')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    selectedPreset === 'today'
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDatePreset('this_week')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    selectedPreset === 'this_week'
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                This Week
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDatePreset('this_month')}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                                    selectedPreset === 'this_month'
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                This Month
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Secondary Dropdowns & Sort */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setSelectedPreset(''); applyFilters({ start_date: e.target.value, date_preset: '' }); }}
                                className="rounded-lg border-gray-300 py-1.5 px-2.5 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                title="Start Date"
                            />
                            <span className="text-gray-400 text-xs">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setSelectedPreset(''); applyFilters({ end_date: e.target.value, date_preset: '' }); }}
                                className="rounded-lg border-gray-300 py-1.5 px-2.5 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                title="End Date"
                            />

                            <select
                                value={selectedSort}
                                onChange={(e) => { setSelectedSort(e.target.value); applyFilters({ sort: e.target.value }); }}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="latest">Newest Invoices (সর্বশেষ বিল)</option>
                                <option value="due_desc">⚠️ Highest Due First (বকেয়া)</option>
                                <option value="amount_desc">💰 Highest Billed First</option>
                                <option value="oldest">Oldest First</option>
                            </select>

                            <select
                                value={perPage}
                                onChange={(e) => { setPerPage(e.target.value); applyFilters({ per_page: e.target.value }); }}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="10">10 / page</option>
                                <option value="15">15 / page</option>
                                <option value="25">25 / page</option>
                                <option value="50">50 / page</option>
                                <option value="100">100 / page</option>
                            </select>
                        </div>

                        {(searchTerm || selectedStatus !== 'all' || selectedMethod !== 'all' || selectedPreset || startDate || endDate || selectedSort !== 'latest') && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline transition"
                            >
                                Reset All Filters
                            </button>
                        )}
                    </div>

                    {/* Row 3: 1-Click Fast Filter Pills Strip */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                            <span>🏷️</span>
                            <span>Payment Status &amp; Method Fast Filters:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleStatusPill('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStatus === 'all' && selectedMethod === 'all'
                                        ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Invoices
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusPill('due')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStatus === 'due'
                                        ? 'bg-rose-600 text-white font-bold shadow-2xs'
                                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                                }`}
                            >
                                ⚠️ Has Due ({metrics.due_invoices_count || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusPill('paid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStatus === 'paid'
                                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                                ✅ Fully Paid ({metrics.paid_invoices_count || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusPill('unpaid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStatus === 'unpaid'
                                        ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                🛑 Unpaid
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMethodPill('bkash')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedMethod === 'bkash'
                                        ? 'bg-pink-600 text-white font-bold shadow-2xs'
                                        : 'bg-pink-50 text-pink-800 hover:bg-pink-100 border border-pink-200'
                                }`}
                            >
                                📱 bKash MFS
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMethodPill('cash')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedMethod === 'cash'
                                        ? 'bg-teal-600 text-white font-bold shadow-2xs'
                                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                                }`}
                            >
                                💵 Cash Desk
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dual-Mode Presentation: Desktop DataTable alongside Mobile Touch Cards */}

                {/* 1. Desktop Structured Table (hidden md:block) */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                            <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3">Invoice #</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Patient Master</th>
                                    <th className="px-4 py-3">Attending Doctor</th>
                                    <th className="px-4 py-3 text-right">Billed (৳)</th>
                                    <th className="px-4 py-3 text-right">Paid (৳)</th>
                                    <th className="px-4 py-3 text-right">Due (৳)</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {invoices?.data?.length > 0 ? (
                                    invoices.data.map((inv) => {
                                        const dueAmt = Number(inv.due_amount || 0);
                                        const hasDue = dueAmt > 0 && !['cancelled', 'waived'].includes(inv.status);

                                        return (
                                            <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                                                <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                                                    <Link
                                                        href={route('admin.invoices.show', inv.id)}
                                                        className="text-primary-700 hover:underline flex items-center gap-1 font-mono"
                                                    >
                                                        <span>🧾</span> {inv.invoice_number}
                                                    </Link>
                                                    {inv.createdBy?.name && (
                                                        <span className="block text-[10px] text-gray-400 font-normal">
                                                            by {inv.createdBy.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{inv.invoice_date}</div>
                                                    <div className="text-[10px] text-gray-400">
                                                        {inv.payments?.length > 0
                                                            ? inv.payments.map((p) => methodIcons[p.payment_method] || p.payment_method).join(', ')
                                                            : 'No payments'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">
                                                        {inv.patient?.name || 'Walk-in Patient'}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                                        {inv.patient?.phone ? (
                                                            <a href={`tel:${inv.patient.phone}`} className="text-primary-600 hover:underline font-mono">
                                                                📞 {inv.patient.phone}
                                                            </a>
                                                        ) : (
                                                            <span>No phone</span>
                                                        )}
                                                        <span className="text-gray-300">·</span>
                                                        <span className="font-mono text-gray-500">ID: {inv.patient?.patient_code || inv.patient?.id || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {inv.visit?.doctor?.name ? (
                                                        <div className="font-semibold text-gray-800 flex items-center gap-1">
                                                            <span>🩺</span> {inv.visit.doctor.name}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">Direct Chamber Desk</span>
                                                    )}
                                                    {inv.visit_id && (
                                                        <span className="block text-[10px] text-gray-400 font-mono">Visit #{inv.visit_id}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                                                    ৳{Number(inv.total_amount).toFixed(2)}
                                                    {Number(inv.discount_amount) > 0 && (
                                                        <span className="block text-[10px] text-emerald-600 font-normal">
                                                            -৳{Number(inv.discount_amount).toFixed(2)} off
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap font-mono">
                                                    ৳{Number(inv.paid_amount).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap font-mono">
                                                    {hasDue ? (
                                                        <span className="font-bold text-rose-700">৳{dueAmt.toFixed(2)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">৳0.00</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge[inv.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                        {inv.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        {hasDue && canUpdate && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openCollectDueModal(inv)}
                                                                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                                                                title="Fast Due Settlement"
                                                            >
                                                                <span>💵</span> Collect
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={route('admin.invoices.show', inv.id)}
                                                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                                                        >
                                                            View
                                                        </Link>
                                                        <Link
                                                            href={route('admin.invoices.pos_receipt', inv.id)}
                                                            target="_blank"
                                                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                                                            title="Thermal 80mm POS Slip"
                                                        >
                                                            🧾
                                                        </Link>
                                                        <Link
                                                            href={route('admin.invoices.print', inv.id)}
                                                            target="_blank"
                                                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                                                            title="Standard A4 Print"
                                                        >
                                                            🖨️
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={9} className="py-14 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-4xl mb-2">🧾</span>
                                                <p className="text-sm font-semibold text-gray-800">No matching invoices found</p>
                                                <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria, payment status, or date range.</p>
                                                <button
                                                    type="button"
                                                    onClick={clearAllFilters}
                                                    className="mt-3 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold border border-primary-200 hover:bg-primary-100 transition"
                                                >
                                                    Reset Filters
                                                </button>
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

                {/* 2. Mobile Touch Cards (< 768px: block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {invoices?.data?.length > 0 ? (
                        invoices.data.map((inv) => {
                            const dueAmt = Number(inv.due_amount || 0);
                            const hasDue = dueAmt > 0 && !['cancelled', 'waived'].includes(inv.status);

                            return (
                                <div key={inv.id} className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-3">
                                    {/* Top Row: Invoice # + Status Badge */}
                                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-base">🧾</span>
                                            <Link
                                                href={route('admin.invoices.show', inv.id)}
                                                className="font-bold text-sm text-primary-700 hover:underline font-mono truncate"
                                            >
                                                {inv.invoice_number}
                                            </Link>
                                        </div>
                                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge[inv.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                            {inv.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Patient & Doctor Meta */}
                                    <div className="space-y-1">
                                        <div className="font-bold text-gray-900 text-sm">
                                            {inv.patient?.name || 'Walk-in Patient'}
                                        </div>
                                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                                            {inv.patient?.phone ? (
                                                <a href={`tel:${inv.patient.phone}`} className="text-primary-700 font-mono font-medium">
                                                    📞 {inv.patient.phone}
                                                </a>
                                            ) : (
                                                <span>No phone</span>
                                            )}
                                            <span>·</span>
                                            <span className="font-mono">ID: {inv.patient?.patient_code || inv.patient?.id || '—'}</span>
                                        </div>
                                        <div className="text-xs text-gray-600 flex items-center justify-between pt-1">
                                            <span>Attending: <strong>{inv.visit?.doctor?.name || 'Direct Desk Bill'}</strong></span>
                                            <span className="text-gray-400 font-mono text-[11px]">{inv.invoice_date}</span>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown Grid */}
                                    <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center font-mono">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block uppercase">Billed</span>
                                            <span className="text-xs font-bold text-gray-900">৳{Number(inv.total_amount).toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-emerald-600 block uppercase">Paid</span>
                                            <span className="text-xs font-bold text-emerald-700">৳{Number(inv.paid_amount).toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-rose-600 block uppercase">Due</span>
                                            <span className={`text-xs font-bold ${hasDue ? 'text-rose-700' : 'text-gray-400'}`}>
                                                ৳{dueAmt.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions Row */}
                                    <div className="space-y-2 pt-1">
                                        {hasDue && canUpdate && (
                                            <button
                                                type="button"
                                                onClick={() => openCollectDueModal(inv)}
                                                className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-2xs hover:bg-emerald-700 transition"
                                            >
                                                <span>💵</span> Collect Due Balance (৳{dueAmt.toFixed(2)})
                                            </button>
                                        )}
                                        <div className="grid grid-cols-3 gap-2">
                                            <Link
                                                href={route('admin.invoices.show', inv.id)}
                                                className="flex items-center justify-center min-h-[40px] rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                👁️ View
                                            </Link>
                                            <Link
                                                href={route('admin.invoices.pos_receipt', inv.id)}
                                                target="_blank"
                                                className="flex items-center justify-center min-h-[40px] rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                                            >
                                                🧾 POS Slip
                                            </Link>
                                            <Link
                                                href={route('admin.invoices.print', inv.id)}
                                                target="_blank"
                                                className="flex items-center justify-center min-h-[40px] rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                            >
                                                🖨️ A4 Print
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
                            <span className="text-3xl mb-1 block">🧾</span>
                            <p className="text-sm font-semibold text-gray-800">No invoices found</p>
                            <p className="text-xs text-gray-400 mt-1">Try resetting your active filters.</p>
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-3 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold border border-primary-200"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}

                    {invoices?.links && (
                        <div className="pt-2">
                            <Pagination links={invoices.links} />
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Due Collection Modal */}
            {payingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-emerald-50/80 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
                                    💵
                                </span>
                                <div>
                                    <h3 className="font-bold text-sm text-gray-900">Collect Due Payment</h3>
                                    <p className="text-[11px] text-emerald-700 font-mono">Invoice #{payingInvoice.invoice_number}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeCollectDueModal}
                                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitDueCollection} className="p-5 space-y-4">
                            {/* Outstanding Balance Banner */}
                            <div className="rounded-xl bg-gray-50 p-3 border border-gray-200 flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] text-gray-500 uppercase block font-semibold">Patient Name</span>
                                    <span className="text-xs font-bold text-gray-900">{payingInvoice.patient?.name || 'Walk-in Patient'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[11px] text-rose-600 uppercase block font-bold">Outstanding Due</span>
                                    <span className="text-lg font-bold text-rose-700 font-mono">
                                        ৳{Number(payingInvoice.due_amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Amount & Quick Chips */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700">
                                    Collection Amount (আদায়কৃত টাকা) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">৳</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={payingInvoice.due_amount}
                                        value={payData.amount}
                                        onChange={(e) => setPayData('amount', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 pl-8 pr-3 text-sm font-bold font-mono focus:border-emerald-500 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                {payErrors.amount && <p className="text-xs text-rose-600">{payErrors.amount}</p>}

                                {/* Quick Amount Chips */}
                                <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPayData('amount', Number(payingInvoice.due_amount).toFixed(2))}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition"
                                    >
                                        Full Due (৳{Number(payingInvoice.due_amount).toFixed(2)})
                                    </button>
                                    {Number(payingInvoice.due_amount) > 100 && (
                                        <button
                                            type="button"
                                            onClick={() => setPayData('amount', (Number(payingInvoice.due_amount) / 2).toFixed(2))}
                                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition"
                                        >
                                            50% (৳{(Number(payingInvoice.due_amount) / 2).toFixed(2)})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700">
                                    Payment Method (পেমেন্ট মাধ্যম) <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { key: 'cash', label: '💵 Cash' },
                                        { key: 'bkash', label: '📱 bKash' },
                                        { key: 'nagad', label: '📱 Nagad' },
                                        { key: 'rocket', label: '📱 Rocket' },
                                        { key: 'card', label: '💳 Card' },
                                        { key: 'bank', label: '🏦 Bank' },
                                    ].map((m) => (
                                        <button
                                            key={m.key}
                                            type="button"
                                            onClick={() => setPayData('payment_method', m.key)}
                                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                                                payData.payment_method === m.key
                                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs font-bold'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                                {payErrors.payment_method && <p className="text-xs text-rose-600">{payErrors.payment_method}</p>}
                            </div>

                            {/* Transaction Reference (if digital) */}
                            {payData.payment_method !== 'cash' && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-700">
                                        Transaction Reference / TrxID (লেনদেন আইডি)
                                    </label>
                                    <input
                                        type="text"
                                        value={payData.transaction_reference}
                                        onChange={(e) => setPayData('transaction_reference', e.target.value)}
                                        placeholder="e.g. 9J4K8L9M0"
                                        className="w-full rounded-lg border-gray-300 text-xs font-mono focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                    {payErrors.transaction_reference && <p className="text-xs text-rose-600">{payErrors.transaction_reference}</p>}
                                </div>
                            )}

                            {/* Payment Date */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Payment Date (তারিখ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={payData.payment_date}
                                    onChange={(e) => setPayData('payment_date', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs focus:border-emerald-500 focus:ring-emerald-500"
                                    required
                                />
                                {payErrors.payment_date && <p className="text-xs text-rose-600">{payErrors.payment_date}</p>}
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeCollectDueModal}
                                    disabled={payProcessing}
                                    className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={payProcessing || !payData.amount || Number(payData.amount) <= 0}
                                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    {payProcessing ? 'Recording Payment...' : '💾 Record Payment & Update Due'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
