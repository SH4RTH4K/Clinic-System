import React from 'react';
import { Head } from '@inertiajs/react';

export default function DigitalPrescription({ visit, clinic, token }) {
    const patient = visit.patient;
    const doctor = visit.doctor;
    const vitals = visit.vital;
    const items = visit.prescription_items || [];
    const advice = visit.advice_items || [];
    const foodRestrictions = visit.food_restrictions || [];
    const labOrders = visit.lab_investigations || [];

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-neutral-100 py-6 px-3 sm:px-6 lg:px-8 font-sans print:bg-white print:p-0 print:m-0">
            <Head title={`Digital Prescription - ${patient?.name || 'Patient'} - ${clinic.name}`} />

            {/* Top Toolbar (Hidden when printing) */}
            <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        Verified Digital Prescription
                    </span>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold border border-neutral-300 shadow-sm transition"
                    >
                        <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>

                    <a
                        href={route('rx.pdf', token)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                    </a>
                </div>
            </div>

            {/* Main Prescription Card (A4 proportioned) */}
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-neutral-200 shadow-lg overflow-hidden print:border-none print:shadow-none print:rounded-none">
                {/* Clinic Header */}
                <header className="p-6 sm:p-8 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-4 border-emerald-500 print:bg-white print:text-neutral-900 print:border-neutral-900 print:p-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{clinic.name}</h1>
                        {clinic.name_bn && (
                            <p className="text-base font-semibold text-emerald-200 print:text-neutral-700 font-bangla">
                                {clinic.name_bn}
                            </p>
                        )}
                        {clinic.address && (
                            <p className="text-xs text-emerald-100 print:text-neutral-500 max-w-md">
                                {clinic.address}
                            </p>
                        )}
                    </div>

                    <div className="text-left sm:text-right text-xs text-emerald-100 print:text-neutral-600 space-y-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-700">
                        {clinic.phone && (
                            <p className="font-mono">Helpline: <strong className="text-white print:text-neutral-900">{clinic.phone}</strong></p>
                        )}
                        <p className="font-mono text-[11px]">Date: {new Date(visit.visit_date).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        <p className="font-mono text-[11px]">Rx ID: #{visit.id}</p>
                    </div>
                </header>

                {/* Doctor & Patient Metadata Row */}
                <div className="p-6 border-b border-neutral-200 bg-neutral-50/70 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Patient Information */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Patient Information</span>
                        <div className="text-base font-bold text-neutral-900">{patient?.name || 'Patient'}</div>
                        <div className="flex flex-wrap gap-x-4 text-neutral-600">
                            {patient?.patient_number && <span>ID: <strong className="text-neutral-800 font-mono">#{patient.patient_number}</strong></span>}
                            {patient?.gender && <span>Gender: <strong className="capitalize text-neutral-800">{patient.gender}</strong></span>}
                            {visit.age_summary && <span>Age: <strong className="text-neutral-800">{visit.age_summary}</strong></span>}
                        </div>
                    </div>

                    {/* Consulting Doctor */}
                    <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Prescribing Physician</span>
                        <div className="text-base font-bold text-neutral-900">{doctor?.name || 'Physician'}</div>
                        {doctor?.credentials && (
                            <p className="text-neutral-600 font-medium">{doctor.credentials}</p>
                        )}
                        {doctor?.specialty && (
                            <p className="text-emerald-700 font-semibold">{doctor.specialty}</p>
                        )}
                        {doctor?.govt_reg_no && (
                            <p className="text-neutral-400 font-mono text-[11px]">Reg: {doctor.govt_reg_no}</p>
                        )}
                    </div>
                </div>

                {/* Vitals Ribbon (If recorded) */}
                {vitals && (
                    <div className="px-6 py-3 bg-emerald-50/50 border-b border-emerald-100 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                        <span className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider">Clinical Vitals:</span>
                        {vitals.bp_systolic && (
                            <span>BP: <strong className="font-mono text-neutral-800">{vitals.bp_systolic}/{vitals.bp_diastolic} mmHg</strong></span>
                        )}
                        {vitals.pulse_rate && (
                            <span>Pulse: <strong className="font-mono text-neutral-800">{vitals.pulse_rate} bpm</strong></span>
                        )}
                        {vitals.temperature_f && (
                            <span>Temp: <strong className="font-mono text-neutral-800">{vitals.temperature_f} °F</strong></span>
                        )}
                        {vitals.weight_kg && (
                            <span>Weight: <strong className="font-mono text-neutral-800">{vitals.weight_kg} kg</strong></span>
                        )}
                        {vitals.bmi && (
                            <span>BMI: <strong className="font-mono text-neutral-800">{vitals.bmi}</strong></span>
                        )}
                        {vitals.blood_sugar_rbs && (
                            <span>RBS: <strong className="font-mono text-neutral-800">{vitals.blood_sugar_rbs} mmol/L</strong></span>
                        )}
                    </div>
                )}

                {/* Diagnoses Banner (If recorded) */}
                {(visit.provisional_diagnosis || visit.final_diagnosis || visit.diagnosis_notes) && (
                    <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200 text-xs flex flex-wrap items-center gap-4">
                        <span className="font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Diagnosis:</span>
                        {visit.final_diagnosis && (
                            <span className="font-bold text-neutral-900 bg-neutral-200/70 px-2.5 py-0.5 rounded">
                                {visit.final_diagnosis}
                            </span>
                        )}
                        {visit.provisional_diagnosis && (
                            <span className="text-neutral-700 italic">
                                Prov: {visit.provisional_diagnosis}
                            </span>
                        )}
                    </div>
                )}

                {/* Prescription Body (Rx) */}
                <div className="p-6 sm:p-8 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 pb-2 border-b-2 border-neutral-900 mb-4">
                            <span className="text-2xl font-serif font-black italic">℞</span>
                            <h2 className="text-sm font-extrabold uppercase tracking-widest text-neutral-800">
                                Medications & Dosage Directions (ঔষধের নির্দেশিকা)
                            </h2>
                        </div>

                        {items.length > 0 ? (
                            <div className="space-y-4">
                                {items.map((item, idx) => {
                                    const isPharma = item.item_type === 'pharmaceutical';
                                    const name = isPharma
                                        ? (item.pharmaceutical?.brand_name || 'Medicine')
                                        : (item.medicine?.name || 'Remedy');
                                    const generic = item.pharmaceutical?.generic_name;
                                    const potency = item.medicine?.potency || item.potency_name;
                                    const form = item.pharmaceutical?.form || item.form || '';
                                    const strength = item.pharmaceutical?.strength || '';

                                    return (
                                        <div key={item.id || idx} className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div className="space-y-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-base font-bold text-neutral-900">{name}</span>
                                                    {potency && (
                                                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-xs font-mono">
                                                            {potency}
                                                        </span>
                                                    )}
                                                    {strength && (
                                                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-xs font-mono">
                                                            {strength}
                                                        </span>
                                                    )}
                                                    {form && (
                                                        <span className="text-xs text-neutral-500 capitalize">({form})</span>
                                                    )}
                                                </div>

                                                {generic && (
                                                    <p className="text-xs text-neutral-500 pl-7 italic">Generic: {generic}</p>
                                                )}

                                                {/* Dosage & Timing directions */}
                                                <div className="pl-7 text-xs text-neutral-700 font-medium space-x-2">
                                                    {item.timing && <span className="font-bold text-emerald-800">{item.timing}</span>}
                                                    {item.meal_relation && <span>• {item.meal_relation}</span>}
                                                    {item.dilution_instruction && <span className="text-neutral-600">({item.dilution_instruction})</span>}
                                                    {item.duration_days && <span className="text-neutral-500 font-mono">— {item.duration_days} days</span>}
                                                </div>
                                            </div>

                                            {item.instructions_bn && (
                                                <div className="text-xs font-bangla text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 max-w-xs">
                                                    {item.instructions_bn}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-neutral-400 py-3 italic">No medications prescribed for this visit.</p>
                        )}
                    </div>

                    {/* Clinical Advice & Dietary Restrictions */}
                    {(advice.length > 0 || foodRestrictions.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
                            {advice.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                        Clinical Advice (উপদেশ)
                                    </h3>
                                    <ul className="space-y-1.5 text-xs text-neutral-700 list-disc list-inside">
                                        {advice.map((adv) => (
                                            <li key={adv.id}>
                                                <span>{adv.text_en || adv.advice_en}</span>
                                                {(adv.text_bn || adv.advice_bn) && <span className="font-bangla block text-neutral-600 pl-4">{adv.text_bn || adv.advice_bn}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {foodRestrictions.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-800">
                                        Dietary Restrictions (খাদ্য নিষেধ)
                                    </h3>
                                    <ul className="space-y-1.5 text-xs text-red-900 list-disc list-inside">
                                        {foodRestrictions.map((food) => (
                                            <li key={food.id}>
                                                <span>{food.text_en || food.restriction_en}</span>
                                                {(food.text_bn || food.restriction_bn) && <span className="font-bangla block text-red-700 pl-4">{food.text_bn || food.restriction_bn}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Diagnostic Investigations Ordered */}
                    {labOrders.length > 0 && (
                        <div className="pt-4 border-t border-neutral-200 space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                Diagnostic Lab Investigations (পরীক্ষা-নিরীক্ষা)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {labOrders.map((order) => (
                                    <span key={order.id} className="px-3 py-1 bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-lg border border-neutral-200">
                                        🔬 {order.lab_investigation?.name || 'Lab Test'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Signature & Verification Block */}
                <footer className="p-6 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
                    <div>
                        <p className="font-semibold text-neutral-700">RemediQ Digital Prescription System</p>
                        <p className="text-[11px] text-neutral-400">Authentic digital document • Generated on {new Date(visit.finalized_at || visit.created_at).toLocaleString()}</p>
                    </div>

                    <div className="text-center sm:text-right">
                        <div className="font-bold text-neutral-900">{doctor?.name}</div>
                        <div className="text-[11px] text-neutral-500">{doctor?.credentials}</div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
