import ConfirmDialog from '@/Components/ConfirmDialog';
import DataTable from '@/Components/DataTable';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatAgeSummary } from './ageHelpers';

export default function Index({ patients, filters = {} }) {
    const { data, setData, get } = useForm({
        search: filters.search || '',
    });

    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.patients.index'), { preserveState: true });
    };

    const confirmDelete = () => {
        if (!deleteId) return;
        setIsDeleting(true);
        router.delete(route('admin.patients.destroy', deleteId), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeleteId(null);
            },
        });
    };

    const columns = [
        {
            key: 'patient_no',
            label: 'Patient ID',
            render: (p) => (
                <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {p.patient_no} {p.patient_series}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            render: (p) => (
                <div>
                    <span className="font-semibold text-gray-900">{p.name}</span>
                    {p.guardian_name && (
                        <span className="block text-xs text-gray-500">C/O {p.guardian_name}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (p) => (
                <span className="text-sm text-gray-700">{p.phone || '—'}</span>
            ),
        },
        {
            key: 'age_gender',
            label: 'Age / Gender',
            render: (p) => (
                <span className="text-sm text-gray-700">
                    {formatAgeSummary(p.age_years, p.age_months, p.age_days) || p.dob || '—'}
                    {p.gender ? ` (${ucFirst(p.gender)})` : ''}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (p) => (
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={route('admin.patients.show', p.id)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition"
                    >
                        View
                    </Link>
                    <Link
                        href={route('admin.patients.edit', p.id)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition"
                    >
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteId(p.id)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    function ucFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return (
        <AuthenticatedLayout header="Patients">
            <Head title="Patients" />

            <div className="mx-auto max-w-7xl">
                <PageHeader
                    title="Patients"
                    subtitle="Register and manage patient health records"
                    actions={
                        <Link href={route('admin.patients.create')}>
                            <PrimaryButton className="gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>New Patient</span>
                            </PrimaryButton>
                        </Link>
                    }
                />

                {/* Search Bar */}
                <div className="mb-4">
                    <form onSubmit={onSearch} className="flex max-w-md gap-2">
                        <TextInput
                            type="text"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Search by name, phone or patient ID..."
                            className="w-full text-sm"
                        />
                        <button
                            type="submit"
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                        >
                            Search
                        </button>
                    </form>
                </div>

                <DataTable
                    columns={columns}
                    data={patients.data || []}
                    emptyMessage="No patients found matching the criteria."
                />

                <Pagination links={patients.links} />

                {/* Accessible Confirmation Dialog */}
                <ConfirmDialog
                    show={Boolean(deleteId)}
                    title="Delete Patient"
                    message="Are you sure you want to delete this patient record? This action will safely archive the patient record."
                    confirmLabel="Delete Patient"
                    isLoading={isDeleting}
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteId(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
