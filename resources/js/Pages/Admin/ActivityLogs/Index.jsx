import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Index({
    logs = { data: [], links: [] },
    kpis = {},
    actors = [],
    availableEvents = [],
    filters = {},
}) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedFilter, setSelectedFilter] = useState(filters.filter || 'all');
    const [selectedEvent, setSelectedEvent] = useState(filters.event || 'all');
    const [selectedActor, setSelectedActor] = useState(filters.causer_id || 'all');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return undefined;
        }

        const timer = setTimeout(() => {
            router.get(
                route('admin.activity_logs.index'),
                {
                    search: search.trim() || undefined,
                    filter: selectedFilter && selectedFilter !== 'all' ? selectedFilter : undefined,
                    event: selectedEvent && selectedEvent !== 'all' ? selectedEvent : undefined,
                    causer_id: selectedActor && selectedActor !== 'all' ? selectedActor : undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, selectedFilter, selectedEvent, selectedActor, dateFrom, dateTo]);

    const handleClearSearch = () => {
        setSearch('');
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedFilter('all');
        setSelectedEvent('all');
        setSelectedActor('all');
        setDateFrom('');
        setDateTo('');
    };

    const hasActiveFilters = Boolean(
        search
        || (selectedFilter && selectedFilter !== 'all')
        || (selectedEvent && selectedEvent !== 'all')
        || (selectedActor && selectedActor !== 'all')
        || dateFrom
        || dateTo
    );

    const exportUrl = route('admin.activity_logs.export', {
        search: search.trim() || undefined,
        filter: selectedFilter && selectedFilter !== 'all' ? selectedFilter : undefined,
        event: selectedEvent && selectedEvent !== 'all' ? selectedEvent : undefined,
        causer_id: selectedActor && selectedActor !== 'all' ? selectedActor : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
    });

    const formatRelativeTime = (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getEventBadgeClass = (log) => {
        const event = (log.event || log.description || '').toLowerCase();
        if (event.includes('denied')) return 'bg-red-50 text-red-700 border-red-200';
        if (event.includes('deleted') || event.includes('destroy')) return 'bg-rose-50 text-rose-700 border-rose-200';
        if (event.includes('created') || event.includes('store')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (event.includes('updated') || event.includes('update')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (event.includes('backup')) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getModelDisplayName = (subjectType) => {
        if (!subjectType) return '—';
        const parts = subjectType.split('\\');
        return parts[parts.length - 1];
    };

    const columns = [
        {
            header: 'Timestamp',
            accessor: 'created_at',
            cell: (log) => (
                <div className="space-y-0.5 whitespace-nowrap">
                    <div className="text-xs font-mono font-medium text-gray-900">
                        {new Date(log.created_at).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                    <div className="text-[10px] text-gray-400 font-sans">
                        {formatRelativeTime(log.created_at)}
                    </div>
                </div>
            ),
        },
        {
            header: 'Staff Actor',
            accessor: 'causer.name',
            cell: (log) => {
                const actorName = log.causer?.name;
                return (
                    <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            actorName ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {actorName ? actorName.slice(0, 1).toUpperCase() : '🤖'}
                        </div>
                        <span className="font-semibold text-xs text-gray-900">
                            {actorName || 'System / Automated'}
                        </span>
                    </div>
                );
            },
        },
        {
            header: 'Action / Event',
            accessor: 'description',
            cell: (log) => (
                <div className="space-y-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${getEventBadgeClass(log)}`}>
                        {log.event || log.description}
                    </span>
                    {log.description && log.description !== log.event && (
                        <p className="text-[11px] text-gray-500 truncate max-w-xs">{log.description}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Access Outcome',
            accessor: 'properties.authorization_outcome',
            cell: (log) => {
                if (log.log_name !== 'clinical_access') return <span className="text-xs text-gray-400 font-mono">—</span>;
                const outcome = log.properties?.authorization_outcome;
                const allowed = outcome === 'allowed';
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                        allowed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200 animate-pulse'
                    }`}>
                        <span>{allowed ? '🟢' : '🛑'}</span>
                        <span className="capitalize">{outcome || 'Denied'}</span>
                    </span>
                );
            },
        },
        {
            header: 'Clinical Records',
            accessor: 'properties.visit_id',
            cell: (log) => {
                const patientId = log.properties?.patient_id;
                const visitId = log.properties?.visit_id;
                if (!patientId && !visitId) return <span className="font-mono text-xs text-gray-400">—</span>;

                return (
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                        {patientId && (
                            <Link
                                href={route('admin.patients.index', { search: patientId })}
                                className="inline-flex items-center gap-1 text-primary-700 bg-primary-50 hover:bg-primary-100 px-1.5 py-0.5 rounded border border-primary-200 font-semibold"
                                title="Inspect Patient Record"
                            >
                                <span>Patient #{patientId}</span>
                            </Link>
                        )}
                        {visitId && (
                            <Link
                                href={route('admin.visits.show', visitId)}
                                className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 font-semibold"
                                title="Inspect Visit Record"
                            >
                                <span>Visit #{visitId}</span>
                            </Link>
                        )}
                    </div>
                );
            },
        },
        {
            header: 'Target Model & ID',
            accessor: 'subject_type',
            cell: (log) => {
                const modelName = getModelDisplayName(log.subject_type);
                return (
                    <div className="space-y-0.5 font-mono text-xs">
                        <div className="font-semibold text-gray-800">{modelName}</div>
                        {log.subject_id && <div className="text-[11px] text-gray-500">ID: #{log.subject_id}</div>}
                    </div>
                );
            },
        },
    ];

    const filterPills = [
        { key: 'all', label: 'All Events', count: kpis.total_logs ?? logs.total ?? 0, icon: '📜' },
        { key: 'denied', label: 'Security Denials', count: kpis.denied_alerts_count ?? 0, icon: '🛑' },
        { key: 'clinical_access', label: 'Clinical Access', count: kpis.clinical_access_count ?? 0, icon: '🩺' },
        { key: 'mutations', label: 'Data Changes', count: null, icon: '✏️' },
        { key: 'system_health', label: 'System Operations', count: null, icon: '🏥' },
        { key: 'today', label: 'Today Only', count: kpis.today_logs ?? 0, icon: '⚡' },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="System Audit & Activity Logs" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="System Audit &amp; Activity Logs (সিস্টেম অডিট ও অ্যাক্টিভিটি লগ)"
                    subtitle="Immutable tamper-evident audit records of clinical changes, access verifications, and administrative operations"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.users.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>👥</span> Staff Users
                            </Link>
                            <Link
                                href={route('admin.roles.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🛡️</span> Roles
                            </Link>
                            <Link
                                href={route('admin.permissions.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🔑</span> Permissions
                            </Link>
                            <Link
                                href={route('admin.system_health.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🏥</span> System Health
                            </Link>
                            <a
                                href={exportUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
                            >
                                <span>📥</span> Export CSV
                            </a>
                        </div>
                    }
                />

                {/* Executive 5-Card KPI Summary Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Security Audit Metrics">
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Total Audit Events 📜</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total_logs ?? 0}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">মোট সংরক্ষিত অডিট রেকর্ড</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Today's Events ⚡</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.today_logs ?? 0}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">আজকের সম্পাদিত অ্যাক্টিভিটি</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">Clinical Access 🩺</div>
                        <div className="text-2xl font-bold text-violet-900 mt-1">{kpis.clinical_access_count ?? 0}</div>
                        <div className="text-[11px] text-violet-600 mt-0.5">রোগীর রেকর্ড অ্যাক্সেস যাচাই</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Security Denials 🛑</div>
                        <div className="text-2xl font-bold text-rose-900 mt-1">{kpis.denied_alerts_count ?? 0}</div>
                        <div className="text-[11px] text-rose-600 mt-0.5">অননুমোদিত অ্যাক্সেস ব্লক</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Active Staff Today 👥</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{kpis.active_actors_today ?? 0}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">আজ সক্রিয় স্টাফ সদস্য</div>
                    </div>
                </section>

                {/* Universal Search & Multi-Filter Controls */}
                <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search logs by action, staff actor, target model (e.g. Patient, Visit, AdviceItem)..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition py-1.5 px-3 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 shrink-0"
                            >
                                ✕ Reset Filters
                            </button>
                        )}
                    </div>

                    {/* 1-Click Fast-Track Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Fast Filters:</span>
                        {filterPills.map((pill) => {
                            const isSelected = selectedFilter === pill.key;
                            return (
                                <button
                                    key={pill.key}
                                    type="button"
                                    onClick={() => setSelectedFilter(pill.key)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                                        isSelected
                                            ? 'bg-primary-600 text-white shadow-2xs font-bold'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                                    }`}
                                >
                                    <span>{pill.icon}</span>
                                    <span>{pill.label}</span>
                                    {pill.count !== null && (
                                        <span
                                            className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                                                isSelected ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {pill.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Advanced Dropdown Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100 text-xs">
                        {/* Actor Dropdown */}
                        <div>
                            <label htmlFor="actor-filter" className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Staff Actor
                            </label>
                            <select
                                id="actor-filter"
                                value={selectedActor}
                                onChange={(e) => setSelectedActor(e.target.value)}
                                className="w-full rounded-md border-gray-300 py-1.5 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="all">All Staff Actors</option>
                                {actors.map((actor) => (
                                    <option key={actor.id} value={actor.id}>
                                        {actor.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Event Dropdown */}
                        <div>
                            <label htmlFor="event-filter" className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Event Type
                            </label>
                            <select
                                id="event-filter"
                                value={selectedEvent}
                                onChange={(e) => setSelectedEvent(e.target.value)}
                                className="w-full rounded-md border-gray-300 py-1.5 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="all">All Event Types</option>
                                {availableEvents.map((evt) => (
                                    <option key={evt} value={evt}>
                                        {evt}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date From */}
                        <div>
                            <label htmlFor="date-from" className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Date From
                            </label>
                            <input
                                id="date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full rounded-md border-gray-300 py-1.5 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>

                        {/* Date To */}
                        <div>
                            <label htmlFor="date-to" className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                Date To
                            </label>
                            <input
                                id="date-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="w-full rounded-md border-gray-300 py-1.5 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                </section>

                {/* Audit Logs Results Table & Mobile Cards */}
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                    {/* Desktop View (hidden on < md) */}
                    <div className="hidden md:block">
                        <DataTable
                            columns={columns}
                            data={logs.data}
                            keyExtractor={(l) => l.id}
                            emptyMessage="No audit log entries match your filter criteria."
                        />
                    </div>

                    {/* Mobile Touch Cards View (visible on < md) */}
                    <div className="block md:hidden divide-y divide-gray-100">
                        {logs.data.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-xs">
                                No audit log entries match your filter criteria.
                            </div>
                        ) : (
                            logs.data.map((log) => {
                                const actorName = log.causer?.name;
                                const modelName = getModelDisplayName(log.subject_type);
                                const isClinical = log.log_name === 'clinical_access';
                                const outcome = log.properties?.authorization_outcome;
                                const patientId = log.properties?.patient_id;
                                const visitId = log.properties?.visit_id;

                                return (
                                    <article key={log.id} className="p-4 space-y-2.5 hover:bg-gray-50/70 transition">
                                        {/* Actor & Time Header */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                    actorName ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {actorName ? actorName.slice(0, 1).toUpperCase() : '🤖'}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-xs text-gray-900 block truncate">
                                                        {actorName || 'System / Automated'}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="text-[11px] font-mono text-gray-500 shrink-0">
                                                {formatRelativeTime(log.created_at)}
                                            </span>
                                        </div>

                                        {/* Event & Outcome Badges */}
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border capitalize ${getEventBadgeClass(log)}`}>
                                                {log.event || log.description}
                                            </span>

                                            {isClinical && (
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                                    outcome === 'allowed'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : 'bg-red-50 text-red-800 border-red-200'
                                                }`}>
                                                    <span>{outcome === 'allowed' ? '🟢' : '🛑'}</span>
                                                    <span className="capitalize">{outcome || 'Denied'}</span>
                                                </span>
                                            )}

                                            <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {modelName} #{log.subject_id || '—'}
                                            </span>
                                        </div>

                                        {/* Clinical Record Links if present */}
                                        {(patientId || visitId) && (
                                            <div className="flex items-center gap-2 pt-1 font-mono text-xs text-gray-600">
                                                {patientId && (
                                                    <Link
                                                        href={route('admin.patients.index', { search: patientId })}
                                                        className="text-primary-700 font-semibold underline"
                                                    >
                                                        Patient #{patientId}
                                                    </Link>
                                                )}
                                                {visitId && (
                                                    <Link
                                                        href={route('admin.visits.show', visitId)}
                                                        className="text-blue-700 font-semibold underline"
                                                    >
                                                        Visit #{visitId}
                                                    </Link>
                                                )}
                                            </div>
                                        )}

                                        {/* Full Timestamp */}
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {new Date(log.created_at).toLocaleString()}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>

                    {logs.links && (
                        <div className="border-t border-gray-100 p-4">
                            <Pagination links={logs.links} />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
