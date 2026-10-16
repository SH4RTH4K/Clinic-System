import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

const statCards = [
    {
        key: 'total_patients',
        label: 'Total Patients',
        accent: 'text-blue-700',
        bg: 'bg-blue-50',
        route: 'admin.patients.index',
        metaKey: 'new_patients_this_month',
        metaLabel: 'new this month',
    },
    {
        key: 'todays_visits',
        label: "Today's Visits",
        accent: 'text-emerald-700',
        bg: 'bg-emerald-50',
        route: 'admin.visits.index',
        metaKey: 'weekly_visits_total',
        metaLabel: 'last 7 days',
    },
    {
        key: 'pending_requests',
        label: 'Pending Requests',
        accent: 'text-rose-700',
        bg: 'bg-rose-50',
        route: 'admin.appointment_requests.index',
        metaLabel: 'needs follow-up',
    },
    {
        key: 'active_doctors',
        label: 'Active Doctors',
        accent: 'text-indigo-700',
        bg: 'bg-indigo-50',
        route: 'admin.doctors.index',
        metaKey: 'total_medicines',
        metaLabel: 'medicines listed',
    },
];

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
    if (!value) {
        return 'Not set';
    }

    return String(value).split('T')[0];
}

function formatTime(value) {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 5);
}

function formatPatientNo(patient) {
    if (!patient) {
        return 'No patient';
    }

    return `${patient.patient_series ?? ''}${patient.patient_no ?? patient.id}`;
}

function StatusPill({ status }) {
    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusBadge[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    );
}

function StatCard({ card, metrics }) {
    return (
        <Link href={route(card.route)} className={`${card.bg} block rounded-lg border border-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
                    <p className={`mt-3 text-4xl font-bold ${card.accent}`}>{metrics[card.key] ?? 0}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg font-bold ${card.accent}`}>
                    {card.label.charAt(0)}
                </span>
            </div>
            <p className="mt-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{card.metaKey ? (metrics[card.metaKey] ?? 0) : (metrics[card.key] ?? 0)}</span> {card.metaLabel}
            </p>
        </Link>
    );
}

export default function Dashboard({
    metrics = {},
    appointment_status = {},
    weekly_visits = [],
    top_medicines = [],
    top_medicine_max = 1,
    recent_requests = [],
    recent_visits = [],
}) {
    const maxWeeklyVisits = Math.max(...weekly_visits.map((day) => day.total), 1);
    const appointmentTotal = appointmentStatuses.reduce((total, item) => total + (appointment_status[item.key] ?? 0), 0);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Dashboard</h2>}>
            <Head title="Dashboard" />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Clinic Overview</p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-950">Admin Dashboard</h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={route('admin.visits.create')} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                            New Visit
                        </Link>
                        <Link href={route('admin.patients.create')} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            New Patient
                        </Link>
                        <Link href={route('admin.doctors.index')} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Doctors
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((card) => (
                        <StatCard key={card.key} card={card} metrics={metrics} />
                    ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <section className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Weekly Visits</h3>
                                <p className="text-sm text-slate-500">{metrics.weekly_visits_total ?? 0} visits in the last 7 days</p>
                            </div>
                            <Link href={route('admin.visits.index')} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                                View all
                            </Link>
                        </div>
                        <div className="mt-6 flex h-56 items-end gap-3">
                            {weekly_visits.map((day) => (
                                <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                                    <div className="flex h-44 w-full items-end rounded-md bg-slate-100">
                                        <div
                                            className="w-full rounded-md bg-blue-600 transition-all"
                                            style={{ height: `${Math.max((day.total / maxWeeklyVisits) * 100, day.total ? 12 : 4)}%` }}
                                            title={`${day.total} visits`}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-900">{day.total}</p>
                                        <p className="text-xs font-medium text-slate-500">{day.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Appointments</h3>
                                <p className="text-sm text-slate-500">{appointmentTotal} total requests</p>
                            </div>
                            <Link href={route('admin.appointment_requests.index')} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                                Manage
                            </Link>
                        </div>
                        <div className="mt-6 space-y-4">
                            {appointmentStatuses.map((item) => {
                                const count = appointment_status[item.key] ?? 0;
                                const width = appointmentTotal ? (count / appointmentTotal) * 100 : 0;

                                return (
                                    <div key={item.key}>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="font-semibold text-slate-700">{item.label}</span>
                                            <span className="font-bold text-slate-900">{count}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${width}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                    <section className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Recent Requests</h3>
                            <Link href={route('admin.appointment_requests.index')} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                                Open
                            </Link>
                        </div>
                        <div className="mt-5 space-y-4">
                            {recent_requests.length ? recent_requests.map((request) => (
                                <div key={request.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-slate-900">{request.name}</p>
                                            <p className="text-sm text-slate-500">{request.phone}</p>
                                        </div>
                                        <StatusPill status={request.status} />
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {formatDate(request.preferred_date)} {formatTime(request.preferred_time)}
                                    </p>
                                </div>
                            )) : (
                                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No appointment requests yet.</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Recent Visits</h3>
                            <Link href={route('admin.visits.index')} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                                Open
                            </Link>
                        </div>
                        <div className="mt-5 space-y-4">
                            {recent_visits.length ? recent_visits.map((visit) => (
                                <div key={visit.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <Link href={route('admin.visits.show', visit.id)} className="font-semibold text-slate-900 hover:text-blue-700">
                                                {visit.patient?.name ?? 'Unknown patient'}
                                            </Link>
                                            <p className="text-sm text-slate-500">{formatPatientNo(visit.patient)} - {formatDate(visit.visit_date)}</p>
                                        </div>
                                        <StatusPill status={visit.status} />
                                    </div>
                                    <p className="mt-2 max-h-10 overflow-hidden text-sm text-slate-600">{visit.chief_complaint}</p>
                                </div>
                            )) : (
                                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No visits recorded yet.</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-lg bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Top Medicines</h3>
                                <p className="text-sm text-slate-500">Last 30 days</p>
                            </div>
                            <Link href={route('admin.medicines.index')} className="text-sm font-semibold text-blue-700 hover:text-blue-900">
                                Inventory
                            </Link>
                        </div>
                        <div className="mt-5 space-y-4">
                            {top_medicines.length ? top_medicines.map((item) => (
                                <div key={item.medicine_id}>
                                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                        <div>
                                            <p className="font-semibold text-slate-900">{item.name}</p>
                                            {item.potency && <p className="text-xs text-slate-500">{item.potency}</p>}
                                        </div>
                                        <span className="font-bold text-slate-900">{item.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(item.count / top_medicine_max) * 100}%` }} />
                                    </div>
                                </div>
                            )) : (
                                <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No prescription data for the last 30 days.</p>
                            )}
                        </div>
                    </section>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-white p-5 shadow-sm">
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Visit Status</p>
                        <div className="mt-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-3xl font-bold text-orange-600">{metrics.draft_visits ?? 0}</p>
                                <p className="text-sm text-slate-500">Draft</p>
                            </div>
                            <div className="h-14 w-px bg-slate-200" />
                            <div>
                                <p className="text-3xl font-bold text-purple-600">{metrics.finalized_visits ?? 0}</p>
                                <p className="text-sm text-slate-500">Finalized</p>
                            </div>
                        </div>
                    </div>
                    <Link href={route('admin.medicines.index')} className="rounded-lg bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Medicines</p>
                        <p className="mt-4 text-3xl font-bold text-slate-900">{metrics.active_medicines ?? 0}</p>
                        <p className="text-sm text-slate-500">active of {metrics.total_medicines ?? 0} total</p>
                    </Link>
                    <Link href={route('admin.appointment_requests.index', { status: 'pending' })} className="rounded-lg bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Next Action</p>
                        <p className="mt-4 text-lg font-bold text-slate-900">Follow up pending requests</p>
                        <p className="text-sm text-slate-500">{metrics.pending_requests ?? 0} waiting now</p>
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
