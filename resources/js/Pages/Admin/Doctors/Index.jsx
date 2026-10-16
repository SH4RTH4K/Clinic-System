import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ doctors }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Doctors</h2>}>
            <Head title="Doctors" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Doctor List</h3>
                                <p className="text-sm text-gray-500">Add doctor information and upload profile photos for the public Doctors page.</p>
                            </div>
                            <Link href={route('admin.doctors.create')} className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                                Add Doctor
                            </Link>
                        </div>

                        {doctors.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                                No doctors have been added yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left">
                                    <thead>
                                        <tr className="text-sm text-gray-500">
                                            <th className="border-b p-3">Doctor</th>
                                            <th className="border-b p-3">Specialty</th>
                                            <th className="border-b p-3">Contact</th>
                                            <th className="border-b p-3">Order</th>
                                            <th className="border-b p-3">Active</th>
                                            <th className="border-b p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {doctors.map((doctor) => (
                                            <tr key={doctor.id} className="align-top">
                                                <td className="border-b p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
                                                            {doctor.photo_path ? (
                                                                <img src={`/storage/${doctor.photo_path}`} alt={doctor.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                                                                    Photo
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{doctor.name}</div>
                                                            <div className="text-sm text-gray-500">{doctor.credentials || 'No credentials added'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="border-b p-3 text-sm text-gray-700">{doctor.specialty || '-'}</td>
                                                <td className="border-b p-3 text-sm text-gray-700">
                                                    <div>Contact: {doctor.phone || '-'}</div>
                                                    <div className="text-gray-500">Appointment: {doctor.appointment_phone || '-'}</div>
                                                    <div className="text-gray-500">{doctor.email || ''}</div>
                                                </td>
                                                <td className="border-b p-3 text-sm text-gray-700">{doctor.sort_order}</td>
                                                <td className="border-b p-3 text-sm text-gray-700">{doctor.is_active ? 'Yes' : 'No'}</td>
                                                <td className="border-b p-3 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <Link href={route('admin.doctors.edit', doctor.id)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                                                            Edit
                                                        </Link>
                                                        <Link
                                                            href={route('admin.doctors.destroy', doctor.id)}
                                                            method="delete"
                                                            as="button"
                                                            onClick={(event) => {
                                                                if (!confirm('Delete this doctor profile?')) {
                                                                    event.preventDefault();
                                                                }
                                                            }}
                                                            className="text-sm font-semibold text-red-600 hover:text-red-800"
                                                        >
                                                            Delete
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
