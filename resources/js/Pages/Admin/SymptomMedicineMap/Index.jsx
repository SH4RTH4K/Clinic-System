import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ maps, importPreview, flash = {} }) {
    const can = usePermission();
    const canCreate = can('symptom_medicine_map.create');
    const canUpdate = can('symptom_medicine_map.update');
    const canReview = can('symptom_medicine_map.review');
    const canDelete = can('symptom_medicine_map.delete');
    const { data, setData, post, processing, errors } = useForm({ csv_file: null });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [restoreTarget, setRestoreTarget] = useState(null);

    const uploadCsv = (e) => {
        e.preventDefault();
        if (!canCreate) return;
        post(route('admin.symptom_medicine_map.import'), { preserveScroll: true });
    };

    const confirmImport = () => {
        if (!canCreate || !importPreview?.token) return;
        router.post(route('admin.symptom_medicine_map.import.confirm'), { preview_token: importPreview.token }, { preserveScroll: true });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.symptom_medicine_map.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const confirmRestore = () => {
        if (!canUpdate || !restoreTarget) return;
        router.post(route('admin.symptom_medicine_map.restore', restoreTarget.id), { confirmed: true }, {
            onSuccess: () => setRestoreTarget(null),
        });
    };

    const columns = [
        {
            header: 'Symptom',
            accessor: 'symptom.name_en',
            cell: (m) => (
                <div>
                    <span className="font-medium text-gray-900">{m.symptom?.name_en || 'Unknown'}</span>
                    {m.symptom?.name_bn && <span className="text-xs text-gray-500 ml-1">({m.symptom.name_bn})</span>}
                </div>
            ),
        },
        {
            header: 'Medicine',
            accessor: 'medicine.name',
            cell: (m) => (
                <div>
                    <span className="font-semibold text-primary-900">{m.medicine?.name || 'Unknown'}</span>
                    {m.medicine?.potency && <span className="text-xs text-gray-500 ml-1">({m.medicine.potency})</span>}
                </div>
            ),
        },
        {
            header: 'Priority',
            accessor: 'priority',
            cell: (m) => (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                    Priority {m.priority}
                </span>
            ),
        },
        {
            header: 'Clinical note',
            accessor: 'note',
            cell: (mapping) => <span className="text-sm text-gray-600">{mapping.note || '—'}</span>,
        },
        {
            header: 'Clinical status',
            accessor: 'review_status',
            cell: (mapping) => (
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${mapping.review_status === 'approved' ? 'bg-green-50 text-green-700' : mapping.review_status === 'rejected' || mapping.review_status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-amber-50 text-amber-800'}`}>
                    {String(mapping.review_status || 'draft').replace('_', ' ')}
                </span>
            ),
        },
        { header: 'Reference source', accessor: 'source_title', cell: (mapping) => <span className="text-sm text-gray-600">{mapping.source_title || 'Not recorded'}</span> },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (m) => (
                <div className="flex justify-end gap-2 text-xs">
                    {m.deleted_at ? (
                        <button
                            type="button"
                            onClick={() => setRestoreTarget(m)}
                            disabled={!canUpdate}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 rounded font-medium transition enabled:hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Restore for review
                        </button>
                    ) : canUpdate || canReview ? (
                        <Link
                            href={route('admin.symptom_medicine_map.edit', m.id)}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 rounded font-medium transition hover:bg-primary-100"
                        >
                            {canUpdate ? 'Edit' : 'Review'}
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-primary-700 bg-primary-50 rounded font-medium opacity-50 cursor-not-allowed">
                            Edit
                        </button>
                    )}
                    {!m.deleted_at && <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 rounded font-medium transition enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Symptom-Medicine Mappings" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Symptom &amp; Medicine Repertory"
                    subtitle="Define clinical relationships between homeopathic symptoms and remedies"
                    action={canCreate ? (
                        <Link
                            href={route('admin.symptom_medicine_map.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + Add Mapping
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs cursor-not-allowed opacity-50">
                            + Add Mapping
                        </button>
                    )}
                />
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Repertory mappings are reference material only. Matches do not establish effectiveness or patient suitability and are not a substitute for established medical treatment.</div>

                {/* CSV Import Card */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-1">Batch Import from CSV</h3>
                    <p className="text-xs text-gray-500 mb-3">UTF-8 CSV, up to 5 MB / 1,000 rows. Required headers: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">symptom_name, medicine_name</code>; optional: priority, note, source_title, source_author, source_edition, source_page, source_url. Imported mappings stay in Draft.</p>
                    <form onSubmit={uploadCsv} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                            type="file"
                            disabled={!canCreate}
                            onChange={e => setData('csv_file', e.target.files[0])}
                            accept=".csv"
                            required
                            className="text-xs text-gray-700 border border-gray-300 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                        />
                        <button
                            type="submit"
                            disabled={!canCreate || processing}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-md shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? 'Validating...' : 'Preview CSV'}
                        </button>
                    </form>
                    {errors.csv_file && <p className="text-xs text-red-500 mt-1">{errors.csv_file}</p>}
                    {errors.preview_token && <p className="text-xs text-red-500 mt-1">{errors.preview_token}</p>}
                    {flash.success && <p className="mt-3 text-sm font-medium text-green-700">{flash.success}</p>}
                    {flash.importResults?.length > 0 && (
                        <details className="mt-3 rounded border border-gray-200 p-3">
                            <summary className="cursor-pointer text-sm font-semibold">View row results</summary>
                            <ul className="mt-2 space-y-1 text-xs text-gray-700">
                                {flash.importResults.map((result, index) => <li key={`${result.line}-${index}`}>Line {result.line}: <strong>{result.result}</strong> — {result.reason}</li>)}
                            </ul>
                        </details>
                    )}
                    {importPreview && (
                        <div className="mt-5 space-y-3 border-t border-gray-200 pt-4">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Import validation preview</h4>
                                <p className="mt-1 text-xs text-gray-600">Valid: {importPreview.totals.valid} · New: {importPreview.totals.new} · Updates: {importPreview.totals.update} · Duplicates: {importPreview.totals.duplicate} · Invalid: {importPreview.totals.invalid} · Protected approved: {importPreview.totals.protected}</p>
                                <p className="mt-1 text-xs text-amber-800">Approved existing mappings are protected. Imported mappings stay out of clinical suggestions until explicitly approved.</p>
                            </div>
                            <div className="max-h-80 overflow-auto rounded border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-50"><tr>{['Line', 'Symptom', 'Medicine', 'Priority', 'Source', 'Result', 'Details'].map((heading) => <th key={heading} className="px-3 py-2 text-left font-semibold text-gray-600">{heading}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {importPreview.rows.map((row, index) => <tr key={`${row.line}-${index}`}><td className="px-3 py-2">{row.line}</td><td className="px-3 py-2">{row.symptom || '—'}</td><td className="px-3 py-2">{row.medicine || '—'}</td><td className="px-3 py-2">{row.priority}</td><td className="px-3 py-2">{row.source_title || '—'}</td><td className="px-3 py-2 capitalize">{row.status}</td><td className="px-3 py-2">{row.message}</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                            <button type="button" onClick={confirmImport} disabled={!canCreate || processing || importPreview.totals.valid === 0} className="rounded-md bg-primary-700 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50">Confirm import</button>
                            <span className="ml-3 text-xs text-gray-500">Preview expires at {new Date(importPreview.expires_at).toLocaleTimeString()}.</span>
                        </div>
                    )}
                </div>

                {/* Mappings Table */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-4">
                    <DataTable
                        columns={columns}
                        data={maps.data}
                        keyExtractor={(m) => m.id}
                        emptyMessage="No symptom-medicine mappings found."
                    />

                    {maps.links && <Pagination links={maps.links} />}
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Mapping"
                    message="Remove this mapping from active use? The mapping will be retained in historical records."
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
                <ConfirmDialog
                    isOpen={!!restoreTarget}
                    title="Restore for clinical review"
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
