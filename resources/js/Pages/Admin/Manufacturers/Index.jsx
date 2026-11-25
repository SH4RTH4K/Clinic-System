import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const TYPE_CONFIG = {
    allopathic: {
        label: 'Allopathy Pharma',
        icon: '💊',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    homeopathic: {
        label: 'Homeopathy Lab',
        icon: '🌿',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    dual: {
        label: 'Dual Practice',
        icon: '🏥',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    surgical: {
        label: 'Surgical & Diag.',
        icon: '🩺',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    },
};

export default function Index({ manufacturers, filters = {}, metrics = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('manufacturers.create');
    const canUpdate = permissions.includes('manufacturers.update');
    const canDelete = permissions.includes('manufacturers.delete');

    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedType, setSelectedType] = useState(filters.type || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isFirstRender = useRef(true);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            type: overrides.type !== undefined ? overrides.type : selectedType,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
        };

        if (!query.search) delete query.search;
        if (query.type === 'all') delete query.type;
        if (query.status === 'all') delete query.status;

        router.get(route('admin.manufacturers.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

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

    const handleStatusSelect = (status) => {
        setSelectedStatus(status);
        applyFilters({ status });
    };

    const clearAllFilters = () => {
        setSearchTerm('');
        setSelectedType('all');
        setSelectedStatus('all');
        router.get(route('admin.manufacturers.index'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.manufacturers.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Manufacturer / Company',
            accessor: 'name',
            cell: (m) => (
                <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <span>{m.name}</span>
                        {m.short_name && (
                            <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
                                {m.short_name}
                            </span>
                        )}
                    </div>
                    {m.name_bn && (
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                            {m.name_bn}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Category',
            accessor: 'type',
            cell: (m) => {
                const conf = TYPE_CONFIG[m.type] || TYPE_CONFIG.allopathic;
                return (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${conf.badgeClass}`}>
                        <span>{conf.icon}</span>
                        <span>{conf.label}</span>
                    </span>
                );
            },
        },
        {
            header: 'Medical Rep / Contact',
            accessor: 'contact_person',
            cell: (m) => (
                <div className="text-xs">
                    <div className="font-semibold text-gray-800">
                        {m.contact_person || '—'}
                    </div>
                    {m.phone && (
                        <a
                            href={`tel:${m.phone}`}
                            className="text-primary-600 hover:text-primary-800 font-mono flex items-center gap-1 mt-0.5 font-medium"
                        >
                            <span>📞</span>
                            <span>{m.phone}</span>
                        </a>
                    )}
                </div>
            ),
        },
        {
            header: 'Email & Depot',
            accessor: 'email',
            cell: (m) => (
                <div className="text-xs max-w-xs">
                    {m.email && (
                        <a
                            href={`mailto:${m.email}`}
                            className="text-gray-600 hover:text-gray-900 truncate block"
                        >
                            ✉️ {m.email}
                        </a>
                    )}
                    {m.address && (
                        <span className="text-gray-500 truncate block text-[11px] mt-0.5">
                            📍 {m.address}
                        </span>
                    )}
                    {!m.email && !m.address && <span className="text-gray-400">—</span>}
                </div>
            ),
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
                            href={route('admin.manufacturers.edit', m.id)}
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

    const hasActiveFilters = Boolean(searchTerm || selectedType !== 'all' || selectedStatus !== 'all');

    return (
        <AuthenticatedLayout>
            <Head title="Pharmaceutical & Remedy Manufacturers" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Manufacturers & Suppliers (কোম্পানি / প্রস্তুতকারক)"
                    subtitle="Maintain pharmaceutical companies, homeopathic laboratories, and medical representatives for drug catalogs and purchase reorders."
                    actions={
                        canCreate && (
                            <Link
                                href={route('admin.manufacturers.create')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs"
                            >
                                <span>+</span>
                                <span>Add Manufacturer</span>
                            </Link>
                        )
                    }
                />

                {/* KPI Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="text-xs font-medium text-gray-500">Total Companies</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{metrics.total || 0}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Registered vendors</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="text-xs font-medium text-sky-700">Allopathy Pharma</div>
                        <div className="text-xl font-bold text-sky-900 mt-1">{metrics.allopathic || 0}</div>
                        <div className="text-[11px] text-sky-600 mt-0.5">Commercial manufacturers</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="text-xs font-medium text-emerald-700">Homeopathy Labs</div>
                        <div className="text-xl font-bold text-emerald-900 mt-1">{metrics.homeopathic || 0}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">Remedy laboratories</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="text-xs font-medium text-purple-700">Active Companies</div>
                        <div className="text-xl font-bold text-purple-900 mt-1">{metrics.active || 0}</div>
                        <div className="text-[11px] text-purple-600 mt-0.5">Available in dropdowns</div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-200 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Search by company name, short code, MR name, phone, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full text-sm rounded-lg border-gray-300 pl-9 pr-9 focus:border-primary-500 focus:ring-primary-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
                                aria-label="Filter by status"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
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

                    {/* Category Type Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        <button
                            type="button"
                            onClick={() => handleTypeSelect('all')}
                            className={`px-3 py-1 rounded-full font-medium transition shrink-0 ${
                                selectedType === 'all'
                                    ? 'bg-primary-600 text-white shadow-2xs'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            All Categories
                        </button>
                        {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleTypeSelect(key)}
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-medium transition shrink-0 ${
                                    selectedType === key
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                            >
                                <span>{conf.icon}</span>
                                <span>{conf.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile View: High-Density Touch Cards (< 768px) */}
                <div className="block md:hidden space-y-3">
                    {manufacturers.data && manufacturers.data.length > 0 ? (
                        manufacturers.data.map((m) => {
                            const conf = TYPE_CONFIG[m.type] || TYPE_CONFIG.allopathic;
                            return (
                                <div key={m.id} className="bg-white rounded-xl p-4 shadow-2xs border border-gray-200 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-bold text-gray-900 text-base flex items-center gap-2">
                                                <span>{m.name}</span>
                                                {m.short_name && (
                                                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                                        {m.short_name}
                                                    </span>
                                                )}
                                            </div>
                                            {m.name_bn && (
                                                <div className="text-xs font-medium text-gray-500 mt-0.5">
                                                    {m.name_bn}
                                                </div>
                                            )}
                                        </div>
                                        <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${conf.badgeClass}`}>
                                            <span>{conf.icon}</span>
                                            <span>{conf.label}</span>
                                        </span>
                                        {m.contact_person && (
                                            <span className="text-gray-600 font-medium">
                                                👤 {m.contact_person}
                                            </span>
                                        )}
                                    </div>

                                    {m.phone && (
                                        <div className="bg-gray-50 rounded-lg p-2 flex items-center justify-between text-xs">
                                            <span className="text-gray-500">MR Phone:</span>
                                            <a
                                                href={`tel:${m.phone}`}
                                                className="font-mono font-bold text-primary-700 hover:underline flex items-center gap-1"
                                            >
                                                <span>📞</span>
                                                <span>{m.phone}</span>
                                            </a>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.manufacturers.edit', m.id)}
                                                className="px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 rounded-md border border-primary-200"
                                            >
                                                Edit
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(m)}
                                                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-md border border-red-200"
                                            >
                                                Deactivate
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200 shadow-2xs">
                            No manufacturers found matching your filter criteria.
                        </div>
                    )}
                </div>

                {/* Desktop View: Full Clinical Matrix (>= 768px) */}
                <div className="hidden md:block bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={manufacturers.data || []}
                        emptyMessage="No manufacturers found matching your filter criteria."
                    />
                </div>

                {/* Pagination */}
                {manufacturers.links && manufacturers.links.length > 3 && (
                    <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4">
                        <Pagination links={manufacturers.links} />
                    </div>
                )}

                {/* Deactivation Modal */}
                {deleteTarget && (
                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        title="Deactivate Manufacturer"
                        message={`Are you sure you want to deactivate ${deleteTarget.name}? The company will be hidden from new drug registration dropdowns while preserving all existing medications and batch records.`}
                        confirmLabel="Deactivate Company"
                        onConfirm={confirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
