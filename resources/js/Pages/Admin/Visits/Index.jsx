import DataTable from '@/Components/DataTable';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import StatusBadge from '@/Components/StatusBadge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ visits }) {
    const columns = [
        {
            key: 'visit_date',
            label: 'Date',
            render: (v) => (
                <span className="font-medium text-gray-900">
                    {v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'N/A'}
                </span>
            ),
        },
        {
            key: 'patient',
            label: 'Patient',
            render: (v) => (
                <div>
                    <span className="font-semibold text-gray-900">{v.patient?.name}</span>
                    <span className="ml-2 font-mono text-xs text-gray-500">
                        ({v.patient?.patient_no} {v.patient?.patient_series})
                    </span>
                </div>
            ),
        },
        {
            key: 'doctor',
            label: 'Doctor',
            render: (v) => (
                <span className="text-xs text-gray-700">
                    {v.doctor?.name ?? 'Dr. Fazlul Karim'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (v) => <StatusBadge status={v.status} />,
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (v) => (
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={route('admin.visits.show', v.id)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition"
                    >
                        View
                    </Link>
                    <Link
                        href={route('admin.visits.edit', v.id)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition"
                    >
                        Edit
                    </Link>
                    <a
                        href={route('admin.visits.pdf', v.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition"
                    >
                        <span>PDF</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout header="Visits">
            <Head title="Visits" />

            <div className="mx-auto max-w-7xl">
                <PageHeader
                    title="Visits"
                    subtitle="Track clinical encounters, prescriptions and patient consultations"
                    actions={
                        <Link href={route('admin.visits.create')}>
                            <PrimaryButton className="gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>New Visit</span>
                            </PrimaryButton>
                        </Link>
                    }
                />

                <DataTable
                    columns={columns}
                    data={visits.data || []}
                    emptyMessage="No clinical visits recorded yet."
                />

                <Pagination links={visits.links} />
            </div>
        </AuthenticatedLayout>
    );
}
