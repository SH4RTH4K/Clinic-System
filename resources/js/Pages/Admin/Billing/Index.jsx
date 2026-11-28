import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const statusBadge = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    partially_paid: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    unpaid: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    cancelled: 'bg-slate-100 text-slate-600 border-slate-200 font-medium',
    waived: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
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
    const safeInvoices = (invoices && typeof invoices === 'object') ? invoices : { data: [] };
    const safeData = Array.isArray(safeInvoices.data) ? safeInvoices.data : [];
    const safeMetrics = (metrics && typeof metrics === 'object' && !Array.isArray(metrics)) ? metrics : {};
    const safeFilters = (filters && typeof filters === 'object' && !Array.isArray(filters)) ? filters : {};

    const can = usePermission();
    const canCreate = typeof can === 'function' && can('billing.create');
    const canUpdate = typeof can === 'function' && can('billing.update');

    // Filter states
    const [searchTerm, setSearchTerm] = useState(safeFilters?.search || '');
    const [selectedStatus, setSelectedStatus] = useState(safeFilters?.status || 'all');
    const [selectedMethod, setSelectedMethod] = useState(safeFilters?.payment_method || 'all');
    const [selectedPreset, setSelectedPreset] = useState(safeFilters?.date_preset || '');
    const [startDate, setStartDate] = useState(safeFilters?.start_date || '');
    const [endDate, setEndDate] = useState(safeFilters?.end_date || '');
    const [selectedSort, setSelectedSort] = useState(safeFilters?.sort || 'latest');
    const [perPage, setPerPage] = useState(safeFilters?.per_page || '15');
    const [showCustomDate, setShowCustomDate] = useState(Boolean(safeFilters?.start_date || safeFilters?.end_date));

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

        const targetUrl = typeof route === 'function' ? route('admin.invoices.index') : '/admin/invoices';
        router.get(targetUrl, query, {
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

        if (searchTerm === (safeFilters?.search || '')) {
            return;
        }

        const timeoutId = setTimeout(() => {
            applyFilters({ search: searchTerm });
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleStatusTab = (statusKey) => {
        setSelectedStatus(statusKey);
        applyFilters({ status: statusKey });
    };

    const handleDatePreset = (presetKey) => {
        setSelectedPreset(presetKey);
        setStartDate('');
        setEndDate('');
        setShowCustomDate(presetKey === 'custom');
        if (presetKey !== 'custom') {
            applyFilters({ date_preset: presetKey, start_date: '', end_date: '' });
        }
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
        setShowCustomDate(false);
        const targetUrl = typeof route === 'function' ? route('admin.invoices.index') : '/admin/invoices';
        router.get(targetUrl, {}, {
            preserveState: true,
            replace: true,
        });
    };

    const hasActiveFilters = Boolean(
        searchTerm ||
        (selectedStatus && selectedStatus !== 'all') ||
        (selectedMethod && selectedMethod !== 'all') ||
        selectedPreset ||
        startDate ||
        endDate ||
        (selectedSort && selectedSort !== 'latest') ||
        (perPage && perPage !== '15')
    );

    // Open Due Collection Modal
    const openCollectDueModal = (invoice) => {
        setPayingInvoice(invoice);
        setPayData({
            amount: Number(invoice.due_amount || 0).toFixed(2),
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

        const payTarget = typeof route === 'function'
            ? route('admin.invoices.payments.store', payingInvoice.id)
            : `/admin/invoices/${payingInvoice.id}/payments`;

        postPay(payTarget, {
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
    if (selectedPreset && selectedPreset !== 'custom') exportParams.set('date_preset', selectedPreset);
    if (startDate) exportParams.set('start_date', startDate);
    if (endDate) exportParams.set('end_date', endDate);
    if (selectedSort !== 'latest') exportParams.set('sort', selectedSort);
    let exportUrl = '/admin/invoices/export';
    try {
        exportUrl = `${typeof route === 'function' ? route('admin.invoices.export') : '/admin/invoices/export'}${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
    } catch {
        exportUrl = `/admin/invoices/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
    }

    const totalInvoiced = Number(safeMetrics?.total_invoiced || 0);
    const totalCollected = Number(safeMetrics?.total_collected || 0);
    const collectionPercent = totalInvoiced > 0
        ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100))
        : 100;

    return (
        <AuthenticatedLayout>
            <Head title="Patient Invoices & Cash Register" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-20">
                {/* RemediQ Modern PageHeader */}
                <PageHeader
                    title={
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span>Patient Invoicing &amp; Cash Register</span>
                            <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
                                বিলিং ও ক্যাশিয়ার
                            </span>
                        </div>
                    }
                    subtitle="Manage patient billing, consultation fees, medicine sales, due settlement, and daily cash closing"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={typeof route === 'function' ? route('admin.billing.cash_register') : '/admin/billing/cash-register'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>Daily Register</span>
                                <span className="text-[10px] text-slate-400 font-normal">ক্যাশ</span>
                            </Link>
                            <a
                                href={exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export CSV</span>
                            </a>
                            {canCreate && (
                                <Link
                                    href={typeof route === 'function' ? route('admin.invoices.create') : '/admin/invoices/create'}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>New POS Invoice</span>
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive 5-Card Financial KPI Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5" aria-label="Financial Metrics Overview">
                    {/* Card 1: Total Billed */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Billed</span>
                            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
                                ৳ {Number(safeMetrics?.total_invoiced || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">মোট প্রদেয় রাজস্ব</div>
                        </div>
                    </div>

                    {/* Card 2: Realized Revenue */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Collected</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                {collectionPercent}%
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold text-emerald-700 tracking-tight font-sans">
                                ৳ {Number(safeMetrics?.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">নগদ ও ডিজিটাল আদায়</div>
                        </div>
                    </div>

                    {/* Card 3: Outstanding Due */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-rose-300 transition flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Outstanding Due</span>
                            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold text-rose-700 tracking-tight font-sans">
                                ৳ {Number(safeMetrics?.total_due || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5">রোগীদের নিকট বকেয়া</div>
                        </div>
                    </div>

                    {/* Card 4: Due Invoices */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-amber-300 transition flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due Invoices</span>
                            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold text-amber-900 tracking-tight font-sans">
                                {safeMetrics?.due_invoices_count || 0}
                            </div>
                            <div className="text-[11px] text-amber-600 mt-0.5">বকেয়া সমন্বয় বাকি বিল</div>
                        </div>
                    </div>

                    {/* Card 5: Fully Settled */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs hover:border-teal-300 transition flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fully Settled</span>
                            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-2">
                            <div className="text-2xl font-bold text-teal-800 tracking-tight font-sans">
                                {safeMetrics?.paid_invoices_count || 0}
                            </div>
                            <div className="text-[11px] text-teal-600 mt-0.5">পরিশোধিত ইনভয়েস</div>
                        </div>
                    </div>
                </section>

                {/* Modern Unified Search & Filter Studio */}
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-4 space-y-3.5">
                    {/* Tier 1: Search Bar & Preset Pill Tabs */}
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-xl">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by invoice #, patient name, phone, doctor..."
                                className="w-full rounded-lg border-slate-300 pl-10 pr-9 text-xs sm:text-sm placeholder-slate-400 shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
                                    title="Clear Search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Date Presets Segmented Control */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start lg:self-auto overflow-x-auto max-w-full">
                            {[
                                { key: '', label: 'All Time' },
                                { key: 'today', label: 'Today' },
                                { key: 'this_week', label: 'This Week' },
                                { key: 'this_month', label: 'This Month' },
                                { key: 'custom', label: 'Custom Range' },
                            ].map((preset) => (
                                <button
                                    key={preset.key}
                                    type="button"
                                    onClick={() => handleDatePreset(preset.key)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                                        (preset.key === 'custom' && showCustomDate) || (preset.key !== 'custom' && selectedPreset === preset.key && !showCustomDate)
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Optional Custom Date Range Row */}
                    {showCustomDate && (
                        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 bg-slate-50/60 -mx-4 -mb-3.5 px-4 py-2.5 rounded-b-xl">
                            <span className="text-xs font-semibold text-slate-600">Date Range:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    applyFilters({ start_date: e.target.value, date_preset: '' });
                                }}
                                className="rounded-lg border-slate-300 py-1.5 px-2.5 text-xs font-medium shadow-2xs focus:border-teal-500 focus:ring-teal-500 bg-white"
                                title="Start Date"
                            />
                            <span className="text-slate-400 text-xs font-medium">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    applyFilters({ end_date: e.target.value, date_preset: '' });
                                }}
                                className="rounded-lg border-slate-300 py-1.5 px-2.5 text-xs font-medium shadow-2xs focus:border-teal-500 focus:ring-teal-500 bg-white"
                                title="End Date"
                            />
                            {(startDate || endDate) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                        applyFilters({ start_date: '', end_date: '' });
                                    }}
                                    className="text-xs text-rose-600 hover:underline font-semibold"
                                >
                                    Clear Dates
                                </button>
                            )}
                        </div>
                    )}

                    {/* Tier 2: Status Tabs & Secondary Filters */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                        {/* Status Filter Tabs */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleStatusTab('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStatus === 'all'
                                        ? 'bg-slate-900 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                All Invoices
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusTab('due')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                    selectedStatus === 'due'
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                            >
                                <span>Has Due</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20">
                                    {safeMetrics?.due_invoices_count || 0}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusTab('paid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                                    selectedStatus === 'paid'
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                                <span>Fully Paid</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20">
                                    {safeMetrics?.paid_invoices_count || 0}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStatusTab('unpaid')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStatus === 'unpaid'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                Unpaid
                            </button>
                        </div>

                        {/* Secondary Dropdowns & Reset */}
                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                            {/* Payment Method Filter */}
                            <select
                                value={selectedMethod}
                                onChange={(e) => {
                                    setSelectedMethod(e.target.value);
                                    applyFilters({ payment_method: e.target.value });
                                }}
                                className="rounded-lg border-slate-300 py-1.5 pl-2.5 pr-8 text-xs font-medium shadow-2xs focus:border-teal-500 focus:ring-teal-500 bg-white"
                            >
                                <option value="all">All Methods</option>
                                <option value="cash">💵 Cash Desk</option>
                                <option value="bkash">📱 bKash MFS</option>
                                <option value="nagad">📱 Nagad</option>
                                <option value="rocket">📱 Rocket</option>
                                <option value="card">💳 Card</option>
                                <option value="bank">🏦 Bank</option>
                            </select>

                            {/* Sort Filter */}
                            <select
                                value={selectedSort}
                                onChange={(e) => {
                                    setSelectedSort(e.target.value);
                                    applyFilters({ sort: e.target.value });
                                }}
                                className="rounded-lg border-slate-300 py-1.5 pl-2.5 pr-8 text-xs font-medium shadow-2xs focus:border-teal-500 focus:ring-teal-500 bg-white"
                            >
                                <option value="latest">Newest First</option>
                                <option value="due_desc">Highest Due First</option>
                                <option value="amount_desc">Highest Amount</option>
                                <option value="oldest">Oldest First</option>
                            </select>

                            {/* Per Page */}
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(e.target.value);
                                    applyFilters({ per_page: e.target.value });
                                }}
                                className="rounded-lg border-slate-300 py-1.5 pl-2.5 pr-8 text-xs font-medium shadow-2xs focus:border-teal-500 focus:ring-teal-500 bg-white"
                            >
                                <option value="10">10 / page</option>
                                <option value="15">15 / page</option>
                                <option value="25">25 / page</option>
                                <option value="50">50 / page</option>
                                <option value="100">100 / page</option>
                            </select>

                            {/* Reset Button */}
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold hover:bg-rose-50 rounded-lg transition"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 1. Desktop Structured Table (hidden md:block) */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                            <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3.5">Invoice #</th>
                                    <th className="px-4 py-3.5">Date &amp; Method</th>
                                    <th className="px-4 py-3.5">Patient Details</th>
                                    <th className="px-4 py-3.5">Attending Doctor</th>
                                    <th className="px-4 py-3.5 text-right">Billed</th>
                                    <th className="px-4 py-3.5 text-right">Paid</th>
                                    <th className="px-4 py-3.5 text-right">Due</th>
                                    <th className="px-4 py-3.5 text-center">Status</th>
                                    <th className="px-4 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {safeData.length > 0 ? (
                                    safeData.map((inv) => {
                                        const dueAmt = Number(inv.due_amount || 0);
                                        const hasDue = dueAmt > 0 && !['cancelled', 'waived'].includes(inv.status);

                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50/75 transition-colors">
                                                <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                                                    <Link
                                                        href={typeof route === 'function' ? route('admin.invoices.show', inv.id) : `/admin/invoices/${inv.id}`}
                                                        className="text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1.5 font-mono text-xs"
                                                    >
                                                        <span>🧾</span> {inv.invoice_number}
                                                    </Link>
                                                    {inv.createdBy?.name && (
                                                        <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                                                            by {inv.createdBy.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                                                    <div className="font-medium text-slate-900">{inv.invoice_date || 'N/A'}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-1">
                                                        {inv.payments?.length > 0
                                                            ? inv.payments.map((p) => (
                                                                <span key={p.id || Math.random()} className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">
                                                                    {p?.payment_method ? (methodIcons[p.payment_method] || p.payment_method) : 'N/A'}
                                                                </span>
                                                            ))
                                                            : <span className="text-slate-400">No payment</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="font-semibold text-slate-900">
                                                        {inv.patient?.name || 'Walk-in Patient'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                        {inv.patient?.phone ? (
                                                            <a href={`tel:${inv.patient.phone}`} className="text-teal-700 hover:underline font-mono">
                                                                📞 {inv.patient.phone}
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-400">No phone</span>
                                                        )}
                                                        <span className="text-slate-300">·</span>
                                                        <span className="font-mono text-slate-400">ID: {inv.patient?.patient_code || inv.patient?.id || '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-slate-600">
                                                    {inv.visit?.doctor?.name ? (
                                                        <div className="font-medium text-slate-800 flex items-center gap-1">
                                                            <span>🩺</span> {inv.visit.doctor.name}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">Chamber Desk</span>
                                                    )}
                                                    {inv.visit_id && (
                                                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">Visit #{inv.visit_id}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap font-mono">
                                                    ৳ {Number(inv.total_amount || 0).toFixed(2)}
                                                    {Number(inv.discount_amount || 0) > 0 && (
                                                        <span className="block text-[10px] text-emerald-600 font-normal">
                                                            -৳{Number(inv.discount_amount || 0).toFixed(2)} off
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 whitespace-nowrap font-mono">
                                                    ৳ {Number(inv.paid_amount || 0).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono">
                                                    {hasDue ? (
                                                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                            ৳ {dueAmt.toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">৳ 0.00</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge[inv.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                        {(inv.status || 'unpaid').replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        {hasDue && canUpdate && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openCollectDueModal(inv)}
                                                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs"
                                                                title="Collect Outstanding Balance"
                                                            >
                                                                <span>💵</span>
                                                                <span>Collect</span>
                                                            </button>
                                                        )}
                                                        <Link
                                                            href={typeof route === 'function' ? route('admin.invoices.show', inv.id) : `/admin/invoices/${inv.id}`}
                                                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                                        >
                                                            View
                                                        </Link>
                                                        <Link
                                                            href={typeof route === 'function' ? route('admin.invoices.pos_receipt', inv.id) : `/admin/invoices/${inv.id}/pos-receipt`}
                                                            target="_blank"
                                                            className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 transition"
                                                            title="Thermal 80mm POS Slip"
                                                        >
                                                            🧾
                                                        </Link>
                                                        <Link
                                                            href={typeof route === 'function' ? route('admin.invoices.print', inv.id) : `/admin/invoices/${inv.id}/print`}
                                                            target="_blank"
                                                            className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 transition"
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
                                        <td colSpan={9} className="py-16 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-bold text-slate-800">No matching invoices found</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {hasActiveFilters
                                                        ? 'Try clearing or adjusting your search, status, or date range filters.'
                                                        : 'No invoices have been generated yet in this clinic.'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-4">
                                                    {hasActiveFilters && (
                                                        <button
                                                            type="button"
                                                            onClick={clearAllFilters}
                                                            className="px-3.5 py-1.5 bg-white text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 transition shadow-2xs"
                                                        >
                                                            Reset Filters
                                                        </button>
                                                    )}
                                                    {canCreate && (
                                                        <Link
                                                            href={typeof route === 'function' ? route('admin.invoices.create') : '/admin/invoices/create'}
                                                            className="px-3.5 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition shadow-xs"
                                                        >
                                                            + Create POS Invoice
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {safeInvoices?.links && (
                        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
                            <Pagination links={safeInvoices.links} />
                        </div>
                    )}
                </div>

                {/* 2. Mobile Touch Cards (< 768px: block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {safeData.length > 0 ? (
                        safeData.map((inv) => {
                            const dueAmt = Number(inv.due_amount || 0);
                            const hasDue = dueAmt > 0 && !['cancelled', 'waived'].includes(inv.status);

                            return (
                                <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                                    {/* Top Row: Invoice # + Status Badge */}
                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-base">🧾</span>
                                            <Link
                                                href={typeof route === 'function' ? route('admin.invoices.show', inv.id) : `/admin/invoices/${inv.id}`}
                                                className="font-bold text-sm text-teal-700 hover:underline font-mono truncate"
                                            >
                                                {inv.invoice_number}
                                            </Link>
                                        </div>
                                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusBadge[inv.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                            {(inv.status || 'unpaid').replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Patient & Doctor Meta */}
                                    <div className="space-y-1">
                                        <div className="font-bold text-slate-900 text-sm">
                                            {inv.patient?.name || 'Walk-in Patient'}
                                        </div>
                                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                            {inv.patient?.phone ? (
                                                <a href={`tel:${inv.patient.phone}`} className="text-teal-700 font-mono font-medium">
                                                    📞 {inv.patient.phone}
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">No phone</span>
                                            )}
                                            <span>·</span>
                                            <span className="font-mono text-slate-400">ID: {inv.patient?.patient_code || inv.patient?.id || '—'}</span>
                                        </div>
                                        <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                                            <span>Doctor: <strong>{inv.visit?.doctor?.name || 'Chamber Desk'}</strong></span>
                                            <span className="text-slate-400 font-mono text-[11px]">{inv.invoice_date}</span>
                                        </div>
                                    </div>

                                    {/* Financial Breakdown Grid */}
                                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-center font-mono">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase">Billed</span>
                                            <span className="text-xs font-bold text-slate-900">৳{Number(inv.total_amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-emerald-600 block uppercase">Paid</span>
                                            <span className="text-xs font-bold text-emerald-700">৳{Number(inv.paid_amount || 0).toFixed(2)}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-rose-600 block uppercase">Due</span>
                                            <span className={`text-xs font-bold ${hasDue ? 'text-rose-700' : 'text-slate-400'}`}>
                                                ৳{dueAmt.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                                        {hasDue && canUpdate && (
                                            <button
                                                type="button"
                                                onClick={() => openCollectDueModal(inv)}
                                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-2xs transition"
                                            >
                                                <span>💵</span> Collect Due
                                            </button>
                                        )}
                                        <Link
                                            href={typeof route === 'function' ? route('admin.invoices.show', inv.id) : `/admin/invoices/${inv.id}`}
                                            className="flex-1 text-center py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                                        >
                                            View
                                        </Link>
                                        <Link
                                            href={typeof route === 'function' ? route('admin.invoices.pos_receipt', inv.id) : `/admin/invoices/${inv.id}/pos-receipt`}
                                            target="_blank"
                                            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition"
                                            title="Thermal Receipt"
                                        >
                                            🧾
                                        </Link>
                                        <Link
                                            href={typeof route === 'function' ? route('admin.invoices.print', inv.id) : `/admin/invoices/${inv.id}/print`}
                                            target="_blank"
                                            className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition"
                                            title="A4 Print"
                                        >
                                            🖨️
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                            <span className="text-3xl mb-1 block">🧾</span>
                            <p className="text-sm font-semibold text-slate-800">No invoices found</p>
                            <p className="text-xs text-slate-400 mt-1">Try resetting your active filters.</p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="mt-3 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    )}

                    {safeInvoices?.links && (
                        <div className="pt-2">
                            <Pagination links={safeInvoices.links} />
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Due Collection Modal */}
            {payingInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-50/80 px-5 py-3.5">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-sm">
                                    💵
                                </span>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">Collect Due Payment</h3>
                                    <p className="text-[11px] text-emerald-700 font-mono">Invoice #{payingInvoice.invoice_number}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeCollectDueModal}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitDueCollection} className="p-5 space-y-4">
                            {/* Outstanding Balance Banner */}
                            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] text-slate-500 uppercase block font-semibold">Patient Name</span>
                                    <span className="text-xs font-bold text-slate-900">{payingInvoice.patient?.name || 'Walk-in Patient'}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[11px] text-rose-600 uppercase block font-bold">Outstanding Due</span>
                                    <span className="text-lg font-bold text-rose-700 font-mono">
                                        ৳ {Number(payingInvoice?.due_amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Amount & Quick Chips */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
                                    Collection Amount (আদায়কৃত টাকা) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold">৳</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={payingInvoice?.due_amount || 0}
                                        value={payData.amount}
                                        onChange={(e) => setPayData('amount', e.target.value)}
                                        className="w-full rounded-lg border-slate-300 pl-8 pr-3 text-sm font-bold font-mono focus:border-emerald-500 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                {payErrors.amount && <p className="text-xs text-rose-600">{payErrors.amount}</p>}

                                {/* Quick Amount Chips */}
                                <div className="flex items-center gap-1.5 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setPayData('amount', Number(payingInvoice?.due_amount || 0).toFixed(2))}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition"
                                    >
                                        Full Due (৳ {Number(payingInvoice?.due_amount || 0).toFixed(2)})
                                    </button>
                                    {Number(payingInvoice?.due_amount || 0) > 100 && (
                                        <button
                                            type="button"
                                            onClick={() => setPayData('amount', (Number(payingInvoice?.due_amount || 0) / 2).toFixed(2))}
                                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition"
                                        >
                                            50% (৳ {(Number(payingInvoice?.due_amount || 0) / 2).toFixed(2)})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700">
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
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Transaction Reference / TrxID (লেনদেন আইডি)
                                    </label>
                                    <input
                                        type="text"
                                        value={payData.transaction_reference}
                                        onChange={(e) => setPayData('transaction_reference', e.target.value)}
                                        placeholder="e.g. 9J4K8L9M0"
                                        className="w-full rounded-lg border-slate-300 text-xs font-mono focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                    {payErrors.transaction_reference && <p className="text-xs text-rose-600">{payErrors.transaction_reference}</p>}
                                </div>
                            )}

                            {/* Payment Date */}
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Payment Date (তারিখ) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={payData.payment_date}
                                    onChange={(e) => setPayData('payment_date', e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-xs focus:border-emerald-500 focus:ring-emerald-500"
                                    required
                                />
                                {payErrors.payment_date && <p className="text-xs text-rose-600">{payErrors.payment_date}</p>}
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeCollectDueModal}
                                    disabled={payProcessing}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={payProcessing || !payData.amount || Number(payData.amount) <= 0}
                                    className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
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
