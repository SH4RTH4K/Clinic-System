import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link } from '@inertiajs/react';
import { formatAgeSummary } from './ageHelpers';

export default function Show({ patient }) {
    const visitColumns = [
        {
            header: 'Visit Date',
            accessor: 'visit_date',
            cell: (v) => <span className="font-semibold text-gray-900">{v.visit_date}</span>,
        },
        {
            header: 'Chief Complaint',
            accessor: 'chief_complaint',
            cell: (v) => <p className="text-xs text-gray-700 line-clamp-2 max-w-md">{v.chief_complaint}</p>,
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (v) => <StatusBadge status={v.status} />,
        },
        {
            header: 'Prescribed Medicines',
            accessor: 'prescription_items',
            cell: (v) => (
                <div className="text-xs text-gray-600">
                    {v.prescription_items?.map((p, i) => (
                        <span key={p.id || i} className="inline-block mr-1.5 font-medium text-primary-800">
                            {p.medicine?.name}{i < v.prescription_items.length - 1 ? ',' : ''}
                        </span>
                    ))}
                    {(!v.prescription_items || v.prescription_items.length === 0) && (
                        <span className="text-gray-400">No medicines</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (v) => (
                <div className="flex justify-end gap-2 text-xs">
                    <Link
                        href={route('admin.visits.show', v.id)}
                        className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                    >
                        View Visit
                    </Link>
                    <a
                        href={route('admin.visits.pdf', v.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition"
                    >
                        PDF
                    </a>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title={`Patient Record - ${patient.name}`} />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Patient: ${patient.name}`}
                    subtitle={`Patient ID: ${patient.patient_no}${patient.patient_series || ''} • Registered: ${new Date(patient.created_at).toLocaleDateString()}`}
                    action={
                        <div className="flex gap-2">
                            <Link
                                href={route('admin.patients.edit', patient.id)}
                                className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                Edit Patient
                            </Link>
                            <Link
                                href={route('admin.visits.create', { patient_id: patient.id })}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                + New Visit / Prescription
                            </Link>
                        </div>
                    }
                />

                {/* Patient Summary Card */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
                        Patient Information &amp; Demographics
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        <div className="space-y-2">
                            <div><span className="text-gray-400 font-medium">Full Name:</span> <strong className="text-gray-900 block text-sm">{patient.name}</strong></div>
                            <div><span className="text-gray-400 font-medium">Guardian / Spouse:</span> <span className="text-gray-800 block">{patient.guardian_name || '—'}</span></div>
                            <div><span className="text-gray-400 font-medium">Gender:</span> <span className="text-gray-800 capitalize block">{patient.gender}</span></div>
                        </div>

                        <div className="space-y-2">
                            <div><span className="text-gray-400 font-medium">Age / Date of Birth:</span> <span className="text-gray-800 block">{formatAgeSummary(patient.age_years, patient.age_months, patient.age_days)} {patient.dob ? `(${patient.dob})` : ''}</span></div>
                            <div><span className="text-gray-400 font-medium">Mobile Phone:</span> <span className="font-mono text-gray-900 block">{patient.phone || '—'}</span></div>
                            <div><span className="text-gray-400 font-medium">Blood Group:</span> <span className="text-gray-800 font-semibold block">{patient.blood_group || 'Unknown'}</span></div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <span className="text-gray-400 font-medium">Residential Address:</span>
                                <p className="text-gray-800 font-medium mt-0.5 whitespace-pre-wrap">{patient.address || 'No address recorded'}</p>
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium">Known Allergies:</span>
                                <p className="text-gray-800 mt-0.5">{patient.known_allergies || 'None reported'}</p>
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium">Referred By:</span>
                                <span className="text-gray-800 block">{patient.referred_by || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Past Visits Table */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                            Consultation History &amp; Prescriptions ({patient.visits?.length || 0})
                        </h3>
                    </div>

                    <DataTable
                        columns={visitColumns}
                        data={patient.visits || []}
                        keyExtractor={(v) => v.id}
                        emptyMessage="No consultation visits recorded for this patient yet."
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
