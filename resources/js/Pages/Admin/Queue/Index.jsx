import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Index({ tokens, filters, doctors, counters }) {
    const handleFilterChange = (key, value) => {
        router.get(
            route('admin.queue.index'),
            { ...filters, [key]: value },
            { preserveState: true, replace: true }
        );
    };

    const handleCall = (token) => {
        router.post(route('admin.queue.tokens.call', token.id), {}, { preserveScroll: true });
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

    const handleDestroy = (token) => {
        if (confirm(`Cancel token ${token.token_code}?`)) {
            router.delete(route('admin.queue.tokens.destroy', token.id), { preserveScroll: true });
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'calling':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Calling (ডাকছে)
                    </span>
                );
            case 'in_consultation':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        In Consultation
                    </span>
                );
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        Completed
                    </span>
                );
            case 'skipped':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
                        Skipped
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Cancelled
                    </span>
                );
            case 'waiting':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Waiting (অপেক্ষমাণ)
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout header="Waiting Room Queue Management">
            <Head title="Waiting Room Queue" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Metric Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Total Billed/Issued</span>
                        <span className="text-2xl font-black text-neutral-900 mt-1 block">{counters?.total || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">Waiting</span>
                        <span className="text-2xl font-black text-blue-900 mt-1 block">{counters?.waiting || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
                        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Now Calling</span>
                        <span className="text-2xl font-black text-amber-900 mt-1 block">{counters?.calling || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/30 shadow-sm">
                        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider block">In Consultation</span>
                        <span className="text-2xl font-black text-teal-900 mt-1 block">{counters?.in_consultation || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Completed</span>
                        <span className="text-2xl font-black text-emerald-900 mt-1 block">{counters?.completed || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Skipped</span>
                        <span className="text-2xl font-black text-neutral-700 mt-1 block">{counters?.skipped || 0}</span>
                    </div>
                </div>

                {/* Action Bar & Quick Links */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('admin.queue.tokens.create')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Issue New Token (টোকেন দিন)
                        </Link>
                        <Link
                            href={route('admin.queue.workbench')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-sm font-semibold border border-neutral-300 transition"
                        >
                            <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Doctor Workbench
                        </Link>
                        <Link
                            href={route('queue.display')}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-semibold shadow-sm transition"
                        >
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Waiting Room Live TV Board
                        </Link>
                    </div>

                    {/* Date Picker */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-neutral-600 uppercase">Queue Date:</label>
                        <input
                            type="date"
                            value={filters?.date || ''}
                            onChange={(e) => handleFilterChange('date', e.target.value)}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        />
                        <button
                            type="button"
                            onClick={() => handleFilterChange('date', new Date().toISOString().split('T')[0])}
                            className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-xs font-medium rounded-lg text-neutral-700"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters?.doctor_id || ''}
                            onChange={(e) => handleFilterChange('doctor_id', e.target.value)}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Doctors (সকল ডাক্তার)</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters?.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Statuses (সকল স্ট্যাটাস)</option>
                            <option value="waiting">Waiting (অপেক্ষমাণ)</option>
                            <option value="calling">Calling (চলতি ডাক)</option>
                            <option value="in_consultation">In Consultation (চিকিৎসাধীন)</option>
                            <option value="completed">Completed (সম্পন্ন)</option>
                            <option value="skipped">Skipped (বাদ)</option>
                            <option value="cancelled">Cancelled (বাতিল)</option>
                        </select>
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search token / patient / phone..."
                            value={filters?.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full md:w-64 pl-9 pr-3 py-1.5 text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Tokens Table */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    {tokens?.data?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200 text-sm">
                                <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left">Token</th>
                                        <th className="px-6 py-3.5 text-left">Patient Details</th>
                                        <th className="px-6 py-3.5 text-left">Doctor & Chamber</th>
                                        <th className="px-6 py-3.5 text-left">Priority</th>
                                        <th className="px-6 py-3.5 text-left">Status</th>
                                        <th className="px-6 py-3.5 text-left">Time</th>
                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200">
                                    {tokens.data.map((token) => (
                                        <tr key={token.id} className="hover:bg-neutral-50/80 transition">
                                            {/* Token Code */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono font-extrabold text-base text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                    {token.token_code}
                                                </span>
                                            </td>

                                            {/* Patient */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-neutral-900">{token.patient_name}</div>
                                                <div className="text-xs text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                                                    {token.patient_phone && <span>{token.patient_phone}</span>}
                                                    {token.patient?.patient_number && (
                                                        <span className="text-emerald-700 font-medium">#{token.patient.patient_number}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Doctor & Room */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-neutral-900">
                                                    {token.doctor ? token.doctor.name : 'Any Doctor'}
                                                </div>
                                                <div className="text-xs font-semibold text-neutral-500">
                                                    {token.service_room || 'Chamber 1'}
                                                </div>
                                            </td>

                                            {/* Priority */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {token.priority === 'urgent' ? (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 uppercase tracking-wide">
                                                        Urgent (জরুরি)
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-700">
                                                        Normal
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(token.status)}
                                            </td>

                                            {/* Time */}
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500">
                                                <div>Issued: {new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                {token.called_at && (
                                                    <div className="text-amber-700 font-medium">
                                                        Called: {new Date(token.called_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                                                {token.status === 'waiting' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCall(token)}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition shadow-sm"
                                                    >
                                                        Call
                                                    </button>
                                                )}

                                                {token.status === 'calling' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRecall(token)}
                                                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition"
                                                            title="Recall"
                                                        >
                                                            Recall
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartConsultation(token)}
                                                            className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition"
                                                        >
                                                            Enter
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSkip(token)}
                                                            className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-xs font-medium transition"
                                                        >
                                                            Skip
                                                        </button>
                                                    </>
                                                )}

                                                {token.status === 'in_consultation' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleComplete(token)}
                                                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold transition"
                                                    >
                                                        Complete
                                                    </button>
                                                )}

                                                <Link
                                                    href={route('admin.queue.tokens.print', token.id)}
                                                    target="_blank"
                                                    className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-medium transition inline-block"
                                                    title="Print token slip"
                                                >
                                                    Slip
                                                </Link>

                                                {token.status !== 'completed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDestroy(token)}
                                                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition"
                                                        title="Cancel token"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-16 text-center text-neutral-400 space-y-2">
                            <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="font-semibold text-neutral-600 text-base">No queue tokens for this date or filter</p>
                            <p className="text-xs text-neutral-400">Click "Issue New Token" to generate a token for an incoming patient.</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
