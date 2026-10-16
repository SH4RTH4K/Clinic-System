import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import StatusBadge from '@/Components/StatusBadge';
import { formatAgeSummary } from '@/Utils/ageHelpers';
import { Head, Link } from '@inertiajs/react';

export default function Show({ visit }) {
    const timingMap = {
        morning: 'সকাল (Morning)',
        noon: 'দুপুর (Noon)',
        afternoon: 'বিকাল (Afternoon)',
        night: 'রাত (Night)',
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Visit #${visit.id} - ${visit.patient?.name}`} />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Visit #${visit.id} – ${visit.patient?.name}`}
                    subtitle={`Patient ID: ${visit.patient?.patient_no}${visit.patient?.patient_series || ''} • Visit Date: ${visit.visit_date}`}
                    action={
                        <div className="flex gap-2">
                            <Link
                                href={route('admin.visits.edit', visit.id)}
                                className="px-3.5 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold shadow-xs transition"
                            >
                                Edit Visit
                            </Link>
                            <a
                                href={route('admin.visits.pdf', visit.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                            >
                                🖨 Print / Download PDF
                            </a>
                        </div>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
                    {/* Clinical Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-50/50 border-b border-gray-200 text-xs p-4">
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Status</span>
                            <StatusBadge status={visit.status} />
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Treating Doctor</span>
                            <p className="font-semibold text-gray-800">
                                {visit.doctor ? `${visit.doctor.name} (${visit.doctor.credentials || ''})` : 'Clinic Doctor'}
                            </p>
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Patient Info</span>
                            <p className="font-medium text-gray-800">
                                {visit.patient?.gender}, Age at visit: {visit.age_summary || formatAgeSummary(visit.age_at_visit, visit.age_months, visit.age_days)}
                            </p>
                        </div>
                        <div className="py-2 md:py-0 md:px-3">
                            <span className="text-gray-400 font-medium block mb-1">Follow-up Date</span>
                            <p className="font-medium text-gray-800">
                                {visit.follow_up_date || 'None scheduled'}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
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
                                        {visit.prescription_items?.map((pi, idx) => (
                                            <tr key={pi.id || idx} className="hover:bg-gray-50/50">
                                                <td className="p-3 font-semibold text-gray-400">{idx + 1}</td>
                                                <td className="p-3 font-bold text-gray-900">
                                                    {pi.medicine?.name} {pi.medicine?.potency && <span className="font-normal text-gray-500">({pi.medicine.potency})</span>}
                                                </td>
                                                <td className="p-3">
                                                    {(pi.timing || []).map(t => timingMap[t] || t).join(', ')}
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-medium">{pi.dose_qty} {pi.dose_unit}</span> ({pi.before_after === 'before' ? 'খাওয়ার আগে / Before' : 'খাওয়ার পরে / After'})
                                                </td>
                                                <td className="p-3 text-gray-600">{pi.dilution_note || '—'}</td>
                                                <td className="p-3">{pi.duration_days ? `${pi.duration_days} days` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

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