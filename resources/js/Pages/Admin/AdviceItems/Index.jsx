import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

export default function Index({
    adviceItems,
    kpis = { total: 0, default: 0, homeopathic: 0, general: 0, diet: 0, lifestyle: 0, hygiene: 0, warning: 0, active: 0 },
    filters = {},
}) {
    const can = usePermission();
    const canCreate = can('advice_items.create') || can('settings.create');
    const canUpdate = can('advice_items.update') || can('settings.update');
    const canDelete = can('advice_items.delete') || can('settings.delete');

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

        router.get(route('admin.advice_items.index'), query, {
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
        router.get(route('admin.advice_items.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.advice_items.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const categoryTabs = [
        { key: 'all', label: 'All', count: kpis.total, icon: '📋' },
        { key: 'homeopathic', label: 'Homeopathic', count: kpis.homeopathic, icon: '🌿' },
        { key: 'general', label: 'General', count: kpis.general, icon: '💡' },
        { key: 'diet', label: 'Diet & Food', count: kpis.diet, icon: '🍽️' },
        { key: 'lifestyle', label: 'Lifestyle & Rest', count: kpis.lifestyle, icon: '🏃' },
        { key: 'hygiene', label: 'Hygiene', count: kpis.hygiene, icon: '🧼' },
        { key: 'warning', label: 'Warning & Safety', count: kpis.warning, icon: '⚠️' },
    ];

    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'homeopathic':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">🌿 Homeopathic</span>;
            case 'diet':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">🍽️ Diet</span>;
            case 'lifestyle':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">🏃 Lifestyle</span>;
            case 'hygiene':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">🧼 Hygiene</span>;
            case 'warning':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">⚠️ Warning</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">💡 General</span>;
        }
    };

    const columns = [
        {
            header: 'Advice Instruction (পরামর্শ)',
            accessor: 'text_bn',
            cell: (a) => (
                <div className="space-y-1 py-1">
                    <div className="text-sm font-bold text-gray-900 font-bengali leading-relaxed">
                        {a.text_bn}
                    </div>
                    {a.text_en && (
                        <div className="text-xs text-gray-500 italic">
                            {a.text_en}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Category',
            accessor: 'category',
            cell: (a) => getCategoryBadge(a.category),
        },
        {
            header: 'Prescription Preset',
            accessor: 'is_default',
            cell: (a) => (
                a.is_default ? (
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
            cell: (a) => (
                <span className="text-xs text-gray-600 font-mono">
                    {a.visits_count || 0} visits
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (a) => (
                a.is_active ? (
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
            cell: (a) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.advice_items.edit', a.id)}
                            className="px-2.5 py-1 text-teal-700 bg-teal-50 border border-teal-200 rounded-lg font-medium transition hover:bg-teal-100"
                        >
                            Edit
                        </Link>
                    ) : null}
                    {canDelete ? (
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(a)}
                            className="px-2.5 py-1 text-red-700 bg-red-50 border border-red-200 rounded-lg font-medium transition hover:bg-red-100"
                        >
                            {a.visits_count > 0 ? 'Deactivate' : 'Delete'}
                        </button>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Advice Templates & Instructions" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Advice Templates &amp; Instructions (পরামর্শ ও স্বাস্থ্যবিধি)"
                    subtitle="Manage pre-configured clinical advice, homeopathic rules, and lifestyle guidelines attached to prescriptions"
                    actions={
                        canCreate ? (
                            <Link
                                href={route('admin.advice_items.create')}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition inline-flex items-center gap-1"
                            >
                                + New Advice Item
                            </Link>
                        ) : null
                    }
                />

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Guidelines</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Prescription templates</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-amber-700 uppercase tracking-wider">Default Presets ⭐</div>
                        <div className="text-2xl font-bold text-amber-800 mt-1">{kpis.default}</div>
                        <div className="text-[11px] text-amber-600 mt-1">Auto-selected in new visits</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Homeopathic Rules 🌿</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.homeopathic}</div>
                        <div className="text-[11px] text-emerald-600 mt-1">Remedy dosing guidelines</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-blue-700 uppercase tracking-wider">General &amp; Diet 🍽️</div>
                        <div className="text-2xl font-bold text-blue-800 mt-1">{kpis.general + kpis.diet}</div>
                        <div className="text-[11px] text-blue-600 mt-1">Lifestyle &amp; nutrition advice</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Templates</div>
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
                                    category === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search & Filter Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative lg:col-span-2">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search advice instructions in English or বাংলা..."
                                className="w-full pl-9 pr-8 py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            />
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
                        data={adviceItems.data}
                        keyExtractor={(a) => a.id}
                        emptyMessage="No clinical advice templates match the selected criteria."
                    />
                    {adviceItems.links && <Pagination links={adviceItems.links} />}
                </div>

                {/* Mobile High-Density Touch Cards View */}
                <div className="block md:hidden space-y-3">
                    {adviceItems.data.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                            No clinical advice templates match the selected criteria.
                        </div>
                    ) : (
                        adviceItems.data.map((a) => (
                            <div
                                key={a.id}
                                className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                                    !a.is_active ? 'border-gray-200 bg-gray-50/50 opacity-80' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {getCategoryBadge(a.category)}
                                        {a.is_default && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                ⭐ Default
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {a.visits_count || 0} visits
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 font-bengali leading-snug">
                                        {a.text_bn}
                                    </h4>
                                    {a.text_en && (
                                        <p className="text-xs text-gray-500 italic mt-0.5">
                                            {a.text_en}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div>
                                        {a.is_active ? (
                                            <span className="text-xs text-emerald-700 font-medium">● Active</span>
                                        ) : (
                                            <span className="text-xs text-gray-500 font-medium">○ Inactive</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.advice_items.edit', a.id)}
                                                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg flex items-center"
                                            >
                                                Edit
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(a)}
                                                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg"
                                            >
                                                {a.visits_count > 0 ? 'Deactivate' : 'Delete'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {adviceItems.links && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <Pagination links={adviceItems.links} />
                        </div>
                    )}
                </div>

                {/* Confirm Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title={deleteTarget?.visits_count > 0 ? 'Deactivate Advice Template' : 'Delete Advice Template'}
                    message={
                        deleteTarget?.visits_count > 0
                            ? `This advice item has been included in ${deleteTarget.visits_count} past patient prescription(s). To protect historical medical records, it will be deactivated instead of permanently erased.`
                            : 'Permanently remove this advice item template?'
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
