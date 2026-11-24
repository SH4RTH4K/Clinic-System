import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CommunicationsIndex({ notifications, filters, metrics, recentPatients }) {
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);

    const { data: smsData, setData: setSmsData, post: postSms, processing: sendingSms, reset: resetSms, errors: smsErrors } = useForm({
        patient_id: '',
        phone: '',
        message: '',
    });

    const handleFilterChange = (key, value) => {
        router.get(
            route('admin.communications.index'),
            { ...filters, [key]: value },
            { preserveState: true, replace: true }
        );
    };

    const handlePatientSelect = (e) => {
        const pId = e.target.value;
        const patient = recentPatients.find((p) => String(p.id) === String(pId));
        if (patient) {
            setSmsData((prev) => ({
                ...prev,
                patient_id: patient.id,
                phone: patient.phone || '',
            }));
        } else {
            setSmsData((prev) => ({ ...prev, patient_id: '' }));
        }
    };

    const handleSendCustomSms = (e) => {
        e.preventDefault();
        postSms(route('admin.communications.send_custom'), {
            onSuccess: () => {
                setIsSendModalOpen(false);
                resetSms();
            },
        });
    };

    return (
        <AuthenticatedLayout header="Patient Communications & Notification Center">
            <Head title="Communications & SMS Logs" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Total Dispatched</span>
                        <span className="text-2xl font-black text-neutral-900 mt-1 block">{metrics?.total_sent || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">SMS Messages</span>
                        <span className="text-2xl font-black text-blue-900 mt-1 block">{metrics?.total_sms || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">WhatsApp Shares</span>
                        <span className="text-2xl font-black text-emerald-900 mt-1 block">{metrics?.total_whatsapp || 0}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">Today's Traffic</span>
                        <span className="text-2xl font-black text-neutral-900 mt-1 block">{metrics?.today_count || 0}</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsSendModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send Quick SMS (এসএমএস পাঠান)
                        </button>

                        <Link
                            href={route('admin.communications.settings')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-sm font-semibold border border-neutral-300 transition"
                        >
                            <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Gateway & Template Settings
                        </Link>
                    </div>

                    {/* Filter Inputs */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters?.channel || ''}
                            onChange={(e) => handleFilterChange('channel', e.target.value)}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Channels</option>
                            <option value="sms">SMS</option>
                            <option value="whatsapp">WhatsApp</option>
                        </select>

                        <select
                            value={filters?.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Statuses</option>
                            <option value="sent">Sent / Delivered</option>
                            <option value="failed">Failed</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Search phone or text..."
                            value={filters?.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5 w-44"
                        />
                    </div>
                </div>

                {/* Notifications Table */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    {notifications?.data?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-neutral-200 text-sm">
                                <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase font-semibold">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left">Time</th>
                                        <th className="px-6 py-3.5 text-left">Recipient</th>
                                        <th className="px-6 py-3.5 text-left">Channel</th>
                                        <th className="px-6 py-3.5 text-left">Event Type</th>
                                        <th className="px-6 py-3.5 text-left">Message Preview</th>
                                        <th className="px-6 py-3.5 text-left">Status</th>
                                        <th className="px-6 py-3.5 text-right">Sent By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200">
                                    {notifications.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-neutral-50 transition">
                                            <td className="px-6 py-3.5 whitespace-nowrap text-xs text-neutral-500 font-mono">
                                                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <div className="font-mono font-bold text-neutral-900">{item.recipient_phone}</div>
                                                {item.patient && (
                                                    <div className="text-xs text-neutral-500">{item.patient.name}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                {item.channel === 'whatsapp' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                        WhatsApp
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                        SMS
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-xs text-neutral-600 capitalize">
                                                {item.event_type?.replace(/_/g, ' ') || 'Notification'}
                                            </td>
                                            <td className="px-6 py-3.5 max-w-sm truncate text-xs text-neutral-700" title={item.message_body}>
                                                {item.message_body}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                {item.status === 'sent' ? (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                                                        ✓ Sent
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700">
                                                        ✕ Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs text-neutral-500">
                                                {item.sender?.name || 'System Auto'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-16 text-center text-neutral-400 space-y-2">
                            <p className="font-semibold text-neutral-600 text-base">No communication logs recorded yet</p>
                            <p className="text-xs text-neutral-400">SMS and WhatsApp notifications will appear here automatically.</p>
                        </div>
                    )}
                </div>

                {/* Quick Send SMS Modal */}
                {isSendModalOpen && (
                    <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                                <h3 className="text-base font-bold text-neutral-900">Send Direct SMS to Patient</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsSendModalOpen(false)}
                                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSendCustomSms} className="space-y-4 text-xs">
                                <div>
                                    <label className="block font-bold text-neutral-700 uppercase mb-1">
                                        Select Patient (Optional)
                                    </label>
                                    <select
                                        value={smsData.patient_id}
                                        onChange={handlePatientSelect}
                                        className="w-full text-xs rounded-xl border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 p-2"
                                    >
                                        <option value="">-- Manual Number Entry --</option>
                                        {recentPatients.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.phone || 'No phone'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-neutral-700 uppercase mb-1">
                                        Mobile Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="017XXXXXXXX"
                                        value={smsData.phone}
                                        onChange={(e) => setSmsData('phone', e.target.value)}
                                        className="w-full text-xs font-mono rounded-xl border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 p-2"
                                    />
                                    {smsErrors.phone && <p className="text-red-600 mt-1">{smsErrors.phone}</p>}
                                </div>

                                <div>
                                    <label className="block font-bold text-neutral-700 uppercase mb-1">
                                        Message Text <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={4}
                                        required
                                        placeholder="Type your message here..."
                                        value={smsData.message}
                                        onChange={(e) => setSmsData('message', e.target.value)}
                                        className="w-full text-xs rounded-xl border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 p-2"
                                    />
                                    <p className="text-neutral-400 text-[10px] mt-0.5">{smsData.message.length} characters</p>
                                    {smsErrors.message && <p className="text-red-600 mt-1">{smsErrors.message}</p>}
                                </div>

                                <div className="pt-2 border-t border-neutral-200 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsSendModalOpen(false)}
                                        className="px-3 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-medium hover:bg-neutral-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingSms}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-sm"
                                    >
                                        {sendingSms ? 'Sending...' : 'Send SMS Now'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
