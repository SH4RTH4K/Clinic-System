import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatAgeSummary } from './ageHelpers';
import { getGuardianRelationshipLabel } from './relationshipHelpers';

export default function Show({ patient, relationshipOptions = [] }) {
    const can = usePermission();
    const canViewClinicalRecords = can('clinical_records.view');
    const canVisitView = canViewClinicalRecords && can('visits.view');
    const canVisitExport = can('visits.export');
    const canPatientUpdate = can('patients.update');
    const canVisitCreate = can('visits.create');
    const canViewAttachments = can('attachments.view') || canViewClinicalRecords;
    const canCreateAttachments = can('attachments.create');
    const canDeleteAttachments = can('attachments.delete');

    const [showUploadModal, setShowUploadModal] = useState(false);
    const {
        data: attachData,
        setData: setAttachData,
        post: postAttachment,
        processing: uploadingAttachment,
        errors: attachErrors,
        reset: resetAttachment,
    } = useForm({
        title: '',
        category: 'other',
        file: null,
        notes: '',
    });

    const handleUploadAttachment = (e) => {
        e.preventDefault();
        postAttachment(route('admin.patients.attachments.store', patient.id), {
            forceFormData: true,
            onSuccess: () => {
                setShowUploadModal(false);
                resetAttachment();
            },
        });
    };

    const handleDeleteAttachment = (attachmentId) => {
        if (!confirm('Are you sure you want to permanently delete this diagnostic report / file attachment?')) {
            return;
        }
        router.delete(route('admin.attachments.destroy', attachmentId), {
            preserveScroll: true,
        });
    };

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
                    {canVisitView ? (
                        <Link href={route('admin.visits.show', v.id)} className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition">
                            View Visit
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-primary-700 bg-primary-50 rounded font-medium cursor-not-allowed opacity-50">View Visit</button>
                    )}
                    {canVisitExport ? (
                        <a href={route('admin.visits.pdf', v.id)} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition">
                            PDF
                        </a>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-gray-700 bg-gray-100 rounded font-medium cursor-not-allowed opacity-50">PDF</button>
                    )}
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
                    subtitle={`Patient ID: ${patient.patient_identifier || `${patient.patient_no}${patient.patient_series || ''}`} • Registered: ${new Date(patient.created_at).toLocaleDateString()}`}
                    actions={
                        <div className="flex gap-2">
                            <Link
                                href={route('admin.queue.tokens.create', { patient_id: patient.id })}
                                className="px-3.5 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                Issue Queue Token
                            </Link>
                            <Link
                                href={route('admin.patients.opd_card', patient.id)}
                                className="px-3.5 py-2 border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
                                    <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
                                </svg>
                                Print OPD Card
                            </Link>
                            {canPatientUpdate ? <Link
                                href={route('admin.patients.edit', patient.id)}
                                className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                Edit Patient
                            </Link> : <button type="button" disabled className="px-3.5 py-2 border border-gray-300 bg-white text-gray-700 text-xs font-semibold rounded-md shadow-xs cursor-not-allowed opacity-50">Edit Patient</button>}
                            {canVisitCreate ? <Link
                                href={route('admin.visits.create', { patient_id: patient.id })}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                + New Visit / Prescription
                            </Link> : <button type="button" disabled className="px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-md shadow-xs cursor-not-allowed opacity-50">+ New Visit / Prescription</button>}
                        </div>
                    }
                />

                {/* Patient Summary Card */}
                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-2">
                        Patient Information &amp; Demographics
                    </h3>

                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                        <div className="w-24 h-28 rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                            {patient.photo_url ? (
                                <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-2 text-gray-400">
                                    <svg className="w-8 h-8 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="text-[10px] uppercase font-semibold">No Photo</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                            <div className="space-y-2">
                                <div><span className="text-gray-400 font-medium">Full Name:</span> <strong className="text-gray-900 block text-sm">{patient.name}</strong></div>
                                <div><span className="text-gray-400 font-medium">Old/Other ID:</span> <span className="font-mono text-gray-800 block">{patient.old_or_other_id || '—'}</span></div>
                                <div><span className="text-gray-400 font-medium">Reference Number:</span> <span className="text-gray-800 block">{patient.reference_number || '—'}</span></div>
                                <div><span className="text-gray-400 font-medium">{getGuardianRelationshipLabel(patient.guardian_relationship, patient.guardian_relationship_custom, relationshipOptions) || 'Guardian / Spouse'} Name:</span> <span className="text-gray-800 block">{patient.guardian_name || '—'}</span></div>
                                <div><span className="text-gray-400 font-medium">Gender:</span> <span className="text-gray-800 capitalize block">{patient.gender}</span></div>
                            </div>

                            <div className="space-y-2">
                                <div><span className="text-gray-400 font-medium">Age / Date of Birth:</span> <span className="text-gray-800 block">{formatAgeSummary(patient.age_years, patient.age_months, patient.age_days)} {patient.dob ? `(${patient.dob})` : ''}</span></div>
                                <div><span className="text-gray-400 font-medium">Mobile Phone:</span> <span className="font-mono text-gray-900 block">{patient.phone || '—'}</span></div>
                                {canViewClinicalRecords && <div><span className="text-gray-400 font-medium">Blood Group:</span> <span className="text-gray-800 font-semibold block">{patient.blood_group || 'Unknown'}</span></div>}
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-400 font-medium">Residential Address:</span>
                                    <p className="text-gray-800 font-medium mt-0.5 whitespace-pre-wrap">{patient.address || 'No address recorded'}</p>
                                </div>
                                {canViewClinicalRecords && <div>
                                    <span className="text-gray-400 font-medium">Known Allergies:</span>
                                    <p className="text-gray-800 mt-0.5">{patient.known_allergies || 'None reported'}</p>
                                </div>}
                                {canViewClinicalRecords && <div>
                                    <span className="text-gray-400 font-medium">Medical History (অতীত চিকিৎসা ইতিহাস):</span>
                                    <p className="text-gray-800 mt-0.5 whitespace-pre-wrap">{patient.medical_history || 'No chronic or surgical history recorded'}</p>
                                </div>}
                                <div>
                                    <span className="text-gray-400 font-medium">Referred By:</span>
                                    <span className="text-gray-800 block">{patient.referred_by || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vitals History */}
                {patient.vitals_history && patient.vitals_history.length > 0 && (
                    <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span>🩺</span> Longitudinal Vitals &amp; Biometrics History ({patient.vitals_history.length})
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">BP (mmHg)</th>
                                        <th className="p-3">Pulse</th>
                                        <th className="p-3">Temp (°F)</th>
                                        <th className="p-3">Weight (kg)</th>
                                        <th className="p-3">BMI</th>
                                        <th className="p-3">SpO2</th>
                                        <th className="p-3">Sugar RBS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {patient.vitals_history.map((vital) => (
                                        <tr key={vital.id} className="hover:bg-gray-50/50">
                                            <td className="p-3 text-gray-500 font-mono">
                                                {new Date(vital.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3 font-bold text-gray-900">
                                                {vital.bp_systolic && vital.bp_diastolic ? `${vital.bp_systolic}/${vital.bp_diastolic}` : '—'}
                                            </td>
                                            <td className="p-3 text-gray-700">{vital.pulse_rate ? `${vital.pulse_rate} bpm` : '—'}</td>
                                            <td className="p-3 text-gray-700">{vital.temperature_f ? `${vital.temperature_f}°F` : '—'}</td>
                                            <td className="p-3 font-semibold text-gray-800">{vital.weight_kg ? `${vital.weight_kg} kg` : '—'}</td>
                                            <td className="p-3 text-gray-700">{vital.bmi ? `${vital.bmi}` : '—'}</td>
                                            <td className="p-3 text-gray-700">{vital.spo2 ? `${vital.spo2}%` : '—'}</td>
                                            <td className="p-3 text-gray-700">{vital.blood_sugar_rbs ? `${vital.blood_sugar_rbs} mmol/L` : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Diagnostic Reports & Medical Attachments */}
                {canViewAttachments && (
                    <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                    Diagnostic Reports &amp; Medical Attachments ({patient.attachments?.length || 0})
                                </h3>
                            </div>
                            {canCreateAttachments && (
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(true)}
                                    className="inline-flex items-center px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-md shadow-xs transition"
                                >
                                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Upload Report
                                </button>
                            )}
                        </div>

                        {patient.attachments && patient.attachments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {patient.attachments.map((att) => (
                                    <div
                                        key={att.id}
                                        className="border border-gray-200 rounded-lg p-3 hover:border-teal-400 transition bg-gray-50/40 flex flex-col justify-between space-y-2"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-xs font-bold text-gray-900 truncate flex-1" title={att.title}>
                                                    {att.title}
                                                </h4>
                                                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-100 text-teal-800">
                                                    {att.category.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate" title={att.file_name}>
                                                <svg className="w-3 h-3 inline mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                {att.file_name} ({att.file_size_formatted})
                                            </p>
                                            {att.notes && (
                                                <p className="text-[11px] text-gray-600 mt-1 italic line-clamp-2">
                                                    "{att.notes}"
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                            <span>{att.created_at}</span>
                                            <div className="flex items-center space-x-1">
                                                <a
                                                    href={att.view_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="View in browser"
                                                    className="p-1 hover:text-teal-600 text-gray-600 transition"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </a>
                                                <a
                                                    href={att.download_url}
                                                    title="Download file"
                                                    className="p-1 hover:text-teal-600 text-gray-600 transition"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </a>
                                                {canDeleteAttachments && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAttachment(att.id)}
                                                        title="Delete attachment"
                                                        className="p-1 hover:text-red-600 text-gray-400 transition"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400">
                                <svg className="w-8 h-8 mx-auto mb-1 opacity-30 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                No diagnostic reports or attachments uploaded for this patient yet.
                            </div>
                        )}
                    </div>
                )}

                {canVisitView && (
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
                )}
            </div>

            {/* Upload Diagnostic Report Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center space-x-2 text-gray-900 font-semibold">
                                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span>Upload Diagnostic Report / Medical File</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    resetAttachment();
                                }}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleUploadAttachment} className="p-5 space-y-4 text-xs">
                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">
                                    Report Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={attachData.title}
                                    onChange={(e) => setAttachData('title', e.target.value)}
                                    placeholder="e.g. Complete Blood Count (CBC), Chest X-Ray"
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                />
                                {attachErrors.title && <p className="mt-1 text-red-600">{attachErrors.title}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-gray-700 font-semibold mb-1">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={attachData.category}
                                        onChange={(e) => setAttachData('category', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        <option value="blood_test">Blood Test / Pathology</option>
                                        <option value="x_ray">X-Ray Imaging</option>
                                        <option value="usg">Ultrasonography (USG)</option>
                                        <option value="mri">MRI / CT Scan</option>
                                        <option value="prescription">External Prescription</option>
                                        <option value="discharge_summary">Discharge Summary</option>
                                        <option value="other">Other Medical Report</option>
                                    </select>
                                    {attachErrors.category && <p className="mt-1 text-red-600">{attachErrors.category}</p>}
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-semibold mb-1">
                                        Select File <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        required
                                        accept="application/pdf,image/jpeg,image/png,image/webp"
                                        onChange={(e) => setAttachData('file', e.target.files?.[0] || null)}
                                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                    />
                                    {attachErrors.file && <p className="mt-1 text-red-600">{attachErrors.file}</p>}
                                    <p className="text-[10px] text-gray-400 mt-1">PDF, JPG, PNG, WEBP up to 10MB</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">
                                    Clinical Notes / Impressions (Optional)
                                </label>
                                <textarea
                                    rows="3"
                                    value={attachData.notes}
                                    onChange={(e) => setAttachData('notes', e.target.value)}
                                    placeholder="Doctor or technician summary / findings"
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-sm focus:border-teal-500 focus:ring-teal-500"
                                />
                                {attachErrors.notes && <p className="mt-1 text-red-600">{attachErrors.notes}</p>}
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        resetAttachment();
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploadingAttachment}
                                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition"
                                >
                                    {uploadingAttachment ? 'Uploading...' : 'Save & Attach Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
