import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const formatDate = (value) => {
    if (!value) return 'Flexible';

    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
};

const formatTime = (value) => value ? String(value).slice(0, 5) : null;

export default function Index({ requests, filters = {} }) {
    const { auth = {}, flash = {} } = usePage().props;
    const can = usePermission();
    const isSuperAdmin = (auth.roles || []).includes('Super Admin');
    const canCreate = isSuperAdmin || can('appointments.create');
    const canUpdate = isSuperAdmin || can('appointments.update');
    const canDelete = isSuperAdmin || can('appointments.delete');
    const canCreatePatient = isSuperAdmin || can('patients.create');
    const canViewPatients = isSuperAdmin || can('patients.view');
    const { data, setData, get } = useForm({ status: filters.status || '' });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [linkTarget, setLinkTarget] = useState(null);

    const onFilter = (event) => {
        event.preventDefault();
        get(route('admin.appointment_requests.index'), { preserveState: true });
    };

    const convertToPatient = (id) => {
        if (canUpdate) {
            router.post(route('admin.appointment_requests.convert', id));
        }
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;

        router.delete(route('admin.appointment_requests.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const confirmLink = () => {
        if (!canUpdate || !canViewPatients || !linkTarget) return;

        router.post(route('admin.appointment_requests.link_patient', linkTarget.id), {
            patient_id: linkTarget.patientId,
        }, {
            preserveScroll: true,
            onSuccess: () => setLinkTarget(null),
        });
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
                    {canUpdate && request.converted_patient_id ? (
                        <span className="whitespace-nowrap rounded bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                            Patient registered
                        </span>
                    ) : canUpdate && canViewPatients && request.existing_patient_match_id ? (
                        <button
                            type="button"
                            onClick={() => setLinkTarget({
                                id: request.id,
                                patientId: request.existing_patient_match_id,
                                name: request.name,
                            })}
                            className="whitespace-nowrap rounded bg-primary-50 px-2.5 py-1 font-medium text-primary-800 transition hover:bg-primary-100"
                        >
                            Link existing patient
                        </button>
                    ) : canUpdate && canViewPatients && request.has_ambiguous_patient_match ? (
                        <span className="max-w-48 text-left text-amber-800" role="status">
                            Multiple patient matches; review before converting
                        </span>
                    ) : canUpdate && canCreatePatient ? (
                        <button
                            type="button"
                            onClick={() => convertToPatient(request.id)}
                            className="whitespace-nowrap rounded bg-primary-50 px-2.5 py-1 font-medium text-primary-800 transition hover:bg-primary-100"
                        >
                            Convert to Patient
                        </button>
                    ) : null}
                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(request)}
                            className="whitespace-nowrap rounded bg-red-50 px-2.5 py-1 font-medium text-red-700 transition hover:bg-red-100"
                        >
                            Delete
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
                    {flash.warning && (
                        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {flash.warning}
                        </div>
                    )}
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

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete appointment request?"
                    message="This removes the request from the active list. Its record and audit history are retained."
                    confirmLabel="Delete"
                    isDestructive
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />

                <ConfirmDialog
                    isOpen={!!linkTarget}
                    title="Link existing patient?"
                    message={linkTarget
                        ? `An exact name and phone match was found for ${linkTarget.name}. Link that existing patient to this request? No new patient record will be created.`
                        : ''}
                    confirmLabel="Link patient"
                    isDestructive={false}
                    onConfirm={confirmLink}
                    onCancel={() => setLinkTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
