import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ medicines, filters = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('medicines.create');
    const canUpdate = permissions.includes('medicines.update');
    const canDelete = permissions.includes('medicines.delete');
    const { data, setData, get, processing } = useForm({ search: filters.search || '' });
    const [deleteTarget, setDeleteTarget] = useState(null);

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.medicines.index'), { preserveState: true });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.medicines.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            cell: (m) => (
                <div>
                    <div className="font-semibold text-gray-900">{m.name}</div>
                    {m.name_bn && <div className="text-xs text-gray-500">{m.name_bn}</div>}
                </div>
            ),
        },
        {
            header: 'Potency',
            accessor: 'potency',
            cell: (m) => <span className="font-mono text-xs">{m.potency || '—'}</span>,
        },
        {
            header: 'Form',
            accessor: 'form',
            cell: (m) => <span className="capitalize">{m.form || '—'}</span>,
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
                            href={route('admin.medicines.edit', m.id)}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                        >
                            Edit
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-primary-700 bg-primary-50 rounded font-medium cursor-not-allowed opacity-50">
                            Edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(m)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 rounded font-medium transition enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Medicines" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Medicines"
                    subtitle="Manage homeopathic medicines catalog, forms, and potencies"
                    actions={canCreate ? (
                        <Link
                            href={route('admin.medicines.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + New Medicine
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-semibold shadow-xs cursor-not-allowed opacity-50">
                            + New Medicine
                        </button>
                    )}
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-4">
                    <form onSubmit={onSearch} className="flex max-w-md gap-2">
                        <input
                            type="text"
                            aria-label="Search medicines"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Search by name..."
                            className="flex-1 rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition"
                        >
                            Search
                        </button>
                    </form>

                    <DataTable
                        columns={columns}
                        data={medicines.data}
                        keyExtractor={(m) => m.id}
                        isLoading={processing}
                        emptyMessage="No medicines found."
                    />

                    {medicines.links && <Pagination links={medicines.links} />}
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Medicine"
                    message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
