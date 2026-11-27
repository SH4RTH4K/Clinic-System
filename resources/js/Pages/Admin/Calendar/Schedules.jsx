import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';

const CHAMBER_PRESETS = ['Chamber 1', 'Chamber 2', 'Chamber 3', 'OPD Room 1', 'Consultation Room'];

const LEAVE_REASON_PRESETS = [
    'Annual Vacation',
    'Medical Leave',
    'Clinical Conference',
    'Personal Emergency',
    'Religious Holiday',
];

export default function Schedules({ doctors = [], selectedDoctor = null, days = {}, kpis = {} }) {
    const { flash } = usePage().props;

    // Doctor Search state
    const [doctorSearch, setDoctorSearch] = useState('');

    // Mobile sub-tab switcher: 'shifts' | 'leaves'
    const [mobileTab, setMobileTab] = useState('shifts');

    // Filter doctors by search query
    const filteredDoctors = useMemo(() => {
        const q = doctorSearch.trim().toLowerCase();
        if (!q) return doctors;
        return doctors.filter(
            (doc) =>
                (doc.name && doc.name.toLowerCase().includes(q)) ||
                (doc.specialty && doc.specialty.toLowerCase().includes(q)) ||
                (doc.phone && doc.phone.includes(q)) ||
                (doc.qualifications && doc.qualifications.toLowerCase().includes(q))
        );
    }, [doctors, doctorSearch]);

    const handleDoctorSelect = (docId) => {
        router.get(route('admin.doctor_schedules.index'), { doctor_id: docId }, { preserveState: true });
    };

    // Pre-populate schedules form for the selected doctor
    const existingSchedules = selectedDoctor?.schedules || [];
    const initialScheduleRows = Object.entries(days).map(([dayNum, dayName]) => {
        const found = existingSchedules.find((s) => Number(s.day_of_week) === Number(dayNum));
        return {
            day_of_week: Number(dayNum),
            day_name: dayName,
            is_active: found ? Boolean(found.is_active) : Number(dayNum) !== 5, // Default active except Friday
            start_time: found ? String(found.start_time).slice(0, 5) : '09:00',
            end_time: found ? String(found.end_time).slice(0, 5) : '14:00',
            chamber_no: found?.chamber_no || 'Chamber 1',
            slot_duration_minutes: found?.slot_duration_minutes || 15,
            max_patients: found?.max_patients || 25,
        };
    });

    const {
        data: scheduleData,
        setData: setScheduleData,
        put: putSchedule,
        processing: savingSchedule,
    } = useForm({
        schedules: initialScheduleRows,
    });

    const handleScheduleChange = (index, field, value) => {
        const updated = [...scheduleData.schedules];
        updated[index][field] = value;
        setScheduleData('schedules', updated);
    };

    // 1-Click Fast-Track Accelerators
    const copySundayToWorkingDays = () => {
        const sunday = scheduleData.schedules.find((s) => s.day_of_week === 0) || scheduleData.schedules[0];
        const updated = scheduleData.schedules.map((row) => {
            // Days 1, 2, 3, 4 are Monday through Thursday
            if ([1, 2, 3, 4].includes(row.day_of_week)) {
                return {
                    ...row,
                    is_active: true,
                    start_time: sunday.start_time,
                    end_time: sunday.end_time,
                    chamber_no: sunday.chamber_no,
                    slot_duration_minutes: sunday.slot_duration_minutes,
                    max_patients: sunday.max_patients,
                };
            }
            return row;
        });
        setScheduleData('schedules', updated);
    };

    const applySundayToAllActive = () => {
        const sunday = scheduleData.schedules.find((s) => s.day_of_week === 0) || scheduleData.schedules[0];
        const updated = scheduleData.schedules.map((row) => {
            if (row.is_active) {
                return {
                    ...row,
                    start_time: sunday.start_time,
                    end_time: sunday.end_time,
                    chamber_no: sunday.chamber_no,
                    slot_duration_minutes: sunday.slot_duration_minutes,
                    max_patients: sunday.max_patients,
                };
            }
            return row;
        });
        setScheduleData('schedules', updated);
    };

    const setFridayOff = () => {
        const updated = scheduleData.schedules.map((row) => {
            if (row.day_of_week === 5) {
                return { ...row, is_active: false };
            }
            return row;
        });
        setScheduleData('schedules', updated);
    };

    const handleSaveSchedule = (e) => {
        e.preventDefault();
        putSchedule(route('admin.doctor_schedules.update', selectedDoctor.id));
    };

    // Form for adding a leave (single date or date range)
    const {
        data: leaveData,
        setData: setLeaveData,
        post: postLeave,
        processing: savingLeave,
        reset: resetLeave,
        errors: leaveErrors,
    } = useForm({
        leave_date: '',
        leave_date_end: '',
        reason: '',
    });

    const handleAddLeave = (e) => {
        e.preventDefault();
        postLeave(route('admin.doctor_schedules.leaves.store', selectedDoctor.id), {
            onSuccess: () => resetLeave(),
        });
    };

    const handleDeleteLeave = (leaveId) => {
        if (confirm('Are you sure you want to delete this scheduled leave date?')) {
            router.delete(route('admin.doctor_schedules.leaves.destroy', leaveId));
        }
    };

    return (
        <AuthenticatedLayout header="Doctor Visiting Schedules & Chamber Setup">
            <Head title="Doctor Visiting Schedules" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* RemediQ Standard Page Header */}
                <PageHeader
                    title="Visiting Schedules & Chamber Setup"
                    subtitle="Configure weekly consultation shifts, chamber rooms, and scheduled leaves for clinic physicians."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.doctors.index')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold border border-neutral-300 shadow-2xs transition"
                            >
                                <span>👨‍⚕️</span>
                                <span>Doctor Profiles</span>
                            </Link>
                            <Link
                                href={route('admin.calendar.index')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold border border-teal-200 shadow-2xs transition"
                            >
                                <span>📅</span>
                                <span>Visual Calendar</span>
                            </Link>
                            <Link
                                href={route('admin.queue.index')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold border border-neutral-300 shadow-2xs transition"
                            >
                                <span>🎟️</span>
                                <span>Live Queue</span>
                            </Link>
                            <Link
                                href={route('admin.appointment_requests.index')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold border border-neutral-300 shadow-2xs transition"
                            >
                                <span>📝</span>
                                <span>Intake Requests</span>
                            </Link>
                        </div>
                    }
                />

                {/* Session Warning / Conflict Flash Alert */}
                {flash?.warning && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs flex items-start gap-3">
                        <span className="text-xl shrink-0">⚠️</span>
                        <div className="text-xs space-y-1">
                            <div className="font-bold text-amber-950">Booking Conflict Warning</div>
                            <div>{flash.warning}</div>
                            <div className="pt-1">
                                <Link
                                    href={route('admin.calendar.index')}
                                    className="font-bold underline text-amber-800 hover:text-amber-950"
                                >
                                    Open Visual Calendar to reschedule affected appointments →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Executive KPI Summary Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Total Doctors
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-neutral-900">
                                {kpis.total_doctors ?? doctors.length}
                            </span>
                            <span className="text-[11px] text-teal-600 font-semibold">Active</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Consulting Days
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-teal-700">
                                {kpis.active_days ?? 0}
                            </span>
                            <span className="text-[11px] text-neutral-500">/ 7 Days</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Weekly Shift Hours
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-indigo-700">
                                {kpis.weekly_hours ?? 0}
                            </span>
                            <span className="text-[11px] text-neutral-500">Hours/Wk</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Primary Chamber
                        </span>
                        <div className="mt-1 truncate">
                            <span className="text-base font-bold text-neutral-900 font-mono">
                                {kpis.assigned_chamber || 'Chamber 1'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Upcoming Leaves
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-amber-600">
                                {kpis.upcoming_leaves ?? selectedDoctor?.leaves?.length ?? 0}
                            </span>
                            <span className="text-[11px] text-neutral-500">Scheduled</span>
                        </div>
                    </div>
                </div>

                {/* Doctor Search & Multi-Doctor Selection Bar */}
                <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                                Select Practitioner:
                            </span>
                            <span className="text-xs text-neutral-400">
                                ({filteredDoctors.length} of {doctors.length} Doctors)
                            </span>
                        </div>

                        {/* Instant Doctor Search Bar */}
                        <div className="relative w-full sm:w-72">
                            <input
                                type="text"
                                value={doctorSearch}
                                onChange={(e) => setDoctorSearch(e.target.value)}
                                placeholder="Search by doctor name or specialty..."
                                className="w-full text-xs rounded-xl border-neutral-300 pr-8 pl-8 py-2 focus:border-teal-500 focus:ring-teal-500"
                            />
                            <span className="absolute left-2.5 top-2.5 text-neutral-400 text-xs">🔍</span>
                            {doctorSearch && (
                                <button
                                    type="button"
                                    onClick={() => setDoctorSearch('')}
                                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 text-xs p-1"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Mobile Native Doctor Selector Dropdown (< 640px) */}
                    <div className="block sm:hidden">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1 block">
                            Quick Switch Doctor:
                        </label>
                        <select
                            value={selectedDoctor?.id || ''}
                            onChange={(e) => handleDoctorSelect(e.target.value)}
                            className="w-full text-xs font-semibold rounded-xl border-neutral-300 py-2.5 bg-neutral-50 focus:border-teal-500 focus:ring-teal-500"
                        >
                            {filteredDoctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Desktop/Tablet Doctor Tabs Strip */}
                    <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
                        {filteredDoctors.length > 0 ? (
                            filteredDoctors.map((doc) => {
                                const isSelected = String(selectedDoctor?.id) === String(doc.id);
                                return (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        onClick={() => handleDoctorSelect(doc.id)}
                                        className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-2 border ${
                                            isSelected
                                                ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-600/20'
                                                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                                        }`}
                                    >
                                        <span>👨‍⚕️</span>
                                        <span>{doc.name}</span>
                                        {doc.specialty && (
                                            <span className={`text-[10px] ${isSelected ? 'opacity-90' : 'text-neutral-400'}`}>
                                                ({doc.specialty})
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-xs text-neutral-400 py-2 italic">
                                No doctors match "{doctorSearch}".
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Sub-Tab Switcher (< 1024px) */}
                <div className="flex lg:hidden bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                    <button
                        type="button"
                        onClick={() => setMobileTab('shifts')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center min-h-[44px] flex items-center justify-center gap-1.5 ${
                            mobileTab === 'shifts'
                                ? 'bg-white text-teal-800 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                        <span>🕒</span>
                        <span>Weekly Visiting Hours</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('leaves')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition text-center min-h-[44px] flex items-center justify-center gap-1.5 ${
                            mobileTab === 'leaves'
                                ? 'bg-white text-amber-800 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                    >
                        <span>🏖️</span>
                        <span>Leaves & Holidays</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                            {selectedDoctor?.leaves?.length || 0}
                        </span>
                    </button>
                </div>

                {selectedDoctor && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Weekly Shift Grid (2 cols on desktop) */}
                        <div
                            className={`lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4 ${
                                mobileTab === 'shifts' ? 'block' : 'hidden lg:block'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-neutral-200 gap-2">
                                <div>
                                    <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                                        <span>Weekly Consulting Shifts for</span>
                                        <span className="text-teal-700">{selectedDoctor.name}</span>
                                    </h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        Set chamber room, visiting hours, slot duration, and token caps for each day of the week.
                                    </p>
                                </div>
                            </div>

                            {/* 1-Click Fast-Track Accelerators Toolbar */}
                            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 space-y-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                    ⚡ Fast-Track Schedule Accelerators:
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={copySundayToWorkingDays}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                        title="Copy Sunday start/end times and chamber to Mon, Tue, Wed, Thu"
                                    >
                                        <span>📋</span>
                                        <span>Copy Sunday to Working Days (Mon–Thu)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applySundayToAllActive}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                        title="Apply Sunday timings across all currently active days"
                                    >
                                        <span>⚡</span>
                                        <span>Apply Sunday to All Active Days</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={setFridayOff}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                                        title="Mark Friday as Day Off"
                                    >
                                        <span>🕌</span>
                                        <span>Set Friday Off</span>
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSaveSchedule} className="space-y-4">
                                <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
                                    {scheduleData.schedules.map((row, idx) => (
                                        <div
                                            key={row.day_of_week}
                                            className={`p-4 flex flex-col gap-3 transition ${
                                                row.is_active ? 'bg-white' : 'bg-neutral-50/70 opacity-70'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        id={`day-${row.day_of_week}`}
                                                        checked={row.is_active}
                                                        onChange={(e) =>
                                                            handleScheduleChange(idx, 'is_active', e.target.checked)
                                                        }
                                                        className="h-4 w-4 rounded border-neutral-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                    />
                                                    <label
                                                        htmlFor={`day-${row.day_of_week}`}
                                                        className="text-sm font-bold text-neutral-900 cursor-pointer"
                                                    >
                                                        {row.day_name}
                                                    </label>
                                                </div>

                                                <span
                                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                                        row.is_active
                                                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                                            : 'bg-neutral-100 text-neutral-500'
                                                    }`}
                                                >
                                                    {row.is_active ? 'Active Consultation Day' : 'Day Off / Closed'}
                                                </span>
                                            </div>

                                            {row.is_active ? (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                                        <div>
                                                            <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
                                                                Start Time
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={row.start_time}
                                                                onChange={(e) =>
                                                                    handleScheduleChange(idx, 'start_time', e.target.value)
                                                                }
                                                                className="w-full text-xs rounded-lg border-neutral-300 p-2 font-mono min-h-[40px]"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
                                                                End Time
                                                            </label>
                                                            <input
                                                                type="time"
                                                                value={row.end_time}
                                                                onChange={(e) =>
                                                                    handleScheduleChange(idx, 'end_time', e.target.value)
                                                                }
                                                                className="w-full text-xs rounded-lg border-neutral-300 p-2 font-mono min-h-[40px]"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
                                                                Chamber Room
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={row.chamber_no}
                                                                onChange={(e) =>
                                                                    handleScheduleChange(idx, 'chamber_no', e.target.value)
                                                                }
                                                                placeholder="Chamber 1"
                                                                className="w-full text-xs rounded-lg border-neutral-300 p-2 min-h-[40px]"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-1">
                                                                Max Tokens
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={row.max_patients || ''}
                                                                onChange={(e) =>
                                                                    handleScheduleChange(
                                                                        idx,
                                                                        'max_patients',
                                                                        e.target.value ? Number(e.target.value) : null
                                                                    )
                                                                }
                                                                placeholder="e.g. 25"
                                                                className="w-full text-xs rounded-lg border-neutral-300 p-2 min-h-[40px]"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Quick Chamber Presets */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        <span className="text-[10px] text-neutral-400 font-semibold">
                                                            Chamber Presets:
                                                        </span>
                                                        {CHAMBER_PRESETS.map((room) => (
                                                            <button
                                                                key={room}
                                                                type="button"
                                                                onClick={() =>
                                                                    handleScheduleChange(idx, 'chamber_no', room)
                                                                }
                                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                                                    row.chamber_no === room
                                                                        ? 'bg-teal-100 text-teal-800 border-teal-300'
                                                                        : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                                                }`}
                                                            >
                                                                {room}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-neutral-400 italic pl-6">
                                                    Doctor will not be on duty on {row.day_name}.
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={savingSchedule}
                                        className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition min-h-[44px]"
                                    >
                                        {savingSchedule ? 'Saving Working Hours...' : 'Save Weekly Schedules'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Leaves / Holidays Manager (1 col on desktop) */}
                        <div
                            className={`bg-white rounded-2xl border border-neutral-200 shadow-2xs p-5 sm:p-6 space-y-5 ${
                                mobileTab === 'leaves' ? 'block' : 'hidden lg:block'
                            }`}
                        >
                            <div>
                                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                                    <span>Leaves & Off-Days (ছুটি)</span>
                                </h3>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    Record single-day holidays or multi-day vacation ranges for {selectedDoctor.name}.
                                </p>
                            </div>

                            {/* Add Leave Form with Date Range & Reason Chips */}
                            <form
                                onSubmit={handleAddLeave}
                                className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3.5"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-1">
                                            From Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={leaveData.leave_date}
                                            onChange={(e) => setLeaveData('leave_date', e.target.value)}
                                            className="w-full rounded-lg border-neutral-300 text-xs p-2 focus:border-teal-500 focus:ring-teal-500 min-h-[40px]"
                                        />
                                        {leaveErrors.leave_date && (
                                            <p className="mt-1 text-xs text-red-600">{leaveErrors.leave_date}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-1">
                                            To Date (Optional Range)
                                        </label>
                                        <input
                                            type="date"
                                            value={leaveData.leave_date_end}
                                            min={leaveData.leave_date || undefined}
                                            onChange={(e) => setLeaveData('leave_date_end', e.target.value)}
                                            className="w-full rounded-lg border-neutral-300 text-xs p-2 focus:border-teal-500 focus:ring-teal-500 min-h-[40px]"
                                            placeholder="Single day if empty"
                                        />
                                        {leaveErrors.leave_date_end && (
                                            <p className="mt-1 text-xs text-red-600">{leaveErrors.leave_date_end}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-neutral-700 uppercase mb-1">
                                        Reason / Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={leaveData.reason}
                                        onChange={(e) => setLeaveData('reason', e.target.value)}
                                        placeholder="e.g. Annual Vacation, Conference, Eid Holiday..."
                                        className="w-full rounded-lg border-neutral-300 text-xs p-2 focus:border-teal-500 focus:ring-teal-500 min-h-[40px]"
                                    />
                                    {leaveErrors.reason && (
                                        <p className="mt-1 text-xs text-red-600">{leaveErrors.reason}</p>
                                    )}
                                </div>

                                {/* Quick Reason Chips */}
                                <div className="space-y-1">
                                    <span className="text-[10px] text-neutral-400 font-semibold block">
                                        Quick Reasons:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {LEAVE_REASON_PRESETS.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => setLeaveData('reason', tag)}
                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                                    leaveData.reason === tag
                                                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingLeave}
                                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition min-h-[44px]"
                                >
                                    {savingLeave
                                        ? 'Saving Leaves...'
                                        : leaveData.leave_date_end && leaveData.leave_date_end !== leaveData.leave_date
                                        ? '+ Add Multi-Day Leave Range'
                                        : '+ Add Single Leave Day'}
                                </button>
                            </form>

                            {/* Upcoming Scheduled Leaves List */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                                        Upcoming Scheduled Leaves
                                    </h4>
                                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                        {selectedDoctor.leaves?.length || 0} Scheduled
                                    </span>
                                </div>

                                {selectedDoctor.leaves && selectedDoctor.leaves.length > 0 ? (
                                    <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                                        {selectedDoctor.leaves.map((l) => (
                                            <div
                                                key={l.id}
                                                className="p-3 bg-white hover:bg-neutral-50 flex items-center justify-between text-xs transition"
                                            >
                                                <div>
                                                    <span className="font-bold text-neutral-900 font-mono block">
                                                        {l.leave_date
                                                            ? new Date(l.leave_date).toLocaleDateString([], {
                                                                  weekday: 'short',
                                                                  month: 'short',
                                                                  day: 'numeric',
                                                                  year: 'numeric',
                                                              })
                                                            : ''}
                                                    </span>
                                                    <span className="text-neutral-500 text-[11px]">
                                                        {l.reason || 'Official Leave'}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLeave(l.id)}
                                                    className="text-neutral-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                                                    title="Delete this leave date"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-neutral-400 py-4 italic text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                                        No upcoming leaves scheduled for {selectedDoctor.name}.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
