import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, useForm } from '@inertiajs/react';

export default function Index({ visits, filters = {} }) {
    const { data, setData, get, processing } = useForm({
        start_date: filters.start_date || '',
        end_date: filters.end_date || '',
    });

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.reports.index'), { preserveState: true });
    };

    const visitList = visits.data || (Array.isArray(visits) ? visits : []);

    const columns = [
        {
            header: 'Visit Date',
            accessor: 'visit_date',
            cell: (v) => <span className="font-medium text-gray-900">{v.visit_date}</span>,
        },
        {
            header: 'Patient',
            accessor: 'patient.name',
            cell: (v) => (
                <div>
                    <div className="font-semibold text-gray-900">{v.patient?.name || 'Unknown'}</div>
                    <div className="text-xs text-primary-700 font-mono">
                        {v.patient?.patient_no}{v.patient?.patient_series}
                    </div>
                </div>
            ),
        },
        {
            header: 'Contact Phone',
            accessor: 'patient.phone',
            cell: (v) => <span className="text-xs text-gray-600">{v.patient?.phone || '—'}</span>,
        },
        {
            header: 'Chief Complaint',
            accessor: 'chief_complaint',
            cell: (v) => (
                <p className="text-xs text-gray-700 line-clamp-2 max-w-md">
                    {v.chief_complaint}
                </p>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (v) => <StatusBadge status={v.status} />,
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Clinical Reports" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Clinical Reports"
                    subtitle="Filter and analyze patient visit records, diagnoses, and clinic activity"
                    action={
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-semibold transition inline-flex items-center gap-1.5"
                        >
                            🖨 Print Report
                        </button>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-5 space-y-4">
                    <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3 pb-4 border-b border-gray-100">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">From Date</label>
                            <input
                                type="date"
                                value={data.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                className="rounded-md border-gray-300 shadow-sm text-xs focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">To Date</label>
                            <input
                                type="date"
                                value={data.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                className="rounded-md border-gray-300 shadow-sm text-xs focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-semibold shadow-xs transition"
                        >
                            Filter Visits
                        </button>
                    </form>

                    <DataTable
                        columns={columns}
                        data={visitList}
                        keyExtractor={(v) => v.id}
                        emptyMessage="No clinical visits found in the selected date range."
                    />

                    {visits.links && <Pagination links={visits.links} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
