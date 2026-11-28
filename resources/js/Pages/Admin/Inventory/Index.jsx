import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Components/usePermission';

// High-precision crisp SVG icons (replacing raw emojis)
const LeafIcon = ({ className = 'w-3.5 h-3.5 text-teal-600' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.06-1.38L21 21l-1.62-3.94C20.5 15.58 21 13.85 21 12c0-5.52-4.48-10-10-10zm-1 15v-4H7l5-7v4h4l-5 7z" />
    </svg>
);

const PillIcon = ({ className = 'w-3.5 h-3.5 text-blue-600' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const FactoryIcon = ({ className = 'w-3.5 h-3.5 text-purple-600' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const LedgerIcon = ({ className = 'w-3.5 h-3.5 text-indigo-600' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const DownloadIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ClipboardListIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
);

const PackageIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const CoinsIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AlertTriangleIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const ClockIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AlertOctagonIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
);

const AdjustIcon = ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
);

const TrashIcon = ({ className = 'w-4 h-4' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

export default function Index({ batches, filters = {}, metrics = {} }) {
    const can = usePermission();
    const canCreate = can('inventory.create');
    const canUpdate = can('inventory.update');
    const canDelete = can('inventory.delete');

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedStockLevel, setSelectedStockLevel] = useState(filters.stock_level || 'all');
    const [selectedExpiry, setSelectedExpiry] = useState(filters.expiry_status || 'all');
    const [selectedSort, setSelectedSort] = useState(filters.sort || 'latest');
    const [perPage, setPerPage] = useState(filters.per_page || '15');

    const isFirstRender = useRef(true);

    // Quick Stock Adjustment Modal State
    const [adjustingBatch, setAdjustingBatch] = useState(null);
    const {
        data: adjustData,
        setData: setAdjustData,
        post: postAdjust,
        processing: adjusting,
        errors: adjustErrors,
        reset: resetAdjust,
    } = useForm({
        new_quantity: '',
        transaction_type: 'adjustment',
        reason: '',
        reference_number: '',
    });

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            type: overrides.type !== undefined ? overrides.type : selectedType,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
            stock_level: overrides.stock_level !== undefined ? overrides.stock_level : selectedStockLevel,
            expiry_status: overrides.expiry_status !== undefined ? overrides.expiry_status : selectedExpiry,
            sort: overrides.sort !== undefined ? overrides.sort : selectedSort,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        if (!query.search) delete query.search;
        if (query.type === 'all') delete query.type;
        if (query.status === 'all') delete query.status;
        if (query.stock_level === 'all') delete query.stock_level;
        if (query.expiry_status === 'all') delete query.expiry_status;
        if (query.sort === 'latest') delete query.sort;
        if (query.per_page === '15') delete query.per_page;

        router.get(route('admin.inventory.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounced search (300ms)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            applyFilters({ search: searchTerm });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleTypeSelect = (type) => {
        setSelectedType(type);
        applyFilters({ type });
    };

    const handleQuickStatusPill = (statusKey) => {
        if (statusKey === 'all') {
            setSelectedType('all');
            setSelectedStatus('all');
            setSelectedStockLevel('all');
            setSelectedExpiry('all');
            applyFilters({ type: 'all', status: 'all', stock_level: 'all', expiry_status: 'all' });
        } else if (statusKey === 'remedy' || statusKey === 'pharmaceutical') {
            setSelectedType(statusKey);
            applyFilters({ type: statusKey });
        } else if (statusKey === 'expiring') {
            setSelectedExpiry('near_expiry');
            applyFilters({ expiry_status: 'near_expiry' });
        } else if (statusKey === 'low_stock') {
            setSelectedStockLevel('low_stock');
            applyFilters({ stock_level: 'low_stock' });
        } else if (statusKey === 'expired') {
            setSelectedExpiry('expired');
            applyFilters({ expiry_status: 'expired' });
        }
    };

    const handleSortChange = (e) => {
        const val = e.target.value;
        setSelectedSort(val);
        applyFilters({ sort: val });
    };

    const handlePerPageChange = (e) => {
        const val = e.target.value;
        setPerPage(val);
        applyFilters({ per_page: val });
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedType('all');
        setSelectedStatus('all');
        setSelectedStockLevel('all');
        setSelectedExpiry('all');
        setSelectedSort('latest');
        setPerPage('15');
        router.get(route('admin.inventory.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const openAdjustModal = (batch) => {
        setAdjustingBatch(batch);
        setAdjustData({
            new_quantity: batch.current_quantity,
            transaction_type: 'adjustment',
            reason: '',
            reference_number: '',
        });
    };

    const closeAdjustModal = () => {
        setAdjustingBatch(null);
        resetAdjust();
    };

    const submitAdjust = (e) => {
        e.preventDefault();
        if (!adjustingBatch) return;

        postAdjust(route('admin.inventory.adjust', adjustingBatch.id), {
            preserveScroll: true,
            onSuccess: () => closeAdjustModal(),
        });
    };

    const handleDelete = (batchId, itemName) => {
        if (!confirm(`Are you sure you want to remove ${itemName} from inventory?`)) {
            return;
        }
        router.delete(route('admin.inventory.destroy', batchId), {
            preserveScroll: true,
        });
    };

    const exportUrl = route('admin.inventory.export', {
        search: searchTerm || undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        sort: selectedSort !== 'latest' ? selectedSort : undefined,
    });

    const exportPoUrl = route('admin.inventory.purchase_order_draft', {
        type: selectedType !== 'all' ? selectedType : undefined,
    });

    return (
        <AuthenticatedLayout>
            <Head title="Pharmacy Multi-Batch Inventory" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader with Quick Links */}
                <PageHeader
                    title="Pharmacy Multi-Batch Inventory &amp; Stock Control (ফার্মেসি ইনভেন্টরি ও স্টক কন্ট্রোল)"
                    subtitle="Track Homeopathic potencies, dilutions, mother tinctures, and conventional pharmaceuticals with FEFO expiration management"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.medicines.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <LeafIcon className="w-3.5 h-3.5 text-teal-600" />
                                <span>Homeo Remedies</span>
                            </Link>
                            <Link
                                href={route('admin.pharmaceuticals.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <PillIcon className="w-3.5 h-3.5 text-blue-600" />
                                <span>Pharmaceuticals</span>
                            </Link>
                            <Link
                                href={route('admin.manufacturers.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <FactoryIcon className="w-3.5 h-3.5 text-purple-600" />
                                <span>Manufacturers</span>
                            </Link>
                            <Link
                                href={route('admin.inventory.transactions')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <LedgerIcon className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Stock Ledger</span>
                            </Link>
                            <a
                                href={exportPoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800 shadow-2xs transition hover:bg-amber-100"
                                title="Export items at or below reorder level as Purchase Order CSV"
                            >
                                <ClipboardListIcon className="w-3.5 h-3.5 text-amber-700" />
                                <span>PO Draft (ক্রয় প্রস্তাবনা)</span>
                            </a>
                            <a
                                href={exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                            >
                                <DownloadIcon className="w-3.5 h-3.5 text-white" />
                                <span>Stocktake CSV</span>
                            </a>
                            {canCreate && (
                                <Link
                                    href={route('admin.inventory.create')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Receive Stock</span>
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive 5-Card Inventory KPI Summary Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Inventory Metrics">
                    {/* Card 1: Total Active Batches */}
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                            <PackageIcon className="w-3.5 h-3.5 text-sky-600" />
                            <span>Active Batches</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.total_batches || 0}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            {metrics.remedy_batches || 0} Homeo · {metrics.pharmaceutical_batches || 0} Pharma
                        </div>
                    </div>

                    {/* Card 2: Stock Valuation */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <CoinsIcon className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Stock Valuation</span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">
                            ৳{Number(metrics.total_selling_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">
                            ক্রয়মূল্য: ৳{Number(metrics.total_purchase_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Card 3: Low Stock Items */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600" />
                            <span>Low Stock Items</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-800 mt-1">{metrics.low_stock_count || 0}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">পুনঃঅর্ডার লেভেলে বা নিচে</div>
                    </div>

                    {/* Card 4: Near Expiry (<= 30d) */}
                    <div className="bg-white p-3.5 rounded-xl border border-orange-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 text-orange-600" />
                            <span>Near Expiry (≤30d)</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-800 mt-1">{metrics.expiring_count || 0}</div>
                        <div className="text-[11px] text-orange-600 mt-0.5">অগ্রাধিকার বিক্রয় প্রয়োজন (FEFO)</div>
                    </div>

                    {/* Card 5: Expired Stock */}
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                            <AlertOctagonIcon className="w-3.5 h-3.5 text-rose-600" />
                            <span>Expired Batches</span>
                        </div>
                        <div className="text-2xl font-bold text-rose-800 mt-1">{metrics.expired_count || 0}</div>
                        <div className="text-[11px] text-rose-600 mt-0.5">বিতরণ নিষিদ্ধ / অপসারন প্রয়োজন</div>
                    </div>
                </section>

                {/* Universal Search & Multi-Parameter Filter Studio */}
                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-4">
                    {/* Search & Sort Row */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search remedy, brand, generic, batch #, supplier..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchTerm(''); applyFilters({ search: '' }); }}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Sort Selector with FEFO Engine & Per Page */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            <label htmlFor="sort-select" className="text-xs font-semibold text-gray-500 hidden sm:inline">Sort:</label>
                            <select
                                id="sort-select"
                                value={selectedSort}
                                onChange={handleSortChange}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="latest">Newest Intake (সর্বশেষ গ্রহণ)</option>
                                <option value="expiry_asc">⚡ Earliest Expiry (FEFO Engine)</option>
                                <option value="stock_asc">Reorder Priority (Lowest Stock)</option>
                                <option value="valuation_desc">Highest Valuation (সর্বোচ্চ মূল্য)</option>
                                <option value="name_asc">Batch Number (A-Z)</option>
                            </select>

                            <select
                                value={selectedStockLevel}
                                onChange={(e) => { setSelectedStockLevel(e.target.value); applyFilters({ stock_level: e.target.value }); }}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="all">All Stock Levels</option>
                                <option value="in_stock">In Stock (&gt;0)</option>
                                <option value="low_stock">Low Stock (≤Reorder)</option>
                                <option value="out_of_stock">Out of Stock (=0)</option>
                            </select>

                            <select
                                value={selectedExpiry}
                                onChange={(e) => { setSelectedExpiry(e.target.value); applyFilters({ expiry_status: e.target.value }); }}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="all">All Expiry Windows</option>
                                <option value="30_days">Expiry ≤ 30d (জরুরী)</option>
                                <option value="60_days">Expiry ≤ 60d</option>
                                <option value="90_days">Expiry ≤ 90d (ত্রৈমাসিক)</option>
                                <option value="180_days">Expiry ≤ 180d (অর্ধবার্ষিক)</option>
                                <option value="expired">Expired (মেয়াদোত্তীর্ণ)</option>
                            </select>

                            <select
                                value={perPage}
                                onChange={handlePerPageChange}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="10">10 / page</option>
                                <option value="15">15 / page</option>
                                <option value="25">25 / page</option>
                                <option value="50">50 / page</option>
                                <option value="100">100 / page</option>
                            </select>

                            {(searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || selectedStockLevel !== 'all' || selectedExpiry !== 'all' || selectedSort !== 'latest') && (
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline transition"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 1-Click Fast Filter Pills Strip */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                            <PackageIcon className="w-3.5 h-3.5 text-gray-500" />
                            <span>Dispensary Filter Pills (ডিসপেনসারি ফিল্টার):</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleQuickStatusPill('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedType === 'all' && selectedStockLevel === 'all' && selectedExpiry === 'all'
                                        ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Batches ({metrics.total_batches || 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusPill('remedy')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedType === 'remedy'
                                        ? 'bg-teal-600 text-white font-bold shadow-2xs'
                                        : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                                }`}
                            >
                                <LeafIcon className={`w-3.5 h-3.5 ${selectedType === 'remedy' ? 'text-white' : 'text-teal-600'}`} />
                                <span>Homeopathic Remedies ({metrics.remedy_batches || 0})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusPill('pharmaceutical')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedType === 'pharmaceutical'
                                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                }`}
                            >
                                <PillIcon className={`w-3.5 h-3.5 ${selectedType === 'pharmaceutical' ? 'text-white' : 'text-blue-600'}`} />
                                <span>Conventional Pharma ({metrics.pharmaceutical_batches || 0})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusPill('expiring')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedExpiry === 'near_expiry'
                                        ? 'bg-orange-600 text-white font-bold shadow-2xs'
                                        : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                                }`}
                            >
                                <ClockIcon className={`w-3.5 h-3.5 ${selectedExpiry === 'near_expiry' ? 'text-white' : 'text-orange-600'}`} />
                                <span>Near Expiry ({metrics.expiring_count || 0})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusPill('low_stock')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedStockLevel === 'low_stock'
                                        ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                <AlertTriangleIcon className={`w-3.5 h-3.5 ${selectedStockLevel === 'low_stock' ? 'text-white' : 'text-amber-600'}`} />
                                <span>Low Stock ({metrics.low_stock_count || 0})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickStatusPill('expired')}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedExpiry === 'expired'
                                        ? 'bg-rose-600 text-white font-bold shadow-2xs'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                            >
                                <AlertOctagonIcon className={`w-3.5 h-3.5 ${selectedExpiry === 'expired' ? 'text-white' : 'text-rose-600'}`} />
                                <span>Expired ({metrics.expired_count || 0})</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dual-Mode Presentation: Desktop Table vs Mobile Touch Cards */}
                {/* Desktop View (md:block hidden) */}
                <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase tracking-wide text-[11px]">
                                <tr>
                                    <th className="p-3.5">Medicine / Item</th>
                                    <th className="p-3.5">Classification</th>
                                    <th className="p-3.5">Batch # / Supplier</th>
                                    <th className="p-3.5">Current Stock</th>
                                    <th className="p-3.5">Expiry Date</th>
                                    <th className="p-3.5">Prices (Buy / Sell)</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {batches.data && batches.data.length > 0 ? (
                                    batches.data.map((b) => {
                                        const isLow = b.is_low_stock;
                                        const isExp = b.is_expired;
                                        const isSoon = b.is_expiring_soon;

                                        return (
                                            <tr key={b.id} className="hover:bg-gray-50/80 transition">
                                                {/* Item Title */}
                                                <td className="p-3.5">
                                                    <div className="font-bold text-gray-900 text-sm">
                                                        {b.item_name}
                                                    </div>
                                                    {b.item_type === 'pharmaceutical' && b.pharmaceutical?.generic_name && (
                                                        <div className="text-[11px] text-gray-500 font-medium">
                                                            {b.pharmaceutical.generic_name}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Classification Badge */}
                                                <td className="p-3.5">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                                        b.item_type === 'remedy'
                                                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                                                            : 'bg-blue-50 text-blue-800 border-blue-200'
                                                    }`}>
                                                        {b.item_type === 'remedy' ? (
                                                            <>
                                                                <LeafIcon className="w-3 h-3 text-teal-600" />
                                                                <span>Homeo</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PillIcon className="w-3 h-3 text-blue-600" />
                                                                <span>Pharma</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* Batch Number & Supplier */}
                                                <td className="p-3.5">
                                                    <div className="font-mono text-xs font-bold text-gray-900">
                                                        {b.batch_number}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 truncate max-w-xs">
                                                        {b.supplier_name || b.pharmaceutical?.manufacturer || '—'}
                                                    </div>
                                                </td>

                                                {/* Stock Quantity */}
                                                <td className="p-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-sm text-gray-900">
                                                            {Number(b.current_quantity).toLocaleString()} {b.unit}
                                                        </span>
                                                        {isLow && b.current_quantity > 0 && (
                                                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold uppercase">
                                                                Low
                                                            </span>
                                                        )}
                                                        {b.current_quantity <= 0 && (
                                                            <span className="text-[10px] px-1.5 py-0.2 bg-red-100 text-red-800 rounded font-bold uppercase">
                                                                Out
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                                        Reorder at: {b.reorder_level} {b.unit}
                                                    </div>
                                                </td>

                                                {/* Expiry Date */}
                                                <td className="p-3.5 whitespace-nowrap">
                                                    {b.expiry_date ? (
                                                        <div>
                                                            <div className="font-mono text-xs text-gray-900">
                                                                {new Date(b.expiry_date).toLocaleDateString()}
                                                            </div>
                                                            {isExp ? (
                                                                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                                                    <AlertOctagonIcon className="w-3 h-3 text-red-600" />
                                                                    <span>Expired</span>
                                                                </span>
                                                            ) : isSoon ? (
                                                                <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                                                                    <ClockIcon className="w-3 h-3 text-orange-600" />
                                                                    <span>Exp. in {b.days_until_expiry}d</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400">
                                                                    {b.days_until_expiry} days remaining
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 font-mono">—</span>
                                                    )}
                                                </td>

                                                {/* Prices & Valuation */}
                                                <td className="p-3.5 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900">
                                                        Sell: ৳{Number(b.selling_price).toFixed(2)}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500">
                                                        Cost: ৳{Number(b.purchase_price).toFixed(2)}
                                                    </div>
                                                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                                        Val: ৳{(Number(b.current_quantity) * Number(b.selling_price)).toFixed(2)}
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                                    {canUpdate && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openAdjustModal(b)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md border border-teal-200 transition shadow-2xs"
                                                            title="Adjust Stock Quantity"
                                                        >
                                                            <AdjustIcon className="w-3 h-3 text-teal-700" />
                                                            <span>Adjust</span>
                                                        </button>
                                                    )}
                                                    {canUpdate && (
                                                        <Link
                                                            href={route('admin.inventory.edit', b.id)}
                                                            className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition shadow-2xs"
                                                        >
                                                            Edit
                                                        </Link>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(b.id, b.item_name)}
                                                            className="p-1 text-gray-400 hover:text-red-600 transition inline-flex items-center"
                                                            title="Delete Batch"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-xs text-gray-400">
                                            No medicine batches match your filter criteria. Click "+ Receive Stock" to record inventory.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Touch Cards (< 768px) */}
                <div className="md:hidden space-y-3">
                    {batches.data && batches.data.length > 0 ? (
                        batches.data.map((b) => {
                            const isLow = b.is_low_stock;
                            const isExp = b.is_expired;
                            const isSoon = b.is_expiring_soon;

                            return (
                                <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm">{b.item_name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                                    b.item_type === 'remedy' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                                                }`}>
                                                    {b.item_type === 'remedy' ? (
                                                        <>
                                                            <LeafIcon className="w-3 h-3 text-teal-600" />
                                                            <span>Homeo</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <PillIcon className="w-3 h-3 text-blue-600" />
                                                            <span>Pharma</span>
                                                        </>
                                                    )}
                                                </span>
                                                <span className="font-mono text-xs text-gray-500 font-semibold">
                                                    Batch: {b.batch_number}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-sm text-gray-900">
                                                {Number(b.current_quantity).toLocaleString()} {b.unit}
                                            </div>
                                            {isLow && b.current_quantity > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold uppercase">
                                                    Low Stock
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                                        <div>
                                            <span className="text-gray-400 text-[11px] block">Expiry Date:</span>
                                            {b.expiry_date ? (
                                                <span className={`font-mono font-medium ${isExp ? 'text-red-600 font-bold' : isSoon ? 'text-orange-600 font-bold' : 'text-gray-800'}`}>
                                                    {new Date(b.expiry_date).toLocaleDateString()} {isExp ? '(Expired)' : isSoon ? `(${b.days_until_expiry}d left)` : ''}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-mono">—</span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-[11px] block">Batch Valuation:</span>
                                            <span className="font-bold text-emerald-700">
                                                ৳{(Number(b.current_quantity) * Number(b.selling_price)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                        {canUpdate && (
                                            <button
                                                type="button"
                                                onClick={() => openAdjustModal(b)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition"
                                            >
                                                <AdjustIcon className="w-3.5 h-3.5 text-teal-700" />
                                                <span>Adjust Stock</span>
                                            </button>
                                        )}
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.inventory.edit', b.id)}
                                                className="flex-1 inline-flex items-center justify-center min-h-[44px] rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold hover:bg-gray-100 transition"
                                            >
                                                Edit Batch
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(b.id, b.item_name)}
                                                className="min-h-[44px] px-3.5 inline-flex items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition"
                                                aria-label="Delete batch"
                                            >
                                                <TrashIcon className="w-4 h-4 text-rose-600" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                                <PackageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="mt-2 text-sm font-semibold text-gray-800">No batches found</p>
                            <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filter pills.</p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {batches.links && (
                    <Pagination links={batches.links} />
                )}
            </div>

            {/* Quick Stock Adjustment Modal */}
            {adjustingBatch && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Stock Adjustment (স্টক সমন্বয়)
                                </h3>
                                <p className="text-xs text-teal-700 font-semibold mt-0.5">
                                    {adjustingBatch.item_name} (Batch: {adjustingBatch.batch_number})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeAdjustModal}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={submitAdjust} className="p-5 space-y-4 text-xs">
                            <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center text-xs border border-gray-100">
                                <span className="text-gray-500">Current Recorded Stock:</span>
                                <span className="font-bold text-gray-900 text-sm">
                                    {adjustingBatch.current_quantity} {adjustingBatch.unit}
                                </span>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">
                                    New Quantity On-Hand <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={adjustData.new_quantity}
                                        onChange={(e) => setAdjustData('new_quantity', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
                                        {adjustingBatch.unit}
                                    </span>
                                </div>
                                {adjustErrors.new_quantity && <p className="mt-1 text-red-600">{adjustErrors.new_quantity}</p>}
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">
                                    Adjustment Reason / Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={adjustData.transaction_type}
                                    onChange={(e) => setAdjustData('transaction_type', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                >
                                    <option value="adjustment">Stock Reconciliation / Count Correction (হিসাব সমন্বয়)</option>
                                    <option value="purchase">Additional Stock Received (নতুন আগমন)</option>
                                    <option value="wastage">Wastage / Damage / Expired Disposal (অপচয়, নষ্ট বা অপসরণ)</option>
                                    <option value="return">Supplier Return / Restock (সরবরাহকারীকে ফেরত বা রিস্টক)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">
                                    Notes &amp; Justification <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows="2"
                                    required
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData('reason', e.target.value)}
                                    placeholder="Explain the reason for adjustment (e.g. Physical inventory count, bottle broken)"
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {adjustErrors.reason && <p className="mt-1 text-red-600">{adjustErrors.reason}</p>}
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={closeAdjustModal}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjusting}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-2xs transition"
                                >
                                    {adjusting ? 'Saving...' : 'Confirm Adjustment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
