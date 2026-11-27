import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

export default function Index({
    maps,
    importPreview,
    kpis = { total: 0, approved: 0, pending_review: 0, draft: 0, inactive: 0 },
    chapters = [],
    selectedSymptom = null,
    selectedMedicine = null,
    filters = {},
    flash = {},
}) {
    const can = usePermission();
    const canCreate = can('symptom_medicine_map.create');
    const canUpdate = can('symptom_medicine_map.update');
    const canReview = can('symptom_medicine_map.review');
    const canDelete = can('symptom_medicine_map.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [priority, setPriority] = useState(filters.priority || '');
    const [category, setCategory] = useState(filters.category || '');
    const [trashed, setTrashed] = useState(filters.trashed || 'with');
    const [showCsvCard, setShowCsvCard] = useState(Boolean(importPreview));

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [restoreTarget, setRestoreTarget] = useState(null);
    const isFirstRender = useRef(true);

    const { data: csvData, setData: setCsvData, post: postCsv, processing: csvProcessing, errors: csvErrors } = useForm({
        csv_file: null,
    });

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            applyFilters({ search, status, priority, category, trashed });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, status, priority, category, trashed]);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : search,
            status: overrides.status !== undefined ? overrides.status : status,
            priority: overrides.priority !== undefined ? overrides.priority : priority,
            category: overrides.category !== undefined ? overrides.category : category,
            trashed: overrides.trashed !== undefined ? overrides.trashed : trashed,
        };

        if (filters.symptom_id) query.symptom_id = filters.symptom_id;
        if (filters.medicine_id) query.medicine_id = filters.medicine_id;

        Object.keys(query).forEach((key) => {
            if (query[key] === '' || query[key] === null || (key === 'status' && query[key] === 'all')) {
                delete query[key];
            }
        });

        router.get(route('admin.symptom_medicine_map.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilterParam = (paramKey) => {
        const query = { ...filters };
        delete query[paramKey];
        router.get(route('admin.symptom_medicine_map.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetAllFilters = () => {
        setSearch('');
        setStatus('all');
        setPriority('');
        setCategory('');
        setTrashed('with');
        router.get(route('admin.symptom_medicine_map.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const uploadCsv = (e) => {
        e.preventDefault();
        if (!canCreate) return;
        postCsv(route('admin.symptom_medicine_map.import'), { preserveScroll: true });
    };

    const confirmImport = () => {
        if (!canCreate || !importPreview?.token) return;
        router.post(
            route('admin.symptom_medicine_map.import.confirm'),
            { preview_token: importPreview.token },
            { preserveScroll: true }
        );
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.symptom_medicine_map.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const confirmRestore = () => {
        if (!canUpdate || !restoreTarget) return;
        router.post(
            route('admin.symptom_medicine_map.restore', restoreTarget.id),
            { confirmed: true },
            { onSuccess: () => setRestoreTarget(null) }
        );
    };

    const renderGradeBadge = (p) => {
        const pNum = Number(p);
        if (pNum === 1) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Grade 1 ⭐
                </span>
            );
        }
        if (pNum === 2) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                    Grade 2 ⭐⭐
                </span>
            );
        }
        if (pNum === 3) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    Grade 3 ⭐⭐⭐
                </span>
            );
        }
        if (pNum === 4) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200">
                    Grade 4 (Keynote) 🌟
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                Priority {p}
            </span>
        );
    };

    const renderStatusBadge = (mapping) => {
        if (mapping.deleted_at) {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                    Archived / Deleted
                </span>
            );
        }
        if (mapping.review_status === 'approved' && mapping.is_approved) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Approved ✅
                </span>
            );
        }
        if (mapping.review_status === 'pending_review') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    Pending Review ⏳
                </span>
            );
        }
        if (mapping.review_status === 'rejected') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    Rejected ✕
                </span>
            );
        }
        if (mapping.review_status === 'inactive') {
            return (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Inactive 🚫
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Draft 📝
            </span>
        );
    };

    const statusPills = [
        { key: 'all', label: 'All', count: kpis.total },
        { key: 'approved', label: 'Approved (Active CDSS) ✅', count: kpis.approved },
        { key: 'pending_review', label: 'Pending Review ⏳', count: kpis.pending_review },
        { key: 'draft', label: 'Drafts 📝', count: kpis.draft },
        { key: 'inactive', label: 'Inactive 🚫', count: kpis.inactive },
    ];

    const columns = [
        {
            header: 'Symptom / Rubric',
            accessor: 'symptom.name_en',
            cell: (m) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {m.symptom?.code && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px] font-semibold border border-gray-200">
                                {m.symptom.code}
                            </span>
                        )}
                        <span className="font-semibold text-gray-900">{m.symptom?.name_en || 'Unknown'}</span>
                    </div>
                    {m.symptom?.name_bn && (
                        <div className="text-xs text-gray-500 font-bengali">{m.symptom.name_bn}</div>
                    )}
                    {m.symptom?.category && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-medium bg-teal-50 text-teal-700 uppercase tracking-wider">
                            {m.symptom.category.replace('_', ' ')}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Indicated Medicine',
            accessor: 'medicine.name',
            cell: (m) => (
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-teal-900">{m.medicine?.name || 'Unknown'}</span>
                        {m.medicine?.potency && (
                            <span className="px-1.5 py-0.2 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {m.medicine.potency}
                            </span>
                        )}
                    </div>
                    {m.medicine?.common_name && (
                        <div className="text-xs text-gray-500 italic">{m.medicine.common_name}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Grade / Priority',
            accessor: 'priority',
            cell: (m) => renderGradeBadge(m.priority),
        },
        {
            header: 'Clinical Status',
            accessor: 'review_status',
            cell: (m) => renderStatusBadge(m),
        },
        {
            header: 'Reference Source',
            accessor: 'source_title',
            cell: (m) => (
                <div className="text-xs space-y-0.5 max-w-xs">
                    <div className="font-medium text-gray-800 truncate" title={m.source_title}>
                        {m.source_title || 'Not recorded'}
                    </div>
                    {m.source_author && (
                        <div className="text-gray-500 text-[11px]">
                            {m.source_author}
                            {m.source_page ? ` · p. ${m.source_page}` : ''}
                        </div>
                    )}
                    {m.note && (
                        <div className="text-gray-500 text-[11px] italic truncate" title={m.note}>
                            "{m.note}"
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (m) => (
                <div className="flex justify-end gap-1.5 text-xs">
                    {m.deleted_at ? (
                        <button
                            type="button"
                            onClick={() => setRestoreTarget(m)}
                            disabled={!canUpdate}
                            className="px-2.5 py-1 text-teal-700 bg-teal-50 border border-teal-200 rounded font-medium transition hover:bg-teal-100 disabled:opacity-50"
                        >
                            Restore for review
                        </button>
                    ) : canUpdate || canReview ? (
                        <Link
                            href={route('admin.symptom_medicine_map.edit', m.id)}
                            className="px-2.5 py-1 text-teal-700 bg-teal-50 border border-teal-200 rounded font-medium transition hover:bg-teal-100"
                        >
                            {canReview && m.review_status === 'pending_review' ? 'Review ⏳' : 'Edit'}
                        </Link>
                    ) : null}
                    {!m.deleted_at && (
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            disabled={!canDelete}
                            className="px-2.5 py-1 text-red-700 bg-red-50 border border-red-200 rounded font-medium transition hover:bg-red-100 disabled:opacity-50"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Symptom-Medicine Knowledge Graph" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Symptom &amp; Medicine Repertory Knowledge Graph"
                    subtitle="Define, grade, and clinically govern relationships between homeopathic symptoms and remedies for CDSS recommendations"
                    actions={
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setShowCsvCard(!showCsvCard)}
                                className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                            >
                                📂 {showCsvCard ? 'Hide Batch CSV' : 'Batch CSV Import'}
                            </button>
                            {canCreate ? (
                                <Link
                                    href={route('admin.symptom_medicine_map.create')}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition inline-flex items-center gap-1"
                                >
                                    + Add Mapping
                                </Link>
                            ) : null}
                        </div>
                    }
                />

                {/* Clinical Advisory Banner */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3 shadow-xs">
                    <span className="text-lg leading-none">⚖️</span>
                    <div>
                        <strong className="font-semibold">Clinical Decision Support Advisory:</strong> Repertory mappings serve as indexed reference material for clinical decision support. Prescribing recommendations do not replace independent physician evaluation or established patient safety guidelines.
                    </div>
                </div>

                {/* KPI Metric Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total References</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Knowledge graph entries</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active in CDSS</div>
                        <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.approved}</div>
                        <div className="text-[11px] text-emerald-600/80 mt-1">Approved &amp; recommended</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending Review</div>
                        <div className="text-2xl font-bold text-amber-700 mt-1">{kpis.pending_review}</div>
                        <div className="text-[11px] text-amber-600/80 mt-1">Awaiting clinical review</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-blue-600 uppercase tracking-wider">Draft Mappings</div>
                        <div className="text-2xl font-bold text-blue-700 mt-1">{kpis.draft}</div>
                        <div className="text-[11px] text-blue-600/80 mt-1">Work in progress</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Inactive / Archived</div>
                        <div className="text-2xl font-bold text-gray-600 mt-1">{kpis.inactive}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Excluded from CDSS</div>
                    </div>
                </div>

                {/* Active Filter Dismiss Banners (From Symptom or Medicine Cross-Links) */}
                {selectedSymptom && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm text-teal-900 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Showing mappings for Rubric:</span>
                            <span className="font-mono bg-teal-100 px-1.5 py-0.5 rounded text-teal-800">{selectedSymptom.code || 'NO-CODE'}</span>
                            <span className="font-bold">{selectedSymptom.name_en}</span>
                            {selectedSymptom.name_bn && <span className="text-teal-700">({selectedSymptom.name_bn})</span>}
                        </div>
                        <button
                            type="button"
                            onClick={() => clearFilterParam('symptom_id')}
                            className="text-teal-700 hover:text-teal-900 font-semibold underline text-xs ml-4"
                        >
                            ✕ Clear Rubric Filter
                        </button>
                    </div>
                )}

                {selectedMedicine && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm text-blue-900 shadow-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Showing mappings for Remedy:</span>
                            <span className="font-bold">{selectedMedicine.name}</span>
                            {selectedMedicine.potency && <span className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">({selectedMedicine.potency})</span>}
                        </div>
                        <button
                            type="button"
                            onClick={() => clearFilterParam('medicine_id')}
                            className="text-blue-700 hover:text-blue-900 font-semibold underline text-xs ml-4"
                        >
                            ✕ Clear Remedy Filter
                        </button>
                    </div>
                )}

                {/* Collapsible CSV Import Workstation */}
                {showCsvCard && (
                    <div className="bg-white rounded-xl shadow-xs border border-teal-200 p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Batch Ingestion from CSV</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    UTF-8 CSV format, up to 5 MB / 1,000 rows. Required columns: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono">symptom_name, medicine_name</code>; Optional: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800 font-mono">priority, note, source_title, source_author, source_edition, source_page, source_url</code>.
                                </p>
                            </div>
                            <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-medium">
                                Ingests as Draft
                            </span>
                        </div>

                        <form onSubmit={uploadCsv} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <input
                                id="symptom-map-csv"
                                type="file"
                                disabled={!canCreate}
                                onChange={(e) => setCsvData('csv_file', e.target.files[0])}
                                accept=".csv"
                                required
                                aria-required="true"
                                className="text-xs text-gray-700 border border-gray-300 rounded-lg file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer w-full sm:w-auto"
                            />
                            <button
                                type="submit"
                                disabled={!canCreate || csvProcessing}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {csvProcessing ? 'Validating CSV...' : 'Preview Validation'}
                            </button>
                        </form>

                        {csvErrors.csv_file && (
                            <p className="text-xs font-medium text-red-600">{csvErrors.csv_file}</p>
                        )}
                        {csvErrors.preview_token && (
                            <p className="text-xs font-medium text-red-600">{csvErrors.preview_token}</p>
                        )}
                        {flash.success && (
                            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                                {flash.success}
                            </p>
                        )}

                        {flash.importResults?.length > 0 && (
                            <details className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                                <summary className="cursor-pointer text-xs font-semibold text-gray-800">
                                    View Batch Import Row Results ({flash.importResults.length})
                                </summary>
                                <ul className="mt-2 space-y-1 text-xs text-gray-600 max-h-48 overflow-y-auto">
                                    {flash.importResults.map((result, index) => (
                                        <li key={`${result.line}-${index}`}>
                                            Line {result.line}: <strong className="text-gray-800">{result.result}</strong> — {result.reason}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        {importPreview && (
                            <div className="space-y-3 border-t border-gray-200 pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900">Validation Summary</h4>
                                        <p className="text-xs text-gray-600">
                                            Valid: {importPreview.totals.valid} · New: {importPreview.totals.new} · Updates: {importPreview.totals.update} · Duplicates: {importPreview.totals.duplicate} · Invalid: {importPreview.totals.invalid} · Protected Approved: {importPreview.totals.protected}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={confirmImport}
                                            disabled={!canCreate || csvProcessing || importPreview.totals.valid === 0}
                                            className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Confirm &amp; Import Valid Rows
                                        </button>
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-auto rounded-lg border border-gray-200 text-xs">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold">Line</th>
                                                <th className="px-3 py-2 text-left font-semibold">Symptom</th>
                                                <th className="px-3 py-2 text-left font-semibold">Medicine</th>
                                                <th className="px-3 py-2 text-left font-semibold">Priority</th>
                                                <th className="px-3 py-2 text-left font-semibold">Source</th>
                                                <th className="px-3 py-2 text-left font-semibold">Status</th>
                                                <th className="px-3 py-2 text-left font-semibold">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {importPreview.rows.map((row, idx) => (
                                                <tr key={`${row.line}-${idx}`}>
                                                    <td className="px-3 py-1.5">{row.line}</td>
                                                    <td className="px-3 py-1.5 font-medium">{row.symptom || '—'}</td>
                                                    <td className="px-3 py-1.5 font-medium text-teal-800">{row.medicine || '—'}</td>
                                                    <td className="px-3 py-1.5">{row.priority}</td>
                                                    <td className="px-3 py-1.5 truncate max-w-xs">{row.source_title || '—'}</td>
                                                    <td className="px-3 py-1.5 capitalize font-semibold">{row.status}</td>
                                                    <td className="px-3 py-1.5 text-gray-500">{row.message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Search & Filter Toolbar */}
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
                    {/* Status Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        {statusPills.map((pill) => (
                            <button
                                key={pill.key}
                                type="button"
                                onClick={() => setStatus(pill.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                    status === pill.key
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                <span>{pill.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    status === pill.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {pill.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search and Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative lg:col-span-2">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by symptom, remedy, notes, or source citation..."
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

                        {/* Chapter Filter */}
                        <div>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            >
                                <option value="">All Kent Chapters</option>
                                {chapters.map((ch) => (
                                    <option key={ch} value={ch}>
                                        {ch.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Grade Filter */}
                        <div>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            >
                                <option value="">All Repertory Grades</option>
                                <option value="1">Grade 1 ⭐ (Ordinary)</option>
                                <option value="2">Grade 2 ⭐⭐ (Moderate)</option>
                                <option value="3">Grade 3 ⭐⭐⭐ (Strong)</option>
                                <option value="4">Grade 4 🌟 (Keynote)</option>
                            </select>
                        </div>

                        {/* Trashed Status & Reset */}
                        <div className="flex items-center gap-2">
                            <select
                                value={trashed}
                                onChange={(e) => setTrashed(e.target.value)}
                                className="w-full py-2 rounded-lg border-gray-300 text-xs sm:text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            >
                                <option value="with">Active + Archived</option>
                                <option value="without">Active Only</option>
                                <option value="only">Archived Only</option>
                            </select>
                            {(search || status !== 'all' || priority || category || trashed !== 'with' || filters.symptom_id || filters.medicine_id) && (
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="px-2.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop Data Table (hidden on mobile) */}
                <div className="hidden md:block bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
                    <DataTable
                        columns={columns}
                        data={maps.data}
                        keyExtractor={(m) => m.id}
                        emptyMessage="No symptom-medicine mappings match the selected criteria."
                    />
                    {maps.links && <Pagination links={maps.links} />}
                </div>

                {/* Mobile Touch Cards View (visible on mobile only) */}
                <div className="block md:hidden space-y-3">
                    {maps.data.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                            No symptom-medicine mappings match the selected criteria.
                        </div>
                    ) : (
                        maps.data.map((m) => (
                            <div
                                key={m.id}
                                className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                                    m.deleted_at ? 'border-red-200 bg-red-50/20' : 'border-gray-200'
                                }`}
                            >
                                {/* Header: Code & Chapter + Grade */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {m.symptom?.code && (
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px] font-semibold border border-gray-200">
                                                {m.symptom.code}
                                            </span>
                                        )}
                                        {m.symptom?.category && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 uppercase tracking-wider">
                                                {m.symptom.category.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <div>{renderGradeBadge(m.priority)}</div>
                                </div>

                                {/* Symptom & Medicine */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">{m.symptom?.name_en || 'Unknown Rubric'}</h4>
                                    {m.symptom?.name_bn && (
                                        <p className="text-xs text-gray-500 font-bengali">{m.symptom.name_bn}</p>
                                    )}
                                </div>

                                {/* Linked Remedy */}
                                <div className="bg-teal-50/60 border border-teal-100 rounded-lg p-2.5 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-teal-700 font-medium block">Remedy Reference</span>
                                        <span className="text-sm font-bold text-teal-900">{m.medicine?.name || 'Unknown'}</span>
                                        {m.medicine?.common_name && (
                                            <span className="text-xs text-gray-500 italic block">({m.medicine.common_name})</span>
                                        )}
                                    </div>
                                    {m.medicine?.potency && (
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                            {m.medicine.potency}
                                        </span>
                                    )}
                                </div>

                                {/* Notes and Source */}
                                {(m.source_title || m.note) && (
                                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg space-y-0.5">
                                        {m.source_title && (
                                            <div>
                                                📖 <strong className="text-gray-800">{m.source_title}</strong>
                                                {m.source_page ? ` (p. ${m.source_page})` : ''}
                                            </div>
                                        )}
                                        {m.note && <div className="text-gray-500 italic">"{m.note}"</div>}
                                    </div>
                                )}

                                {/* Status and Actions */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                    <div>{renderStatusBadge(m)}</div>
                                    <div className="flex items-center gap-2">
                                        {m.deleted_at ? (
                                            <button
                                                type="button"
                                                onClick={() => setRestoreTarget(m)}
                                                disabled={!canUpdate}
                                                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg"
                                            >
                                                Restore
                                            </button>
                                        ) : canUpdate || canReview ? (
                                            <Link
                                                href={route('admin.symptom_medicine_map.edit', m.id)}
                                                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg flex items-center"
                                            >
                                                {canReview && m.review_status === 'pending_review' ? 'Review ⏳' : 'Edit'}
                                            </Link>
                                        ) : null}
                                        {!m.deleted_at && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(m)}
                                                disabled={!canDelete}
                                                className="min-h-[44px] px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {maps.links && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <Pagination links={maps.links} />
                        </div>
                    )}
                </div>

                {/* Confirmation Dialogs */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Repertory Mapping"
                    message="Remove this mapping from active use? The relationship will be retained in historical records and can be restored at any time."
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
                <ConfirmDialog
                    isOpen={!!restoreTarget}
                    title="Restore for Clinical Review"
                    message="Restore this mapping as pending review? It will remain unavailable to consultation suggestions until an authorized reviewer approves it."
                    confirmLabel="Restore for review"
                    isDestructive={false}
                    onConfirm={confirmRestore}
                    onCancel={() => setRestoreTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
