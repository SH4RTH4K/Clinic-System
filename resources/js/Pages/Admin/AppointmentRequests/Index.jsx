import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import { Head, useForm, router } from '@inertiajs/react';

export default function Index({ requests, filters = {} }) {
    const { data, setData, get } = useForm({ status: filters.status || '' });

    const onFilter = (e) => {
        e.preventDefault();
        get(route('admin.appointment_requests.index'), { preserveState: true });
    };

    const updateStatus = (id, newStatus) => {
        router.put(
            route('admin.appointment_requests.update', id),
            { status: newStatus },
            { preserveScroll: true }
        );
    };

    const convertToPatient = (id) => {
        router.post(route('admin.appointment_requests.convert', id));
    };

    const columns = [
        {
            header: 'Submitted',
            accessor: 'created_at',
            cell: (req) => (
                <span className="text-xs font-mono text-gray-500 whitespace-nowrap">
                    {new Date(req.created_at).toLocaleDateString()}
                </span>
            ),
        },
        {
            header: 'Patient Name',
            accessor: 'name',
            cell: (req) => <span className="font-semibold text-gray-900">{req.name}</span>,
        },
        {
            header: 'Phone',
            accessor: 'phone',
            cell: (req) => <span className="text-xs font-mono text-gray-700">{req.phone}</span>,
        },
        {
            header: 'Pref. Date',
            accessor: 'preferred_date',
            cell: (req) => (
                <span className="text-xs text-gray-600">
                    {req.preferred_date ? new Date(req.preferred_date).toLocaleDateString() : 'Flexible'}
                </span>
            ),
        },
        {
            header: 'Message / Notes',
            accessor: 'message',
            cell: (req) => (
                <p className="text-xs text-gray-600 max-w-xs truncate" title={req.message}>
                    {req.message || '—'}
                </p>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (req) => (
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={req.status} />
                    <select
                        value={req.status}
                        onChange={(e) => updateStatus(req.id, e.target.value)}
                        className="text-[11px] py-0.5 px-1.5 rounded border-gray-300 text-gray-700 focus:border-primary-500 focus:ring-primary-500 bg-white"
                    >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (req) => (
                <div className="flex justify-end gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => convertToPatient(req.id)}
                        className="px-2.5 py-1 text-primary-800 bg-primary-50 hover:bg-primary-100 rounded font-medium transition shadow-xs"
                    >
                        Convert to Patient
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Appointment Requests" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Appointment Requests"
                    subtitle="Manage incoming patient consultation requests from the public website"
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4 space-y-4">
                    <form onSubmit={onFilter} className="flex max-w-xs gap-2">
                        <select
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className="flex-1 rounded-md border-gray-300 shadow-sm text-xs focus:border-primary-500 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                            type="submit"
                            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition"
                        >
                            Filter
                        </button>
                    </form>

                    <DataTable
                        columns={columns}
                        data={requests.data}
                        keyExtractor={(r) => r.id}
                        emptyMessage="No appointment requests found."
                    />

                    {requests.links && <Pagination links={requests.links} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
