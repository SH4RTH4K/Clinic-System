import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

export default function Index({
    foodRestrictions,
    kpis = { total: 0, default: 0, antidote: 0, sour_cold: 0, spicy_oily: 0, allergic: 0, metabolic: 0, general: 0, active: 0 },
    filters = {},
}) {
    const can = usePermission();
    const canCreate = can('food_restrictions.create') || can('settings.create');
    const canUpdate = can('food_restrictions.update') || can('settings.update');
    const canDelete = can('food_restrictions.delete') || can('settings.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');
    const [defaultFilter, setDefaultFilter] = useState(filters.default || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            applyFilters({ search, category, defaultFilter, status });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, category, defaultFilter, status]);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : search,
            category: overrides.category !== undefined ? overrides.category : category,
            default: overrides.defaultFilter !== undefined ? overrides.defaultFilter : defaultFilter,
            status: overrides.status !== undefined ? overrides.status : status,
        };

        Object.keys(query).forEach((key) => {
            if (query[key] === '' || query[key] === null || query[key] === 'all') {
                delete query[key];
            }
        });

        router.get(route('admin.food_restrictions.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setCategory('all');
        setDefaultFilter('all');
        setStatus('all');
        router.get(route('admin.food_restrictions.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.food_restrictions.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const categoryTabs = [
        { key: 'all', label: 'All', count: kpis.total, icon: '📋' },
        { key: 'homeopathic_antidote', label: 'Antidote Rules', count: kpis.antidote, icon: '🌿' },
        { key: 'sour_cold', label: 'Cold & Sour', count: kpis.sour_cold, icon: '❄️' },
        { key: 'spicy_oily', label: 'Spicy & Oily', count: kpis.spicy_oily, icon: '🌶️' },
        { key: 'allergic_histamine', label: 'Allergenic', count: kpis.allergic, icon: '🦐' },
        { key: 'chronic_metabolic', label: 'Metabolic & Chronic', count: kpis.metabolic, icon: '🩺' },
        { key: 'general', label: 'General', count: kpis.general, icon: '🚫' },
    ];

    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'homeopathic_antidote':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">🌿 Antidote</span>;
            case 'sour_cold':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">❄️ Cold &amp; Sour</span>;
            case 'spicy_oily':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">🌶️ Spicy/Oily</span>;
            case 'allergic_histamine':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">🦐 Allergic</span>;
            case 'chronic_metabolic':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">🩺 Metabolic</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">🚫 General</span>;
        }
    };

    const columns = [
        {
            header: 'Dietary Restriction (খাদ্য নিষেধ)',
            accessor: 'text_bn',
            cell: (f) => (
                <div className="space-y-1 py-1">
                    <div className="text-sm font-bold text-gray-900 font-bengali leading-relaxed">
                        {f.text_bn}
                    </div>
                    {f.text_en && (
                        <div className="text-xs text-gray-500 italic">
                            {f.text_en}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Category',
            accessor: 'category',
            cell: (f) => getCategoryBadge(f.category),
        },
        {
            header: 'Prescription Preset',
            accessor: 'is_default',
            cell: (f) => (
                f.is_default ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        ⭐ Default Preset
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200">
                        Optional
                    </span>
                )
            ),
        },
        {
            header: 'Prescription Usage',
            accessor: 'visits_count',
            cell: (f) => (
                <span className="text-xs text-gray-600 font-mono">
                    {f.visits_count || 0} visits
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (f) => (
                f.is_active ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Inactive
                    </span>
                )
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (f) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.food_restrictions.edit', f.id)}
                            className="px-2.5 py-1 text-teal-700 bg-teal-50 border border-teal-200 rounded-lg font-medium transition hover:bg-teal-100"
                        >
                            Edit
                        </Link>
                    ) : null}
                    {canDelete ? (
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(f)}
                            className="px-2.5 py-1 text-red-700 bg-red-50 border border-red-200 rounded-lg font-medium transition hover:bg-red-100"
                        >
                            {f.visits_count > 0 ? 'Deactivate' : 'Delete'}
                        </button>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Food & Dietary Restrictions" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Dietary &amp; Food Restrictions (পথ্য ও খাদ্য নিষেধ)"
                    subtitle="Manage homeopathic remedy antidotes, dietary precautions, and lifestyle prohibitions attached to prescriptions"
                    actions={
                        canCreate ? (
                            <Link
                                href={route('admin.food_restrictions.create')}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition inline-flex items-center gap-1"
                            >
                                + New Restriction
                            </Link>
                        ) : null
                    }
                />

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Restrictions</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Master catalog items</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-amber-700 uppercase tracking-wider">Default Presets ⭐</div>
                        <div className="text-2xl font-bold text-amber-800 mt-1">{kpis.default}</div>
                        <div className="text-[11px] text-amber-600 mt-1">Auto-selected in new visits</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Antidote Rules 🌿</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.antidote}</div>
                        <div className="text-[11px] text-emerald-600 mt-1">Remedy integrity guardrails</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-purple-700 uppercase tracking-wider">Chronic &amp; Metabolic 🩺</div>
                        <div className="text-2xl font-bold text-purple-800 mt-1">{kpis.metabolic}</div>
                        <div className="text-[11px] text-purple-600 mt-1">Salt, sugar &amp; uric acid</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Rules</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.active}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Available in workbench</div>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
                    {/* Horizontal Category Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        {categoryTabs.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setCategory(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                    category === tab.key
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    category === tab.key ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search & Select Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                        {/* Search Input */}
                        <div className="relative sm:col-span-2">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search restrictions in English or বাংলা..."
                                className="w-full pl-9 pr-8 py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                🔍
                            </div>
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-sm"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Default Preset Filter */}
                        <div>
                            <select
                                value={defaultFilter}
                                onChange={(e) => setDefaultFilter(e.target.value)}
                                className="w-full py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            >
                                <option value="all">All Presets</option>
                                <option value="default">⭐ Default Presets Only</option>
                                <option value="optional">Optional Only</option>
                            </select>
                        </div>

                        {/* Status Filter & Reset */}
                        <div className="flex items-center gap-2">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                            {(search || category !== 'all' || defaultFilter !== 'all' || status !== 'all') && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
                    <DataTable
                        columns={columns}
                        data={foodRestrictions.data}
                        keyExtractor={(f) => f.id}
                        emptyMessage="No dietary or food restrictions match the selected criteria."
                    />
                    {foodRestrictions.links && <Pagination links={foodRestrictions.links} />}
                </div>

                {/* Mobile High-Density Touch Cards View */}
                <div className="block md:hidden space-y-3">
                    {foodRestrictions.data.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                            No dietary or food restrictions match the selected criteria.
                        </div>
                    ) : (
                        foodRestrictions.data.map((f) => (
                            <div
                                key={f.id}
                                className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                                    !f.is_active ? 'border-gray-200 bg-gray-50/50 opacity-80' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {getCategoryBadge(f.category)}
                                        {f.is_default && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                ⭐ Default
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {f.visits_count || 0} visits
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 font-bengali leading-snug">
                                        {f.text_bn}
                                    </h4>
                                    {f.text_en && (
                                        <p className="text-xs text-gray-500 italic mt-0.5">
                                            {f.text_en}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div>
                                        {f.is_active ? (
                                            <span className="text-xs text-emerald-700 font-medium">● Active</span>
                                        ) : (
                                            <span className="text-xs text-gray-500 font-medium">○ Inactive</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.food_restrictions.edit', f.id)}
                                                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg flex items-center"
                                            >
                                                Edit
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(f)}
                                                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg"
                                            >
                                                {f.visits_count > 0 ? 'Deactivate' : 'Delete'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {foodRestrictions.links && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <Pagination links={foodRestrictions.links} />
                        </div>
                    )}
                </div>

                {/* Confirm Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title={deleteTarget?.visits_count > 0 ? 'Deactivate Dietary Restriction' : 'Delete Dietary Restriction'}
                    message={
                        deleteTarget?.visits_count > 0
                            ? `This food restriction has been included in ${deleteTarget.visits_count} past patient prescription(s). To protect historical medical records, it will be deactivated instead of permanently erased.`
                            : 'Permanently remove this food restriction template?'
                    }
                    confirmLabel={deleteTarget?.visits_count > 0 ? 'Deactivate' : 'Delete'}
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
