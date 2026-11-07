import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';

const formatDate = (value) => {
    if (!value) return 'Flexible';

    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
};

const formatTime = (value) => value ? String(value).slice(0, 5) : null;

export default function Index({ requests, filters = {} }) {
    const { auth = {} } = usePage().props;
    const can = usePermission();
    const isSuperAdmin = (auth.roles || []).includes('Super Admin');
    const canCreate = isSuperAdmin || can('appointments.create');
    const canUpdate = isSuperAdmin || can('appointments.update');
    const { data, setData, get } = useForm({ status: filters.status || '' });

    const onFilter = (event) => {
        event.preventDefault();
        get(route('admin.appointment_requests.index'), { preserveState: true });
    };

    const convertToPatient = (id) => {
        if (canUpdate) {
            router.post(route('admin.appointment_requests.convert', id));
        }
    };

    const columns = [
        {
            header: 'Submitted',
            accessor: 'created_at',
            cell: (request) => (
                <span className="whitespace-nowrap text-xs font-mono text-gray-500">
                    {new Date(request.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            header: 'Patient Name',
            accessor: 'name',
            cell: (request) => <span className="font-semibold text-gray-900">{request.name}</span>,
        },
        {
            header: 'Phone',
            accessor: 'phone',
            cell: (request) => <span className="whitespace-nowrap text-xs font-mono text-gray-700">{request.phone}</span>,
        },
        {
            header: 'Requested Slot',
            accessor: 'preferred_date',
            cell: (request) => (
                <span className="whitespace-nowrap text-xs text-gray-600">
                    {formatDate(request.preferred_date)}{formatTime(request.preferred_time) ? ` · ${formatTime(request.preferred_time)}` : ''}
                </span>
            ),
        },
        {
            header: 'Confirmed Slot',
            accessor: 'scheduled_date',
            cell: (request) => (
                <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                    {request.scheduled_date
                        ? `${formatDate(request.scheduled_date)}${formatTime(request.scheduled_time) ? ` · ${formatTime(request.scheduled_time)}` : ''}`
                        : 'Not scheduled'}
                </span>
            ),
        },
        {
            header: 'Source / Created By',
            accessor: 'source',
            cell: (request) => (
                <div className="text-xs text-gray-600">
                    <div className="font-medium text-gray-800">{request.source === 'walk_in' ? 'Walk-in' : request.source === 'phone' ? 'Phone' : 'Website'}</div>
                    <div>{request.creator?.name || (request.source === 'website' ? 'Patient submission' : 'Unknown staff account')}</div>
                </div>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (request) => <StatusBadge status={request.status} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (request) => (
                <div className="flex flex-wrap justify-end gap-2 text-xs">
                    {canUpdate && (
                        <Link
                            href={route('admin.appointment_requests.edit', request.id)}
                            className="whitespace-nowrap rounded bg-primary-50 px-2.5 py-1 font-medium text-primary-800 transition hover:bg-primary-100"
                        >
                            {request.status === 'scheduled' ? 'Manage / Reschedule' : 'Manage / Schedule'}
                        </Link>
                    )}
                    {canUpdate && (
                        <button
                            type="button"
                            onClick={() => convertToPatient(request.id)}
                            className="whitespace-nowrap rounded bg-primary-50 px-2.5 py-1 font-medium text-primary-800 transition hover:bg-primary-100"
                        >
                            Convert to Patient
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Appointment Requests" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title="Appointment Requests"
                    subtitle="Manage website, phone, and walk-in appointment requests. Scheduling records an agreed slot; it does not check Doctor availability automatically."
                    actions={canCreate ? (
                        <Link
                            href={route('admin.appointment_requests.create')}
                            className="rounded-md bg-primary-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-800"
                        >
                            Record Appointment
                        </Link>
                    ) : null}
                />

                <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xs">
                    <form onSubmit={onFilter} className="flex max-w-sm gap-2">
                        <label className="sr-only" htmlFor="appointment-status-filter">Filter appointment requests by status</label>
                        <select
                            id="appointment-status-filter"
                            value={data.status}
                            onChange={(event) => setData('status', event.target.value)}
                            className="flex-1 rounded-md border-gray-300 text-xs shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button type="submit" className="rounded-md bg-gray-100 px-3.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-200">
                            Filter
                        </button>
                    </form>

                    <DataTable
                        columns={columns}
                        data={requests.data}
                        keyExtractor={(request) => request.id}
                        emptyMessage="No appointment requests found."
                    />

                    {requests.links && <Pagination links={requests.links} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
