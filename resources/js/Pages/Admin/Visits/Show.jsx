import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import StatusBadge from '@/Components/StatusBadge';
import usePermission from '@/Components/usePermission';
import { formatAgeSummary } from '@/Utils/ageHelpers';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

const getPrescriptionDetails = (item) => {
    const snapshot = item.prescription_snapshot || {};
    const directions = snapshot.directions || {};

    return {
        name: snapshot.medicine_name || item.medicine?.name || 'Medicine',
        potency: snapshot.potency || item.medicine?.potency || '',
        formulation: snapshot.formulation || item.medicine?.form || '',
        authorizer: snapshot.authorizer || null,
        timing: directions.timing || item.timing || [],
        doseQty: directions.dose_qty ?? item.dose_qty,
        doseUnit: directions.dose_unit || item.dose_unit,
        beforeAfter: directions.before_after || item.before_after,
        instruction: directions.dilution_note ?? item.dilution_note,
        duration: directions.duration_days ?? item.duration_days,
    };
};

export default function Show({ visit, prescriptionHistory = [], canCancelPrescription: isCancellationAuthorized = false }) {
    const can = usePermission();
    const canUpdate = visit.status === 'draft' && can('visits.update');
    const canAmend = visit.status === 'finalized' && can('visits.amend');
    const canPrintPrescription = can('visits.export')
        && visit.status === 'finalized'
        && ['finalized', 'amended'].includes(visit.prescription_status);
    const canCancelPrescription = isCancellationAuthorized && ['finalized', 'amended'].includes(visit.prescription_status);
    const [showCancellationForm, setShowCancellationForm] = useState(false);
    const { data: cancellationData, setData: setCancellationData, post: postCancellation, processing: cancelling, errors: cancellationErrors } = useForm({ reason: '' });
    const originalPrescriberSnapshot = visit.prescriber_snapshot || {};
    const prescriberSnapshot = visit.prescription_authorizer_snapshot || visit.prescriber_snapshot || {};
    const patientSnapshot = visit.patient_snapshot || {};
    const patientName = patientSnapshot.name || visit.patient?.name;
    const patientIdentifier = patientSnapshot.patient_identifier || visit.patient?.patient_identifier || `${visit.patient?.patient_no}${visit.patient?.patient_series || ''}`;
    const timingMap = {
        morning: 'সকাল (Morning)',
        noon: 'দুপুর (Noon)',
        afternoon: 'বিকাল (Afternoon)',
        night: 'রাত (Night)',
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Visit #${visit.id} - ${patientName}`} />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Visit #${visit.id} – ${patientName}`}
                    subtitle={`Patient ID: ${patientIdentifier} • Visit Date: ${visit.visit_date}`}
                    actions={
                        <div className="flex gap-2">
                            {canUpdate || canAmend ? <Link
                                href={route('admin.visits.edit', visit.id)}
                                className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold shadow-xs transition"
                            >
                                Edit Visit
                            </Link> : <button type="button" disabled className="px-3.5 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-xs font-semibold shadow-xs cursor-not-allowed opacity-50">Edit Visit</button>}
                            {canPrintPrescription ? <a
                                href={route('admin.visits.pdf', visit.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                            >
                                🖨 Print / Download PDF
                            </a> : <button type="button" disabled className="px-4 py-2 bg-primary-600 text-white rounded-md text-xs font-semibold shadow-xs opacity-50 cursor-not-allowed">Print / Download PDF</button>}
                            {['finalized', 'amended'].includes(visit.prescription_status) && (canCancelPrescription ? <button type="button" onClick={() => setShowCancellationForm((visible) => !visible)} className="px-3.5 py-2 border border-red-200 bg-white text-red-700 rounded-md text-xs font-semibold">Cancel Prescription</button> : <button type="button" disabled className="px-3.5 py-2 border border-red-200 bg-white text-red-700 rounded-md text-xs font-semibold opacity-50 cursor-not-allowed">Cancel Prescription</button>)}
                        </div>
                    }
                />

                {showCancellationForm && canCancelPrescription && (
                    <form onSubmit={(event) => { event.preventDefault(); postCancellation(route('admin.visits.cancel_prescription', visit.id), { onSuccess: () => setShowCancellationForm(false) }); }} className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                        <label htmlFor="prescription-cancellation-reason" className="block text-sm font-semibold text-red-900">Why is this prescription being cancelled?</label>
                        <textarea id="prescription-cancellation-reason" value={cancellationData.reason} onChange={(event) => setCancellationData('reason', event.target.value)} minLength={10} maxLength={2000} required rows={3} className="w-full rounded-md border-gray-300 text-sm" />
                        {cancellationErrors.reason && <p className="text-sm text-red-700">{cancellationErrors.reason}</p>}
                        <div className="flex gap-2">
                            <button type="submit" disabled={cancelling} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{cancelling ? 'Cancelling...' : 'Confirm cancellation'}</button>
                            <button type="button" onClick={() => setShowCancellationForm(false)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">Keep prescription</button>
                        </div>
                    </form>
                )}

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
                    {/* Clinical Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-50/50 border-b border-gray-200 text-xs p-4">
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Status</span>
                            <StatusBadge status={visit.status} />
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Prescription status</span>
                            <p className="font-semibold capitalize text-gray-800">{visit.prescription_status || visit.status}</p>
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Treating Doctor</span>
                            <p className="font-semibold text-gray-800">
                                {prescriberSnapshot.doctor_name || (visit.doctor ? `${visit.doctor.name} (${visit.doctor.credentials || ''})` : 'Clinic Doctor')}
                            </p>
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Patient Info</span>
                            <p className="font-medium text-gray-800">
                                {patientSnapshot.gender || visit.patient?.gender}, Age at visit: {visit.age_summary || formatAgeSummary(visit.age_at_visit, visit.age_months, visit.age_days)}
                            </p>
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Follow-up Date</span>
                            <p className="font-medium text-gray-800">
                                {visit.follow_up_date || 'None scheduled'}
                            </p>
                        </div>
                    </div>

                    {visit.status === 'finalized' && (
                        <div className="border-b border-gray-200 bg-sky-50 px-6 py-4 text-sm text-gray-700">
                            <span className="font-semibold">Finalized by:</span>{' '}
                            {originalPrescriberSnapshot.authorized_by_name || visit.finalized_by?.name || 'Prescriber'}
                            {' · '}
                            {visit.finalized_at || 'Finalization time unavailable for this legacy record'}
                        </div>
                    )}

                    {visit.prescription_status === 'cancelled' && (
                        <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm text-red-900">
                            <span className="font-semibold">Prescription cancelled</span>{' '}
                            {visit.cancelled_by?.name || 'Authorized staff'} · {visit.cancelled_at}
                        </div>
                    )}

                    <div className="p-6 space-y-6">
                        {visit.amendments?.length > 0 && (
                            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">Amendment history</h4>
                                <div className="mt-3 space-y-3">
                                    {visit.amendments.map((amendment) => (
                                        <article key={amendment.id} className="border-t border-amber-200 pt-3 text-sm text-gray-700">
                                            <p>{amendment.reason}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {amendment.amended_by?.name || 'Staff'} · {amendment.created_at}
                                                {amendment.amended_by_doctor?.name && ` · Dr. ${amendment.amended_by_doctor.name}`}
                                                {amendment.changed_fields?.length > 0 && ` · Changed: ${amendment.changed_fields.join(', ')}`}
                                            </p>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Chief complaint & Clinical notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Chief Complaint</h4>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{visit.chief_complaint}</p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Clinical / BP Notes</h4>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{visit.bp_symptoms_notes || 'No notes recorded.'}</p>
                            </div>
                        </div>

                        {/* Symptoms */}
                        {visit.symptoms && visit.symptoms.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Tagged Symptoms</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {visit.symptoms.map(s => (
                                        <span key={s.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-800 border border-primary-200">
                                            {s.name_en} {s.name_bn && `(${s.name_bn})`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prescribed Medicines */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Prescription (Rx)</h4>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Medicine &amp; Potency</th>
                                            <th className="p-3">Timing (খাওয়ার সময়)</th>
                                            <th className="p-3">Meal &amp; Dose</th>
                                            <th className="p-3">Instructions</th>
                                            <th className="p-3">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {visit.prescription_items?.map((pi, idx) => {
                                            const details = getPrescriptionDetails(pi);

                                            return (
                                            <tr key={pi.id || idx} className="hover:bg-gray-50/50">
                                                <td className="p-3 font-semibold text-gray-400">{idx + 1}</td>
                                                <td className="p-3 font-bold text-gray-900">
                                                    {details.name} {details.potency && <span className="font-normal text-gray-500">({details.potency})</span>} {details.formulation && <span className="font-normal text-gray-500">· {details.formulation}</span>}
                                                </td>
                                                <td className="p-3">
                                                    {details.timing.map(t => timingMap[t] || t).join(', ')}
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-medium">{details.doseQty} {details.doseUnit}</span> ({details.beforeAfter === 'before' ? 'খাওয়ার আগে / Before' : 'খাওয়ার পরে / After'})
                                                </td>
                                                <td className="p-3 text-gray-600">{details.instruction || '—'}</td>
                                                <td className="p-3">{details.duration ? `${details.duration} days` : '—'}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {prescriptionHistory.some((item) => item.deleted_at) && (
                            <details className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <summary className="cursor-pointer text-sm font-semibold text-gray-700">Previous prescription versions</summary>
                                <div className="mt-3 space-y-2">
                                    {prescriptionHistory.filter((item) => item.deleted_at).map((item) => {
                                        const details = getPrescriptionDetails(item);

                                        return (
                                            <div key={item.id} className="rounded border border-gray-200 bg-white p-3 text-sm">
                                                <p className="font-semibold text-gray-800">Version {item.prescription_version}: {details.name} {details.potency} {details.formulation}</p>
                                                <p className="mt-1 text-gray-600">{details.doseQty} {details.doseUnit} · {details.timing.join(', ')} · {details.beforeAfter} meal · {details.instruction || 'No additional instruction'} · {details.duration ? `${details.duration} days` : 'Duration not set'}</p>
                                                <p className="mt-1 text-xs text-gray-400">Saved {item.created_at}{details.authorizer?.authorized_by_name ? ` · Authorized by ${details.authorizer.authorized_by_name} (${details.authorizer.doctor_name})` : ' · Historical authorizer not recorded'}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        )}

                        {/* Advice & Restrictions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Advice (উপদেশ)</h4>
                                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                    {visit.advice_items?.map(a => (
                                        <li key={a.id}>{a.text_bn || a.text_en}</li>
                                    ))}
                                    {(!visit.advice_items || visit.advice_items.length === 0) && <li className="text-gray-400 list-none">None</li>}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Food Restrictions (খাদ্য নিষেধ)</h4>
                                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                    {visit.food_restrictions?.map(f => (
                                        <li key={f.id}>{f.text_bn || f.text_en}</li>
                                    ))}
                                    {(!visit.food_restrictions || visit.food_restrictions.length === 0) && <li className="text-gray-400 list-none">None</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
