import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, router } from '@inertiajs/react';
import React, { useMemo, useState } from 'react';

export default function CalendarIndex({
    doctors = [],
    appointments = [],
    visits = [],
    leaves = [],
    doctorShifts = {},
    kpis = {},
    filters = {},
    startDate,
    endDate,
}) {
    const currentMonth = filters?.month || new Date().toISOString().slice(0, 7);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Selected Day Modal
    const [selectedDayEvents, setSelectedDayEvents] = useState(null);

    // Search and Event Type Filters
    const [searchQuery, setSearchQuery] = useState(filters?.search || '');
    const [selectedEventType, setSelectedEventType] = useState(filters?.event_type || 'all');

    // Mobile Active Selected Date
    const [mobileDate, setMobileDate] = useState(todayStr);

    // Doctor filter change
    const handleDoctorFilter = (e) => {
        router.get(
            route('admin.calendar.index'),
            { ...filters, doctor_id: e.target.value },
            { preserveState: true }
        );
    };

    // Month navigation
    const handleMonthChange = (offset) => {
        const [y, m] = currentMonth.split('-').map(Number);
        const newDate = new Date(y, m - 1 + offset, 1);
        const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        router.get(
            route('admin.calendar.index'),
            { ...filters, month: newMonth },
            { preserveState: true }
        );
    };

    // Search submission
    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            route('admin.calendar.index'),
            { ...filters, search: searchQuery },
            { preserveState: true }
        );
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        router.get(
            route('admin.calendar.index'),
            { ...filters, search: '' },
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
    // Leading empty days
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarCells.push({ isCurrentMonth: false, day: null, dateStr: null, dayOfWeek: i });
    }
    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDate = new Date(year, month - 1, d);
        calendarCells.push({ isCurrentMonth: true, day: d, dateStr, dayOfWeek: dayDate.getDay() });
    }

    // Index events by dateStr
    const appointmentsByDate = useMemo(() => {
        const map = {};
        appointments.forEach((a) => {
            const d = String(a.scheduled_date).slice(0, 10);
            if (!map[d]) map[d] = [];
            map[d].push(a);
        });
        return map;
    }, [appointments]);

    const visitsByDate = useMemo(() => {
        const map = {};
        visits.forEach((v) => {
            const d = String(v.visit_date).slice(0, 10);
            if (!map[d]) map[d] = [];
            map[d].push(v);
        });
        return map;
    }, [visits]);

    const leavesByDate = useMemo(() => {
        const map = {};
        leaves.forEach((l) => {
            const d = String(l.leave_date).slice(0, 10);
            if (!map[d]) map[d] = [];
            map[d].push(l);
        });
        return map;
    }, [leaves]);

    const monthLabel = firstDay.toLocaleDateString([], { month: 'long', year: 'numeric' });

    // Days for mobile horizontal ribbon
    const monthDaysList = useMemo(() => {
        const list = [];
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(year, month - 1, d);
            list.push({
                dayNum: d,
                dateStr,
                dayName: dateObj.toLocaleDateString([], { weekday: 'short' }),
                dayOfWeek: dateObj.getDay(),
                apptsCount: appointmentsByDate[dateStr]?.length || 0,
                visitsCount: visitsByDate[dateStr]?.length || 0,
                leavesCount: leavesByDate[dateStr]?.length || 0,
            });
        }
        return list;
    }, [year, month, totalDays, appointmentsByDate, visitsByDate, leavesByDate]);

    // Active Mobile Day Data
    const activeMobileAppts = appointmentsByDate[mobileDate] || [];
    const activeMobileVisits = visitsByDate[mobileDate] || [];
    const activeMobileLeaves = leavesByDate[mobileDate] || [];
    const activeMobileDayOfWeek = new Date(mobileDate).getDay();
    const activeMobileShifts = doctorShifts[activeMobileDayOfWeek] || [];

    return (
        <AuthenticatedLayout header="Doctor Schedule & Appointments Calendar">
            <Head title="Doctor Visual Calendar" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* RemediQ Standard Page Header */}
                <PageHeader
                    title="Doctor Visual Calendar & Appointments"
                    subtitle="Interactive monthly schedule matrix, booked patient appointments, consultations, and doctor leaves."
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
                                href={route('admin.doctor_schedules.index')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold border border-teal-200 shadow-2xs transition"
                            >
                                <span>🕒</span>
                                <span>Visiting Schedules & Chamber</span>
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

                {/* Executive Monthly KPI Summary Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Booked Appointments
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-blue-700">
                                {kpis.total_appointments ?? appointments.length}
                            </span>
                            <span className="text-[11px] text-blue-600 font-semibold">This Month</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Clinical Visits
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-emerald-700">
                                {kpis.total_visits ?? visits.length}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-semibold">Consultations</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Doctor Leaves
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-red-600">
                                {kpis.total_leaves ?? leaves.length}
                            </span>
                            <span className="text-[11px] text-red-500 font-semibold">Off-Days</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Today's Activity
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-neutral-900">
                                {kpis.today_activity ?? 0}
                            </span>
                            <span className="text-[11px] text-teal-600 font-semibold">Today</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Active Doctors
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-teal-700">
                                {kpis.active_doctors ?? doctors.length}
                            </span>
                            <span className="text-[11px] text-neutral-500">On Roster</span>
                        </div>
                    </div>
                </div>

                {/* Calendar Controls & Universal Search Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Month Navigator */}
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 min-w-[180px]">
                                {monthLabel}
                            </h2>
                            <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1 border border-neutral-200">
                                <button
                                    type="button"
                                    onClick={() => handleMonthChange(-1)}
                                    className="p-1.5 hover:bg-white rounded-lg text-neutral-600 hover:text-neutral-900 transition"
                                    title="Previous Month"
                                >
                                    ◀
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date().toISOString().slice(0, 7);
                                        router.get(route('admin.calendar.index'), { ...filters, month: now }, { preserveState: true });
                                    }}
                                    className="px-3 py-1 text-xs font-bold text-neutral-800 hover:bg-white rounded-lg transition"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMonthChange(1)}
                                    className="p-1.5 hover:bg-white rounded-lg text-neutral-600 hover:text-neutral-900 transition"
                                    title="Next Month"
                                >
                                    ▶
                                </button>
                            </div>
                        </div>

                        {/* Search & Doctor Filter Controls */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Doctor Filter */}
                            <select
                                value={filters?.doctor_id || ''}
                                onChange={handleDoctorFilter}
                                className="text-xs font-semibold rounded-xl border-neutral-300 py-2 bg-neutral-50 focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="">All Doctors (সকল ডাক্তার)</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.name}
                                    </option>
                                ))}
                            </select>

                            {/* Multi-Factor Search Form */}
                            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search patient, phone, doctor..."
                                    className="w-full text-xs rounded-xl border-neutral-300 pr-8 pl-8 py-2 focus:border-teal-500 focus:ring-teal-500"
                                />
                                <span className="absolute left-2.5 top-2.5 text-neutral-400 text-xs">🔍</span>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={handleClearSearch}
                                        className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 text-xs p-1"
                                        title="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Event Type Filter Pills & Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                                Filter View:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedEventType('all')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    selectedEventType === 'all'
                                        ? 'bg-neutral-900 text-white shadow-2xs'
                                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                }`}
                            >
                                All Events ({appointments.length + visits.length + leaves.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventType('appointments')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    selectedEventType === 'appointments'
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }`}
                            >
                                🕒 Appointments ({appointments.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventType('visits')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    selectedEventType === 'visits'
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                            >
                                🩺 Visits ({visits.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedEventType('leaves')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    selectedEventType === 'leaves'
                                        ? 'bg-red-600 text-white shadow-2xs'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                }`}
                            >
                                🏖️ Doctor Leaves ({leaves.length})
                            </button>
                        </div>

                        {filters?.search && (
                            <span className="text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                                🔍 Matching: "{filters.search}"
                            </span>
                        )}
                    </div>
                </div>

                {/* Mobile Daily Agenda Timeline View (< 768px / block md:hidden) */}
                <div className="block md:hidden space-y-4">
                    <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Select Day to Inspect Timeline:
                        </div>

                        {/* Horizontal Day Picker Ribbon */}
                        <div className="flex gap-2 overflow-x-auto pb-2 pt-1">
                            {monthDaysList.map((item) => {
                                const isSelected = item.dateStr === mobileDate;
                                const isToday = item.dateStr === todayStr;
                                const totalEvents = item.apptsCount + item.visitsCount + item.leavesCount;

                                return (
                                    <button
                                        key={item.dateStr}
                                        type="button"
                                        onClick={() => setMobileDate(item.dateStr)}
                                        className={`shrink-0 w-14 py-2 px-1 rounded-xl flex flex-col items-center justify-between transition border ${
                                            isSelected
                                                ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                                                : isToday
                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                                : 'bg-white border-neutral-200 text-neutral-700'
                                        }`}
                                    >
                                        <span className="text-[10px] uppercase font-bold">{item.dayName}</span>
                                        <span className="text-base font-extrabold my-0.5">{item.dayNum}</span>
                                        <div className="flex gap-0.5 h-1.5 items-center">
                                            {item.apptsCount > 0 && (
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                                            )}
                                            {item.visitsCount > 0 && (
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                            )}
                                            {item.leavesCount > 0 && (
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mobile Chronological Agenda Card Feed for Selected Day */}
                    <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                            <div>
                                <h3 className="text-sm font-bold text-neutral-900">
                                    {new Date(mobileDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                </h3>
                                <p className="text-[11px] text-neutral-500">
                                    {activeMobileAppts.length} appointments • {activeMobileVisits.length} visits
                                </p>
                            </div>
                            <Link
                                href={route('admin.appointment_requests.create', { date: mobileDate })}
                                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold shadow-2xs"
                            >
                                + Book Appt
                            </Link>
                        </div>

                        {/* On-Duty Shifts Summary */}
                        {activeMobileShifts.length > 0 && (
                            <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200 space-y-1.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                    👨‍⚕️ Doctors on Duty Today:
                                </div>
                                <div className="space-y-1">
                                    {activeMobileShifts.map((shift, sIdx) => (
                                        <div key={sIdx} className="text-xs font-semibold text-teal-950 flex items-center justify-between">
                                            <span>{shift.doctor_name}</span>
                                            <span className="font-mono text-[11px] text-teal-700">
                                                {shift.start_time} - {shift.end_time} ({shift.chamber_no})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Leaves */}
                        {activeMobileLeaves.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                                    🏖️ Doctor Leaves:
                                </span>
                                {activeMobileLeaves.map((l) => (
                                    <div key={l.id} className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                                        <strong>{l.doctor?.name || 'Doctor'}</strong>: {l.reason || 'Official Holiday'}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Scheduled Appointments */}
                        {activeMobileAppts.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                    🕒 Scheduled Appointments ({activeMobileAppts.length}):
                                </span>
                                {activeMobileAppts.map((a) => (
                                    <div key={a.id} className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-neutral-900 block">{a.name}</span>
                                                <span className="text-[11px] font-mono text-neutral-500">{a.phone || 'No phone'}</span>
                                            </div>
                                            {a.scheduled_time && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px] font-mono">
                                                    {String(a.scheduled_time).slice(0, 5)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pt-1 border-t border-blue-100">
                                            {a.phone && (
                                                <>
                                                    <a
                                                        href={`tel:${a.phone}`}
                                                        className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded text-[11px] font-semibold"
                                                    >
                                                        📞 Call
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/88${String(a.phone).replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-semibold"
                                                    >
                                                        💬 WhatsApp
                                                    </a>
                                                </>
                                            )}
                                            <Link
                                                href={route('admin.queue.tokens.create', {
                                                    appointment_request_id: a.id,
                                                    patient_name: a.name,
                                                    patient_phone: a.phone,
                                                })}
                                                className="ml-auto px-3 py-1 bg-teal-600 text-white rounded text-[11px] font-bold"
                                            >
                                                Issue Token
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Clinical Consultations */}
                        {activeMobileVisits.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                    🩺 Clinical Consultations ({activeMobileVisits.length}):
                                </span>
                                {activeMobileVisits.map((v) => (
                                    <div key={v.id} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-neutral-900 block">{v.patient?.name || 'Patient'}</span>
                                            <span className="text-[10px] text-neutral-500 font-mono">
                                                Visit #{v.id} • {v.doctor?.name || 'Doctor'}
                                            </span>
                                        </div>
                                        <Link
                                            href={route('admin.visits.show', v.id)}
                                            className="px-2.5 py-1 bg-white text-neutral-800 border border-neutral-300 rounded text-[11px] font-semibold"
                                        >
                                            View Rx
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeMobileAppts.length === 0 && activeMobileVisits.length === 0 && activeMobileLeaves.length === 0 && (
                            <div className="text-xs text-neutral-400 py-6 text-center italic">
                                No scheduled events for this date.
                            </div>
                        )}
                    </div>
                </div>

                {/* Desktop / Tablet Monthly Grid (>= 768px / hidden md:block) */}
                <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
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

                    {/* Day Cells Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-neutral-200">
                        {calendarCells.map((cell, idx) => {
                            if (!cell.isCurrentMonth) {
                                return (
                                    <div key={`empty-${idx}`} className="min-h-[120px] bg-neutral-50/50 p-2" />
                                );
                            }

                            const dayAppts = appointmentsByDate[cell.dateStr] || [];
                            const dayVisits = visitsByDate[cell.dateStr] || [];
                            const dayLeaves = leavesByDate[cell.dateStr] || [];
                            const isToday = cell.dateStr === todayStr;
                            const shifts = doctorShifts[cell.dayOfWeek] || [];

                            // Filter events based on selected event type
                            const showAppts = selectedEventType === 'all' || selectedEventType === 'appointments';
                            const showVisits = selectedEventType === 'all' || selectedEventType === 'visits';
                            const showLeaves = selectedEventType === 'all' || selectedEventType === 'leaves';

                            const totalMatches =
                                (showAppts ? dayAppts.length : 0) +
                                (showVisits ? dayVisits.length : 0) +
                                (showLeaves ? dayLeaves.length : 0);

                            const isSearchMatch = Boolean(filters?.search && totalMatches > 0);

                            return (
                                <div
                                    key={cell.dateStr}
                                    onClick={() =>
                                        setSelectedDayEvents({
                                            date: cell.dateStr,
                                            dayAppts,
                                            dayVisits,
                                            dayLeaves,
                                            shifts,
                                        })
                                    }
                                    className={`min-h-[120px] p-2 hover:bg-neutral-50 transition cursor-pointer flex flex-col justify-between ${
                                        isSearchMatch
                                            ? 'bg-teal-50/50 ring-2 ring-inset ring-teal-500'
                                            : isToday
                                            ? 'bg-emerald-50/40 ring-1 ring-inset ring-emerald-400'
                                            : 'bg-white'
                                    }`}
                                >
                                    {/* Day Header with Roster Shift Indicator */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    isToday
                                                        ? 'bg-teal-600 text-white font-extrabold shadow-sm'
                                                        : 'text-neutral-700'
                                                }`}
                                            >
                                                {cell.day}
                                            </span>

                                            {totalMatches > 0 && (
                                                <span className="text-[10px] text-neutral-400 font-mono font-bold">
                                                    {totalMatches} items
                                                </span>
                                            )}
                                        </div>

                                        {/* Recurring Doctor Shift Pills */}
                                        {shifts.length > 0 && (
                                            <div className="mb-1 space-y-0.5">
                                                {shifts.slice(0, 1).map((s, sIdx) => {
                                                    const isOnLeave = dayLeaves.some(
                                                        (l) => Number(l.doctor_id) === Number(s.doctor_id)
                                                    );
                                                    return (
                                                        <div
                                                            key={sIdx}
                                                            className={`text-[9px] font-semibold truncate px-1 py-0.5 rounded ${
                                                                isOnLeave
                                                                    ? 'line-through bg-neutral-100 text-neutral-400'
                                                                    : 'bg-neutral-100 text-neutral-600'
                                                            }`}
                                                            title={`${s.doctor_name}: ${s.start_time}-${s.end_time} (${s.chamber_no})`}
                                                        >
                                                            👨‍⚕️ {s.doctor_name.replace('Dr. ', '')} ({s.chamber_no})
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Event Chips List */}
                                    <div className="space-y-1 overflow-hidden flex-1">
                                        {/* Doctor Leaves (Red) */}
                                        {showLeaves &&
                                            dayLeaves.map((l) => (
                                                <div
                                                    key={`leave-${l.id}`}
                                                    className="truncate px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200"
                                                >
                                                    🏖️ {l.doctor?.name || 'Dr'}: {l.reason || 'Off'}
                                                </div>
                                            ))}

                                        {/* Scheduled Appointments (Blue) */}
                                        {showAppts &&
                                            dayAppts.slice(0, 2).map((a) => (
                                                <div
                                                    key={`appt-${a.id}`}
                                                    className="truncate px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200"
                                                >
                                                    🕒 {a.scheduled_time ? String(a.scheduled_time).slice(0, 5) : 'Appt'}: {a.name}
                                                </div>
                                            ))}

                                        {/* Clinical Visits (Green) */}
                                        {showVisits &&
                                            dayVisits.slice(0, 2).map((v) => (
                                                <div
                                                    key={`visit-${v.id}`}
                                                    className="truncate px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                >
                                                    🩺 {v.patient?.name || 'Patient'}
                                                </div>
                                            ))}

                                        {/* Overflow indicator */}
                                        {totalMatches > 4 && (
                                            <div className="text-[10px] font-bold text-neutral-500 pl-1">
                                                +{totalMatches - 4} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day Details Studio Modal / Drawer */}
                {selectedDayEvents && (
                    <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                                        Schedule for {new Date(selectedDayEvents.date).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </h3>
                                    <p className="text-xs text-neutral-500">
                                        Clinical duty roster, appointments, and consultations
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDayEvents(null)}
                                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Scheduled Doctor Shifts */}
                            {selectedDayEvents.shifts?.length > 0 && (
                                <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-1">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                        👨‍⚕️ Scheduled Visiting Shifts for this Day:
                                    </div>
                                    <div className="space-y-1">
                                        {selectedDayEvents.shifts.map((s, idx) => (
                                            <div key={idx} className="text-xs font-semibold text-teal-950 flex items-center justify-between">
                                                <span>{s.doctor_name}</span>
                                                <span className="font-mono text-[11px] text-teal-700">
                                                    {s.start_time} - {s.end_time} • {s.chamber_no}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Leaves */}
                            {selectedDayEvents.dayLeaves.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                                        Doctor Leaves / Holidays
                                    </h4>
                                    {selectedDayEvents.dayLeaves.map((l) => (
                                        <div key={l.id} className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                                            <strong>{l.doctor?.name || 'Doctor'}</strong>: {l.reason || 'Official off-day'}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Scheduled Appointments */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
                                    <span>Scheduled Appointments ({selectedDayEvents.dayAppts.length})</span>
                                    <Link
                                        href={route('admin.appointment_requests.create', { date: selectedDayEvents.date })}
                                        className="text-[11px] font-bold text-blue-600 hover:underline"
                                    >
                                        + Book New
                                    </Link>
                                </h4>

                                {selectedDayEvents.dayAppts.length > 0 ? (
                                    selectedDayEvents.dayAppts.map((a) => (
                                        <div key={a.id} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-bold text-neutral-900 text-sm block">{a.name}</span>
                                                    <span className="text-neutral-500 font-mono">{a.phone || 'No phone'}</span>
                                                    {a.scheduled_time && (
                                                        <span className="ml-2 font-bold text-blue-700">
                                                            Time: {String(a.scheduled_time).slice(0, 5)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 pt-1 border-t border-blue-100">
                                                {a.phone && (
                                                    <>
                                                        <a
                                                            href={`tel:${a.phone}`}
                                                            className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded text-[11px] font-semibold"
                                                        >
                                                            📞 Call
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/88${String(a.phone).replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-semibold"
                                                        >
                                                            💬 WhatsApp
                                                        </a>
                                                    </>
                                                )}
                                                <Link
                                                    href={route('admin.queue.tokens.create', {
                                                        appointment_request_id: a.id,
                                                        patient_name: a.name,
                                                        patient_phone: a.phone,
                                                    })}
                                                    className="ml-auto px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[11px]"
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

                            {/* Clinical Consultations */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                    Clinical Consultations ({selectedDayEvents.dayVisits.length})
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
                                                className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded font-semibold text-[11px]"
                                            >
                                                View Rx
                                            </Link>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-neutral-400 py-1">No visits recorded on this date.</p>
                                )}
                            </div>

                            {/* Fast Action Footer */}
                            <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                                <Link
                                    href={route('admin.appointment_requests.create', { date: selectedDayEvents.date })}
                                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                                >
                                    + Book Appointment for this Date
                                </Link>
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
