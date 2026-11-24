import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ pharmaceuticals, filters = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('pharmaceuticals.create');
    const canUpdate = permissions.includes('pharmaceuticals.update');
    const canDelete = permissions.includes('pharmaceuticals.delete');

    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
        dosage_form: filters.dosage_form || '',
    });

    const [deleteTarget, setDeleteTarget] = useState(null);

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.pharmaceuticals.index'), { preserveState: true });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.pharmaceuticals.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Brand Name',
            accessor: 'brand_name',
            cell: (p) => (
                <div>
                    <div className="font-bold text-gray-900">{p.brand_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.strength}</div>
                </div>
            ),
        },
        {
            header: 'Generic Name',
            accessor: 'generic_name',
            cell: (p) => <span className="font-medium text-gray-800">{p.generic_name}</span>,
        },
        {
            header: 'Dosage Form',
            accessor: 'dosage_form',
            cell: (p) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {p.dosage_form}
                </span>
            ),
        },
        {
            header: 'Manufacturer',
            accessor: 'manufacturer',
            cell: (p) => <span className="text-xs text-gray-600">{p.manufacturer || '—'}</span>,
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (p) => <StatusBadge status={p.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (p) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.pharmaceuticals.edit', p.id)}
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
                        onClick={() => setDeleteTarget(p)}
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
            <Head title="Pharmaceuticals Catalog" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Pharmaceutical Drugs (ঔষধ ক্যাটালগ)"
                    description="General Practice & Allopathy medication catalog: generic & brand names, strengths, and dosage forms."
                    action={
                        canCreate && (
                            <Link
                                href={route('admin.pharmaceuticals.create')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs"
                            >
                                + Add Pharmaceutical Drug
                            </Link>
                        )
                    }
                />

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 flex flex-col sm:flex-row gap-3">
                    <form onSubmit={onSearch} className="flex-1 flex gap-2">
                        <input
                            type="text"
                            placeholder="Search by brand name, generic name, or manufacturer..."
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                        />
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                        >
                            Search
                        </button>
                    </form>
                </div>

                <div className="bg-white rounded-xl shadow-2xs border border-gray-100 overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={pharmaceuticals.data || []}
                        emptyMessage="No pharmaceutical drugs found in the catalog."
                    />
                    <div className="p-4 border-t border-gray-100">
                        <Pagination links={pharmaceuticals.links} />
                    </div>
                </div>

                {deleteTarget && (
                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        title="Delete Pharmaceutical Drug"
                        message={`Are you sure you want to delete ${deleteTarget.brand_name} (${deleteTarget.generic_name})?`}
                        confirmLabel="Delete Drug"
                        onConfirm={confirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
