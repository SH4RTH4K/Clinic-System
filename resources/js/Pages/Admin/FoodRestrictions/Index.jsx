import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ foodRestrictions }) {
    const [deleteTarget, setDeleteTarget] = useState(null);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('admin.food_restrictions.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Food Restriction (Bangla)',
            accessor: 'text_bn',
            className: 'font-medium text-gray-900',
        },
        {
            header: 'Food Restriction (English)',
            accessor: 'text_en',
            cell: (f) => <span className="text-gray-500 text-xs">{f.text_en || '—'}</span>,
        },
        {
            header: 'Default for New Visits',
            accessor: 'is_default',
            cell: (f) => <StatusBadge status={f.is_default ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (f) => (
                <div className="flex justify-end gap-2 text-xs">
                    <Link
                        href={route('admin.food_restrictions.edit', f.id)}
                        className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                    >
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(f)}
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
            <Head title="Food Restrictions" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Food Restrictions (খাদ্য নিষেধ)"
                    subtitle="Manage homeopathic dietary precautions and prohibitions for patients"
                    action={
                        <Link
                            href={route('admin.food_restrictions.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + New Restriction
                        </Link>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-4">
                    <DataTable
                        columns={columns}
                        data={foodRestrictions.data}
                        keyExtractor={(f) => f.id}
                        emptyMessage="No food restrictions found."
                    />

                    {foodRestrictions.links && <Pagination links={foodRestrictions.links} />}
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Food Restriction"
                    message="Are you sure you want to delete this food restriction item?"
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
