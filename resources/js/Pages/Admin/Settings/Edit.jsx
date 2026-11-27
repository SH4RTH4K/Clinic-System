import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import usePermission from '@/Components/usePermission';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const HOURS_MODES = [
    { value: 'no_hours', label: 'No Hours Available', desc: "Visitors won't see business hours on this page" },
    { value: 'always_open', label: 'Always Open', desc: 'e.g. 24/7 emergency or hospital units' },
    { value: 'permanently_closed', label: 'Permanently Closed', desc: 'This business has permanently closed' },
    { value: 'temporarily_closed', label: 'Temporarily Closed', desc: 'e.g. closed for renovation / vacation' },
    { value: 'selected_hours', label: 'Open on Selected Hours', desc: 'Input custom daily chamber hours' },
];

const SECTIONS = [
    { id: 'all', label: 'All Settings', icon: '⚙️' },
    { id: 'practice', label: 'Practice Mode', icon: '🩺' },
    { id: 'pharmacy', label: 'Stock & Pharmacy', icon: '📦' },
    { id: 'billing', label: 'Billing & bKash', icon: '🧾' },
    { id: 'branding', label: 'Branding & Identity', icon: '🎨' },
    { id: 'general', label: 'General Info', icon: '🏥' },
    { id: 'hours', label: 'Visiting Hours', icon: '🕒' },
    { id: 'website', label: 'Website & About', icon: '🌐' },
];

const InputField = ({ label, value, onChange, type = 'text', placeholder = '', full = false, highlighted = false }) => (
    <div className={`${full ? 'col-span-1 sm:col-span-2' : ''} ${highlighted ? 'p-2 rounded-lg bg-emerald-50/40 ring-1 ring-emerald-400' : ''}`}>
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full rounded-md border-gray-300 text-sm shadow-xs focus:border-primary-500 focus:ring-primary-500"
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
    const removeSlot = (day, index) => updateDay(day, (days[day] || []).filter((_, currentIndex) => currentIndex !== index));

    const updateSlot = (day, index, field, value) => {
        const updated = (days[day] || []).map((slot, currentIndex) => (
            currentIndex === index ? { ...slot, [field]: value } : slot
        ));

        updateDay(day, updated);
    };

    // Accelerators
    const copySundayToWorkingDays = () => {
        const sundaySlots = days['Sunday'] || [];
        const nextDays = { ...days };
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].forEach((day) => {
            nextDays[day] = JSON.parse(JSON.stringify(sundaySlots));
        });
        onScheduleChange({ ...schedule, days: nextDays });
    };

    const setFridayClosed = () => {
        onScheduleChange({
            ...schedule,
            days: { ...days, Friday: [] },
        });
    };

    const applyStandardOpdHours = () => {
        const standardSlots = [{ from: '09:00', to: '21:00' }];
        const nextDays = {};
        DAYS.forEach((day) => {
            nextDays[day] = day === 'Friday' ? [] : JSON.parse(JSON.stringify(standardSlots));
        });
        onScheduleChange({ ...schedule, days: nextDays });
    };

    return (
        <div>
            {/* Quick Accelerators Toolbar */}
            {mode === 'selected_hours' && canUpdate && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
                    <span className="text-xs font-bold text-blue-900">⚡ Fast-Track Schedule Shortcuts:</span>
                    <button
                        type="button"
                        onClick={copySundayToWorkingDays}
                        className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-2xs border border-blue-200 hover:bg-blue-50 transition"
                    >
                        📋 Copy Sunday to Working Days (Sun-Thu)
                    </button>
                    <button
                        type="button"
                        onClick={setFridayClosed}
                        className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-2xs border border-amber-200 hover:bg-amber-50 transition"
                    >
                        🕌 Set Friday Closed / Off
                    </button>
                    <button
                        type="button"
                        onClick={applyStandardOpdHours}
                        className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-2xs border border-emerald-200 hover:bg-emerald-50 transition"
                    >
                        ⚡ Standard 9 AM - 9 PM OPD
                    </button>
                </div>
            )}

            <div className="mb-6 space-y-3">
                {HOURS_MODES.map((hoursMode) => (
                    <label key={hoursMode.value} className="group flex cursor-pointer items-start gap-3">
                        <input
                            type="radio"
                            name="hours_mode"
                            value={hoursMode.value}
                            checked={mode === hoursMode.value}
                            onChange={() => setMode(hoursMode.value)}
                            className="mt-1 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                            <span className="text-sm font-semibold text-gray-800 group-hover:text-primary-600">{hoursMode.label}</span>
                            <p className="text-xs text-gray-500">{hoursMode.desc}</p>
                        </div>
                    </label>
                ))}
            </div>

            {mode === 'selected_hours' && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <div className="border-b bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Weekly Chamber Schedule (সাপ্তাহিক চেম্বার সূচি)
                    </div>
                    <div className="divide-y divide-gray-100">
                        {DAYS.map((day) => {
                            const slots = days[day] || [];

                            return (
                                <div key={day} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3.5 hover:bg-gray-50/80 transition">
                                    <div className="w-28 shrink-0 pt-1 text-sm font-semibold text-gray-800 flex items-center justify-between sm:block">
                                        <span>{day}</span>
                                        {slots.length === 0 && (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded sm:hidden">
                                                Closed
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        {slots.length === 0 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-1 items-center gap-2">
                                                    <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-1.5 text-xs text-gray-400">
                                                        <span>Closed / চেম্বার বন্ধ</span>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addSlot(day)}
                                                    disabled={!canUpdate}
                                                    className="flex h-8 px-2.5 shrink-0 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-xs font-bold text-primary-700 transition hover:bg-primary-100"
                                                >
                                                    + Add Hours
                                                </button>
                                            </div>
                                        ) : slots.map((slot, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                                                    <div className="flex-1">
                                                        <div className="mb-0.5 text-[9px] font-semibold text-gray-400 uppercase">Opening</div>
                                                        <input
                                                            type="time"
                                                            value={slot.from}
                                                            onChange={(event) => updateSlot(day, index, 'from', event.target.value)}
                                                            className="w-full border-0 bg-transparent p-0 text-sm text-gray-800 focus:outline-none focus:ring-0"
                                                        />
                                                    </div>
                                                </div>

                                                <span className="shrink-0 text-gray-400 font-bold">-</span>

                                                <div className="flex flex-1 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                                                    <div className="flex-1">
                                                        <div className="mb-0.5 text-[9px] font-semibold text-gray-400 uppercase">Closing</div>
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
                                                        title="Add another shift"
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-200 bg-primary-50 text-lg font-bold text-primary-700 transition hover:bg-primary-100"
                                                    >
                                                        +
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(day, index)}
                                                    disabled={!canUpdate}
                                                    title="Remove shift"
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-sm font-bold text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                                                >
                                                    ✕
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

export default function Edit({ settings, kpis = {}, logoUrl = null, faviconUrl = null }) {
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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState('all');

    const { data, setData, post, processing, errors } = useForm({
        _method: 'put',
        clinic_name_en: settings?.clinic_name_en || '',
        clinic_name_bn: settings?.clinic_name_bn || '',
        about_text: settings?.about_text || '',
        about_text_bn: settings?.about_text_bn || '',
        phone: settings?.phone || '',
        bkash_number: settings?.bkash_number || '',
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

    // Practice Mode Accelerators
    const applyHomeopathyPreset = () => {
        setData((prev) => ({
            ...prev,
            practice_type: 'homeopathy',
            auto_deduct_inventory: true,
            default_consultation_fee: 500,
        }));
    };

    const applyGeneralPracticePreset = () => {
        setData((prev) => ({
            ...prev,
            practice_type: 'general_practice',
            auto_deduct_inventory: true,
            default_consultation_fee: 600,
        }));
    };

    const applyIntegrativeDualPreset = () => {
        setData((prev) => ({
            ...prev,
            practice_type: 'integrative_dual',
            auto_deduct_inventory: true,
            default_consultation_fee: 800,
        }));
    };

    // In-page search evaluation
    const matchesSearch = (textToMatch) => {
        if (!searchQuery.trim()) return false;
        return (textToMatch || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    };

    // Section visibility filter
    const isSectionVisible = (sectionId, sectionKeywords = []) => {
        if (activeSection !== 'all' && activeSection !== sectionId) {
            return false;
        }
        if (!searchQuery.trim()) return true;

        const query = searchQuery.toLowerCase().trim();
        const sectionDef = SECTIONS.find((s) => s.id === sectionId);
        const allKeywords = [
            sectionId,
            sectionDef?.label || '',
            ...sectionKeywords,
        ].map((kw) => kw.toLowerCase());

        return allKeywords.some((kw) => kw.includes(query));
    };

    // Compute live stats
    const stats = useMemo(() => {
        const pType = data.practice_type;
        const pLabel = pType === 'homeopathy'
            ? '🌿 Classical Homeopathy'
            : pType === 'general_practice'
                ? '💊 General Practice'
                : '⚖️ Integrative Dual';

        let activeDays = 0;
        const daysObj = data.visiting_hours_schedule?.days || {};
        DAYS.forEach((d) => {
            if (daysObj[d] && daysObj[d].length > 0) activeDays++;
        });

        return {
            practice_label: pLabel,
            auto_deduct: data.auto_deduct_inventory,
            fee: data.default_consultation_fee,
            has_logo: Boolean(currentLogo),
            has_favicon: Boolean(currentFavicon),
            active_days: activeDays,
            schedule_mode: data.visiting_hours_schedule?.mode || 'selected_hours',
            bkash_number: data.bkash_number,
        };
    }, [data, currentLogo, currentFavicon]);

    return (
        <AuthenticatedLayout>
            <Head title="Clinic Master Settings" />

            <div className="space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Clinic Master Settings & Practice Policies (ক্লিনিক মাস্টার সেটিংস ও চিকিৎসা নীতি)"
                    subtitle="Configure medical practice mode, pharmacy auto-deduction, patient consultation fees, MFS bKash payment, branding, and visiting hours"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.general_settings.edit')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🔢</span> Patient Numbering
                            </Link>
                            <Link
                                href={route('admin.prescription_options.edit')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>📝</span> Rx Presets
                            </Link>
                            <Link
                                href={route('admin.doctors.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>👨‍⚕️</span> Doctors
                            </Link>
                            <Link
                                href={route('admin.queue.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🎟️</span> Queue
                            </Link>
                        </div>
                    }
                />

                {/* Executive KPI Summary Ribbon (5 Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-primary-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">Practice Mode 🩺</div>
                        <div className="text-sm font-bold text-gray-900 mt-1 truncate">{stats.practice_label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">চিকিৎসা পদ্ধতি কনফিগারেশন</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Pharmacy Stock 📦</div>
                        <div className="text-sm font-bold text-emerald-800 mt-1">
                            {stats.auto_deduct ? 'FIFO Auto-Deduct' : 'Manual Dispense'}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">
                            {stats.auto_deduct ? 'প্রেসক্রিপশনে স্বয়ংক্রিয় কর্তন' : 'ম্যানুয়াল স্টক পরিচালনা'}
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Consultation Fee ৳</div>
                        <div className="text-xl font-bold text-blue-900 mt-1">৳{stats.fee}</div>
                        <div className="text-[11px] text-blue-600 mt-0.5">ডিফল্ট ডাক্তারের ভিজিট ফি</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Branding Assets 🎨</div>
                        <div className="text-sm font-bold text-purple-900 mt-1">
                            {stats.has_logo ? 'Custom Logo' : 'Default Icon'} / {stats.has_favicon ? 'Favicon' : 'SVG'}
                        </div>
                        <div className="text-[11px] text-purple-600 mt-0.5">লোগো ও ফেভিকন স্ট্যাটাস</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Visiting Schedule 🕒</div>
                        <div className="text-sm font-bold text-amber-900 mt-1">
                            {stats.schedule_mode === 'selected_hours' ? `${stats.active_days} Days Active` : stats.schedule_mode}
                        </div>
                        <div className="text-[11px] text-amber-600 mt-0.5">সাপ্তাহিক চেম্বার সময়সূচি</div>
                    </div>
                </div>

                {/* Real-time In-Page Search Bar & Category Navigation Strip */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search settings (e.g. practice mode, bkash, consultation fee, inventory, hours, logo, address)..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                                ⚡ Filter Active
                            </span>
                        )}
                    </div>

                    {/* Category Filter Tabs Strip */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs scrollbar-none">
                        {SECTIONS.map((sec) => (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => setActiveSection(sec.id)}
                                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition ${
                                    activeSection === sec.id
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <span>{sec.icon}</span>
                                <span>{sec.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Settings Form */}
                <div className="overflow-hidden bg-white shadow-2xs rounded-xl border border-gray-200">
                    <form onSubmit={submit}>
                        <fieldset disabled={!canUpdate} className="contents">

                        {/* SECTION 1: Practice Mode Selection */}
                        {isSectionVisible('practice', ['homeopathy', 'general practice', 'allopathy', 'integrative', 'dual', 'case-taking', 'repertory', 'diagnosis', 'potency']) && (
                            <div className="border-b p-5 sm:p-6 bg-primary-50/20">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                            <span>🩺</span> Practice Mode Configuration (চিকিৎসা পদ্ধতি)
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Configure RemediQ to adapt to your clinic&apos;s medical discipline. Changing practice mode alters consultation workbenches, prescription formats, and drug catalogs.
                                        </p>
                                    </div>

                                    {/* 1-Click Practice Presets */}
                                    {canUpdate && (
                                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={applyHomeopathyPreset}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 transition"
                                            >
                                                🌿 Classical Pack
                                            </button>
                                            <button
                                                type="button"
                                                onClick={applyGeneralPracticePreset}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition"
                                            >
                                                💊 General Pack
                                            </button>
                                            <button
                                                type="button"
                                                onClick={applyIntegrativeDualPreset}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-purple-300 bg-white text-purple-700 hover:bg-purple-50 transition"
                                            >
                                                ⚖️ Dual Pack
                                            </button>
                                        </div>
                                    )}
                                </div>

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
                                        <p className="text-xs text-gray-600 mb-1.5 font-medium">হোমিওপ্যাথি চিকিৎসা</p>
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
                                        <p className="text-xs text-gray-600 mb-1.5 font-medium">সাধারণ / এলোপ্যাথি চিকিৎসা</p>
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
                                        <p className="text-xs text-gray-600 mb-1.5 font-medium">সমন্বিত / উভয় পদ্ধতি</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">
                                            Multi-disciplinary polyclinic mode. Prescribe both homeopathic remedies and conventional pharmaceuticals with lab orders.
                                        </p>
                                    </label>
                                </div>
                                {errors.practice_type && <p className="mt-2 text-xs text-red-600 font-semibold">{errors.practice_type}</p>}
                            </div>
                        )}

                        {/* SECTION 2: Pharmacy Inventory Configuration */}
                        {isSectionVisible('pharmacy', ['inventory', 'stock', 'deduct', 'fifo', 'batch', 'pharmacy', 'dispense']) && (
                            <div className="border-b p-5 sm:p-6 bg-emerald-50/20">
                                <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>📦</span> Pharmacy &amp; Inventory Settings (ফার্মেসি ও স্টক কনফিগারেশন)
                                </h3>
                                <p className="mb-4 text-xs text-gray-500">
                                    Configure real-time stock deduction behavior when clinical prescriptions are finalized.
                                </p>
                                <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
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
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                            When enabled, finalizing a visit automatically deduces dispensed remedy/pharmaceutical quantities from the earliest-expiring active batches (FIFO) and logs stock ledger transactions.
                                        </p>
                                    </div>
                                </label>
                                {errors.auto_deduct_inventory && <p className="mt-2 text-xs text-red-600 font-semibold">{errors.auto_deduct_inventory}</p>}
                            </div>
                        )}

                        {/* SECTION 3: Patient Billing & bKash MFS Configuration */}
                        {isSectionVisible('billing', ['billing', 'bkash', 'mfs', 'fee', 'consultation', 'invoice', 'receipt', 'note', 'payment', 'cashless']) && (
                            <div className="border-b p-5 sm:p-6 bg-blue-50/20">
                                <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>🧾</span> Patient Billing, Consultation Fees &amp; bKash MFS (বিলিং ও ফি)
                                </h3>
                                <p className="mb-4 text-xs text-gray-500">
                                    Set default consultation fees, Mobile Financial Service (MFS) payment details, and receipt footer notes.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Default Doctor Consultation Fee (ডিফল্ট ডাক্তারের ফি - ৳)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold text-sm">৳</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="10"
                                                value={data.default_consultation_fee}
                                                onChange={(e) => setData('default_consultation_fee', e.target.value)}
                                                disabled={!canUpdate}
                                                className="w-full rounded-md border-gray-300 pl-8 text-sm shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                            />
                                        </div>
                                        {errors.default_consultation_fee && <p className="mt-1 text-xs text-red-600">{errors.default_consultation_fee}</p>}
                                    </div>

                                    {/* Dedicated bKash MFS Card */}
                                    <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-3.5">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-pink-900">
                                                bKash / MFS Number (বিকাশ মার্চেন্ট / পার্সোনাল নম্বর)
                                            </label>
                                            <span className="text-[10px] font-bold text-pink-700 bg-pink-100 border border-pink-200 px-1.5 py-0.5 rounded">
                                                Cashless Payment
                                            </span>
                                        </div>
                                        <input
                                            type="tel"
                                            placeholder="e.g. 01700-000000 (Merchant/Personal)"
                                            value={data.bkash_number}
                                            onChange={(e) => setData('bkash_number', e.target.value)}
                                            disabled={!canUpdate}
                                            className="w-full rounded-md border-pink-300 text-sm shadow-xs focus:border-pink-500 focus:ring-pink-500 bg-white"
                                        />
                                        {errors.bkash_number && <p className="mt-1 text-xs text-red-600">{errors.bkash_number}</p>}
                                        <p className="mt-1 text-[11px] text-pink-700">
                                            Displayed on patient token slips &amp; POS billing invoices for quick QR / direct send-money fee payment.
                                        </p>
                                    </div>

                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            Invoice Receipt Footer Note (রিসিপ্টের নিচের বার্তা)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Thank you for choosing us for your health."
                                            value={data.invoice_footer_note}
                                            onChange={(e) => setData('invoice_footer_note', e.target.value)}
                                            disabled={!canUpdate}
                                            className="w-full rounded-md border-gray-300 text-sm shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                        />
                                        {errors.invoice_footer_note && <p className="mt-1 text-xs text-red-600">{errors.invoice_footer_note}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECTION 4: Clinic Identity & Branding */}
                        {isSectionVisible('branding', ['branding', 'logo', 'favicon', 'identity', 'image', 'icon', 'graphic']) && (
                            <div className="border-b p-5 sm:p-6 bg-slate-50/50">
                                <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>🎨</span> Clinic Identity &amp; Branding (লোগো ও ফেভিকন)
                                </h3>
                                <p className="mb-5 text-xs text-gray-500">
                                    Upload your official clinic logo and browser favicon. These are automatically reflected on the Admin Dashboard, Public Website, and Prescription PDF.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Logo Card */}
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs">
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
                                    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-2xs">
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
                        )}

                        {/* SECTION 5: General Clinic Information */}
                        {isSectionVisible('general', ['clinic', 'name', 'phone', 'address', 'bangla', 'english', 'contact']) && (
                            <div className="border-b p-5 sm:p-6">
                                <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>🏥</span> General Information (সাধারণ ক্লিনিক তথ্য)
                                </h3>
                                <p className="mb-4 text-xs text-gray-500">Official clinic legal title, telephone contacts, and physical address.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField
                                        label="Clinic Name (English)"
                                        value={data.clinic_name_en}
                                        onChange={(event) => setData('clinic_name_en', event.target.value)}
                                        highlighted={matchesSearch('Clinic Name (English)') || matchesSearch(data.clinic_name_en)}
                                    />
                                    <InputField
                                        label="Clinic Name (Bangla)"
                                        value={data.clinic_name_bn}
                                        onChange={(event) => setData('clinic_name_bn', event.target.value)}
                                        highlighted={matchesSearch('Clinic Name (Bangla)') || matchesSearch(data.clinic_name_bn)}
                                    />
                                    <InputField
                                        label="Primary Clinic Phone Number"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(event) => setData('phone', event.target.value)}
                                        highlighted={matchesSearch('Phone') || matchesSearch(data.phone)}
                                    />
                                    <InputField
                                        label="Visiting Hours Text (Short Summary)"
                                        value={data.visiting_hours}
                                        onChange={(event) => setData('visiting_hours', event.target.value)}
                                        placeholder="e.g. Daily 9:00 AM - 9:00 PM (Fri Closed)"
                                        highlighted={matchesSearch('Visiting Hours') || matchesSearch(data.visiting_hours)}
                                    />
                                    <InputField
                                        label="Physical Chamber Address"
                                        value={data.address}
                                        onChange={(event) => setData('address', event.target.value)}
                                        full
                                        highlighted={matchesSearch('Address') || matchesSearch(data.address)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* SECTION 6: Visiting Hours Builder */}
                        {isSectionVisible('hours', ['hours', 'visiting', 'schedule', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'closed', 'opening', 'closing']) && (
                            <div className="border-b p-5 sm:p-6">
                                <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>🕒</span> Visiting Hours &amp; Weekly Schedule (চেম্বার সময়সূচি)
                                </h3>
                                <p className="mb-5 text-xs text-gray-500">Configure how your business hours appear on the public website and patient portals.</p>
                                <VisitingHoursBuilder
                                    schedule={data.visiting_hours_schedule}
                                    onScheduleChange={(value) => setData('visiting_hours_schedule', value)}
                                    canUpdate={canUpdate}
                                />
                            </div>
                        )}

                        {/* SECTION 7: Public Website & About Content */}
                        {isSectionVisible('website', ['website', 'about', 'footer', 'developer', 'copyright', 'url']) && (
                            <div className="border-b p-5 sm:p-6 bg-slate-50/30">
                                <h3 className="mb-1 text-base font-bold text-gray-800 flex items-center gap-2">
                                    <span>🌐</span> Public Website &amp; About Page Content (ওয়েবসাইট পরিচিতি)
                                </h3>
                                <p className="mb-4 text-xs text-gray-500">Provide clinic background and philosophy for the public About page (avoid unverified cure or guarantee claims).</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">About Clinic (English)</label>
                                        <textarea
                                            rows={4}
                                            value={data.about_text}
                                            onChange={(event) => setData('about_text', event.target.value)}
                                            placeholder="Enter English description for the About page..."
                                            className="w-full rounded-md border-gray-300 text-sm shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">About Clinic (Bangla)</label>
                                        <textarea
                                            rows={4}
                                            value={data.about_text_bn}
                                            onChange={(event) => setData('about_text_bn', event.target.value)}
                                            placeholder="বাংলায় ক্লিনিক পরিচিতি লিখুন..."
                                            className="w-full rounded-md border-gray-300 text-sm shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <InputField
                                            label="Public Footer Copyright Text"
                                            value={data.footer_text}
                                            onChange={(event) => setData('footer_text', event.target.value)}
                                            placeholder="e.g. All Rights Reserved"
                                            full
                                        />
                                        <InputField
                                            label="Developer Attribution Name"
                                            value={data.developer_name}
                                            onChange={(event) => setData('developer_name', event.target.value)}
                                        />
                                        <InputField
                                            label="Developer Link (URL)"
                                            type="url"
                                            value={data.developer_link}
                                            onChange={(event) => setData('developer_link', event.target.value)}
                                            placeholder="https://yourwebsite.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Desktop Save Action */}
                        <div className="p-5 sm:p-6 bg-gray-50 flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                                {canUpdate ? 'Changes take effect immediately across all clinical workflows.' : 'You have view-only access.'}
                            </span>
                            <button
                                type="submit"
                                disabled={!canUpdate || processing}
                                className="rounded-lg bg-primary-600 px-7 py-2.5 font-bold text-sm text-white shadow-2xs transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : '💾 Save Clinic Settings'}
                            </button>
                        </div>
                        </fieldset>
                    </form>
                </div>

                {/* Mobile Sticky Save Drawer */}
                {canUpdate && (
                    <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 sm:hidden flex items-center justify-between shadow-lg">
                        <div className="text-xs text-gray-600 font-medium">
                            {processing ? 'Processing changes...' : 'Ready to save'}
                        </div>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={processing}
                            className="rounded-lg bg-primary-600 px-5 py-2 font-bold text-xs text-white shadow-2xs transition hover:bg-primary-700 disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : '💾 Save Settings'}
                        </button>
                    </div>
                )}

                {/* Link to Dedicated Prescription Options Page */}
                <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
                    <div>
                        <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                            <span>⚙️</span> Prescription Options &amp; Clinical Presets (প্রেসক্রিপশন অপশন ও প্রিসেট)
                        </h4>
                        <p className="text-xs text-primary-700 mt-0.5">
                            Manage dosage units, meal relations, timing options, dilution instruction templates, and duration presets.
                        </p>
                    </div>
                    {canViewPrescriptionOptions ? (
                        <Link
                            href={route('admin.prescription_options.edit')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-2xs shrink-0 self-start sm:self-auto"
                        >
                            Configure Prescription Options →
                        </Link>
                    ) : (
                        <button type="button" disabled className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white shadow-2xs shrink-0 self-start sm:self-auto cursor-not-allowed opacity-50">
                            Configure Prescription Options →
                        </button>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
