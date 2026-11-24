import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const CATEGORY_LABELS = {
    hematology: 'Hematology (রক্ত পরীক্ষা)',
    biochemistry: 'Biochemistry (বায়োকেমিস্ট্রি)',
    radiology: 'Radiology / X-Ray (রেডিওলজি)',
    ultrasound: 'Ultrasound / USG (আল্ট্রাসনোগ্রাম)',
    microbiology: 'Microbiology (মাইক্রোবায়োলজি)',
    other: 'Other Investigations (অন্যান্য)',
};

export default function Index({ labInvestigations, filters = {} }) {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const canCreate = permissions.includes('lab_investigations.create');
    const canUpdate = permissions.includes('lab_investigations.update');
    const canDelete = permissions.includes('lab_investigations.delete');

    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
        category: filters.category || '',
    });

    const [deleteTarget, setDeleteTarget] = useState(null);

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.lab_investigations.index'), { preserveState: true });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.lab_investigations.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Investigation / Test Name',
            accessor: 'name',
            cell: (t) => (
                <div>
                    <div className="font-bold text-gray-900">{t.name}</div>
                    {t.default_instructions && (
                        <div className="text-xs text-gray-500 italic mt-0.5">{t.default_instructions}</div>
                    )}
                </div>
            ),
        },
        {
            header: 'Category',
            accessor: 'category',
            cell: (t) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {CATEGORY_LABELS[t.category] || t.category}
                </span>
            ),
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (t) => <StatusBadge status={t.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (t) => (
                <div className="flex justify-end gap-2 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.lab_investigations.edit', t.id)}
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
                        onClick={() => setDeleteTarget(t)}
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
            <Head title="Diagnostic Lab Investigations" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Diagnostic Lab Investigations (পরীক্ষা-নিরীক্ষা ক্যাটালগ)"
                    description="Standard laboratory and diagnostic investigations: CBC, RBS, Lipid profile, X-ray, USG, and urine analysis."
                    action={
                        canCreate && (
                            <Link
                                href={route('admin.lab_investigations.create')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs"
                            >
                                + Add Investigation
                            </Link>
                        )
                    }
                />

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-xl shadow-2xs border border-gray-100 flex flex-col sm:flex-row gap-3">
                    <form onSubmit={onSearch} className="flex-1 flex gap-2">
                        <input
                            type="text"
                            placeholder="Search tests by name or category..."
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
                        data={labInvestigations.data || []}
                        emptyMessage="No lab investigations found in the catalog."
                    />
                    <div className="p-4 border-t border-gray-100">
                        <Pagination links={labInvestigations.links} />
                    </div>
                </div>

                {deleteTarget && (
                    <ConfirmDialog
                        open={Boolean(deleteTarget)}
                        title="Delete Lab Investigation"
                        message={`Are you sure you want to delete ${deleteTarget.name}?`}
                        confirmLabel="Delete Test"
                        onConfirm={confirmDelete}
                        onCancel={() => setDeleteTarget(null)}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
