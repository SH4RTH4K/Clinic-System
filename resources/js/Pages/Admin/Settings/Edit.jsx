import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

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

function VisitingHoursBuilder({ schedule, onScheduleChange }) {
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
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-lg font-bold text-blue-600 transition hover:bg-blue-100"
                                                    >
                                                        +
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => removeSlot(day, index)}
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

export default function Edit({ settings }) {
    const savedSchedule = settings?.visiting_hours_schedule;
    const initialMode = savedSchedule
        ? (isOldFormat(savedSchedule) ? 'selected_hours' : (savedSchedule.mode || 'selected_hours'))
        : 'selected_hours';
    const initialSchedule = {
        mode: initialMode,
        days: buildInitialDays(savedSchedule),
    };

    const { data, setData, put, processing } = useForm({
        clinic_name_en: settings?.clinic_name_en || '',
        clinic_name_bn: settings?.clinic_name_bn || '',
        about_text: settings?.about_text || '',
        about_text_bn: settings?.about_text_bn || '',
        phone: settings?.phone || '',
        address: settings?.address || '',
        visiting_hours: settings?.visiting_hours || '',
        patient_no_series: settings?.patient_no_series || '',
        patient_no_next: settings?.patient_no_next || 1,
        footer_text: settings?.footer_text || '',
        developer_name: settings?.developer_name || '',
        developer_link: settings?.developer_link || '',
        visiting_hours_schedule: initialSchedule,
    });

    const submit = (event) => {
        event.preventDefault();
        put(route('admin.settings.update'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Clinic Settings</h2>}>
            <Head title="Settings" />
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                    <form onSubmit={submit}>
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
                            />
                        </div>

                        <div className="border-b p-6">
                            <h3 className="mb-4 text-base font-bold text-gray-700">Patient Numbering</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Patient No. Series Prefix" value={data.patient_no_series} onChange={(event) => setData('patient_no_series', event.target.value)} />
                                <InputField label="Next Patient Number" type="number" value={data.patient_no_next} onChange={(event) => setData('patient_no_next', event.target.value)} />
                            </div>
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
                                disabled={processing}
                                className="rounded-md bg-primary-600 px-8 py-2.5 font-semibold text-white shadow transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
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
                    <Link
                        href={route('admin.prescription_options.edit')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs shrink-0 self-start sm:self-auto"
                    >
                        Configure Prescription Options →
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
