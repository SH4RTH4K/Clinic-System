import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

const CHAPTER_CONFIG = {
    mind: { label: 'Mind & Emotion', bn: 'মন ও আবেগ', color: 'bg-purple-50 text-purple-700 border-purple-200', border: 'border-l-purple-500', icon: '🧠' },
    head: { label: 'Head & Vertigo', bn: 'মাথা ও মাথাঘোরা', color: 'bg-rose-50 text-rose-700 border-rose-200', border: 'border-l-rose-500', icon: '🤕' },
    eyes_ent: { label: 'Eyes & ENT', bn: 'চোখ, কান, নাক ও গলা', color: 'bg-sky-50 text-sky-700 border-sky-200', border: 'border-l-sky-500', icon: '👃' },
    digestion: { label: 'Digestion & Thirst', bn: 'পাকস্থলী ও পিপাসা', color: 'bg-amber-50 text-amber-700 border-amber-200', border: 'border-l-amber-500', icon: '🍽️' },
    abdomen_stool: { label: 'Abdomen & Stool', bn: 'তলপেট ও মল', color: 'bg-orange-50 text-orange-700 border-orange-200', border: 'border-l-orange-500', icon: '🩺' },
    urinary: { label: 'Urinary Organs', bn: 'মূত্রযন্ত্র', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', border: 'border-l-indigo-500', icon: '🧪' },
    respiratory: { label: 'Respiratory & Cough', bn: 'শ্বাসযন্ত্র ও কাশি', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', border: 'border-l-cyan-500', icon: '🫁' },
    extremities: { label: 'Joints & Extremities', bn: 'হাত-পা ও বাতের ব্যথা', color: 'bg-teal-50 text-teal-700 border-teal-200', border: 'border-l-teal-500', icon: '🦵' },
    skin: { label: 'Skin & Eruptions', bn: 'চর্মরোগ ও চুলকানি', color: 'bg-pink-50 text-pink-700 border-pink-200', border: 'border-l-pink-500', icon: '🩹' },
    fever: { label: 'Fever & Chills', bn: 'জ্বর ও শীতভাব', color: 'bg-red-50 text-red-700 border-red-200', border: 'border-l-red-500', icon: '🌡️' },
    generalities: { label: 'Generalities', bn: 'সাধারণ লক্ষণ ও উপশম/বৃদ্ধি', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-emerald-500', icon: '⚡' },
    other: { label: 'Other Rubrics', bn: 'অন্যান্য', color: 'bg-slate-50 text-slate-700 border-slate-200', border: 'border-l-slate-500', icon: '📋' },
};

export default function Index({ symptoms, filters = {}, metrics = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('symptoms.create');
    const canUpdate = permissions.includes('symptoms.update');
    const canDelete = permissions.includes('symptoms.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || 'all');
    const [status, setStatus] = useState(filters.status || 'all');
    const [mapped, setMapped] = useState(filters.mapped || 'all');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const isFirstRender = useRef(true);

    // Debounced real-time query
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            router.get(
                route('admin.symptoms.index'),
                {
                    search: search || undefined,
                    category: category !== 'all' ? category : undefined,
                    status: status !== 'all' ? status : undefined,
                    mapped: mapped !== 'all' ? mapped : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, category, status, mapped]);

    const handleClearFilters = () => {
        setSearch('');
        setCategory('all');
        setStatus('all');
        setMapped('all');
        router.get(route('admin.symptoms.index'), {}, { preserveState: true, replace: true });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.symptoms.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Code',
            accessor: 'code',
            className: 'w-24',
            cell: (s) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                    {s.code || '—'}
                </span>
            ),
        },
        {
            header: 'Rubric / Symptom Name',
            accessor: 'name_en',
            cell: (s) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                        {s.name_en}
                    </div>
                    {s.name_bn && (
                        <div className="text-xs text-teal-700 dark:text-teal-400 font-medium font-bengali">
                            {s.name_bn}
                        </div>
                    )}
                    {s.modalities && (
                        <div className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1">
                            ⚡ {s.modalities}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Repertory Chapter',
            accessor: 'category',
            cell: (s) => {
                const cat = CHAPTER_CONFIG[s.category] || CHAPTER_CONFIG.other;
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${cat.color}`}>
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </span>
                );
            },
        },
        {
            header: 'Mapped Remedies',
            accessor: 'medicines_count',
            cell: (s) => {
                const count = s.medicines_count || 0;
                return (
                    <div>
                        {count > 0 ? (
                            <Link
                                href={route('admin.symptom_medicine_map.index', { symptom_id: s.id })}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                                title="View mapped remedies in knowledge graph"
                            >
                                <span>💊 {count} Meds</span>
                                <span className="text-[10px]">↗</span>
                            </Link>
                        ) : (
                            <Link
                                href={route('admin.symptom_medicine_map.create', { symptom_id: s.id })}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
                                title="Map homeopathic remedies to this rubric"
                            >
                                <span>+ Map</span>
                            </Link>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (s) => <StatusBadge status={s.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (s) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.symptoms.edit', s.id)}
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
                        onClick={() => setDeleteTarget(s)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const hasActiveFilters = Boolean(search || category !== 'all' || status !== 'all' || mapped !== 'all');

    return (
        <AuthenticatedLayout>
            <Head title="Symptoms & Repertory Rubrics" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Homeopathic Symptoms & Repertory Rubrics (লক্ষণ ও রেপার্টরি রুব্রিক্স)"
                    description="Standard homeopathic symptom dictionary and rubric knowledge graph for doctor consultation case-taking and auto-repertorization."
                    action={
                        canCreate && (
                            <Link
                                href={route('admin.symptoms.create')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shadow-xs"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>+ Add Rubric</span>
                            </Link>
                        )
                    }
                />

                {/* Header KPI Ribbon */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Rubrics</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.total || 0}</span>
                            <span className="text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">Repertory</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active in Case Taking</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.active || 0}</span>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">Ready</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mapped to Remedies</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.mapped || 0}</span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">Scored</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700">
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Repertory Chapters</div>
                        <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{metrics.chapters_count || 11}</span>
                            <span className="text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">Anatomical</span>
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
                                placeholder="Search rubrics in English, Bengali, chapter, or modalities..."
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

                        {/* Mapping Status Filter */}
                        <div className="w-full md:w-48">
                            <select
                                value={mapped}
                                onChange={(e) => setMapped(e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="all">All Mappings</option>
                                <option value="mapped">Mapped to Remedies (💊)</option>
                                <option value="unmapped">Unmapped Rubrics (⚠️)</option>
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

                    {/* Repertory Chapter Tabs Ribbon */}
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
                        {Object.entries(CHAPTER_CONFIG).map(([catKey, cat]) => {
                            const count = metrics.chapter_breakdown?.[catKey] || 0;
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
                        data={symptoms.data || []}
                        emptyMessage="No homeopathic symptoms or rubrics found matching your criteria."
                    />
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <Pagination links={symptoms.links} />
                    </div>
                </div>

                {/* MOBILE VIEW: High-Density Touch Cards (block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {symptoms.data?.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-xs text-gray-500">
                            No symptoms or rubrics found matching your criteria.
                        </div>
                    ) : (
                        symptoms.data?.map((rubric) => {
                            const cat = CHAPTER_CONFIG[rubric.category] || CHAPTER_CONFIG.other;
                            const count = rubric.medicines_count || 0;

                            return (
                                <div
                                    key={rubric.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-2xs border border-gray-100 dark:border-gray-700 border-l-4 ${cat.border} space-y-2.5`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {rubric.code && (
                                                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                                        {rubric.code}
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                                    {rubric.name_en}
                                                </h3>
                                            </div>
                                            {rubric.name_bn && (
                                                <p className="text-xs text-teal-700 dark:text-teal-400 font-medium font-bengali mt-0.5">
                                                    {rubric.name_bn}
                                                </p>
                                            )}
                                        </div>
                                        <StatusBadge status={rubric.is_active ? 'active' : 'inactive'} />
                                    </div>

                                    {/* Chapter & Mapping Badges */}
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cat.color}`}>
                                            <span>{cat.icon}</span>
                                            <span>{cat.label}</span>
                                        </span>

                                        {count > 0 ? (
                                            <Link
                                                href={route('admin.symptom_medicine_map.index', { symptom_id: rubric.id })}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            >
                                                <span>💊 {count} Meds</span>
                                                <span className="text-[10px]">↗</span>
                                            </Link>
                                        ) : (
                                            <Link
                                                href={route('admin.symptom_medicine_map.create', { symptom_id: rubric.id })}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200"
                                            >
                                                <span>+ Map Remedies</span>
                                            </Link>
                                        )}
                                    </div>

                                    {rubric.modalities && (
                                        <p className="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-gray-900/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                                            ⚡ {rubric.modalities}
                                        </p>
                                    )}

                                    {/* Action Bar (44px touch targets) */}
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        {canUpdate && (
                                            <Link
                                                href={route('admin.symptoms.edit', rubric.id)}
                                                className="min-h-[40px] px-4 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs font-semibold rounded-lg flex items-center justify-center transition"
                                            >
                                                Edit Rubric
                                            </Link>
                                        )}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(rubric)}
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
                        <Pagination links={symptoms.links} />
                    </div>
                </div>

                {deleteTarget && (
                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        title="Delete Symptom Rubric"
                        message={`Are you sure you want to delete "${deleteTarget.name_en}"? If linked to active visits or mappings, it will be deactivated safely.`}
                        confirmLabel="Delete Rubric"
                        onConfirm={confirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
