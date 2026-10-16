import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ maps }) {
    const { data, setData, post, processing, errors } = useForm({ csv_file: null });
    const [deleteTarget, setDeleteTarget] = useState(null);

    const uploadCsv = (e) => {
        e.preventDefault();
        post(route('admin.symptom_medicine_map.import'), { preserveScroll: true });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('admin.symptom_medicine_map.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
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
            header: 'Actions',
            className: 'text-right',
            cell: (m) => (
                <div className="flex justify-end gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded font-medium transition"
                    >
                        Delete
                    </button>
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
                    action={
                        <Link
                            href={route('admin.symptom_medicine_map.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + Add Mapping
                        </Link>
                    }
                />

                {/* CSV Import Card */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-1">Batch Import from CSV</h3>
                    <p className="text-xs text-gray-500 mb-3">Expected CSV header: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">symptom_name, medicine_name, priority, note</code></p>
                    <form onSubmit={uploadCsv} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <input
                            type="file"
                            onChange={e => setData('csv_file', e.target.files[0])}
                            accept=".csv"
                            required
                            className="text-xs text-gray-700 border border-gray-300 rounded-md file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                        />
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-md shadow-xs transition disabled:opacity-50"
                        >
                            {processing ? 'Uploading...' : 'Upload & Import'}
                        </button>
                    </form>
                    {errors.csv_file && <p className="text-xs text-red-500 mt-1">{errors.csv_file}</p>}
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
                    message="Are you sure you want to delete this symptom-medicine mapping rule?"
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
