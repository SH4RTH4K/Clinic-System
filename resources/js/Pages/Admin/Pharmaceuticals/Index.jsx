import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const DOSAGE_FORM_ICONS = {
    Tablet: '💊',
    Capsule: '💊',
    Syrup: '🧪',
    Suspension: '🧪',
    Injection: '💉',
    Drops: '🧴',
    Inhaler: '🌬️',
    Ointment: '🧴',
    Cream: '🧴',
    Gel: '🧴',
    Lotion: '🧴',
    Suppository: '💊',
    'Eye Drops': '👁️',
    'Ear Drops': '👂',
    'Nasal Spray': '👃',
    'Powder / Sachet': '📦',
    'IV Infusion': '💧',
};

export default function Index({ pharmaceuticals, filters = {}, availableDosageForms = [] }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('pharmaceuticals.create');
    const canUpdate = permissions.includes('pharmaceuticals.update');
    const canDelete = permissions.includes('pharmaceuticals.delete');
    const canViewInventory = permissions.includes('inventory.view');

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedForm, setSelectedForm] = useState(filters.dosage_form || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedStock, setSelectedStock] = useState(filters.stock_status || 'all');
    const [perPage, setPerPage] = useState(filters.per_page || '15');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isFirstRender = useRef(true);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            dosage_form: overrides.dosage_form !== undefined ? overrides.dosage_form : selectedForm,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
            stock_status: overrides.stock_status !== undefined ? overrides.stock_status : selectedStock,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        // Clean up 'all' or empty strings
        if (!query.search) delete query.search;
        if (query.dosage_form === 'all') delete query.dosage_form;
        if (query.status === 'all') delete query.status;
        if (query.stock_status === 'all') delete query.stock_status;
        if (query.per_page === '15') delete query.per_page;

        router.get(route('admin.pharmaceuticals.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounced search
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

    const handleFormSelect = (form) => {
        setSelectedForm(form);
        applyFilters({ dosage_form: form });
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
        setSelectedForm('all');
        setSelectedStatus('all');
        setSelectedStock('all');
        setPerPage('15');
        router.get(route('admin.pharmaceuticals.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.pharmaceuticals.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Brand & Strength',
            accessor: 'brand_name',
            cell: (p) => (
                <div>
                    <div className="font-bold text-gray-900">{p.brand_name}</div>
                    <div className="text-xs font-semibold text-primary-700 bg-primary-50 inline-block px-1.5 py-0.5 rounded mt-0.5">
                        {p.strength}
                    </div>
                </div>
            ),
        },
        {
            header: 'Generic Molecule',
            accessor: 'generic_name',
            cell: (p) => <span className="font-medium text-gray-800 text-sm">{p.generic_name}</span>,
        },
        {
            header: 'Dosage Form',
            accessor: 'dosage_form',
            cell: (p) => {
                const icon = DOSAGE_FORM_ICONS[p.dosage_form] || '💊';
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                        <span>{icon}</span>
                        <span>{p.dosage_form}</span>
                    </span>
                );
            },
        },
        {
            header: 'Manufacturer',
            accessor: 'manufacturer',
            cell: (p) => <span className="text-xs text-gray-600 font-medium">{p.manufacturer || '—'}</span>,
        },
        {
            header: 'Batch Stock',
            accessor: 'total_stock',
            cell: (p) => {
                const stock = Number(p.total_stock || 0);
                const hasBatches = (p.active_batches_count || 0) > 0;

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
                                href={route('admin.inventory.index', { search: p.brand_name })}
                                className="text-[11px] text-primary-600 hover:text-primary-800 underline font-medium"
                                title="View batch shipments"
                            >
                                {hasBatches ? `${p.active_batches_count} batch(es)` : '+ Receive Batch'}
                            </Link>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (p) => <StatusBadge status={p.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (p) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.pharmaceuticals.edit', p.id)}
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
                        onClick={() => setDeleteTarget(p)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 rounded-md font-medium transition enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs"
                    >
                        Deactivate
                    </button>
                </div>
            ),
        },
    ];

    const hasActiveFilters = Boolean(searchTerm || selectedForm !== 'all' || selectedStatus !== 'all' || selectedStock !== 'all');

    return (
        <AuthenticatedLayout>
            <Head title="Pharmaceuticals Catalog" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Pharmaceutical Drugs (ঔষধ ক্যাটালগ)"
                    subtitle="General Practice & Allopathy medication catalog: generic & brand names, strengths, dosage forms, and batch inventory."
                    actions={
                        <div className="flex items-center gap-2">
                            <a
                                href={route('admin.pharmaceuticals.export', {
                                    search: searchTerm || undefined,
                                    dosage_form: selectedForm !== 'all' ? selectedForm : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                })}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition border border-gray-200 shadow-2xs"
                                title="Download filtered catalog as CSV"
                            >
                                <span>📥</span>
                                <span>Export CSV</span>
                            </a>
                            {canCreate ? (
                                <Link
                                    href={route('admin.pharmaceuticals.create')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs"
                                >
                                    <span>+</span>
                                    <span>Add Pharmaceutical Drug</span>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white opacity-50 cursor-not-allowed shadow-xs"
                                >
                                    + Add Pharmaceutical Drug
                                </button>
                            )}
                        </div>
                    }
                />

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Search by brand name, generic name, strength (e.g. 500mg), or manufacturer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-300 pl-9 pr-9 focus:border-primary-500 focus:ring-primary-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={selectedStatus}
                                onChange={(e) => handleStatusSelect(e.target.value)}
                                className="text-xs rounded-lg border-gray-300 text-gray-700 focus:border-primary-500 focus:ring-primary-500"
                                aria-label="Filter by active status"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>

                            <select
                                value={selectedStock}
                                onChange={(e) => handleStockSelect(e.target.value)}
                                className="text-xs rounded-lg border-gray-300 text-gray-700 focus:border-primary-500 focus:ring-primary-500"
                                aria-label="Filter by stock availability"
                            >
                                <option value="all">All Stock Levels</option>
                                <option value="in_stock">In Stock (&gt;0)</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>

                            <select
                                value={perPage}
                                onChange={handlePerPageChange}
                                className="text-xs rounded-lg border-gray-300 text-gray-700 focus:border-primary-500 focus:ring-primary-500"
                                aria-label="Rows per page"
                            >
                                <option value="10">10 / page</option>
                                <option value="15">15 / page</option>
                                <option value="25">25 / page</option>
                                <option value="50">50 / page</option>
                                <option value="100">100 / page</option>
                            </select>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAllFilters}
                                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded-lg transition"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dosage Form Filter Pill Strip */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
                        <span className="font-semibold text-gray-500 uppercase tracking-wider text-[11px] mr-1 shrink-0">
                            Forms:
                        </span>
                        <button
                            type="button"
                            onClick={() => handleFormSelect('all')}
                            className={`px-2.5 py-1 rounded-full font-medium transition shrink-0 ${
                                selectedForm === 'all'
                                    ? 'bg-primary-600 text-white shadow-2xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            All Forms
                        </button>
                        {(availableDosageForms.length > 0 ? availableDosageForms : Object.keys(DOSAGE_FORM_ICONS)).map((form) => {
                            const icon = DOSAGE_FORM_ICONS[form] || '💊';
                            const isSelected = selectedForm === form;
                            return (
                                <button
                                    key={form}
                                    type="button"
                                    onClick={() => handleFormSelect(form)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition shrink-0 ${
                                        isSelected
                                            ? 'bg-primary-600 text-white shadow-2xs'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    <span>{icon}</span>
                                    <span>{form}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile View: High-Density Touch Cards (< 768px) */}
                <div className="block md:hidden space-y-3">
                    {pharmaceuticals.data && pharmaceuticals.data.length > 0 ? (
                        pharmaceuticals.data.map((p) => {
                            const icon = DOSAGE_FORM_ICONS[p.dosage_form] || '💊';
                            const stock = Number(p.total_stock || 0);
                            return (
                                <div key={p.id} className="bg-white rounded-xl p-4 shadow-2xs border border-gray-200 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                                                <span>{p.brand_name}</span>
                                                <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                                    {p.strength}
                                                </span>
                                            </div>
                                            <div className="text-xs font-medium text-gray-600 mt-0.5">
                                                {p.generic_name}
                                            </div>
                                        </div>
                                        <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                            <span>{icon}</span>
                                            <span>{p.dosage_form}</span>
                                        </span>
                                        {p.manufacturer && (
                                            <span className="text-gray-500">
                                                🏢 {p.manufacturer}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                        <div>
                                            {stock > 0 ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    {stock} units in stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {canViewInventory && (
                                                <Link
                                                    href={route('admin.inventory.index', { search: p.brand_name })}
                                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-md border border-emerald-200"
                                                >
                                                    Batches
                                                </Link>
                                            )}
                                            {canUpdate && (
                                                <Link
                                                    href={route('admin.pharmaceuticals.edit', p.id)}
                                                    className="px-2.5 py-1 text-xs font-semibold text-primary-700 bg-primary-50 rounded-md border border-primary-200"
                                                >
                                                    Edit
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(p)}
                                                    className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-md border border-red-200"
                                                >
                                                    Deactivate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200 shadow-2xs">
                            No pharmaceutical drugs found matching your filter criteria.
                        </div>
                    )}
                </div>

                {/* Desktop View: Full Clinical Formulary Matrix (>= 768px) */}
                <div className="hidden md:block bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={pharmaceuticals.data || []}
                        emptyMessage="No pharmaceutical drugs found matching your filter criteria."
                    />
                </div>

                {/* Pagination */}
                {pharmaceuticals.links && pharmaceuticals.links.length > 3 && (
                    <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4">
                        <Pagination links={pharmaceuticals.links} />
                    </div>
                )}

                {/* Deactivation / Delete Confirmation Modal */}
                {deleteTarget && (
                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        title="Deactivate Pharmaceutical Drug"
                        message={`Are you sure you want to deactivate ${deleteTarget.brand_name} (${deleteTarget.generic_name} ${deleteTarget.strength})? This prevents the drug from appearing in active prescription autocomplete while safely preserving all historical batch inventory and audit records.`}
                        confirmLabel="Deactivate Drug"
                        onConfirm={confirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
