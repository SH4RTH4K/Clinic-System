import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ doctors = [] }) {
    const [deleteTarget, setDeleteTarget] = useState(null);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('admin.doctors.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Doctor Profile',
            accessor: 'name',
            cell: (doctor) => (
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                        {doctor.photo_path ? (
                            <img
                                src={`/storage/${doctor.photo_path}`}
                                alt={doctor.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-400 bg-gray-100">
                                {(doctor.name || 'D').charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{doctor.name}</div>
                        <div className="text-xs text-gray-500">{doctor.credentials || 'No credentials added'}</div>
                        {doctor.govt_reg_no && (
                            <div className="text-[11px] text-primary-700 font-mono">Reg: {doctor.govt_reg_no}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: 'Specialty',
            accessor: 'specialty',
            cell: (doctor) => (
                <div>
                    <span className="text-xs text-gray-800">{doctor.specialty || '—'}</span>
                    {doctor.specialty_bn && <div className="text-[11px] text-gray-500">{doctor.specialty_bn}</div>}
                </div>
            ),
        },
        {
            header: 'Contact Info',
            accessor: 'phone',
            cell: (doctor) => (
                <div className="text-xs text-gray-700 space-y-0.5">
                    {doctor.phone && <div>Direct: {doctor.phone}</div>}
                    {doctor.appointment_phone && (
                        <div className="text-gray-500">Appt: {doctor.appointment_phone}</div>
                    )}
                    {doctor.email && <div className="text-gray-400">{doctor.email}</div>}
                </div>
            ),
        },
        {
            header: 'Sort Order',
            accessor: 'sort_order',
            cell: (doctor) => <span className="text-xs font-mono">{doctor.sort_order ?? 0}</span>,
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (doctor) => <StatusBadge status={doctor.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (doctor) => (
                <div className="flex justify-end gap-2 text-xs">
                    <Link
                        href={route('admin.doctors.edit', doctor.id)}
                        className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                    >
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(doctor)}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded font-medium transition"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Doctors" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Doctors"
                    subtitle="Manage clinic physicians, qualifications, chamber contact, and public profiles"
                    action={
                        <Link
                            href={route('admin.doctors.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + Add Doctor
                        </Link>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4">
                    <DataTable
                        columns={columns}
                        data={doctors}
                        keyExtractor={(d) => d.id}
                        emptyMessage="No doctors have been added yet."
                    />
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Doctor Profile"
                    message={`Are you sure you want to delete the profile for "${deleteTarget?.name}"?`}
                    confirmLabel="Delete"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
