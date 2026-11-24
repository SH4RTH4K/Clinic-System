import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function CalendarIndex({ doctors, appointments, visits, leaves, filters, startDate, endDate }) {
    const [selectedDayEvents, setSelectedDayEvents] = useState(null);
    const currentMonth = filters?.month || new Date().toISOString().slice(0, 7);

    const handleDoctorFilter = (e) => {
        router.get(
            route('admin.calendar.index'),
            { ...filters, doctor_id: e.target.value },
            { preserveState: true }
        );
    };

    const handleMonthChange = (offset) => {
        const [year, month] = currentMonth.split('-').map(Number);
        const newDate = new Date(year, month - 1 + offset, 1);
        const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        router.get(
            route('admin.calendar.index'),
            { ...filters, month: newMonth },
            { preserveState: true }
        );
    };

    // Build calendar matrix for currentMonth
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 is Sunday

    const calendarCells = [];
    // Leading days
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarCells.push({ isCurrentMonth: false, day: null, dateStr: null });
    }
    // Month days
    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        calendarCells.push({ isCurrentMonth: true, day: d, dateStr });
    }

    // Index events by dateStr
    const appointmentsByDate = {};
    appointments.forEach((a) => {
        const d = String(a.scheduled_date).slice(0, 10);
        if (!appointmentsByDate[d]) appointmentsByDate[d] = [];
        appointmentsByDate[d].push(a);
    });

    const visitsByDate = {};
    visits.forEach((v) => {
        const d = String(v.visit_date).slice(0, 10);
        if (!visitsByDate[d]) visitsByDate[d] = [];
        visitsByDate[d].push(v);
    });

    const leavesByDate = {};
    leaves.forEach((l) => {
        const d = String(l.leave_date).slice(0, 10);
        if (!leavesByDate[d]) leavesByDate[d] = [];
        leavesByDate[d].push(l);
    });

    const monthLabel = firstDay.toLocaleDateString([], { month: 'long', year: 'numeric' });
    const todayStr = new Date().toISOString().slice(0, 10);

    return (
        <AuthenticatedLayout header="Doctor Schedule & Appointments Calendar">
            <Head title="Doctor Calendar" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Calendar Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
                    {/* Navigation */}
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-neutral-900 min-w-[200px]">
                            {monthLabel}
                        </h2>
                        <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1 border border-neutral-200">
                            <button
                                type="button"
                                onClick={() => handleMonthChange(-1)}
                                className="p-1.5 hover:bg-white rounded-md text-neutral-600 hover:text-neutral-900 transition"
                                title="Previous Month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date().toISOString().slice(0, 7);
                                    router.get(route('admin.calendar.index'), { ...filters, month: now }, { preserveState: true });
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-white rounded-md transition"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => handleMonthChange(1)}
                                className="p-1.5 hover:bg-white rounded-md text-neutral-600 hover:text-neutral-900 transition"
                                title="Next Month"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Filter and Link */}
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={filters?.doctor_id || ''}
                            onChange={handleDoctorFilter}
                            className="text-sm rounded-lg border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Doctors (সকল ডাক্তার)</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.name}
                                </option>
                            ))}
                        </select>

                        <Link
                            href={route('admin.doctor_schedules.index')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-sm font-semibold border border-neutral-300 transition"
                        >
                            <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Doctor Schedules & Chamber
                        </Link>
                    </div>
                </div>

                {/* Calendar Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-600">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-500"></span>
                        <span>Scheduled Appointment (অ্যাপয়েন্টমেন্ট)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500"></span>
                        <span>Clinical Visit (চিকিৎসকের ভিজিট)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-red-500"></span>
                        <span>Doctor Leave / Holiday (ছুটি)</span>
                    </div>
                </div>

                {/* Monthly Calendar Grid */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    {/* Weekday Header */}
                    <div className="grid grid-cols-7 bg-neutral-50 border-b border-neutral-200 text-center py-2.5 text-xs font-bold text-neutral-600 uppercase tracking-wider">
                        <div>Sun (রবি)</div>
                        <div>Mon (সোম)</div>
                        <div>Tue (মঙ্গল)</div>
                        <div>Wed (বুধ)</div>
                        <div>Thu (বৃহঃ)</div>
                        <div>Fri (শুক্র)</div>
                        <div>Sat (শনি)</div>
                    </div>

                    {/* Day Cells */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-neutral-200">
                        {calendarCells.map((cell, idx) => {
                            if (!cell.isCurrentMonth) {
                                return (
                                    <div key={`empty-${idx}`} className="min-h-[110px] bg-neutral-50/50 p-2"></div>
                                );
                            }

                            const dayAppts = appointmentsByDate[cell.dateStr] || [];
                            const dayVisits = visitsByDate[cell.dateStr] || [];
                            const dayLeaves = leavesByDate[cell.dateStr] || [];
                            const isToday = cell.dateStr === todayStr;

                            return (
                                <div
                                    key={cell.dateStr}
                                    onClick={() => setSelectedDayEvents({ date: cell.dateStr, dayAppts, dayVisits, dayLeaves })}
                                    className={`min-h-[110px] p-2 hover:bg-neutral-50 transition cursor-pointer flex flex-col justify-between ${
                                        isToday ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-400' : 'bg-white'
                                    }`}
                                >
                                    {/* Day Header */}
                                    <div className="flex items-center justify-between mb-1">
                                        <span
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                isToday
                                                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                                                    : 'text-neutral-700'
                                            }`}
                                        >
                                            {cell.day}
                                        </span>
                                        {(dayAppts.length > 0 || dayVisits.length > 0) && (
                                            <span className="text-[10px] text-neutral-400 font-mono">
                                                {dayAppts.length + dayVisits.length} items
                                            </span>
                                        )}
                                    </div>

                                    {/* Event Chips */}
                                    <div className="space-y-1 overflow-hidden flex-1">
                                        {/* Leaves */}
                                        {dayLeaves.map((l) => (
                                            <div
                                                key={`leave-${l.id}`}
                                                className="truncate px-1.5 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200"
                                            >
                                                🏖️ {l.doctor?.name || 'Dr'}: {l.reason || 'Off'}
                                            </div>
                                        ))}

                                        {/* Appointments */}
                                        {dayAppts.slice(0, 2).map((a) => (
                                            <div
                                                key={`appt-${a.id}`}
                                                className="truncate px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200"
                                            >
                                                🕒 {a.scheduled_time ? String(a.scheduled_time).slice(0, 5) : 'Appt'}: {a.name}
                                            </div>
                                        ))}

                                        {/* Visits */}
                                        {dayVisits.slice(0, 2).map((v) => (
                                            <div
                                                key={`visit-${v.id}`}
                                                className="truncate px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                                            >
                                                🩺 {v.patient?.name || 'Patient'}
                                            </div>
                                        ))}

                                        {/* Overflow indicator */}
                                        {dayAppts.length + dayVisits.length > 4 && (
                                            <div className="text-[10px] font-bold text-neutral-500 pl-1">
                                                +{dayAppts.length + dayVisits.length - 4} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Details Modal / Drawer */}
                {selectedDayEvents && (
                    <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                                <div>
                                    <h3 className="text-lg font-bold text-neutral-900">
                                        Schedule for {new Date(selectedDayEvents.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h3>
                                    <p className="text-xs text-neutral-500">Day appointments and consultations</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDayEvents(null)}
                                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Leaves */}
                            {selectedDayEvents.dayLeaves.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Doctor Leaves / Holidays</h4>
                                    {selectedDayEvents.dayLeaves.map((l) => (
                                        <div key={l.id} className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                                            <strong>{l.doctor?.name}</strong>: {l.reason || 'Official off-day'}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Appointments */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                                    Scheduled Appointments ({selectedDayEvents.dayAppts.length})
                                </h4>
                                {selectedDayEvents.dayAppts.length > 0 ? (
                                    selectedDayEvents.dayAppts.map((a) => (
                                        <div key={a.id} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                                            <div>
                                                <span className="font-bold text-neutral-900 text-sm block">{a.name}</span>
                                                <span className="text-neutral-500 font-mono">{a.phone || 'No phone'}</span>
                                                {a.scheduled_time && (
                                                    <span className="ml-2 font-bold text-blue-700">Time: {String(a.scheduled_time).slice(0, 5)}</span>
                                                )}
                                            </div>
                                            <div className="space-x-2">
                                                <Link
                                                    href={route('admin.queue.tokens.create', {
                                                        appointment_request_id: a.id,
                                                        patient_name: a.name,
                                                        patient_phone: a.phone,
                                                    })}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[11px]"
                                                >
                                                    Issue Token
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-neutral-400 py-1">No appointments scheduled for this date.</p>
                                )}
                            </div>

                            {/* Visits */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                    Clinical Visits ({selectedDayEvents.dayVisits.length})
                                </h4>
                                {selectedDayEvents.dayVisits.length > 0 ? (
                                    selectedDayEvents.dayVisits.map((v) => (
                                        <div key={v.id} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                                            <div>
                                                <span className="font-bold text-neutral-900 text-sm block">
                                                    {v.patient?.name || 'Patient'}
                                                </span>
                                                <span className="text-neutral-500 font-mono">
                                                    Visit #{v.id} • Dr: {v.doctor?.name || 'Doctor'}
                                                </span>
                                            </div>
                                            <Link
                                                href={route('admin.visits.show', v.id)}
                                                className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold text-[11px]"
                                            >
                                                View Rx
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-neutral-400 py-1">No visits recorded on this date.</p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-neutral-200 text-right">
                                <button
                                    type="button"
                                    onClick={() => setSelectedDayEvents(null)}
                                    className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
