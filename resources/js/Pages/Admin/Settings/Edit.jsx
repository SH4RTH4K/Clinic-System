import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import usePermission from '@/Components/usePermission';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const HOURS_MODES = [
    { value: 'no_hours', label: 'No Hours Available', desc: "Visitors won't see business hours on this page" },
    { value: 'always_open', label: 'Always Open', desc: 'e.g. parks, beaches, streets' },
    { value: 'permanently_closed', label: 'Permanently Closed', desc: 'This business has permanently closed' },
    { value: 'temporarily_closed', label: 'Temporarily Closed', desc: 'e.g. closed for renovation' },
    { value: 'selected_hours', label: 'Open on Selected Hours', desc: 'Input your own hours' },
];

const InputField = ({ label, value, onChange, type = 'text', placeholder = '', full = false }) => (
    <div className={full ? 'col-span-2' : ''}>
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
    </div>
);

function isOldFormat(saved) {
    return Array.isArray(saved) && saved.length > 0 && saved[0].day !== undefined;
}

function buildInitialDays(saved) {
    const base = {};
    DAYS.forEach((day) => {
        base[day] = [];
    });

    if (!saved) {
        return base;
    }

    if (isOldFormat(saved)) {
        saved.forEach((row) => {
            const slots = [];

            if (row.morning_from && row.morning_to) {
                slots.push({ from: row.morning_from, to: row.morning_to });
            }

            if (row.evening_from && row.evening_to) {
                slots.push({ from: row.evening_from, to: row.evening_to });
            }

            base[row.day] = row.open === false ? [] : slots;
        });

        return base;
    }

    if (saved.days) {
        DAYS.forEach((day) => {
            base[day] = Array.isArray(saved.days[day]) ? saved.days[day] : [];
        });
    }

    return base;
}

function VisitingHoursBuilder({ schedule, onScheduleChange, canUpdate }) {
    const { mode, days } = schedule;

    const setMode = (nextMode) => onScheduleChange({ ...schedule, mode: nextMode });

    const updateDay = (day, slots) => onScheduleChange({
        ...schedule,
        days: { ...days, [day]: slots },
    });

    const addSlot = (day) => updateDay(day, [...(days[day] || []), { from: '', to: '' }]);
    const removeSlot = (day, index) => updateDay(day, days[day].filter((_, currentIndex) => currentIndex !== index));

    const updateSlot = (day, index, field, value) => {
        const updated = days[day].map((slot, currentIndex) => (
            currentIndex === index ? { ...slot, [field]: value } : slot
        ));

        updateDay(day, updated);
    };

    return (
        <div>
            <div className="mb-6 space-y-3">
                {HOURS_MODES.map((hoursMode) => (
                    <label key={hoursMode.value} className="group flex cursor-pointer items-start gap-3">
                        <input
                            type="radio"
                            name="hours_mode"
                            value={hoursMode.value}
                            checked={mode === hoursMode.value}
                            onChange={() => setMode(hoursMode.value)}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-600">{hoursMode.label}</span>
                            <p className="text-xs text-gray-500">{hoursMode.desc}</p>
                        </div>
                    </label>
                ))}
            </div>

            {mode === 'selected_hours' && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="border-b bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Weekly Schedule
                    </div>
                    <div className="divide-y divide-gray-100">
                        {DAYS.map((day) => {
                            const slots = days[day] || [];

                            return (
                                <div key={day} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50">
                                    <div className="w-24 shrink-0 pt-2 text-sm font-semibold text-gray-800">
                                        {day}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        {slots.length === 0 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-1 items-center gap-2">
                                                    <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
                                                        <span>Opening</span>
                                                    </div>
                                                    <span className="text-sm text-gray-400">-</span>
                                                    <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
                                                        <span>Closing</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addSlot(day)}
                                                    disabled={!canUpdate}
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-lg font-bold text-blue-600 transition hover:bg-blue-100"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        ) : slots.map((slot, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                                                    <div className="flex-1">
                                                        <div className="mb-0.5 text-[10px] leading-none text-gray-400">Opening</div>
                                                        <input
                                                            type="time"
                                                            value={slot.from}
                                                            onChange={(event) => updateSlot(day, index, 'from', event.target.value)}
                                                            className="w-full border-0 bg-transparent p-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
                                                        />
                                                    </div>
                                                </div>

                                                <span className="shrink-0 text-gray-400">-</span>

                                                <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                                                    <div className="flex-1">
                                                        <div className="mb-0.5 text-[10px] leading-none text-gray-400">Closing</div>
                                                        <input
                                                            type="time"
                                                            value={slot.to}
                                                            onChange={(event) => updateSlot(day, index, 'to', event.target.value)}
                                                            className="w-full border-0 bg-transparent p-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
                                                        />
                                                    </div>
                                                </div>

                                                {index === slots.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => addSlot(day)}
                                                        disabled={!canUpdate}
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-lg font-bold text-blue-600 transition hover:bg-blue-100"
                                                    >
                                                        +
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(day, index)}
                                                    disabled={!canUpdate}
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-500 transition hover:bg-red-50 hover:text-red-500"
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Edit({ settings, logoUrl = null, faviconUrl = null }) {
    const can = usePermission();
    const canUpdate = can('clinic_settings.update');
    const canViewPrescriptionOptions = can('prescription_options.view');
    const savedSchedule = settings?.visiting_hours_schedule;
    const initialMode = savedSchedule
        ? (isOldFormat(savedSchedule) ? 'selected_hours' : (savedSchedule.mode || 'selected_hours'))
        : 'selected_hours';
    const initialSchedule = {
        mode: initialMode,
        days: buildInitialDays(savedSchedule),
    };

    const [selectedLogoUrl, setSelectedLogoUrl] = useState(null);
    const [selectedFaviconUrl, setSelectedFaviconUrl] = useState(null);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        clinic_name_en: settings?.clinic_name_en || '',
        clinic_name_bn: settings?.clinic_name_bn || '',
        about_text: settings?.about_text || '',
        about_text_bn: settings?.about_text_bn || '',
        phone: settings?.phone || '',
        address: settings?.address || '',
        visiting_hours: settings?.visiting_hours || '',
        practice_type: settings?.practice_type || 'homeopathy',
        auto_deduct_inventory: Boolean(settings?.auto_deduct_inventory),
        default_consultation_fee: settings?.default_consultation_fee ?? 500,
        invoice_footer_note: settings?.invoice_footer_note || '',
        footer_text: settings?.footer_text || '',
        developer_name: settings?.developer_name || '',
        developer_link: settings?.developer_link || '',
        visiting_hours_schedule: initialSchedule,
        logo: null,
        favicon: null,
        remove_logo: false,
        remove_favicon: false,
    });

    useEffect(() => {
        if (!data.logo) {
            setSelectedLogoUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(data.logo);
        setSelectedLogoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [data.logo]);

    useEffect(() => {
        if (!data.favicon) {
            setSelectedFaviconUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(data.favicon);
        setSelectedFaviconUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [data.favicon]);

    const currentLogo = data.remove_logo ? null : (selectedLogoUrl || logoUrl);
    const currentFavicon = data.remove_favicon ? null : (selectedFaviconUrl || faviconUrl);

    const submit = (event) => {
        event.preventDefault();
        if (!canUpdate) return;
        post(route('admin.settings.update'), { forceFormData: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Clinic Settings</h2>}>
            <Head title="Settings" />
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                    <form onSubmit={submit}>
                        <fieldset disabled={!canUpdate} className="contents">

                        {/* Practice Mode Selection */}
                        <div className="border-b p-6 bg-primary-50/30">
                            <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                <span>🩺</span> Practice Mode Configuration (চিকিৎসা পদ্ধতি)
                            </h3>
                            <p className="mb-5 text-sm text-gray-500">
                                Configure RemediQ to adapt to your clinic&apos;s medical discipline. Changing practice mode alters consultation workbenches, prescription formats, and drug catalogs.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <label className={`relative flex cursor-pointer flex-col rounded-xl border p-4 shadow-2xs transition hover:border-primary-400 ${data.practice_type === 'homeopathy' ? 'border-primary-600 bg-white ring-2 ring-primary-500' : 'border-gray-200 bg-white/80'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">🌿</span>
                                            <span className="font-bold text-gray-900 text-sm">Homeopathy</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="practice_type"
                                            value="homeopathy"
                                            checked={data.practice_type === 'homeopathy'}
                                            onChange={(e) => setData('practice_type', e.target.value)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                                            disabled={!canUpdate}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 font-medium">হোমিওপ্যাথি চিকিৎসা</p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                        Classical case-taking, repertory scoring, potencies (CH, LM/Q, X), dilutions, and classical dietary restrictions.
                                    </p>
                                </label>

                                <label className={`relative flex cursor-pointer flex-col rounded-xl border p-4 shadow-2xs transition hover:border-primary-400 ${data.practice_type === 'general_practice' ? 'border-primary-600 bg-white ring-2 ring-primary-500' : 'border-gray-200 bg-white/80'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">💊</span>
                                            <span className="font-bold text-gray-900 text-sm">General Practice</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="practice_type"
                                            value="general_practice"
                                            checked={data.practice_type === 'general_practice'}
                                            onChange={(e) => setData('practice_type', e.target.value)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                                            disabled={!canUpdate}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 font-medium">সাধারণ / এলোপ্যাথি চিকিৎসা</p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                        Provisional &amp; final diagnosis, brand and generic drug catalog (mg/ml), lab investigation orders (CBC, LFT, USG).
                                    </p>
                                </label>

                                <label className={`relative flex cursor-pointer flex-col rounded-xl border p-4 shadow-2xs transition hover:border-primary-400 ${data.practice_type === 'integrative_dual' ? 'border-primary-600 bg-white ring-2 ring-primary-500' : 'border-gray-200 bg-white/80'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">⚖️</span>
                                            <span className="font-bold text-gray-900 text-sm">Integrative / Dual</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="practice_type"
                                            value="integrative_dual"
                                            checked={data.practice_type === 'integrative_dual'}
                                            onChange={(e) => setData('practice_type', e.target.value)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                                            disabled={!canUpdate}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 font-medium">সমন্বিত / উভয় পদ্ধতি</p>
                                    <p className="text-[11px] text-gray-500 leading-relaxed">
                                        Multi-disciplinary polyclinic mode. Prescribe both homeopathic remedies and conventional pharmaceuticals with lab orders.
                                    </p>
                                </label>
                            </div>
                            {errors.practice_type && <p className="mt-2 text-xs text-red-600 font-semibold">{errors.practice_type}</p>}
                        </div>

                        {/* Pharmacy Inventory Configuration */}
                        <div className="border-b p-6 bg-emerald-50/30">
                            <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                <span>📦</span> Pharmacy &amp; Inventory Settings (ফার্মেসি ও স্টক কনফিগারেশন)
                            </h3>
                            <p className="mb-4 text-sm text-gray-500">
                                Configure real-time stock deduction behavior when clinical prescriptions are finalized.
                            </p>
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    name="auto_deduct_inventory"
                                    checked={Boolean(data.auto_deduct_inventory)}
                                    onChange={(e) => setData('auto_deduct_inventory', e.target.checked)}
                                    disabled={!canUpdate}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-gray-800">
                                        Auto-Deduct Stock on Prescription Finalization (প্রেসক্রিপশন সমাপ্তে স্বয়ংক্রিয় স্টক কর্তন)
                                    </span>
                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                        When enabled, finalizing a visit automatically deduces dispensed remedy/pharmaceutical quantities from the earliest-expiring active batches (FIFO) and logs stock ledger transactions.
                                    </p>
                                </div>
                            </label>
                            {errors.auto_deduct_inventory && <p className="mt-2 text-xs text-red-600 font-semibold">{errors.auto_deduct_inventory}</p>}
                        </div>

                        {/* Patient Billing & Invoicing Configuration */}
                        <div className="border-b p-6 bg-blue-50/20">
                            <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                <span>🧾</span> Patient Billing &amp; Invoicing Defaults (বিলিং ও ফি কনফিগারেশন)
                            </h3>
                            <p className="mb-4 text-sm text-gray-500">
                                Set default consultation fees and print receipt notes applied during invoice generation.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Default Doctor Consultation Fee (ডিফল্ট ডাক্তারের ফি - ৳)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="10"
                                        value={data.default_consultation_fee}
                                        onChange={(e) => setData('default_consultation_fee', e.target.value)}
                                        disabled={!canUpdate}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    {errors.default_consultation_fee && <p className="mt-1 text-xs text-red-600">{errors.default_consultation_fee}</p>}
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">
                                        Invoice Receipt Footer Note (রিসিপ্টের নিচের বার্তা)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Thank you for choosing us for your health."
                                        value={data.invoice_footer_note}
                                        onChange={(e) => setData('invoice_footer_note', e.target.value)}
                                        disabled={!canUpdate}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                    {errors.invoice_footer_note && <p className="mt-1 text-xs text-red-600">{errors.invoice_footer_note}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Clinic Identity & Branding */}
                        <div className="border-b p-6 bg-slate-50/50">
                            <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                <span>🎨</span> Clinic Identity &amp; Branding (লোগো ও ফেভিকন)
                            </h3>
                            <p className="mb-5 text-sm text-gray-500">
                                Upload your official clinic logo and browser favicon. These are automatically reflected on the Admin Dashboard, Public Website, and Prescription PDF.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Logo Card */}
                                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Clinic Logo (ক্লিনিক লোগো)</label>
                                    <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/60 p-2 overflow-hidden">
                                        {currentLogo ? (
                                            <img src={currentLogo} alt="Clinic Logo" className="max-h-full max-w-full object-contain" />
                                        ) : (
                                            <div className="text-center text-xs text-gray-400">
                                                <span className="block text-2xl mb-1">🏥</span>
                                                No custom logo uploaded (Default icon used)
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className={`cursor-pointer rounded-md bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {currentLogo ? 'Change Logo' : 'Upload Logo'}
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                                disabled={!canUpdate}
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setData((prev) => ({ ...prev, logo: file, remove_logo: false }));
                                                    }
                                                }}
                                            />
                                        </label>
                                        {currentLogo && (
                                            <button
                                                type="button"
                                                disabled={!canUpdate}
                                                onClick={() => {
                                                    setData((prev) => ({ ...prev, logo: null, remove_logo: true }));
                                                }}
                                                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                                            >
                                                Remove Logo
                                            </button>
                                        )}
                                    </div>
                                    {errors.logo && <p className="mt-1 text-xs text-red-600">{errors.logo}</p>}
                                    <p className="mt-2 text-[11px] text-gray-400">Recommended: Transparent PNG or SVG. Max: 2 MB.</p>
                                </div>

                                {/* Favicon Card */}
                                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
                                    <label className="block text-sm font-semibold text-gray-800 mb-2">Browser Favicon (ব্রাউজার আইকন)</label>
                                    <div className="mb-3 flex h-28 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50/60 p-2 overflow-hidden">
                                        {currentFavicon ? (
                                            <img src={currentFavicon} alt="Clinic Favicon" className="h-12 w-12 object-contain" />
                                        ) : (
                                            <div className="text-center text-xs text-gray-400">
                                                <span className="block text-2xl mb-1">🌐</span>
                                                Default SVG favicon active
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className={`cursor-pointer rounded-md bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {currentFavicon ? 'Change Favicon' : 'Upload Favicon'}
                                            <input
                                                type="file"
                                                accept="image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                                                disabled={!canUpdate}
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setData((prev) => ({ ...prev, favicon: file, remove_favicon: false }));
                                                    }
                                                }}
                                            />
                                        </label>
                                        {currentFavicon && (
                                            <button
                                                type="button"
                                                disabled={!canUpdate}
                                                onClick={() => {
                                                    setData((prev) => ({ ...prev, favicon: null, remove_favicon: true }));
                                                }}
                                                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                                            >
                                                Reset Favicon
                                            </button>
                                        )}
                                    </div>
                                    {errors.favicon && <p className="mt-1 text-xs text-red-600">{errors.favicon}</p>}
                                    <p className="mt-2 text-[11px] text-gray-400">Recommended: Square format (32x32, 64x64). ICO, PNG, or SVG. Max: 1 MB.</p>
                                </div>
                            </div>
                        </div>

                        <div className="border-b p-6">
                            <h3 className="mb-4 text-base font-bold text-gray-700">General Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Clinic Name (English)" value={data.clinic_name_en} onChange={(event) => setData('clinic_name_en', event.target.value)} />
                                <InputField label="Clinic Name (Bangla)" value={data.clinic_name_bn} onChange={(event) => setData('clinic_name_bn', event.target.value)} />
                                <InputField label="Phone" type="tel" value={data.phone} onChange={(event) => setData('phone', event.target.value)} />
                                <InputField label="Address" value={data.address} onChange={(event) => setData('address', event.target.value)} full />
                            </div>
                        </div>

                        <div className="border-b p-6">
                            <h3 className="mb-4 text-base font-bold text-gray-700">About Page Content</h3>
                            <p className="mb-4 text-sm text-gray-500">Provide clinic background and philosophy for the public About page (avoid unverified cure or guarantee claims).</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">About Clinic (English)</label>
                                    <textarea
                                        rows={4}
                                        value={data.about_text}
                                        onChange={(event) => setData('about_text', event.target.value)}
                                        placeholder="Enter English description for the About page..."
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">About Clinic (Bangla)</label>
                                    <textarea
                                        rows={4}
                                        value={data.about_text_bn}
                                        onChange={(event) => setData('about_text_bn', event.target.value)}
                                        placeholder="বাংলায় ক্লিনিক পরিচিতি লিখুন..."
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-b p-6">
                            <h3 className="mb-1 text-base font-bold text-gray-700">Visiting Hours</h3>
                            <p className="mb-5 text-sm text-gray-500">Configure how your business hours appear on the public website.</p>
                            <VisitingHoursBuilder
                                schedule={data.visiting_hours_schedule}
                                onScheduleChange={(value) => setData('visiting_hours_schedule', value)}
                                canUpdate={canUpdate}
                            />
                        </div>

                        <div className="border-b p-6">
                            <h3 className="mb-4 text-base font-bold text-gray-700">Public Website Footer</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Footer Text" value={data.footer_text} onChange={(event) => setData('footer_text', event.target.value)} placeholder="Copyright text" full />
                                <InputField label="Developer Name" value={data.developer_name} onChange={(event) => setData('developer_name', event.target.value)} />
                                <InputField label="Developer Link (URL)" type="url" value={data.developer_link} onChange={(event) => setData('developer_link', event.target.value)} placeholder="https://yourwebsite.com" />
                            </div>
                        </div>

                        <div className="p-6">
                            <button
                                type="submit"
                                disabled={!canUpdate || processing}
                                className="rounded-md bg-primary-600 px-8 py-2.5 font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                        </fieldset>
                    </form>
                </div>

                {/* Link to Dedicated Prescription Options Page */}
                <div className="mt-6 rounded-lg border border-primary-100 bg-primary-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
                    <div>
                        <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                            <span>⚙️</span> Prescription Options &amp; Presets (প্রেসক্রিপশন অপশন ও প্রিসেট)
                        </h4>
                        <p className="text-xs text-primary-700 mt-0.5">
                            Manage dosage units, meal relations, timing options, dilution instruction templates, and duration presets.
                        </p>
                    </div>
                    {canViewPrescriptionOptions ? <Link
                        href={route('admin.prescription_options.edit')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs shrink-0 self-start sm:self-auto"
                    >
                        Configure Prescription Options →
                    </Link> : <button type="button" disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white shadow-xs shrink-0 self-start sm:self-auto cursor-not-allowed opacity-50">
                        Configure Prescription Options →
                    </button>}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
