import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Schedules({ doctors, selectedDoctor, days }) {
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

    const { data: scheduleData, setData: setScheduleData, put: putSchedule, processing: savingSchedule } = useForm({
        schedules: initialScheduleRows,
    });

    const handleScheduleChange = (index, field, value) => {
        const updated = [...scheduleData.schedules];
        updated[index][field] = value;
        setScheduleData('schedules', updated);
    };

    const handleSaveSchedule = (e) => {
        e.preventDefault();
        putSchedule(route('admin.doctor_schedules.update', selectedDoctor.id));
    };

    // Form for adding a leave
    const { data: leaveData, setData: setLeaveData, post: postLeave, processing: savingLeave, reset: resetLeave, errors: leaveErrors } = useForm({
        leave_date: '',
        reason: '',
    });

    const handleAddLeave = (e) => {
        e.preventDefault();
        postLeave(route('admin.doctor_schedules.leaves.store', selectedDoctor.id), {
            onSuccess: () => resetLeave(),
        });
    };

    const handleDeleteLeave = (leaveId) => {
        if (confirm('Delete this leave date?')) {
            router.delete(route('admin.doctor_schedules.leaves.destroy', leaveId));
        }
    };

    return (
        <AuthenticatedLayout header="Doctor Visiting Schedules & Chamber Setup">
            <Head title="Doctor Visiting Schedules" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header & Doctor Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900">Visiting Hours & Chamber Setup</h2>
                        <p className="text-xs text-neutral-500 mt-0.5">
                            Configure weekly consultation shifts, room chambers, and scheduled holidays for doctors.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('admin.calendar.index')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-sm font-semibold border border-neutral-300 transition"
                        >
                            <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Back to Calendar
                        </Link>
                    </div>
                </div>

                {/* Doctor Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {doctors.map((doc) => (
                        <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleDoctorSelect(doc.id)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition flex items-center gap-2 ${
                                String(selectedDoctor?.id) === String(doc.id)
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                    : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                            }`}
                        >
                            <span>{doc.name}</span>
                            {doc.specialty && (
                                <span className="text-xs opacity-80">({doc.specialty})</span>
                            )}
                        </button>
                    ))}
                </div>

                {selectedDoctor && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Weekly Shift Grid (2 cols) */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                                <div>
                                    <h3 className="text-base font-bold text-neutral-900">
                                        Weekly Visiting Hours for {selectedDoctor.name}
                                    </h3>
                                    <p className="text-xs text-neutral-500">
                                        Set chamber room and consultation hours for each day of the week.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSaveSchedule} className="space-y-4">
                                <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
                                    {scheduleData.schedules.map((row, idx) => (
                                        <div
                                            key={row.day_of_week}
                                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                                                row.is_active ? 'bg-white' : 'bg-neutral-50 opacity-60'
                                            }`}
                                        >
                                            <div className="w-28 flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`day-${row.day_of_week}`}
                                                    checked={row.is_active}
                                                    onChange={(e) => handleScheduleChange(idx, 'is_active', e.target.checked)}
                                                    className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <label htmlFor={`day-${row.day_of_week}`} className="text-sm font-bold text-neutral-800 cursor-pointer">
                                                    {row.day_name}
                                                </label>
                                            </div>

                                            {row.is_active ? (
                                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                    <div>
                                                        <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">Start Time</label>
                                                        <input
                                                            type="time"
                                                            value={row.start_time}
                                                            onChange={(e) => handleScheduleChange(idx, 'start_time', e.target.value)}
                                                            className="w-full text-xs rounded-lg border-neutral-300 p-1.5 font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">End Time</label>
                                                        <input
                                                            type="time"
                                                            value={row.end_time}
                                                            onChange={(e) => handleScheduleChange(idx, 'end_time', e.target.value)}
                                                            className="w-full text-xs rounded-lg border-neutral-300 p-1.5 font-mono"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">Chamber Room</label>
                                                        <input
                                                            type="text"
                                                            value={row.chamber_no}
                                                            onChange={(e) => handleScheduleChange(idx, 'chamber_no', e.target.value)}
                                                            placeholder="Chamber 1"
                                                            className="w-full text-xs rounded-lg border-neutral-300 p-1.5"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-neutral-500 uppercase font-bold block mb-0.5">Max Tokens</label>
                                                        <input
                                                            type="number"
                                                            value={row.max_patients || ''}
                                                            onChange={(e) => handleScheduleChange(idx, 'max_patients', e.target.value ? Number(e.target.value) : null)}
                                                            placeholder="e.g. 25"
                                                            className="w-full text-xs rounded-lg border-neutral-300 p-1.5"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-neutral-400 italic">Day Off / Closed</span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        disabled={savingSchedule}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition"
                                    >
                                        {savingSchedule ? 'Saving...' : 'Save Weekly Schedules'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Leaves / Holidays Manager (1 col) */}
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-5">
                            <div>
                                <h3 className="text-base font-bold text-neutral-900">
                                    Leaves & Off-Days (ছুটি)
                                </h3>
                                <p className="text-xs text-neutral-500 mt-0.5">
                                    Record dates when {selectedDoctor.name} will not be available.
                                </p>
                            </div>

                            {/* Add Leave Form */}
                            <form onSubmit={handleAddLeave} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                                        Leave Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={leaveData.leave_date}
                                        onChange={(e) => setLeaveData('leave_date', e.target.value)}
                                        className="w-full rounded-lg border-neutral-300 text-xs p-2 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                    {leaveErrors.leave_date && (
                                        <p className="mt-1 text-xs text-red-600">{leaveErrors.leave_date}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                                        Reason (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={leaveData.reason}
                                        onChange={(e) => setLeaveData('reason', e.target.value)}
                                        placeholder="e.g. Annual Vacation, Conference..."
                                        className="w-full rounded-lg border-neutral-300 text-xs p-2 focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingLeave}
                                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition"
                                >
                                    {savingLeave ? 'Adding...' : '+ Add Leave Day'}
                                </button>
                            </form>

                            {/* Upcoming Leaves List */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                    Upcoming Leaves ({selectedDoctor.leaves?.length || 0})
                                </h4>
                                {selectedDoctor.leaves && selectedDoctor.leaves.length > 0 ? (
                                    <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl overflow-hidden">
                                        {selectedDoctor.leaves.map((l) => (
                                            <div key={l.id} className="p-3 bg-white flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-bold text-neutral-900 font-mono block">
                                                        {l.leave_date ? new Date(l.leave_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                                    </span>
                                                    <span className="text-neutral-500">{l.reason || 'Official Leave'}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLeave(l.id)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Delete leave"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-neutral-400 py-2 italic text-center">No upcoming leaves scheduled.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
