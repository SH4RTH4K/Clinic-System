import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Workbench({
    doctors,
    selectedDoctor,
    currentCalling,
    currentConsultation,
    waitingList,
    completedList,
    todayDate,
}) {
    const handleDoctorChange = (e) => {
        router.get(route('admin.queue.workbench'), { doctor_id: e.target.value }, { preserveState: true });
    };

    const handleCallNext = () => {
        if (waitingList.length === 0) return;
        const nextToken = waitingList[0];
        router.post(route('admin.queue.tokens.call', nextToken.id), {}, { preserveScroll: true });
    };

    const handleRecall = (token) => {
        router.post(route('admin.queue.tokens.recall', token.id), {}, { preserveScroll: true });
    };

    const handleStartConsultation = (token) => {
        router.post(route('admin.queue.tokens.start_consultation', token.id), {}, { preserveScroll: true });
    };

    const handleComplete = (token) => {
        router.post(route('admin.queue.tokens.complete', token.id), {}, { preserveScroll: true });
    };

    const handleSkip = (token) => {
        router.post(route('admin.queue.tokens.skip', token.id), {}, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header="Doctor Chamber Queue Workbench">
            <Head title="Doctor Queue Workbench" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-neutral-900">
                                {selectedDoctor ? selectedDoctor.name : 'Chamber Workbench'}
                            </h2>
                            <p className="text-xs text-neutral-500">
                                {selectedDoctor?.specialty || 'General Practice & Homeopathy'} • Date: {todayDate}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {doctors.length > 1 && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-neutral-600">Switch Doctor:</label>
                                <select
                                    value={selectedDoctor?.id || ''}
                                    onChange={handleDoctorChange}
                                    className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                                >
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <Link
                            href={route('admin.queue.display', selectedDoctor ? { doctor_id: selectedDoctor.id } : {})}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium border border-neutral-300 transition"
                        >
                            <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            TV Display
                        </Link>
                    </div>
                </div>

                {/* Primary Action Hero Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Calling Box */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-emerald-200 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <h3 className="text-base font-bold text-emerald-950 uppercase tracking-wide">
                                        Currently Calling (চলতি ডাক)
                                    </h3>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                    Outside Chamber
                                </span>
                            </div>

                            {currentCalling ? (
                                <div className="text-center py-4 space-y-3">
                                    <div className="inline-block bg-white px-8 py-4 rounded-2xl border-2 border-emerald-500 shadow-md">
                                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Token Code</span>
                                        <span className="text-5xl font-black text-emerald-700 font-mono tracking-wider block">
                                            {currentCalling.token_code}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-2xl font-bold text-neutral-900">{currentCalling.patient_name}</p>
                                        {currentCalling.patient_phone && (
                                            <p className="text-xs text-neutral-500 font-mono mt-0.5">{currentCalling.patient_phone}</p>
                                        )}
                                        <p className="text-xs text-emerald-700 font-medium mt-1">
                                            Called at: {new Date(currentCalling.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-neutral-400 space-y-2">
                                    <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    <p className="font-medium text-neutral-600">No patient currently called</p>
                                    <p className="text-xs">Click "Call Next Patient" to summon the next patient in queue.</p>
                                </div>
                            )}
                        </div>

                        {/* Calling Controls */}
                        <div className="pt-4 border-t border-emerald-200 flex items-center gap-3">
                            {currentCalling ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleRecall(currentCalling)}
                                        className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-1.5"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Recall / Re-Announce
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleStartConsultation(currentCalling)}
                                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-1.5"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Patient Entered Chamber
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSkip(currentCalling)}
                                        className="px-3 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl font-medium text-xs transition"
                                        title="Skip patient"
                                    >
                                        Skip
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    disabled={waitingList.length === 0}
                                    onClick={handleCallNext}
                                    className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl font-extrabold text-base shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                    </svg>
                                    Call Next Patient ({waitingList.length} Waiting)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active In Consultation Box */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                                    <h3 className="text-base font-bold text-neutral-900 uppercase tracking-wide">
                                        Inside Chamber (চিকিৎসাধীন)
                                    </h3>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-100 text-teal-800 rounded-full">
                                    In Consultation
                                </span>
                            </div>

                            {currentConsultation ? (
                                <div className="py-2 space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-200 rounded-xl">
                                        <div>
                                            <span className="text-xs font-mono font-bold text-teal-700 uppercase">Token Code</span>
                                            <div className="text-3xl font-black text-teal-900 font-mono">{currentConsultation.token_code}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-semibold text-neutral-500 uppercase">Started At</span>
                                            <div className="text-sm font-bold text-neutral-800">
                                                {new Date(currentConsultation.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Patient Name</p>
                                        <p className="text-xl font-bold text-neutral-900">{currentConsultation.patient_name}</p>
                                        {currentConsultation.patient_phone && (
                                            <p className="text-sm font-mono text-neutral-600">Mobile: {currentConsultation.patient_phone}</p>
                                        )}
                                    </div>

                                    {/* Action to create visit / open prescription */}
                                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                        <Link
                                            href={
                                                currentConsultation.patient_id
                                                    ? route('admin.visits.create', { patient_id: currentConsultation.patient_id, token_id: currentConsultation.id })
                                                    : route('admin.patients.create')
                                            }
                                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Open Prescription Builder
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => handleComplete(currentConsultation)}
                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            Mark Finished
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-neutral-400 space-y-2">
                                    <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="font-medium text-neutral-600">No patient in consultation right now</p>
                                    <p className="text-xs">Once called patient enters the room, click "Patient Entered Chamber".</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-neutral-200 text-xs text-neutral-500 flex justify-between">
                            <span>Completed Today: <strong className="text-neutral-900">{completedList.length}</strong></span>
                            <span>Remaining in Queue: <strong className="text-neutral-900">{waitingList.length}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Waiting List Queue Table */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-neutral-900">
                                Waiting Room Queue ({waitingList.length})
                            </h3>
                        </div>
                        <Link
                            href={route('admin.queue.tokens.create', selectedDoctor ? { doctor_id: selectedDoctor.id } : {})}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                            + Issue New Token
                        </Link>
                    </div>

                    {waitingList.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200 text-sm">
                                <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-3 text-left">#</th>
                                        <th className="px-6 py-3 text-left">Token</th>
                                        <th className="px-6 py-3 text-left">Patient</th>
                                        <th className="px-6 py-3 text-left">Priority</th>
                                        <th className="px-6 py-3 text-left">Time Issued</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200">
                                    {waitingList.map((token, index) => (
                                        <tr key={token.id} className="hover:bg-neutral-50 transition">
                                            <td className="px-6 py-3.5 text-neutral-400 font-mono text-xs">{index + 1}</td>
                                            <td className="px-6 py-3.5">
                                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                                                    {token.token_code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="font-bold text-neutral-900">{token.patient_name}</div>
                                                {token.patient_phone && (
                                                    <div className="text-xs text-neutral-500 font-mono">{token.patient_phone}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                {token.priority === 'urgent' ? (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 uppercase">
                                                        Urgent
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700">
                                                        Normal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 text-neutral-500 text-xs">
                                                {new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-3.5 text-right space-x-2">
                                                <button
                                                    type="button"
                                                    onClick={() => router.post(route('admin.queue.tokens.call', token.id))}
                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition shadow-sm"
                                                >
                                                    Call
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSkip(token)}
                                                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded text-xs font-medium transition"
                                                >
                                                    Skip
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-neutral-400">
                            <p className="text-sm font-medium">No patients currently waiting in this queue.</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
