import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { Head, useForm } from '@inertiajs/react';

export default function Index({ logs, filters = {} }) {
    const { data, setData, get, processing } = useForm({ search: filters.search || '' });

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.activity_logs.index'), { preserveState: true });
    };

    const columns = [
        {
            header: 'Timestamp',
            accessor: 'created_at',
            cell: (log) => (
                <span className="text-xs font-mono text-gray-600 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                </span>
            ),
        },
        {
            header: 'Actor',
            accessor: 'causer.name',
            cell: (log) => (
                <span className="font-medium text-xs text-gray-900">
                    {log.causer?.name || 'System / Automated'}
                </span>
            ),
        },
        {
            header: 'Action / Event',
            accessor: 'description',
            cell: (log) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 capitalize">
                    {log.description}
                </span>
            ),
        },
        {
            header: 'Access outcome',
            accessor: 'properties.authorization_outcome',
            cell: (log) => {
                if (log.log_name !== 'clinical_access') return <span className="text-xs text-gray-400">—</span>;
                const allowed = log.properties?.authorization_outcome === 'allowed';
                return (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${allowed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {allowed ? 'Allowed' : 'Denied'}
                    </span>
                );
            },
        },
        {
            header: 'Clinical record IDs',
            accessor: 'properties.visit_id',
            cell: (log) => {
                const patientId = log.properties?.patient_id;
                const visitId = log.properties?.visit_id;
                const references = [
                    patientId ? `Patient #${patientId}` : null,
                    visitId ? `Visit #${visitId}` : null,
                ].filter(Boolean);
                return <span className="font-mono text-xs text-gray-600">{references.join(' · ') || '—'}</span>;
            },
        },
        {
            header: 'Target Model',
            accessor: 'subject_type',
            cell: (log) => {
                const modelName = log.subject_type ? log.subject_type.split('\\').pop() : '—';
                return <span className="font-mono text-xs text-gray-700">{modelName}</span>;
            },
        },
        {
            header: 'Subject ID',
            accessor: 'subject_id',
            cell: (log) => <span className="font-mono text-xs text-gray-500">#{log.subject_id || '—'}</span>,
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="System Audit Logs" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="System Audit &amp; Activity Logs"
                    subtitle="Immutable tamper-evident audit records of clinical changes and administrative operations"
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-4">
                    <form onSubmit={onSearch} className="flex max-w-md gap-2">
                        <input
                            type="text"
                            aria-label="Search activity logs"
                            value={data.search}
                            onChange={(e) => setData('search', e.target.value)}
                            placeholder="Search log descriptions..."
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
                        data={logs.data}
                        keyExtractor={(l) => l.id}
                        isLoading={processing}
                        emptyMessage="No audit log entries found."
                    />

                    {logs.links && <Pagination links={logs.links} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
