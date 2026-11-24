import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CommunicationSettings({ config }) {
    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        sms_enabled: config?.sms_enabled ?? false,
        sms_provider: config?.sms_provider ?? 'log',
        api_url: config?.api_url ?? '',
        api_key: config?.api_key ?? '',
        sender_id: config?.sender_id ?? 'RemediQ',
        auto_sms_appointments: config?.auto_sms_appointments ?? true,
        auto_sms_queue: config?.auto_sms_queue ?? true,
        auto_sms_prescriptions: config?.auto_sms_prescriptions ?? false,
        templates: {
            appointment_confirmed: config?.templates?.appointment_confirmed ?? 'Dear {patient_name}, your appointment with {doctor_name} at {clinic_name} is confirmed for {date} at {time}. Helpline: {phone}',
            queue_token_issued: config?.templates?.queue_token_issued ?? 'Token {token_code} issued for {patient_name} at {clinic_name}. Assigned to {doctor_name} ({service_room}). Please watch waiting room display.',
            prescription_ready: config?.templates?.prescription_ready ?? 'Dear {patient_name}, your digital prescription from {clinic_name} by {doctor_name} is ready. View online: {prescription_url}',
        },
    });

    const handleTemplateChange = (key, value) => {
        setData('templates', {
            ...data.templates,
            [key]: value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.communications.settings.update'));
    };

    return (
        <AuthenticatedLayout header="SMS Gateway & Communication Settings">
            <Head title="SMS & Communication Settings" />

            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Header navigation bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">Communication & Gateway Settings</h2>
                        <p className="text-sm text-neutral-500 mt-0.5">
                            Configure SMS Gateway providers (Greenweb, MimSMS, Generic HTTP, or local log) and automated notification templates.
                        </p>
                    </div>
                    <Link
                        href={route('admin.communications.index')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-semibold border border-neutral-300 transition"
                    >
                        <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Notification Center
                    </Link>
                </div>

                {recentlySuccessful && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>SMS Gateway and template configuration saved successfully.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Gateway Provider Settings Card */}
                    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-neutral-900">1. SMS Gateway Provider</h3>
                                <p className="text-xs text-neutral-500">Enable or disable SMS dispatch and choose your gateway driver.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.sms_enabled}
                                    onChange={(e) => setData('sms_enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                <span className="ml-3 text-sm font-semibold text-neutral-700">
                                    {data.sms_enabled ? 'SMS Active (সক্রিয়)' : 'SMS Disabled (নিষ্ক্রিয়)'}
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Gateway Driver / Provider
                                </label>
                                <select
                                    value={data.sms_provider}
                                    onChange={(e) => setData('sms_provider', e.target.value)}
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="log">System Log (Offline Testing / Zero Cost)</option>
                                    <option value="greenweb">Greenweb Bangladesh (api.greenweb.com.bd)</option>
                                    <option value="mimsms">MimSMS Bangladesh (api.mimsms.com)</option>
                                    <option value="generic_http">Generic Custom HTTP REST Gateway</option>
                                </select>
                                {errors.sms_provider && <p className="text-xs text-red-600 mt-1">{errors.sms_provider}</p>}
                                <p className="text-xs text-neutral-400 mt-1.5">
                                    Select 'System Log' to test and verify SMS dispatches in application logs without incurring SMS gateway charges.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Sender ID / Masking Name
                                </label>
                                <input
                                    type="text"
                                    value={data.sender_id}
                                    onChange={(e) => setData('sender_id', e.target.value)}
                                    placeholder="RemediQ or Approved Masking"
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                {errors.sender_id && <p className="text-xs text-red-600 mt-1">{errors.sender_id}</p>}
                                <p className="text-xs text-neutral-400 mt-1.5">Approved sender ID or masking registered with BTRC / Gateway.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    API Endpoint URL
                                </label>
                                <input
                                    type="text"
                                    value={data.api_url}
                                    onChange={(e) => setData('api_url', e.target.value)}
                                    placeholder={
                                        data.sms_provider === 'greenweb'
                                            ? 'https://api.greenweb.com.bd/api.php'
                                            : data.sms_provider === 'mimsms'
                                            ? 'https://api.mimsms.com/api/v3/send-sms'
                                            : 'https://api.sms-provider.com/v1/send'
                                    }
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-mono text-xs"
                                />
                                {errors.api_url && <p className="text-xs text-red-600 mt-1">{errors.api_url}</p>}
                                <p className="text-xs text-neutral-400 mt-1.5">Leave blank to use default endpoint for Greenweb or MimSMS.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    API Key / Authentication Token
                                </label>
                                <input
                                    type="password"
                                    value={data.api_key}
                                    onChange={(e) => setData('api_key', e.target.value)}
                                    placeholder="Enter your SMS gateway API token"
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-mono text-xs"
                                />
                                {errors.api_key && <p className="text-xs text-red-600 mt-1">{errors.api_key}</p>}
                                <p className="text-xs text-neutral-400 mt-1.5">Secured token provided by your SMS vendor account dashboard.</p>
                            </div>
                        </div>
                    </div>

                    {/* Automated Triggers Card */}
                    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
                        <div className="border-b border-neutral-200 pb-3">
                            <h3 className="text-base font-bold text-neutral-900">2. Automated Event Triggers</h3>
                            <p className="text-xs text-neutral-500">Configure which clinical and administrative events trigger automatic SMS dispatches.</p>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={data.auto_sms_appointments}
                                    onChange={(e) => setData('auto_sms_appointments', e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-neutral-800 block">Appointment Confirmation Notification</span>
                                    <span className="text-xs text-neutral-500 block">
                                        Send an SMS to the patient when an online appointment request is scheduled or confirmed with doctor name, date, and time.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={data.auto_sms_queue}
                                    onChange={(e) => setData('auto_sms_queue', e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-neutral-800 block">Waiting Room Queue Token Notification</span>
                                    <span className="text-xs text-neutral-500 block">
                                        Send an SMS to the patient with their token number and assigned doctor when a queue token is issued at the reception desk.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={data.auto_sms_prescriptions}
                                    onChange={(e) => setData('auto_sms_prescriptions', e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-neutral-800 block">Digital Prescription Ready (Auto-SMS)</span>
                                    <span className="text-xs text-neutral-500 block">
                                        Automatically send an SMS with the secure digital prescription link whenever a consultation visit is finalized.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Message Templates Card */}
                    <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm space-y-6">
                        <div className="border-b border-neutral-200 pb-3">
                            <h3 className="text-base font-bold text-neutral-900">3. SMS Message Templates</h3>
                            <p className="text-xs text-neutral-500">
                                Customize the message text. Available dynamic placeholders: <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;patient_name&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;doctor_name&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;clinic_name&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;date&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;time&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;token_code&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;service_room&#125;</code>, <code className="bg-neutral-100 text-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono">&#123;prescription_url&#125;</code>.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                                    Appointment Confirmation Template
                                </label>
                                <textarea
                                    rows="3"
                                    value={data.templates.appointment_confirmed}
                                    onChange={(e) => handleTemplateChange('appointment_confirmed', e.target.value)}
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-sans"
                                />
                                {errors['templates.appointment_confirmed'] && (
                                    <p className="text-xs text-red-600 mt-1">{errors['templates.appointment_confirmed']}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                                    Queue Token Issued Template
                                </label>
                                <textarea
                                    rows="3"
                                    value={data.templates.queue_token_issued}
                                    onChange={(e) => handleTemplateChange('queue_token_issued', e.target.value)}
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-sans"
                                />
                                {errors['templates.queue_token_issued'] && (
                                    <p className="text-xs text-red-600 mt-1">{errors['templates.queue_token_issued']}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                                    Prescription Ready Template
                                </label>
                                <textarea
                                    rows="3"
                                    value={data.templates.prescription_ready}
                                    onChange={(e) => handleTemplateChange('prescription_ready', e.target.value)}
                                    className="w-full rounded-lg border-neutral-300 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-sans"
                                />
                                {errors['templates.prescription_ready'] && (
                                    <p className="text-xs text-red-600 mt-1">{errors['templates.prescription_ready']}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href={route('admin.communications.index')}
                            className="px-4 py-2 bg-white text-neutral-700 border border-neutral-300 rounded-lg text-sm font-semibold hover:bg-neutral-50 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    Saving Settings...
                                </>
                            ) : (
                                'Save Settings (সংরক্ষণ করুন)'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
