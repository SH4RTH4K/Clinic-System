import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';

export default function CommunicationSettings({ config, metrics = {}, initialBalance = null }) {
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
            whatsapp_prescription: config?.templates?.whatsapp_prescription ?? "Dear {patient_name},\n\nHere is your Digital Prescription from {clinic_name} prescribed by {doctor_name} on {date}:\n👉 View & Download: {prescription_url}\n\nFor any query, contact our clinic at {phone}.\n\n— {clinic_name}",
        },
    });

    // Gateway Balance State
    const [balanceInfo, setBalanceInfo] = useState(initialBalance);
    const [checkingBalance, setCheckingBalance] = useState(false);

    // Test SMS Modal State
    const [showTestModal, setShowTestModal] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('RemediQ SMS Gateway Test. If you received this, your SMS integration is working properly!');
    const [sendingTest, setSendingTest] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleTemplateChange = (key, value) => {
        setData('templates', {
            ...data.templates,
            [key]: value,
        });
    };

    const insertVariableChip = (templateKey, placeholder) => {
        const currentText = data.templates[templateKey] || '';
        handleTemplateChange(templateKey, currentText + (currentText.endsWith(' ') ? '' : ' ') + placeholder + ' ');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.communications.settings.update'));
    };

    const refreshBalance = async () => {
        setCheckingBalance(true);
        try {
            const res = await fetch(route('admin.communications.gateway_balance'), {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const json = await res.json();
                setBalanceInfo(json);
            }
        } catch (err) {
            console.error('Balance check failed', err);
        } finally {
            setCheckingBalance(false);
        }
    };

    const handleSendTestSms = async (e) => {
        e.preventDefault();
        setSendingTest(true);
        setTestResult(null);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(route('admin.communications.test_sms'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    phone: testPhone,
                    message: testMessage,
                }),
            });

            const data = await res.json();
            setTestResult(data);
        } catch (err) {
            setTestResult({
                status: 'error',
                message: 'Failed to send request: ' + err.message,
            });
        } finally {
            setSendingTest(false);
        }
    };

    // Analyze text for GSM vs Unicode and count SMS parts
    const getSmsCounter = (text = '') => {
        const isUnicode = /[^\u0000-\u007F]/.test(text);
        const length = text.length;
        let parts = 1;

        if (isUnicode) {
            if (length <= 70) {
                parts = 1;
            } else {
                parts = Math.ceil(length / 67);
            }
        } else {
            if (length <= 160) {
                parts = 1;
            } else {
                parts = Math.ceil(length / 153);
            }
        }

        return {
            isUnicode,
            length,
            parts,
            maxSingle: isUnicode ? 70 : 160,
        };
    };

    return (
        <AuthenticatedLayout>
            <Head title="SMS Gateway & Communication Studio (যোগাযোগ সেটিংস)" />

            <div className="py-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="SMS Gateway & Communication Studio (যোগাযোগ ও এসএমএস গেটওয়ে)"
                    subtitle="Configure SMS Gateway drivers, live credit balance check, automated event triggers, and dynamic message templates"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.communications.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <span>📜</span> Notification Logs
                            </Link>
                            <Link
                                href={route('admin.settings')}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <span>⚙️</span> Clinic Settings
                            </Link>
                            <button
                                type="button"
                                onClick={() => setShowTestModal(true)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🧪</span> Send Test SMS
                            </button>
                        </div>
                    }
                />

                {/* Executive 5-Card Communication KPI Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Communication Metrics">
                    {/* Card 1: Total Dispatches */}
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Total Dispatches 📡</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            {Number(metrics.total_dispatches || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">মোট প্রেরিত বার্তা</div>
                    </div>

                    {/* Card 2: Total SMS */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">SMS Dispatches 💬</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">
                            {Number(metrics.total_sms || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">সরাসরি মোবাইল এসএমএস</div>
                    </div>

                    {/* Card 3: WhatsApp Sent */}
                    <div className="bg-white p-3.5 rounded-xl border border-green-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-green-700 uppercase tracking-wider">WhatsApp Alerts 📱</div>
                        <div className="text-2xl font-bold text-green-800 mt-1">
                            {Number(metrics.total_whatsapp || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-green-600 mt-0.5">হোয়াটসঅ্যাপ ডিজিটাল প্রেসক্রিপশন</div>
                    </div>

                    {/* Card 4: Delivery Rate % */}
                    <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">Delivery Rate ✅</div>
                        <div className="text-2xl font-bold text-violet-800 mt-1">
                            {metrics.delivery_rate || 100}%
                        </div>
                        <div className="text-[11px] text-violet-600 mt-0.5">সফল ডেলিভারি হার</div>
                    </div>

                    {/* Card 5: Today Dispatched */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Today Dispatched 🕒</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">
                            {Number(metrics.today_dispatched || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-amber-600 mt-0.5">আজকের মোট বার্তা প্রেরণ</div>
                    </div>
                </section>

                {/* Gateway Balance & Connection Card */}
                <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-white border border-emerald-300 flex items-center justify-center text-xl shadow-2xs">
                            💳
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-gray-900">
                                    {balanceInfo?.provider || 'SMS Gateway Driver'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    data.sms_enabled
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {data.sms_enabled ? '🟢 Live & Active' : '⏸️ Inactive'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2">
                                <span>Balance: <strong className="text-gray-900 font-mono text-sm">{balanceInfo?.balance ?? 'Unknown'}</strong></span>
                                {balanceInfo?.unit && <span className="text-gray-500 text-[11px]">({balanceInfo.unit})</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={refreshBalance}
                            disabled={checkingBalance}
                            className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <span>{checkingBalance ? '⏳' : '🔄'}</span>
                            {checkingBalance ? 'Checking...' : 'Refresh Balance'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTestModal(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                        >
                            <span>🧪</span> Test Send
                        </button>
                    </div>
                </div>

                {recentlySuccessful && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
                        <span>✅</span>
                        <span>SMS Gateway and template studio configuration saved successfully.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: SMS Gateway Provider Configuration */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <span>1.</span> SMS Gateway Provider & Authentication (গেটওয়ে কনফিগারেশন)
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Enable or disable SMS dispatch and choose your gateway driver.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.sms_enabled}
                                    onChange={(e) => setData('sms_enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                <span className="ml-3 text-xs font-bold text-gray-700">
                                    {data.sms_enabled ? 'SMS Active (সক্রিয়)' : 'SMS Disabled (নিষ্ক্রিয়)'}
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Gateway Driver / Provider
                                </label>
                                <select
                                    value={data.sms_provider}
                                    onChange={(e) => setData('sms_provider', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="log">System Log (Offline Testing / Zero Cost)</option>
                                    <option value="greenweb">Greenweb Bangladesh (api.greenweb.com.bd)</option>
                                    <option value="mimsms">MimSMS Bangladesh (api.mimsms.com)</option>
                                    <option value="generic_http">Generic Custom HTTP REST Gateway</option>
                                </select>
                                {errors.sms_provider && <p className="text-xs text-rose-600 mt-1">{errors.sms_provider}</p>}
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Select 'System Log' to test and verify SMS dispatches in application logs without incurring SMS gateway charges.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Sender ID / Masking Name
                                </label>
                                <input
                                    type="text"
                                    value={data.sender_id}
                                    onChange={(e) => setData('sender_id', e.target.value)}
                                    placeholder="RemediQ or Approved Masking"
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.sender_id && <p className="text-xs text-rose-600 mt-1">{errors.sender_id}</p>}
                                <p className="text-[11px] text-gray-400 mt-1">Approved sender ID or masking registered with BTRC / Gateway.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
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
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500 font-mono"
                                />
                                {errors.api_url && <p className="text-xs text-rose-600 mt-1">{errors.api_url}</p>}
                                <p className="text-[11px] text-gray-400 mt-1">Leave blank to use default endpoint for Greenweb or MimSMS.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    API Key / Authentication Token
                                </label>
                                <input
                                    type="password"
                                    value={data.api_key}
                                    onChange={(e) => setData('api_key', e.target.value)}
                                    placeholder="Enter your SMS gateway API token"
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500 font-mono"
                                />
                                {errors.api_key && <p className="text-xs text-rose-600 mt-1">{errors.api_key}</p>}
                                <p className="text-[11px] text-gray-400 mt-1">Secured token provided by your SMS vendor account dashboard.</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Automated Event Triggers */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <span>2.</span> Automated Clinical Event Triggers (স্বয়ংক্রিয় নোটিফিকেশন ট্রিগার)
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">Configure which clinical and administrative events trigger automatic SMS dispatches.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={data.auto_sms_appointments}
                                    onChange={(e) => setData('auto_sms_appointments', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-800 block">Appointment Confirmation</span>
                                    <span className="text-[11px] text-gray-500 block mt-0.5">
                                        Send SMS to patient when appointment request is confirmed.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={data.auto_sms_queue}
                                    onChange={(e) => setData('auto_sms_queue', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-800 block">Queue Token Issued</span>
                                    <span className="text-[11px] text-gray-500 block mt-0.5">
                                        Send token code and assigned chamber when token is issued.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={data.auto_sms_prescriptions}
                                    onChange={(e) => setData('auto_sms_prescriptions', e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-800 block">Digital Rx Ready (Auto-SMS)</span>
                                    <span className="text-[11px] text-gray-500 block mt-0.5">
                                        Send digital prescription link when visit is finalized.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Section 3: Interactive Template Studio */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-6">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <span>3.</span> Interactive Message Template Studio (টেমপ্লেট স্টুডিও ও লাইভ কাউন্টার)
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Click variable chips to insert dynamic placeholders. Live counter shows character and SMS segment usage.
                            </p>
                        </div>

                        {/* Template 1: Appointment Confirmed */}
                        {(() => {
                            const val = data.templates.appointment_confirmed || '';
                            const counter = getSmsCounter(val);
                            return (
                                <div className="space-y-2 bg-gray-50/75 p-3.5 rounded-xl border border-gray-200">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-xs font-bold text-gray-800">
                                            1. Appointment Confirmation SMS (অ্যাপয়েন্টমেন্ট নিশ্চিতকরণ বার্তা)
                                        </label>
                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className={`px-2 py-0.5 rounded font-bold ${
                                                counter.isUnicode ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                                            }`}>
                                                {counter.isUnicode ? '🌐 Unicode / বাংলা (70 chars/part)' : '🔤 GSM 7-bit (160 chars/part)'}
                                            </span>
                                            <span className="font-mono text-gray-700">
                                                {counter.length} chars • <strong className="text-gray-900">{counter.parts} Part(s)</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Variable Chips Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Insert Chip:</span>
                                        {[
                                            { label: '+ Patient Name', val: '{patient_name}' },
                                            { label: '+ Doctor Name', val: '{doctor_name}' },
                                            { label: '+ Clinic Name', val: '{clinic_name}' },
                                            { label: '+ Date', val: '{date}' },
                                            { label: '+ Time', val: '{time}' },
                                            { label: '+ Clinic Phone', val: '{phone}' },
                                        ].map((chip, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => insertVariableChip('appointment_confirmed', chip.val)}
                                                className="px-2 py-0.5 bg-white hover:bg-primary-50 text-primary-700 border border-primary-200 hover:border-primary-400 rounded text-[11px] font-mono transition"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        rows="2"
                                        value={val}
                                        onChange={(e) => handleTemplateChange('appointment_confirmed', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500 font-sans"
                                    />
                                    {errors['templates.appointment_confirmed'] && (
                                        <p className="text-xs text-rose-600">{errors['templates.appointment_confirmed']}</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Template 2: Queue Token Issued */}
                        {(() => {
                            const val = data.templates.queue_token_issued || '';
                            const counter = getSmsCounter(val);
                            return (
                                <div className="space-y-2 bg-gray-50/75 p-3.5 rounded-xl border border-gray-200">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-xs font-bold text-gray-800">
                                            2. Waiting Room Queue Token SMS (ওয়েটিং রুম টোকেন বার্তা)
                                        </label>
                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className={`px-2 py-0.5 rounded font-bold ${
                                                counter.isUnicode ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                                            }`}>
                                                {counter.isUnicode ? '🌐 Unicode / বাংলা' : '🔤 GSM 7-bit'}
                                            </span>
                                            <span className="font-mono text-gray-700">
                                                {counter.length} chars • <strong className="text-gray-900">{counter.parts} Part(s)</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Variable Chips Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Insert Chip:</span>
                                        {[
                                            { label: '+ Token Code', val: '{token_code}' },
                                            { label: '+ Patient Name', val: '{patient_name}' },
                                            { label: '+ Doctor Name', val: '{doctor_name}' },
                                            { label: '+ Service Room', val: '{service_room}' },
                                            { label: '+ Clinic Name', val: '{clinic_name}' },
                                        ].map((chip, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => insertVariableChip('queue_token_issued', chip.val)}
                                                className="px-2 py-0.5 bg-white hover:bg-primary-50 text-primary-700 border border-primary-200 hover:border-primary-400 rounded text-[11px] font-mono transition"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        rows="2"
                                        value={val}
                                        onChange={(e) => handleTemplateChange('queue_token_issued', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500 font-sans"
                                    />
                                    {errors['templates.queue_token_issued'] && (
                                        <p className="text-xs text-rose-600">{errors['templates.queue_token_issued']}</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Template 3: Prescription Ready SMS */}
                        {(() => {
                            const val = data.templates.prescription_ready || '';
                            const counter = getSmsCounter(val);
                            return (
                                <div className="space-y-2 bg-gray-50/75 p-3.5 rounded-xl border border-gray-200">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-xs font-bold text-gray-800">
                                            3. Digital Prescription Ready SMS (ডিজিটাল প্রেসক্রিপশন লিঙ্ক এসএমএস)
                                        </label>
                                        <div className="flex items-center gap-2 text-[11px]">
                                            <span className={`px-2 py-0.5 rounded font-bold ${
                                                counter.isUnicode ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                                            }`}>
                                                {counter.isUnicode ? '🌐 Unicode / বাংলা' : '🔤 GSM 7-bit'}
                                            </span>
                                            <span className="font-mono text-gray-700">
                                                {counter.length} chars • <strong className="text-gray-900">{counter.parts} Part(s)</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Variable Chips Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase">Insert Chip:</span>
                                        {[
                                            { label: '+ Patient Name', val: '{patient_name}' },
                                            { label: '+ Doctor Name', val: '{doctor_name}' },
                                            { label: '+ Clinic Name', val: '{clinic_name}' },
                                            { label: '+ Rx Link URL', val: '{prescription_url}' },
                                        ].map((chip, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => insertVariableChip('prescription_ready', chip.val)}
                                                className="px-2 py-0.5 bg-white hover:bg-primary-50 text-primary-700 border border-primary-200 hover:border-primary-400 rounded text-[11px] font-mono transition"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        rows="2"
                                        value={val}
                                        onChange={(e) => handleTemplateChange('prescription_ready', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500 font-sans"
                                    />
                                    {errors['templates.prescription_ready'] && (
                                        <p className="text-xs text-rose-600">{errors['templates.prescription_ready']}</p>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Template 4: WhatsApp Sharing Message */}
                        {(() => {
                            const val = data.templates.whatsapp_prescription || '';
                            return (
                                <div className="space-y-2 bg-green-50/50 p-3.5 rounded-xl border border-green-200">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <label className="text-xs font-bold text-green-900 flex items-center gap-1.5">
                                            <span>📱</span> 4. WhatsApp Click-to-Chat Prescription Message (হোয়াটসঅ্যাপে ব্যবস্থাপত্র বার্তা)
                                        </label>
                                        <span className="text-[11px] text-green-700 font-medium">
                                            Formatted with line breaks & emojis
                                        </span>
                                    </div>

                                    {/* Variable Chips Toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 py-1">
                                        <span className="text-[10px] font-bold text-green-800 uppercase">Insert Chip:</span>
                                        {[
                                            { label: '+ Patient Name', val: '{patient_name}' },
                                            { label: '+ Doctor Name', val: '{doctor_name}' },
                                            { label: '+ Clinic Name', val: '{clinic_name}' },
                                            { label: '+ Date', val: '{date}' },
                                            { label: '+ Rx Link URL', val: '{prescription_url}' },
                                            { label: '+ Clinic Phone', val: '{phone}' },
                                        ].map((chip, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => insertVariableChip('whatsapp_prescription', chip.val)}
                                                className="px-2 py-0.5 bg-white hover:bg-green-100 text-green-800 border border-green-300 rounded text-[11px] font-mono transition"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        rows="4"
                                        value={val}
                                        onChange={(e) => handleTemplateChange('whatsapp_prescription', e.target.value)}
                                        className="w-full rounded-lg border-green-300 text-xs shadow-2xs focus:border-green-600 focus:ring-green-600 font-sans"
                                    />
                                    {errors['templates.whatsapp_prescription'] && (
                                        <p className="text-xs text-rose-600">{errors['templates.whatsapp_prescription']}</p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Form Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href={route('admin.communications.index')}
                            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {processing ? 'Saving Settings...' : 'Save Settings (সংরক্ষণ করুন)'}
                        </button>
                    </div>
                </form>

                {/* Test SMS Modal */}
                {showTestModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-md w-full p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <span>🧪</span> Send Live Test SMS (গেটওয়ে টেস্ট)
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTestModal(false);
                                        setTestResult(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSendTestSms} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Recipient Mobile Phone (প্রাপকের মোবাইল)
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={testPhone}
                                        onChange={(e) => setTestPhone(e.target.value)}
                                        placeholder="017XXXXXXXX or 88017XXXXXXXX"
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500 font-mono"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Enter your personal phone number to verify SMS arrival.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Test Message Text
                                    </label>
                                    <textarea
                                        rows="3"
                                        required
                                        value={testMessage}
                                        onChange={(e) => setTestMessage(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>

                                {testResult && (
                                    <div className={`p-3 rounded-lg text-xs border ${
                                        testResult.status === 'sent'
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                            : 'bg-rose-50 border-rose-200 text-rose-800'
                                    }`}>
                                        <div className="font-bold">{testResult.message}</div>
                                        {testResult.gateway_response && (
                                            <div className="text-[11px] font-mono mt-1 opacity-80 break-all">
                                                Gateway: {testResult.gateway_response}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowTestModal(false);
                                            setTestResult(null);
                                        }}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
                                    >
                                        Close
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingTest}
                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs disabled:opacity-50 inline-flex items-center gap-1.5"
                                    >
                                        <span>{sendingTest ? '⏳' : '🚀'}</span>
                                        {sendingTest ? 'Sending...' : 'Dispatch Test SMS'}
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
