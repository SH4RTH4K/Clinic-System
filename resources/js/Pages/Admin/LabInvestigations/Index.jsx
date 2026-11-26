import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const CATEGORY_CONFIG = {
    hematology: { label: 'Hematology', bn: 'রক্ত পরীক্ষা', color: 'bg-rose-50 text-rose-700 border-rose-200', border: 'border-l-rose-500', icon: '🩸' },
    biochemistry: { label: 'Biochemistry', bn: 'বায়োকেমিস্ট্রি', color: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-500', icon: '🧪' },
    radiology: { label: 'Radiology / X-Ray', bn: 'রেডিওলজি', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-l-indigo-500', icon: '🩻' },
    ultrasound: { label: 'Ultrasound / USG', bn: 'আল্ট্রাসনোগ্রাম', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', border: 'border-l-cyan-500', icon: '🔬' },
    microbiology: { label: 'Microbiology', bn: 'মাইক্রোবায়োলজি', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-emerald-500', icon: '🧫' },
    other: { label: 'Other', bn: 'অন্যান্য', color: 'bg-slate-50 text-slate-700 border-slate-200', border: 'border-l-slate-500', icon: '🩺' },
};

const SPECIMEN_CONFIG = {
    blood: { label: 'Blood', bn: 'রক্ত', icon: '💉' },
    urine: { label: 'Urine', bn: 'প্রস্রাব', icon: '🧪' },
    stool: { label: 'Stool', bn: 'মল', icon: '🔬' },
    sputum: { label: 'Sputum', bn: 'কফ', icon: '🧫' },
    swab: { label: 'Swab', bn: 'সোয়াব', icon: '🥢' },
    imaging: { label: 'Imaging / Scan', bn: 'স্ক্যান', icon: '🩻' },
    tissue: { label: 'Tissue / Biopsy', bn: 'টিস্যু', icon: '✂️' },
    other: { label: 'Other', bn: 'অন্যান্য', icon: '📦' },
};

export default function Index({ labInvestigations, filters = {}, metrics = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('lab_investigations.create');
    const canUpdate = permissions.includes('lab_investigations.update');
    const canDelete = permissions.includes('lab_investigations.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [specimen, setSpecimen] = useState(filters.specimen || 'all');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isFirstRender = useRef(true);

    // Debounced query trigger
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route('admin.lab_investigations.index'),
                {
                    search: search || undefined,
                    category: category !== 'all' ? category : undefined,
                    status: status !== 'all' ? status : undefined,
                    specimen: specimen !== 'all' ? specimen : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, category, status, specimen]);

    const handleClearFilters = () => {
        setSearch('');
        setCategory('all');
        setStatus('all');
        setSpecimen('all');
        router.get(route('admin.lab_investigations.index'), {}, { preserveState: true, replace: true });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.lab_investigations.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Code',
            accessor: 'code',
            className: 'w-24',
            cell: (t) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {t.code || '—'}
                </span>
            ),
        },
        {
            header: 'Investigation / Test Name',
            accessor: 'name',
            cell: (t) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                        <span>{t.name}</span>
                    </div>
                    {t.name_bn && (
                        <div className="text-xs text-teal-700 dark:text-teal-400 font-medium">{t.name_bn}</div>
                    )}
                    {t.default_instructions && (
                        <div className="text-xs text-gray-500 italic mt-0.5 line-clamp-1">
                            ℹ {t.default_instructions}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Category & Specimen',
            accessor: 'category',
            cell: (t) => {
                const cat = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.other;
                const spec = SPECIMEN_CONFIG[t.specimen_type] || SPECIMEN_CONFIG.other;
                return (
                    <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${cat.color}`}>
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </span>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                            <span>{spec.icon}</span>
                            <span>{spec.label}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            header: 'Standard Fee (৳)',
            accessor: 'standard_cost',
            cell: (t) => {
                const cost = parseFloat(t.standard_cost || 0);
                return (
                    <div>
                        <span className={`font-semibold text-xs ${cost > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                            {cost > 0 ? `৳${cost.toFixed(2)}` : 'Free / Ref'}
                        </span>
                        {t.turnaround_time && (
                            <div className="text-[10px] text-gray-400 font-medium">⏱ {t.turnaround_time}</div>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (t) => <StatusBadge status={t.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (t) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.lab_investigations.edit', t.id)}
                            className="px-2.5 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 rounded font-medium transition"
                        >
                            Edit
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-gray-400 bg-gray-50 rounded font-medium cursor-not-allowed opacity-50">
                            Edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const hasActiveFilters = Boolean(search || category !== 'all' || status !== 'all' || specimen !== 'all');

    return (
        <AuthenticatedLayout>
            <Head title="Diagnostic Lab Investigations" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Diagnostic Lab Investigations (পরীক্ষা-নিরীক্ষা ক্যাটালগ)"
                    description="Standard clinical laboratory tests and imaging investigations for doctor consultation orders and cashier billing."
                    action={
                        canCreate && (
                            <Link
                                href={route('admin.lab_investigations.create')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shadow-xs"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>+ Add Investigation</span>
                            </Link>
                        )
                    }
                />

                {/* Header KPI Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Tests</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.total || 0}</span>
                            <span className="text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">Formulary</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active in Rx Picker</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.active || 0}</span>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Ready</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">With In-House Fee</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.with_fee || 0}</span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Billable</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Disciplines</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metrics.categories_count || 6}</span>
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">Departments</span>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Search tests by name, code (CBC, FBS, USG), Bengali, or instructions..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-xs rounded-lg pl-9 pr-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="w-full md:w-44">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>

                        {/* Specimen Filter */}
                        <div className="w-full md:w-44">
                            <select
                                value={specimen}
                                onChange={(e) => setSpecimen(e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="all">All Specimens</option>
                                <option value="blood">💉 Blood (রক্ত)</option>
                                <option value="urine">🧪 Urine (প্রস্রাব)</option>
                                <option value="stool">🔬 Stool (মল)</option>
                                <option value="sputum">🧫 Sputum (কফ)</option>
                                <option value="swab">🥢 Swab (সোয়াব)</option>
                                <option value="imaging">🩻 Imaging / Scan</option>
                                <option value="tissue">✂️ Tissue / Biopsy</option>
                                <option value="other">📦 Other</option>
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-red-600 bg-gray-100 dark:bg-gray-700 rounded-lg transition shrink-0"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Category Tabs Ribbon */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => setCategory('all')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                category === 'all'
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            All ({metrics.total || 0})
                        </button>
                        {Object.entries(CATEGORY_CONFIG).map(([catKey, cat]) => {
                            const count = metrics.category_breakdown?.[catKey] || 0;
                            const isActive = category === catKey;
                            return (
                                <button
                                    key={catKey}
                                    type="button"
                                    onClick={() => setCategory(catKey)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
                                        isActive
                                            ? 'bg-teal-600 text-white shadow-2xs'
                                            : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.label}</span>
                                    <span className="text-[10px] opacity-75">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* DESKTOP VIEW: Data Table (hidden on mobile) */}
                <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={labInvestigations.data || []}
                        emptyMessage="No lab investigations found matching your criteria."
                    />
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <Pagination links={labInvestigations.links} />
                    </div>
                </div>

                {/* MOBILE VIEW: High-Density Touch Cards (block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {labInvestigations.data?.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-xs text-gray-500">
                            No lab investigations found matching your criteria.
                        </div>
                    ) : (
                        labInvestigations.data?.map((test) => {
                            const cat = CATEGORY_CONFIG[test.category] || CATEGORY_CONFIG.other;
                            const spec = SPECIMEN_CONFIG[test.specimen_type] || SPECIMEN_CONFIG.other;
                            const cost = parseFloat(test.standard_cost || 0);

                            return (
                                <div
                                    key={test.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-2xs border border-gray-100 dark:border-gray-700 border-l-4 ${cat.border} space-y-2.5`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {test.code && (
                                                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                                        {test.code}
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                                    {test.name}
                                                </h3>
                                            </div>
                                            {test.name_bn && (
                                                <p className="text-xs text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                                                    {test.name_bn}
                                                </p>
                                            )}
                                        </div>
                                        <StatusBadge status={test.is_active ? 'active' : 'inactive'} />
                                    </div>

                                    {/* Attributes Grid */}
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Category</span>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border mt-0.5 ${cat.color}`}>
                                                <span>{cat.icon}</span>
                                                <span>{cat.label}</span>
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Specimen</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium mt-0.5 flex items-center gap-1">
                                                <span>{spec.icon}</span>
                                                <span>{spec.label}</span>
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Standard Fee</span>
                                            <span className={`font-bold mt-0.5 block ${cost > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}`}>
                                                {cost > 0 ? `৳${cost.toFixed(2)}` : 'Free / Referral'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Turnaround Time</span>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium mt-0.5 block">
                                                {test.turnaround_time || 'Routine'}
                                            </span>
                                        </div>
                                    </div>

                                    {test.default_instructions && (
                                        <p className="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                            ℹ {test.default_instructions}
                                        </p>
                                    )}

                                    {/* Action Bar (44px touch targets) */}
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.lab_investigations.edit', test.id)}
                                                className="min-h-[40px] px-4 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-semibold rounded-lg flex items-center justify-center transition"
                                            >
                                                Edit Test
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(test)}
                                                className="min-h-[40px] px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold rounded-lg flex items-center justify-center transition"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <Pagination links={labInvestigations.links} />
                    </div>
                </div>

                {deleteTarget && (
                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        title="Delete Lab Investigation"
                        message={`Are you sure you want to delete ${deleteTarget.name}? This will remove it from future consultation orders.`}
                        confirmLabel="Delete Test"
                        onConfirm={confirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
