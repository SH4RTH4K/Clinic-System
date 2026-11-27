import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, usePage } from '@inertiajs/react';
import React, { useState } from 'react';

const formatDate = (value) => {
    if (!value) return 'Flexible';
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
};

const formatTime = (value) => (value ? String(value).slice(0, 5) : null);

export default function Index({ requests, kpis = {}, filters = {} }) {
    const { auth = {}, flash = {} } = usePage().props;
    const can = usePermission();
    const isSuperAdmin = (auth.roles || []).includes('Super Admin');
    const canCreate = isSuperAdmin || can('appointments.create');
    const canUpdate = isSuperAdmin || can('appointments.update');
    const canDelete = isSuperAdmin || can('appointments.delete');
    const canCreatePatient = isSuperAdmin || can('patients.create');
    const canViewPatients = isSuperAdmin || can('patients.view');

    // Filter and search state
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [datePreset, setDatePreset] = useState(filters.date_preset || 'all');

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [linkTarget, setLinkTarget] = useState(null);

    const todayStr = new Date().toISOString().slice(0, 10);

    const triggerFilter = (newStatus, newSearch, newPreset) => {
        router.get(
            route('admin.appointment_requests.index'),
            {
                status: newStatus !== undefined ? newStatus : statusFilter,
                search: newSearch !== undefined ? newSearch : searchQuery,
                date_preset: newPreset !== undefined ? newPreset : datePreset,
            },
            { preserveState: true }
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        triggerFilter(statusFilter, searchQuery, datePreset);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        triggerFilter(statusFilter, '', datePreset);
    };

    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        triggerFilter(statusFilter, searchQuery, preset);
    };

    const handleStatusChange = (e) => {
        const val = e.target.value;
        setStatusFilter(val);
        triggerFilter(val, searchQuery, datePreset);
    };

    const handleQuickStatus = (id, newStatus) => {
        if (!canUpdate) return;
        router.patch(
            route('admin.appointment_requests.quick_status', id),
            { status: newStatus },
            { preserveScroll: true }
        );
    };

    const convertToPatient = (id) => {
        if (canUpdate) {
            router.post(route('admin.appointment_requests.convert', id));
        }
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;

        router.delete(route('admin.appointment_requests.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const confirmLink = () => {
        if (!canUpdate || !canViewPatients || !linkTarget) return;

        router.post(
            route('admin.appointment_requests.link_patient', linkTarget.id),
            {
                patient_id: linkTarget.patientId,
            },
            {
                preserveScroll: true,
                onSuccess: () => setLinkTarget(null),
            }
        );
    };

    const columns = [
        {
            header: 'Submitted',
            accessor: 'created_at',
            cell: (request) => (
                <div className="whitespace-nowrap text-xs text-neutral-500">
                    <span className="font-mono">{new Date(request.created_at).toLocaleDateString()}</span>
                    <span className="block text-[10px] text-neutral-400">#{request.id}</span>
                </div>
            ),
        },
        {
            header: 'Patient Name & Reach',
            accessor: 'name',
            cell: (request) => (
                <div className="space-y-1">
                    <span className="font-bold text-neutral-900 block">{request.name}</span>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-neutral-700">{request.phone}</span>
                        {request.phone && (
                            <div className="flex items-center gap-1 text-[11px]">
                                <a
                                    href={`tel:${request.phone}`}
                                    className="text-neutral-500 hover:text-neutral-800 p-0.5 rounded hover:bg-neutral-100"
                                    title="Call patient"
                                >
                                    📞
                                </a>
                                <a
                                    href={`https://wa.me/88${String(request.phone).replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded hover:bg-emerald-50"
                                    title="WhatsApp patient"
                                >
                                    💬
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: 'Requested Slot',
            accessor: 'preferred_date',
            cell: (request) => (
                <span className="whitespace-nowrap text-xs text-neutral-600 font-mono">
                    {formatDate(request.preferred_date)}
                    {formatTime(request.preferred_time) ? ` · ${formatTime(request.preferred_time)}` : ''}
                </span>
            ),
        },
        {
            header: 'Confirmed Slot',
            accessor: 'scheduled_date',
            cell: (request) => {
                const isToday =
                    request.scheduled_date && String(request.scheduled_date).slice(0, 10) === todayStr;
                return (
                    <div className="whitespace-nowrap text-xs">
                        {request.scheduled_date ? (
                            <div className="space-y-0.5">
                                <span className={`font-mono font-semibold ${isToday ? 'text-teal-700 font-bold' : 'text-neutral-800'}`}>
                                    {formatDate(request.scheduled_date)}
                                    {formatTime(request.scheduled_time) ? ` · ${formatTime(request.scheduled_time)}` : ''}
                                </span>
                                {isToday && (
                                    <span className="block text-[10px] uppercase font-extrabold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 w-fit">
                                        📅 TODAY
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-neutral-400 italic">Not scheduled</span>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Source',
            accessor: 'source',
            cell: (request) => (
                <div className="text-xs text-neutral-600">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                        {request.source === 'walk_in' ? 'Walk-in' : request.source === 'phone' ? 'Phone' : 'Website'}
                    </span>
                    <span className="block text-[10px] text-neutral-400 truncate max-w-32 mt-0.5">
                        {request.creator?.name || (request.source === 'website' ? 'Public portal' : 'Staff')}
                    </span>
                </div>
            ),
        },
        {
            header: 'Status',
            accessor: 'status',
            cell: (request) => <StatusBadge status={request.status} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (request) => (
                <div className="flex flex-wrap justify-end gap-1.5 text-xs">
                    {/* 1-Click Fast-Track Contacted Action */}
                    {canUpdate && request.status === 'pending' && (
                        <button
                            type="button"
                            onClick={() => handleQuickStatus(request.id, 'contacted')}
                            className="whitespace-nowrap rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-2xs"
                            title="Mark as contacted with patient"
                        >
                            📞 Contacted
                        </button>
                    )}

                    {canUpdate && (
                        <Link
                            href={route('admin.appointment_requests.edit', request.id)}
                            className="whitespace-nowrap rounded-lg bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-800 hover:bg-neutral-200 transition"
                        >
                            {request.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
                        </Link>
                    )}

                    <Link
                        href={route('admin.queue.tokens.create', {
                            appointment_request_id: request.id,
                            patient_id: request.converted_patient_id || request.existing_patient_match_id || '',
                            patient_name: request.name,
                            patient_phone: request.phone,
                        })}
                        className="whitespace-nowrap rounded-lg bg-teal-50 px-2.5 py-1 font-bold text-teal-800 border border-teal-200 hover:bg-teal-100 transition shadow-2xs"
                    >
                        Issue Token
                    </Link>

                    {canUpdate && request.converted_patient_id ? (
                        <span className="whitespace-nowrap rounded-lg bg-emerald-50 px-2 py-1 font-semibold text-emerald-800 border border-emerald-200 text-[11px]">
                            Registered ✓
                        </span>
                    ) : canUpdate && canViewPatients && request.existing_patient_match_id ? (
                        <button
                            type="button"
                            onClick={() =>
                                setLinkTarget({
                                    id: request.id,
                                    patientId: request.existing_patient_match_id,
                                    name: request.name,
                                })
                            }
                            className="whitespace-nowrap rounded-lg bg-blue-50 px-2 py-1 font-semibold text-blue-800 border border-blue-200 hover:bg-blue-100 transition text-[11px]"
                        >
                            Link Patient
                        </button>
                    ) : canUpdate && canViewPatients && request.has_ambiguous_patient_match ? (
                        <span className="text-[10px] text-amber-800 italic" role="status">
                            Multiple matches
                        </span>
                    ) : canUpdate && canCreatePatient ? (
                        <button
                            type="button"
                            onClick={() => convertToPatient(request.id)}
                            className="whitespace-nowrap rounded-lg bg-teal-50 px-2 py-1 font-semibold text-teal-800 border border-teal-200 hover:bg-teal-100 transition text-[11px]"
                        >
                            Convert
                        </button>
                    ) : null}

                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(request)}
                            className="whitespace-nowrap rounded-lg p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete inquiry"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout header="Appointment Requests & Intake Triage">
            <Head title="Appointment Requests" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* RemediQ Standard Page Header */}
                <PageHeader
                    title="Appointment Requests & Intake Triage"
                    subtitle="Manage website inquiries, phone bookings, and walk-in consultation intakes."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
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
                                href={route('admin.patients.index')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold border border-neutral-300 shadow-2xs transition"
                            >
                                <span>👥</span>
                                <span>Patients</span>
                            </Link>
                            {canCreate && (
                                <Link
                                    href={route('admin.appointment_requests.create')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
                                >
                                    <span>➕</span>
                                    <span>Record Appointment</span>
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive KPI Summary Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Total Inquiries
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-neutral-900">
                                {kpis.total_requests ?? requests.total ?? 0}
                            </span>
                            <span className="text-[11px] text-neutral-500 font-semibold">Logged</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Pending Triage
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-amber-600">
                                {kpis.pending_triage ?? 0}
                            </span>
                            <span className="text-[11px] text-amber-700 font-semibold">Needs Action</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Contacted
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-blue-700">
                                {kpis.contacted ?? 0}
                            </span>
                            <span className="text-[11px] text-blue-600 font-semibold">In Progress</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Scheduled Today
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-teal-700">
                                {kpis.scheduled_today ?? 0}
                            </span>
                            <span className="text-[11px] text-teal-600 font-semibold">Today's Slots</span>
                        </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Converted Patients
                        </span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-extrabold text-emerald-700">
                                {kpis.converted_patients ?? 0}
                            </span>
                            <span className="text-[11px] text-emerald-600 font-semibold">Registered</span>
                        </div>
                    </div>
                </div>

                {/* Filter and Universal Search Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
                    {flash.warning && (
                        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                            {flash.warning}
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* Universal Search Form */}
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:max-w-md">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by patient name, phone, or notes..."
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

                        {/* Status Dropdown */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider shrink-0" htmlFor="status-select">
                                Status:
                            </label>
                            <select
                                id="status-select"
                                value={statusFilter}
                                onChange={handleStatusChange}
                                className="text-xs font-semibold rounded-xl border-neutral-300 py-2 bg-neutral-50 focus:border-teal-500 focus:ring-teal-500 min-w-[140px]"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="contacted">Contacted</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Operational Date Presets Filter Pills */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-100 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
                                Operational Presets:
                            </span>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('all')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    datePreset === 'all'
                                        ? 'bg-neutral-900 text-white shadow-2xs'
                                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                }`}
                            >
                                All Inquiries
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('today')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    datePreset === 'today'
                                        ? 'bg-teal-600 text-white shadow-2xs'
                                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                                }`}
                            >
                                📅 Today's Slots
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('tomorrow')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    datePreset === 'tomorrow'
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                                }`}
                            >
                                ☀️ Tomorrow
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('this_week')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    datePreset === 'this_week'
                                        ? 'bg-indigo-600 text-white shadow-2xs'
                                        : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                                }`}
                            >
                                🗓️ This Week
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePresetChange('pending')}
                                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                    datePreset === 'pending'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                }`}
                            >
                                ⏳ Pending Triage
                            </button>
                        </div>

                        {filters?.search && (
                            <span className="text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                                Matching: "{filters.search}"
                            </span>
                        )}
                    </div>
                </div>

                {/* Mobile High-Density Touch Cards (< 768px / block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {requests.data.length > 0 ? (
                        requests.data.map((request) => {
                            const isToday =
                                request.scheduled_date && String(request.scheduled_date).slice(0, 10) === todayStr;
                            return (
                                <div
                                    key={request.id}
                                    className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 ${
                                        isToday ? 'border-teal-400 bg-teal-50/20' : 'border-neutral-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-neutral-500">#{request.id}</span>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                                                {request.source === 'walk_in' ? 'Walk-in' : request.source === 'phone' ? 'Phone' : 'Website'}
                                            </span>
                                            {isToday && (
                                                <span className="text-[10px] uppercase font-extrabold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                                                    📅 TODAY
                                                </span>
                                            )}
                                        </div>
                                        <StatusBadge status={request.status} />
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-neutral-900">{request.name}</h4>
                                        <div className="flex items-center gap-3 text-xs text-neutral-600 mt-1">
                                            <span className="font-mono">{request.phone}</span>
                                            {request.phone && (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`tel:${request.phone}`}
                                                        className="px-2 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold text-[11px]"
                                                    >
                                                        📞 Call
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/88${String(request.phone).replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold text-[11px]"
                                                    >
                                                        💬 WhatsApp
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                                Requested:
                                            </span>
                                            <span className="font-mono text-neutral-700">
                                                {formatDate(request.preferred_date)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                                                Confirmed Slot:
                                            </span>
                                            <span className="font-mono font-bold text-neutral-900">
                                                {request.scheduled_date
                                                    ? `${formatDate(request.scheduled_date)}${formatTime(request.scheduled_time) ? ` ${formatTime(request.scheduled_time)}` : ''}`
                                                    : 'Unscheduled'}
                                            </span>
                                        </div>
                                    </div>

                                    {request.message && (
                                        <p className="text-xs text-neutral-500 italic bg-neutral-50/60 p-2 rounded-lg">
                                            "{request.message}"
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                                        {canUpdate && request.status === 'pending' && (
                                            <button
                                                type="button"
                                                onClick={() => handleQuickStatus(request.id, 'contacted')}
                                                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1 shadow-2xs"
                                            >
                                                <span>📞</span>
                                                <span>Mark Contacted</span>
                                            </button>
                                        )}

                                        <Link
                                            href={route('admin.queue.tokens.create', {
                                                appointment_request_id: request.id,
                                                patient_id: request.converted_patient_id || request.existing_patient_match_id || '',
                                                patient_name: request.name,
                                                patient_phone: request.phone,
                                            })}
                                            className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1 shadow-2xs"
                                        >
                                            <span>🎟️</span>
                                            <span>Issue Token</span>
                                        </Link>

                                        {canUpdate && (
                                            <Link
                                                href={route('admin.appointment_requests.edit', request.id)}
                                                className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center"
                                            >
                                                {request.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
                                            </Link>
                                        )}

                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(request)}
                                                className="p-2 text-neutral-400 hover:text-red-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Delete inquiry"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-xs text-neutral-400 py-8 text-center italic bg-white rounded-2xl border border-neutral-200">
                            No appointment requests match your filters.
                        </div>
                    )}

                    {requests.links && <Pagination links={requests.links} />}
                </div>

                {/* Desktop Data Table (>= 768px / hidden md:block) */}
                <div className="hidden md:block rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-4">
                    <DataTable
                        columns={columns}
                        data={requests.data}
                        keyExtractor={(request) => request.id}
                        emptyMessage="No appointment requests found matching your filters."
                    />

                    {requests.links && <Pagination links={requests.links} />}
                </div>

                {/* Confirmation Dialogs */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete appointment request?"
                    message="This removes the request from the active list. Its record and audit history are retained."
                    confirmLabel="Delete"
                    isDestructive
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />

                <ConfirmDialog
                    isOpen={!!linkTarget}
                    title="Link existing patient?"
                    message={
                        linkTarget
                            ? `An exact name and phone match was found for ${linkTarget.name}. Link that existing patient to this request? No new patient record will be created.`
                            : ''
                    }
                    confirmLabel="Link patient"
                    isDestructive={false}
                    onConfirm={confirmLink}
                    onCancel={() => setLinkTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
