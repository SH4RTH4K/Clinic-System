import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ symptoms, filters = {} }) {
    const { data, setData, get } = useForm({ search: filters.search || '' });
    const [deleteTarget, setDeleteTarget] = useState(null);

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.symptoms.index'), { preserveState: true });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('admin.symptoms.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Name (English)',
            accessor: 'name_en',
            className: 'font-semibold text-gray-900',
        },
        {
            header: 'Name (Bangla)',
            accessor: 'name_bn',
            cell: (s) => <span className="text-gray-700">{s.name_bn || '—'}</span>,
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
                    <Link
                        href={route('admin.symptoms.edit', s.id)}
                        className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                    >
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
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
            <Head title="Symptoms" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Symptoms"
                    subtitle="Manage homeopathic symptoms dictionary and repertory entries"
                    action={
                        <Link
                            href={route('admin.symptoms.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + New Symptom
                        </Link>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-4">
                    <form onSubmit={onSearch} className="flex max-w-md gap-2">
                        <input
                            type="text"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Search symptoms..."
                            className="flex-1 rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition"
                        >
                            Search
                        </button>
                    </form>

                    <DataTable
                        columns={columns}
                        data={symptoms.data}
                        keyExtractor={(s) => s.id}
                        emptyMessage="No symptoms found."
                    />

                    {symptoms.links && <Pagination links={symptoms.links} />}
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Symptom"
                    message={`Are you sure you want to delete "${deleteTarget?.name_en}"?`}
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
