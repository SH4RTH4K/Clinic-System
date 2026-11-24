import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Create({ doctors, patients, selectedPatient, defaultDoctorId, appointmentRequestId, todayActiveTokens = {} }) {
    const [isWalkIn, setIsWalkIn] = useState(!selectedPatient);
    const activeTokenToday = data.patient_id ? todayActiveTokens[data.patient_id] : null;

    const { data, setData, post, processing, errors } = useForm({
        patient_id: selectedPatient?.id || '',
        patient_name: selectedPatient?.name || '',
        patient_phone: selectedPatient?.phone || '',
        doctor_id: defaultDoctorId || (doctors[0]?.id || ''),
        service_room: 'Chamber 1',
        priority: 'normal',
        appointment_request_id: appointmentRequestId || '',
        notes: '',
    });

    const handleDoctorChange = (e) => {
        const docId = e.target.value;
        const doctor = doctors.find((d) => String(d.id) === String(docId));
        setData((prev) => ({
            ...prev,
            doctor_id: docId,
            service_room: doctor?.schedules?.[0]?.chamber_no || prev.service_room || 'Chamber 1',
        }));
    };

    const handlePatientSelect = (e) => {
        const pId = e.target.value;
        const patient = patients.find((p) => String(p.id) === String(pId));
        if (patient) {
            setData((prev) => ({
                ...prev,
                patient_id: patient.id,
                patient_name: patient.name,
                patient_phone: patient.phone || '',
            }));
        } else {
            setData((prev) => ({
                ...prev,
                patient_id: '',
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.queue.tokens.store'));
    };

    return (
        <AuthenticatedLayout header="Issue Waiting Room Queue Token">
            <Head title="Issue Queue Token" />

            <div className="py-6 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8">
                    <div className="mb-6 pb-4 border-b border-neutral-200 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">Issue Patient Token / টোকেন ইস্যু</h2>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                Add patient to today's waiting room queue for consultation.
                            </p>
                        </div>
                        <Link
                            href={route('admin.queue.index')}
                            className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
                        >
                            Back to Queue
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Patient Mode Toggle */}
                        <div>
                            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                                Patient Type / রোগীর ধরন
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWalkIn(false);
                                    }}
                                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                                        !isWalkIn
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                                            : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Registered Patient
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsWalkIn(true);
                                        setData((prev) => ({ ...prev, patient_id: '' }));
                                    }}
                                    className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                                        isWalkIn
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                                            : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                    </svg>
                                    Walk-in Guest / New
                                </button>
                            </div>
                        </div>

                        {/* Patient Selection / Name Field */}
                        {!isWalkIn ? (
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                                    Select Patient <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.patient_id}
                                    onChange={handlePatientSelect}
                                    className="w-full rounded-xl border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">-- Choose Existing Patient --</option>
                                    {patients.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.patient_number ? `[${p.patient_number}] ` : ''}{p.name} ({p.phone || 'No phone'})
                                        </option>
                                    ))}
                                </select>
                                {errors.patient_id && (
                                    <p className="mt-1 text-xs text-red-600">{errors.patient_id}</p>
                                )}
                                {activeTokenToday && (
                                    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                                        <span className="text-base">⚠️</span>
                                        <div>
                                            <p className="font-bold">Active Token Already Issued Today / আজকের টোকেন ইতিমধ্যে বিদ্যমান</p>
                                            <p className="mt-0.5 text-amber-800">
                                                Patient holds Token <span className="font-mono font-bold">#{activeTokenToday.token_number}</span> ({activeTokenToday.token_code}) in status <span className="font-bold uppercase">{activeTokenToday.status}</span>. Avoid issuing duplicate tokens.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                                        Patient Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.patient_name}
                                        onChange={(e) => setData('patient_name', e.target.value)}
                                        placeholder="e.g. Md. Rafiqul Islam"
                                        className="w-full rounded-xl border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                    {errors.patient_name && (
                                        <p className="mt-1 text-xs text-red-600">{errors.patient_name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                                        Mobile Phone (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.patient_phone}
                                        onChange={(e) => setData('patient_phone', e.target.value)}
                                        placeholder="0171XXXXXXX"
                                        className="w-full rounded-xl border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 font-mono"
                                    />
                                    {errors.patient_phone && (
                                        <p className="mt-1 text-xs text-red-600">{errors.patient_phone}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Doctor and Chamber */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                                    Assigned Doctor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.doctor_id}
                                    onChange={handleDoctorChange}
                                    className="w-full rounded-xl border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} - {doc.specialty || 'General'}
                                        </option>
                                    ))}
                                </select>
                                {errors.doctor_id && (
                                    <p className="mt-1 text-xs text-red-600">{errors.doctor_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                                    Chamber / Room No.
                                </label>
                                <input
                                    type="text"
                                    value={data.service_room}
                                    onChange={(e) => setData('service_room', e.target.value)}
                                    placeholder="e.g. Chamber 1"
                                    className="w-full rounded-xl border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                {errors.service_room && (
                                    <p className="mt-1 text-xs text-red-600">{errors.service_room}</p>
                                )}
                            </div>
                        </div>

                        {/* Priority Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2">
                                Priority Level
                            </label>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="normal"
                                        checked={data.priority === 'normal'}
                                        onChange={() => setData('priority', 'normal')}
                                        className="text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-neutral-800">Normal (সাধারণ)</span>
                                </label>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="urgent"
                                        checked={data.priority === 'urgent'}
                                        onChange={() => setData('priority', 'urgent')}
                                        className="text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-bold text-red-700">Urgent / Emergency (জরুরি)</span>
                                </label>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                                Internal Notes (Optional)
                            </label>
                            <textarea
                                rows={2}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="e.g. Follow-up consultation, severe headache..."
                                className="w-full rounded-xl border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
                            <Link
                                href={route('admin.queue.index')}
                                className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition"
                            >
                                {processing ? 'Issuing Token...' : 'Issue Token & Print Slip'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
