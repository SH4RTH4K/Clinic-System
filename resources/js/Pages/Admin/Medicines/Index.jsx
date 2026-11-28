import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import MedicineImportModal from './Partials/MedicineImportModal';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const FORM_ICONS = {
    drops: '💧',
    pills: '⚪',
    liquid: '🧪',
};

const FORM_LABELS = {
    drops: 'Drops (ড্রপস)',
    pills: 'Pills / Globules (গ্লোবিউলস)',
    liquid: 'Liquid Dilution (লিকুইড)',
};

export default function Index({ medicines, filters = {}, availableForms = [], kpis = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('medicines.create');
    const canUpdate = permissions.includes('medicines.update');
    const canDelete = permissions.includes('medicines.delete');
    const canViewInventory = permissions.includes('inventory.view');

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedScale, setSelectedScale] = useState(filters.scale || 'all');
    const [selectedForm, setSelectedForm] = useState(filters.form || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedStock, setSelectedStock] = useState(filters.stock_status || 'all');
    const [perPage, setPerPage] = useState(filters.per_page || '15');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);

    const isFirstRender = useRef(true);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            scale: overrides.scale !== undefined ? overrides.scale : selectedScale,
            form: overrides.form !== undefined ? overrides.form : selectedForm,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
            stock_status: overrides.stock_status !== undefined ? overrides.stock_status : selectedStock,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        if (!query.search) delete query.search;
        if (query.scale === 'all') delete query.scale;
        if (query.form === 'all') delete query.form;
        if (query.status === 'all') delete query.status;
        if (query.stock_status === 'all') delete query.stock_status;
        if (query.per_page === '15') delete query.per_page;

        router.get(route('admin.medicines.index'), query, {
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

    const handleScaleSelect = (scale) => {
        setSelectedScale(scale);
        applyFilters({ scale });
    };

    const handleFormSelect = (form) => {
        setSelectedForm(form);
        applyFilters({ form });
    };

    const handleStatusSelect = (status) => {
        setSelectedStatus(status);
        applyFilters({ status });
    };

    const handleStockSelect = (stock) => {
        setSelectedStock(stock);
        applyFilters({ stock_status: stock });
    };

    const handlePerPageChange = (e) => {
        const val = e.target.value;
        setPerPage(val);
        applyFilters({ per_page: val });
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedScale('all');
        setSelectedForm('all');
        setSelectedStatus('all');
        setSelectedStock('all');
        setPerPage('15');
        router.get(route('admin.medicines.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.medicines.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const getPotencyScaleBadge = (potency) => {
        const p = (potency || '').toUpperCase();
        if (p.includes('LM') || p.startsWith('0/')) {
            return { label: '50-Millesimal (LM)', class: 'bg-purple-50 text-purple-700 border-purple-200' };
        }
        if (p.includes('X') || p.includes('D')) {
            return { label: 'Decimal (X)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        }
        if (p === 'Q' || p.includes('MT') || p.includes('TINCTURE') || p.includes('Ø')) {
            return { label: 'Mother Tincture (Q)', class: 'bg-amber-50 text-amber-800 border-amber-200' };
        }
        return { label: 'Centesimal (CH)', class: 'bg-blue-50 text-blue-700 border-blue-200' };
    };

    const exportUrl = route('admin.medicines.export', {
        search: searchTerm || undefined,
        scale: selectedScale !== 'all' ? selectedScale : undefined,
        form: selectedForm !== 'all' ? selectedForm : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
    });

    const columns = [
        {
            header: 'Remedy & Potency',
            accessor: 'name',
            cell: (m) => {
                const scaleInfo = getPotencyScaleBadge(m.potency);
                return (
                    <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                {m.potency}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${scaleInfo.class}`}>
                                {scaleInfo.label}
                            </span>
                            {m.default_instruction && (
                                <span className="text-xs text-gray-500 truncate max-w-xs" title={m.default_instruction}>
                                    · {m.default_instruction}
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            header: 'Formulation',
            accessor: 'form',
            cell: (m) => {
                const icon = FORM_ICONS[m.form] || '🧪';
                const label = FORM_LABELS[m.form] || m.form;
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs">
                        <span>{icon}</span>
                        <span>{label}</span>
                    </span>
                );
            },
        },
        {
            header: 'Dispensary Batch Stock',
            accessor: 'total_stock',
            cell: (m) => {
                const stock = Number(m.total_stock || 0);
                const hasBatches = (m.active_batches_count || 0) > 0;

                return (
                    <div className="flex flex-col gap-0.5">
                        {stock > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {stock} units
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Out of Stock
                            </span>
                        )}
                        {canViewInventory && (
                            <Link
                                href={route('admin.inventory.index', { search: m.name })}
                                className="text-[11px] text-primary-600 hover:text-primary-800 underline font-medium"
                                title="View batch shipments"
                            >
                                {hasBatches ? `${m.active_batches_count} batch(es)` : '+ Receive Batch'}
                            </Link>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (m) => <StatusBadge status={m.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (m) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.medicines.edit', m.id)}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md font-medium transition shadow-2xs"
                        >
                            Edit
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-primary-700 bg-primary-50 rounded-md font-medium cursor-not-allowed opacity-50">
                            Edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 rounded-md font-medium transition enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs"
                    >
                        Deactivate
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Homeopathic Medicines Catalog" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader with Quick Links */}
                <PageHeader
                    title="Homeopathic Medicines Catalog &amp; Pharmacopoeia (হোমিওপ্যাথিক ঔষধ তালিকা)"
                    subtitle="Manage classical remedies, potencies (CH, LM, X, Q), formulation types, and real-time dispensary batch inventory"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.pharmaceuticals.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>💊</span> Pharmaceuticals
                            </Link>
                            <Link
                                href={route('admin.inventory.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>📦</span> Pharmacy Inventory
                            </Link>
                            <Link
                                href={route('admin.manufacturers.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🏭</span> Manufacturers
                            </Link>
                            <a
                                href={exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                            >
                                <span>📥</span> Export CSV
                            </a>
                            {canCreate && (
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3.5 py-1.5 text-xs font-bold text-primary-700 shadow-2xs transition hover:bg-primary-100"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                    <span>Import (ইমপোর্ট)</span>
                                </button>
                            )}
                            {canCreate && (
                                <Link
                                    href={route('admin.medicines.create')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700"
                                >
                                    <span>➕</span> New Medicine
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive 5-Card KPI Summary Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Pharmacopoeia Metrics">
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Total Remedies 🌿</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total_remedies ?? 0}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">মোট সংরক্ষিত রেমেডি ক্যাটালগ</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Centesimal (CH) 🔵</div>
                        <div className="text-2xl font-bold text-blue-800 mt-1">{kpis.ch_count ?? 0}</div>
                        <div className="text-[11px] text-blue-600 mt-0.5">সেন্টিসিমেল স্কেল (30C, 200C, 1M)</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">50-Millesimal (LM/Q) 🟣</div>
                        <div className="text-2xl font-bold text-purple-900 mt-1">{kpis.lm_count ?? 0}</div>
                        <div className="text-[11px] text-purple-600 mt-0.5">পঞ্চাশ সহস্রতমিক (0/1-0/30, LM)</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Decimal &amp; Tinctures 🟡</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{(kpis.x_count ?? 0) + (kpis.mother_tincture_count ?? 0)}</div>
                        <div className="text-[11px] text-amber-700 mt-0.5">ডেসিমেল (X) ও মাদার টিংচার (Q)</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">In-Stock Batches 📦</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.in_stock_count ?? 0}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">ডিসপেনসারিতে স্টক যুক্ত রেমেডি</div>
                    </div>
                </section>

                {/* Universal Search & Multi-Parameter Filter Studio */}
                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-4">
                    {/* Search bar with instant clear */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by Latin name, potency, instruction..."
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

                        {/* Status, Stock & Per Page dropdowns */}
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                            <select
                                value={selectedStock}
                                onChange={(e) => handleStockSelect(e.target.value)}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="all">All Stock Status</option>
                                <option value="in_stock">In Stock Only</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>

                            <select
                                value={selectedStatus}
                                onChange={(e) => handleStatusSelect(e.target.value)}
                                className="rounded-lg border-gray-300 py-1.5 pl-2.5 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
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

                            {(searchTerm || selectedScale !== 'all' || selectedForm !== 'all' || selectedStatus !== 'all' || selectedStock !== 'all') && (
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

                    {/* 1-Click Potency Scale Filter Pills Strip */}
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                            <span>⚖️</span>
                            <span>Potency Scale Filter (পোটেন্সি স্কেল ফিল্টার):</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => handleScaleSelect('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedScale === 'all'
                                        ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Scales ({kpis.total_remedies ?? 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleScaleSelect('ch')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedScale === 'ch'
                                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                }`}
                            >
                                🔵 Centesimal / CH ({kpis.ch_count ?? 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleScaleSelect('lm')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedScale === 'lm'
                                        ? 'bg-purple-600 text-white font-bold shadow-2xs'
                                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                                }`}
                            >
                                🟣 50-Millesimal / LM ({kpis.lm_count ?? 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleScaleSelect('x')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedScale === 'x'
                                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                                🟢 Decimal / X ({kpis.x_count ?? 0})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleScaleSelect('q')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedScale === 'q'
                                        ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                            >
                                🟡 Mother Tincture / Q ({kpis.mother_tincture_count ?? 0})
                            </button>
                        </div>
                    </div>

                    {/* Formulation Pills Strip */}
                    {availableForms.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-gray-100">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                <span>🧪</span>
                                <span>Formulation Type (ঔষধের রূপ):</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleFormSelect('all')}
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                                        selectedForm === 'all'
                                            ? 'bg-gray-800 text-white font-bold shadow-2xs'
                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    All Forms
                                </button>
                                {availableForms.map((form) => {
                                    const isSelected = selectedForm === form;
                                    const icon = FORM_ICONS[form] || '🧪';
                                    return (
                                        <button
                                            key={form}
                                            type="button"
                                            onClick={() => handleFormSelect(form)}
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                                                isSelected
                                                    ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <span>{icon}</span>
                                            <span>{FORM_LABELS[form] || form}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dual-Mode Presentation: Desktop Table vs Mobile Touch Cards */}
                <div className="hidden md:block">
                    <DataTable
                        columns={columns}
                        data={medicines.data}
                        emptyMessage="No homeopathic medicines found matching your filters."
                    />
                </div>

                {/* Mobile Touch Cards (< 768px) */}
                <div className="md:hidden space-y-3">
                    {medicines.data.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                            <span className="text-3xl">🌿</span>
                            <p className="mt-2 text-sm font-semibold text-gray-800">No homeopathic medicines found</p>
                            <p className="text-xs text-gray-500 mt-1">Try adjusting your search or scale filters.</p>
                        </div>
                    ) : (
                        medicines.data.map((m) => {
                            const scaleInfo = getPotencyScaleBadge(m.potency);
                            const icon = FORM_ICONS[m.form] || '🧪';
                            const stock = Number(m.total_stock || 0);

                            return (
                                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-sm">{m.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                                    {m.potency}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${scaleInfo.class}`}>
                                                    {scaleInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                        <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200">
                                            <span>{icon}</span>
                                            <span>{FORM_LABELS[m.form] || m.form}</span>
                                        </span>

                                        <div>
                                            {stock > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {stock} units
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {m.default_instruction && (
                                        <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                                            "{m.default_instruction}"
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.medicines.edit', m.id)}
                                                className="flex-1 inline-flex items-center justify-center min-h-[44px] rounded-lg bg-primary-50 text-primary-700 border border-primary-200 text-xs font-bold hover:bg-primary-100 transition"
                                            >
                                                Edit Remedy
                                            </Link>
                                        )}
                                        {canViewInventory && (
                                            <Link
                                                href={route('admin.inventory.index', { search: m.name })}
                                                className="flex-1 inline-flex items-center justify-center min-h-[44px] rounded-lg bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold hover:bg-gray-100 transition"
                                            >
                                                View Batches
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(m)}
                                                className="min-h-[44px] px-3.5 inline-flex items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition"
                                                aria-label="Deactivate remedy"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <Pagination links={medicines.links} />

                {/* Deactivation Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Deactivate Homeopathic Medicine"
                    message={`Are you sure you want to deactivate ${deleteTarget?.name} (${deleteTarget?.potency})? It will be hidden from new prescription suggestions, but historical prescription and batch records will remain intact.`}
                    confirmLabel="Deactivate Remedy"
                    confirmVariant="danger"
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteTarget(null)}
                />

                {/* Medicine Catalog Import Modal */}
                <MedicineImportModal
                    show={showImportModal}
                    onClose={() => setShowImportModal(false)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
