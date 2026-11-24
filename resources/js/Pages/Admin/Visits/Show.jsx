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
    const isPharma = (snapshot.item_type || item.item_type) === 'pharmaceutical'
        || Boolean(item.pharmaceutical_id)
        || Boolean(snapshot.brand_name)
        || Boolean(item.brand_name);

    if (isPharma) {
        const brand = snapshot.brand_name || item.brand_name || item.pharmaceutical?.brand_name || 'Drug';
        const generic = snapshot.generic_name || item.generic_name || item.pharmaceutical?.generic_name || '';
        const strength = snapshot.strength || item.strength || item.pharmaceutical?.strength || '';
        const dosageForm = snapshot.dosage_form || item.dosage_form || item.pharmaceutical?.dosage_form || 'Tab.';

        return {
            name: `${dosageForm} ${brand}`,
            potency: strength,
            formulation: generic ? `(${generic})` : '',
            authorizer: snapshot.authorizer || null,
            timing: directions.timing || item.timing || [],
            doseQty: directions.dose_qty ?? item.dose_qty,
            doseUnit: directions.dose_unit || item.dose_unit,
            beforeAfter: directions.before_after || item.before_after,
            instruction: directions.dilution_note ?? item.dilution_note,
            duration: directions.duration_days ?? item.duration_days,
            isPharma: true,
        };
    }

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
        isPharma: false,
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
    const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const handleWhatsAppShare = async () => {
        setSharingWhatsApp(true);
        try {
            const response = await fetch(route('admin.visits.whatsapp_url', visit.id));
            const data = await response.json();
            if (data.url) {
                window.open(data.url, '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSharingWhatsApp(false);
        }
    };

    const handleCopyLink = () => {
        const url = visit.share_url || `${window.location.origin}/rx/${visit.share_token}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

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
                            {can('billing.create') && (
                                <Link
                                    href={route('admin.invoices.create', { visit_id: visit.id, patient_id: visit.patient_id })}
                                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                                >
                                    <span>🧾</span> Bill Patient (বিল তৈরি)
                                </Link>
                            )}
                            {canUpdate || canAmend ? <Link
                                href={route('admin.visits.edit', visit.id)}
                                className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold shadow-xs transition"
                            >
                                Edit Visit
                            </Link> : <button type="button" disabled className="px-3.5 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-xs font-semibold shadow-xs cursor-not-allowed opacity-50">Edit Visit</button>}
                            {canPrintPrescription ? (
                                <div className="inline-flex items-center gap-2">
                                    <a
                                        href={route('admin.visits.pdf', visit.id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                                    >
                                        🖨 Print Official PDF
                                    </a>
                                    <a
                                        href={`${route('admin.visits.pdf', visit.id)}?pre_printed=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Print on official pre-printed letterhead pad with blank header"
                                        className="px-3 py-2 border border-primary-300 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                                    >
                                        📄 Pre-Printed Pad Mode
                                    </a>
                                </div>
                            ) : <button type="button" disabled className="px-4 py-2 bg-primary-600 text-white rounded-md text-xs font-semibold shadow-xs opacity-50 cursor-not-allowed">Print / Download PDF</button>}
                            {['finalized', 'amended'].includes(visit.prescription_status) && (
                                <div className="inline-flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleWhatsAppShare}
                                        disabled={sharingWhatsApp}
                                        title="Send digital prescription link directly via WhatsApp"
                                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                                        </svg>
                                        {sharingWhatsApp ? 'Loading...' : 'WhatsApp Share'}
                                    </button>
                                    <a
                                        href={`/rx/${visit.share_token}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open mobile digital prescription in new tab"
                                        className="px-3 py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1"
                                    >
                                        📱 Digital Rx
                                    </a>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        title="Copy public prescription link"
                                        className="px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold shadow-xs transition"
                                    >
                                        {copiedLink ? 'Copied ✓' : '🔗 Copy Link'}
                                    </button>
                                </div>
                            )}
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

                        {/* Diagnoses */}
                        {(visit.final_diagnosis || visit.provisional_diagnosis || visit.diagnosis_notes) && (
                            <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                    <span>🩺</span> Clinical Diagnosis &amp; Assessment
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    {visit.final_diagnosis && (
                                        <div>
                                            <span className="text-gray-500 font-semibold block">Final Diagnosis:</span>
                                            <p className="font-bold text-gray-900 text-sm mt-0.5">{visit.final_diagnosis}</p>
                                        </div>
                                    )}
                                    {visit.provisional_diagnosis && (
                                        <div>
                                            <span className="text-gray-500 font-semibold block">Provisional Diagnosis:</span>
                                            <p className="font-medium text-gray-800 text-sm mt-0.5">{visit.provisional_diagnosis}</p>
                                        </div>
                                    )}
                                </div>
                                {visit.diagnosis_notes && (
                                    <div className="pt-2 border-t border-emerald-100/60 text-xs text-gray-700">
                                        <span className="font-semibold text-gray-500">Clinical Notes: </span>
                                        {visit.diagnosis_notes}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Universal Clinical Vitals */}
                        {visit.vital && (
                            <div className="p-4 bg-cyan-50/40 rounded-xl border border-cyan-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-950 flex items-center gap-1.5">
                                        <span>🩺</span> Recorded Clinical Vitals
                                    </h4>
                                    <span className="text-[11px] text-cyan-700 font-medium">শারীরিক ভাইটালস</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                                    {visit.vital.bp_systolic && visit.vital.bp_diastolic && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Blood Pressure</span>
                                            <span className="font-bold text-gray-900 text-sm">
                                                {visit.vital.bp_systolic}/{visit.vital.bp_diastolic}
                                            </span>
                                            <span className="text-gray-500 text-[10px] ml-1">mmHg</span>
                                            {visit.vital.blood_pressure_category && (
                                                <span className="block mt-0.5 text-[10px] text-cyan-700 font-semibold">
                                                    {visit.vital.blood_pressure_category}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {visit.vital.pulse_rate && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Pulse Rate</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.pulse_rate}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">bpm</span>
                                        </div>
                                    )}
                                    {visit.vital.temperature_f && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Temperature</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.temperature_f}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">°F</span>
                                        </div>
                                    )}
                                    {visit.vital.weight_kg && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Weight</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.weight_kg}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">kg</span>
                                        </div>
                                    )}
                                    {visit.vital.height_cm && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Height</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.height_cm}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">cm</span>
                                        </div>
                                    )}
                                    {visit.vital.bmi && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">BMI</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.bmi}</span>
                                            {visit.vital.bmi_category && (
                                                <span className="block mt-0.5 text-[10px] text-cyan-700 font-semibold">
                                                    {visit.vital.bmi_category}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {visit.vital.spo2 && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">SpO2</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.spo2}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">%</span>
                                        </div>
                                    )}
                                    {visit.vital.blood_sugar_rbs && (
                                        <div className="bg-white p-2.5 rounded-lg border border-cyan-100 shadow-2xs">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Blood Sugar (RBS)</span>
                                            <span className="font-bold text-gray-900 text-sm">{visit.vital.blood_sugar_rbs}</span>
                                            <span className="text-gray-500 text-[10px] ml-1">mmol/L</span>
                                        </div>
                                    )}
                                </div>
                                {visit.vital.notes && (
                                    <p className="text-xs text-gray-600 bg-white p-2 rounded-lg border border-cyan-100">
                                        <span className="font-semibold text-gray-500">Vitals Note: </span>
                                        {visit.vital.notes}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Physical Generals */}
                        {visit.physical_generals && Object.values(visit.physical_generals).some((v) => v && (Array.isArray(v) ? v.length > 0 : true)) && (
                            <div className="p-4 bg-purple-50/40 rounded-xl border border-purple-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                                        <span>🌿</span> Homeopathic Physical Generals
                                    </h4>
                                    <span className="text-[11px] text-purple-700 font-medium">ধাতুগত বৈশিষ্ট্য</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                    {visit.physical_generals.thermal_state && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Thermal State</span>
                                            <span className="font-bold text-purple-900 uppercase">
                                                {visit.physical_generals.thermal_state === 'chilly' && '❄️ Chilly (শীতকাতর)'}
                                                {visit.physical_generals.thermal_state === 'hot' && '🔥 Hot (উষ্ণকাতর)'}
                                                {visit.physical_generals.thermal_state === 'ambithermal' && '⚖️ Ambithermal (উভয়কাতর)'}
                                            </span>
                                        </div>
                                    )}
                                    {visit.physical_generals.thirst && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Thirst</span>
                                            <span className="font-medium text-gray-800">{visit.physical_generals.thirst}</span>
                                        </div>
                                    )}
                                    {visit.physical_generals.tongue && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Tongue</span>
                                            <span className="font-medium text-gray-800">{visit.physical_generals.tongue}</span>
                                        </div>
                                    )}
                                    {visit.physical_generals.sweat && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase">Sweat</span>
                                            <span className="font-medium text-gray-800">{visit.physical_generals.sweat}</span>
                                        </div>
                                    )}
                                    {visit.physical_generals.food_cravings?.length > 0 && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100 sm:col-span-2">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase mb-1">Cravings / Desires</span>
                                            <div className="flex flex-wrap gap-1">
                                                {visit.physical_generals.food_cravings.map((c, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded font-medium text-[11px] border border-purple-200">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {visit.physical_generals.food_aversions?.length > 0 && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100 sm:col-span-2">
                                            <span className="text-gray-400 block text-[10px] font-bold uppercase mb-1">Aversions</span>
                                            <div className="flex flex-wrap gap-1">
                                                {visit.physical_generals.food_aversions.map((a, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded font-medium text-[11px] border border-rose-200">
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {visit.physical_generals.modalities_aggravation && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100 sm:col-span-3">
                                            <span className="text-red-700 block text-[10px] font-bold uppercase">&lt; Aggravation (কিসে রোগ বাড়ে)</span>
                                            <p className="font-medium text-gray-800 mt-0.5">{visit.physical_generals.modalities_aggravation}</p>
                                        </div>
                                    )}
                                    {visit.physical_generals.modalities_amelioration && (
                                        <div className="bg-white p-2.5 rounded-lg border border-purple-100 sm:col-span-3">
                                            <span className="text-emerald-700 block text-[10px] font-bold uppercase">&gt; Amelioration (কিসে রোগ কমে)</span>
                                            <p className="font-medium text-gray-800 mt-0.5">{visit.physical_generals.modalities_amelioration}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lab Investigations Ordered */}
                        {visit.lab_investigations && visit.lab_investigations.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                                    <span>🧪</span> Advised Lab &amp; Diagnostic Investigations
                                </h4>
                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="p-3">#</th>
                                                <th className="p-3">Investigation Name</th>
                                                <th className="p-3">Instructions / Preparation</th>
                                                <th className="p-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {visit.lab_investigations.map((lab, idx) => (
                                                <tr key={lab.id || idx} className="hover:bg-gray-50/50">
                                                    <td className="p-3 text-gray-400 font-semibold">{idx + 1}</td>
                                                    <td className="p-3 font-bold text-gray-900">{lab.test_name}</td>
                                                    <td className="p-3 text-gray-600">{lab.instructions || 'Routine'}</td>
                                                    <td className="p-3">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                                                            {lab.status || 'ordered'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

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
