import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Show({ patient }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Patient Details: {patient.name}</h2>}>
            <Head title={`Patient - ${patient.name}`} />
            <div className="py-12 max-w-7xl mx-auto px-4">
                <div className="bg-white p-6 shadow-sm sm:rounded-lg mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Patient Information</h3>
                        <Link href={route('admin.visits.create', { patient_id: patient.id })} className="bg-blue-600 text-white px-4 py-2 rounded">New Visit</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><span className="font-bold">Name:</span> {patient.name}</div>
                        <div><span className="font-bold">Patient No:</span> {patient.patient_no} {patient.patient_series}</div>
                        <div><span className="font-bold">Age/DOB:</span> {patient.age_years || patient.dob}</div>
                        <div><span className="font-bold">Phone:</span> {patient.phone}</div>
                        <div><span className="font-bold">Allergies:</span> {patient.known_allergies || 'None'}</div>
                    </div>
                </div>

                <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                    <h3 className="text-lg font-bold mb-4">Past Visits</h3>
                    {patient.visits && patient.visits.length === 0 ? (
                        <p>No past visits.</p>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b p-2">Date</th>
                                    <th className="border-b p-2">Chief Complaint</th>
                                    <th className="border-b p-2">Status</th>
                                    <th className="border-b p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patient.visits && patient.visits.map(visit => (
                                    <tr key={visit.id}>
                                        <td className="border-b p-2">{visit.visit_date}</td>
                                        <td className="border-b p-2">{visit.chief_complaint}</td>
                                        <td className="border-b p-2 capitalize">{visit.status}</td>
                                        <td className="border-b p-2">
                                            <Link href={route('admin.visits.show', visit.id)} className="text-blue-600">View</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
