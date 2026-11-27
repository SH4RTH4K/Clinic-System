import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import PermissionLink from '@/Components/PermissionLink';
import usePermission from '@/Components/usePermission';

const appointmentStatuses = [
    { key: 'pending', label: 'Pending', color: 'bg-rose-500' },
    { key: 'contacted', label: 'Contacted', color: 'bg-amber-500' },
    { key: 'scheduled', label: 'Scheduled', color: 'bg-emerald-500' },
    { key: 'cancelled', label: 'Cancelled', color: 'bg-slate-400' },
];

const statusBadge = {
    pending: 'bg-rose-100 text-rose-700',
    contacted: 'bg-amber-100 text-amber-700',
    scheduled: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-slate-100 text-slate-700',
    draft: 'bg-orange-100 text-orange-700',
    finalized: 'bg-purple-100 text-purple-700',
};

function formatDate(value) {
    if (!value) return 'Not set';
    return String(value).split('T')[0];
}

function formatTime(value) {
    if (!value) return '';
    return String(value).slice(0, 5);
}

function formatPatientNo(patient) {
    if (!patient) return 'No patient';
    return patient.patient_identifier || `${patient.patient_no ?? patient.id}${patient.patient_series ?? ''}`;
}

function StatusPill({ status }) {
    return (
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadge[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    );
}

export default function Dashboard({
    access = {},
    metrics = {},
    appointment_status = {},
    weekly_visits = [],
    top_medicines = [],
    top_medicine_max = 1,
    top_pharmaceuticals = [],
    recent_requests = [],
    recent_visits = [],
    inventory_metrics = null,
    practice_type = 'homeopathy',
    clinic_name = 'RemediQ Clinic',
}) {
    const can = usePermission();

    const safeWeeklyVisits = Array.isArray(weekly_visits) ? weekly_visits : [];
    const safeAppointmentStatus = appointment_status && typeof appointment_status === 'object' ? appointment_status : {};
    const safeRecentRequests = Array.isArray(recent_requests) ? recent_requests : [];
    const safeRecentVisits = Array.isArray(recent_visits) ? recent_visits : [];
    const safeTopMedicines = Array.isArray(top_medicines) ? top_medicines : [];
    const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};

    const maxWeeklyVisits = Math.max(...safeWeeklyVisits.map((day) => Number(day?.total || 0)), 1);
    const appointmentTotal = appointmentStatuses.reduce((total, item) => total + (safeAppointmentStatus[item.key] ?? 0), 0);

    const getPracticeBadge = () => {
        if (practice_type === 'allopathy') {
            return { label: '🩺 General Practice / Allopathy', color: 'bg-blue-50 text-blue-800 border-blue-200' };
        }
        if (practice_type === 'integrative_dual') {
            return { label: '🌐 Integrative Dual Practice (Homeo + Allopathy)', color: 'bg-purple-50 text-purple-800 border-purple-200' };
        }
        return { label: '🌿 Classical Homeopathy Practice', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    };

    const practiceBadge = getPracticeBadge();

    return (
        <AuthenticatedLayout>
            <Head title="Executive Command Dashboard (ক্লিনিক ড্যাশবোর্ড)" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* RemediQ Standard PageHeader with Practice Badge */}
                <PageHeader
                    title={`${clinic_name} — Command Center`}
                    subtitle="Real-time chamber operational flow, waiting room load, daily revenue, and 1-click clinical launchers"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${practiceBadge.color}`}>
                                {practiceBadge.label}
                            </span>
                            <Link
                                href={typeof route === 'function' && route().has('admin.settings.edit') ? route('admin.settings.edit') : '/admin/settings'}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <span>⚙️</span> Clinic Settings
                            </Link>
                        </div>
                    }
                />

                {/* Clinical 1-Click Fast-Launch Action Strip */}
                <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                        <span>⚡</span> 1-Click Clinical Action Launchers (দ্রুত অ্যাকশন লঞ্চার):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                        {/* Action 1: New Visit */}
                        {can('visits.create') && (
                            <Link
                                href={route('admin.visits.create')}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold transition shadow-2xs group"
                            >
                                <span className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                                    ➕
                                </span>
                                <div>
                                    <div className="font-bold">New Visit</div>
                                    <div className="text-[10px] text-emerald-600 font-normal">প্রেসক্রিপশন</div>
                                </div>
                            </Link>
                        )}

                        {/* Action 2: Issue Queue Token */}
                        {can('queue.create') && (
                            <Link
                                href={route('admin.queue.tokens.create')}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 hover:bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-bold transition shadow-2xs group"
                            >
                                <span className="w-7 h-7 rounded-md bg-sky-600 text-white flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                                    🎫
                                </span>
                                <div>
                                    <div className="font-bold">Issue Token</div>
                                    <div className="text-[10px] text-sky-600 font-normal">টোকেন প্রদান</div>
                                </div>
                            </Link>
                        )}

                        {/* Action 3: Register Patient */}
                        {can('patients.create') && (
                            <Link
                                href={route('admin.patients.create')}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-bold transition shadow-2xs group"
                            >
                                <span className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                                    👤
                                </span>
                                <div>
                                    <div className="font-bold">New Patient</div>
                                    <div className="text-[10px] text-blue-600 font-normal">রোগী নিবন্ধন</div>
                                </div>
                            </Link>
                        )}

                        {/* Action 4: New POS Invoice */}
                        {can('billing.create') && (
                            <Link
                                href={route('admin.invoices.create')}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-800 text-xs font-bold transition shadow-2xs group"
                            >
                                <span className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                                    🧾
                                </span>
                                <div>
                                    <div className="font-bold">POS Billing</div>
                                    <div className="text-[10px] text-purple-600 font-normal">নগদ বিক্রয়</div>
                                </div>
                            </Link>
                        )}

                        {/* Action 5: Book Appointment */}
                        {can('appointments.create') && (
                            <Link
                                href={route('admin.appointment_requests.create')}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-bold transition shadow-2xs group"
                            >
                                <span className="w-7 h-7 rounded-md bg-rose-600 text-white flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                                    📅
                                </span>
                                <div>
                                    <div className="font-bold">Book Slot</div>
                                    <div className="text-[10px] text-rose-600 font-normal">অ্যাপয়েন্টমেন্ট</div>
                                </div>
                            </Link>
                        )}

                        {/* Action 6: Clinical Reports */}
                        {can('reports.view') && (
                            <Link
                                href={route('admin.reports.index')}
                                className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-800 text-xs font-bold transition shadow-2xs group"
                            >
                                <span className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition">
                                    📊
                                </span>
                                <div>
                                    <div className="font-bold">Reports</div>
                                    <div className="text-[10px] text-indigo-600 font-normal">ক্লিনিক্যাল রিপোর্ট</div>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Executive 6-Tile Operational Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Executive Operational Ribbon">
                    {/* Card 1: Waiting Room Queue */}
                    {access.queue && (
                        <Link
                            href={route('admin.queue.index')}
                            className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                            <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider flex items-center justify-between">
                                <span>Queue Now 🎫</span>
                                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">
                                {safeMetrics.waiting_queue_count ?? 0}
                            </div>
                            <div className="text-[10px] text-sky-600 mt-0.5">ওয়েটিং রুমে অপেক্ষমান</div>
                        </Link>
                    )}

                    {/* Card 2: Today's Consultations */}
                    {access.visits && (
                        <Link
                            href={route('admin.visits.index')}
                            className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                                Today Visits 🩺
                            </div>
                            <div className="text-2xl font-bold text-emerald-800 mt-1">
                                {safeMetrics.todays_visits ?? 0}
                            </div>
                            <div className="text-[10px] text-emerald-600 mt-0.5">
                                {safeMetrics.weekly_visits_total ?? 0} last 7 days
                            </div>
                        </Link>
                    )}

                    {/* Card 3: Pending Appointments */}
                    {access.appointments && (
                        <Link
                            href={route('admin.appointment_requests.index', { status: 'pending' })}
                            className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                            <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                                Pending Intake 📅
                            </div>
                            <div className="text-2xl font-bold text-rose-800 mt-1">
                                {safeMetrics.pending_requests ?? 0}
                            </div>
                            <div className="text-[10px] text-rose-600 mt-0.5">অনুসরণ প্রয়োজন</div>
                        </Link>
                    )}

                    {/* Card 4: Today's Revenue */}
                    {access.billing && (
                        <Link
                            href={route('admin.invoices.index')}
                            className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                                Today Revenue 💰
                            </div>
                            <div className="text-xl font-bold text-purple-900 mt-1">
                                ৳{Number(safeMetrics.today_revenue || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-purple-600 mt-0.5">
                                {safeMetrics.due_invoices_count ?? 0} unpaid invoices
                            </div>
                        </Link>
                    )}

                    {/* Card 5: Inventory Alerts */}
                    {inventory_metrics && (
                        <Link
                            href={route('admin.inventory.index')}
                            className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                                Stock Alerts ⚠️
                            </div>
                            <div className="text-2xl font-bold text-amber-900 mt-1">
                                {(inventory_metrics?.low_stock_count || 0) + (inventory_metrics?.expiring_soon_count || 0)}
                            </div>
                            <div className="text-[10px] text-amber-600 mt-0.5">
                                {inventory_metrics?.low_stock_count || 0} low, {inventory_metrics?.expiring_soon_count || 0} expiring
                            </div>
                        </Link>
                    )}

                    {/* Card 6: Total Registered Patients */}
                    {access.patients && (
                        <Link
                            href={route('admin.patients.index')}
                            className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                        >
                            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">
                                Total Patients 👥
                            </div>
                            <div className="text-2xl font-bold text-blue-900 mt-1">
                                {Number(safeMetrics.total_patients || 0).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-blue-600 mt-0.5">
                                +{safeMetrics.new_patients_this_month ?? 0} this month
                            </div>
                        </Link>
                    )}
                </section>

                {/* Weekly Clinical Volume & Appointment Breakdown */}
                {(access.visits || access.appointments) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Weekly Visits Graph */}
                        {access.visits && (
                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs lg:col-span-2 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                            <span>📊</span> Weekly Consultation Volume (সাপ্তাহিক ভিজিট)
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{safeMetrics.weekly_visits_total ?? 0} visits in the last 7 days</p>
                                    </div>
                                    <Link
                                        href={route('admin.visits.index')}
                                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                                    >
                                        View All Visits →
                                    </Link>
                                </div>
                                <div className="flex h-48 items-end gap-3 pt-2">
                                    {safeWeeklyVisits.map((day) => (
                                        <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                                            <div className="flex h-36 w-full items-end rounded-lg bg-gray-50 p-1">
                                                <div
                                                    className="w-full rounded-md bg-primary-600 transition-all hover:bg-primary-700"
                                                    style={{ height: `${Math.max((day.total / maxWeeklyVisits) * 100, day.total ? 15 : 6)}%` }}
                                                    title={`${day.total} visits on ${day.date}`}
                                                />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-900">{day.total}</p>
                                                <p className="text-[10px] font-medium text-gray-500">{day.label}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Appointment Status Doughnut / Progress Bars */}
                        {access.appointments && (
                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                            <span>📅</span> Appointments Triage
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">{appointmentTotal} total enquiries</p>
                                    </div>
                                    <Link
                                        href={route('admin.appointment_requests.index')}
                                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                                    >
                                        Manage →
                                    </Link>
                                </div>

                                <div className="space-y-3 pt-1">
                                    {appointmentStatuses.map((item) => {
                                        const count = safeAppointmentStatus[item.key] ?? 0;
                                        const width = appointmentTotal ? (count / appointmentTotal) * 100 : 0;

                                        return (
                                            <div key={item.key} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-gray-700">{item.label}</span>
                                                    <span className="font-bold text-gray-900">{count}</span>
                                                </div>
                                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className={`h-full rounded-full ${item.color}`}
                                                        style={{ width: `${width}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Activity Feed: Recent Consultations & Appointments */}
                {(access.appointments || access.visits || access.top_medicines) && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Recent Requests */}
                        {access.appointments && (
                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        <span>📅</span> Recent Appointments
                                    </h3>
                                    <Link
                                        href={route('admin.appointment_requests.index')}
                                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                                    >
                                        All →
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {safeRecentRequests.length ? (
                                        safeRecentRequests.map((request) => (
                                            <div key={request.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">{request.name}</p>
                                                        <p className="text-[11px] text-gray-500 font-mono">{request.phone}</p>
                                                    </div>
                                                    <StatusPill status={request.status} />
                                                </div>
                                                <p className="mt-1 text-[11px] text-gray-600">
                                                    {formatDate(request.preferred_date)} {formatTime(request.preferred_time)}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="p-4 text-center text-xs text-gray-500">No appointment requests yet.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Recent Visits */}
                        {access.visits && (
                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        <span>🩺</span> Recent Consultations
                                    </h3>
                                    <Link
                                        href={route('admin.visits.index')}
                                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                                    >
                                        All →
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {safeRecentVisits.length ? (
                                        safeRecentVisits.map((visit) => (
                                            <div key={visit.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        {access.patients ? (
                                                            <Link
                                                                href={route('admin.visits.show', visit.id)}
                                                                className="text-xs font-bold text-gray-900 hover:text-primary-700"
                                                            >
                                                                {visit.patient?.name ?? 'Unknown patient'}
                                                            </Link>
                                                        ) : (
                                                            <p className="text-xs font-bold text-gray-900">Patient details restricted</p>
                                                        )}
                                                        <p className="text-[11px] text-gray-500">
                                                            {access.patients ? formatPatientNo(visit.patient) : 'Visit'} • {formatDate(visit.visit_date)}
                                                        </p>
                                                    </div>
                                                    <StatusPill status={visit.status} />
                                                </div>
                                                {visit.chief_complaint && (
                                                    <p className="mt-1 text-[11px] text-gray-600 line-clamp-1">{visit.chief_complaint}</p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="p-4 text-center text-xs text-gray-500">No visits recorded yet.</p>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Practice Mode Prescription Trends (Homeo Remedies / Dual Pharma) */}
                        {access.top_medicines && (
                            <section className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                            <span>💊</span> Top Prescribed Remedies
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Last 30 days trends</p>
                                    </div>
                                    <Link
                                        href={route('admin.medicines.index')}
                                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                                    >
                                        Formulary →
                                    </Link>
                                </div>

                                <div className="space-y-3">
                                    {safeTopMedicines.length ? (
                                        safeTopMedicines.map((item) => (
                                            <div key={item.medicine_id} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div>
                                                        <span className="font-bold text-gray-900">{item.name}</span>
                                                        {item.potency && <span className="ml-1 text-[11px] text-primary-700 font-semibold">({item.potency})</span>}
                                                    </div>
                                                    <span className="font-bold text-gray-800">{item.count}</span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                                                    <div
                                                        className="h-full rounded-full bg-primary-600"
                                                        style={{ width: `${(item.count / top_medicine_max) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="p-4 text-center text-xs text-gray-500">No prescription data for the last 30 days.</p>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
