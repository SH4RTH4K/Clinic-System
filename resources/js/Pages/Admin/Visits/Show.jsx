import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Show({ visit }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Visit Details</h2>}>
            <Head title="Visit Details" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Patient: {visit.patient.name} ({visit.patient.patient_no} {visit.patient.patient_series})</h3>
                    <div className="space-x-2">
                        <Link href={route('admin.visits.edit', visit.id)} className="bg-gray-200 px-4 py-2 rounded">Edit</Link>
                        <a href={route('admin.visits.pdf', visit.id)} target="_blank" className="bg-purple-600 text-white px-4 py-2 rounded">Print PDF</a>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div><strong>Date:</strong> {new Date(visit.visit_date).toLocaleDateString()}</div>
                    <div><strong>Status:</strong> <span className="capitalize">{visit.status}</span></div>
                    <div><strong>Chief Complaint:</strong> <p>{visit.chief_complaint}</p></div>
                    <div><strong>Symptoms:</strong> {visit.symptoms.map(s => s.name_en).join(', ')}</div>
                </div>

                <h4 className="font-bold mb-2 border-b pb-1">Prescription</h4>
                <table className="w-full text-left mb-6 text-sm border">
                    <thead><tr className="bg-gray-50"><th className="p-2 border">Medicine</th><th className="p-2 border">Dose</th><th className="p-2 border">Timing</th><th className="p-2 border">Duration</th></tr></thead>
                    <tbody>
                        {visit.prescription_items.map(pi => (
                            <tr key={pi.id}>
                                <td className="p-2 border">{pi.medicine?.name}</td>
                                <td className="p-2 border">{pi.dose_qty} {pi.dose_unit} {pi.before_after} meal, {pi.dilution_note}</td>
                                <td className="p-2 border">{pi.timing.join(', ')}</td>
                                <td className="p-2 border">{pi.duration_days} days</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div></div>
        </AuthenticatedLayout>
    );
}