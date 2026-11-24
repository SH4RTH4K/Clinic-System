import ConfirmDialog from '@/Components/ConfirmDialog';
import DataTable from '@/Components/DataTable';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import usePermission from '@/Components/usePermission';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatAgeSummary } from './ageHelpers';
import { getGuardianRelationshipLabel } from './relationshipHelpers';

export default function Index({
    patients,
    filters = {},
    relationshipOptions = [],
    kpis = {},
}) {
    const can = usePermission();
    const canCreate = can('patients.create');
    const canUpdate = can('patients.update');
    const canDelete = can('patients.delete');
    const canCreateVisit = can('visits.create') || can('clinical_records.view');
    const canManageQueue = can('queue.manage') || can('queue.view');

    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
        guardian_name: filters.guardian_name || '',
        gender: filters.gender || '',
        blood_group: filters.blood_group || '',
        date_filter: filters.date_filter || '',
    });

    const [showFilters, setShowFilters] = useState(
        Boolean(filters.guardian_name || filters.gender || filters.blood_group || filters.date_filter)
    );
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const onSearch = (e) => {
        if (e) e.preventDefault();
        get(route('admin.patients.index'), { preserveState: true });
    };

    const hasActiveFilters = Boolean(
        data.search || data.guardian_name || data.gender || data.blood_group || data.date_filter
        || filters.search || filters.guardian_name || filters.gender || filters.blood_group || filters.date_filter
    );

    const confirmDelete = () => {
        if (!canDelete || !deleteId) return;
        setIsDeleting(true);
        router.delete(route('admin.patients.destroy', deleteId), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeleteId(null);
            },
        });
    };

    const columns = [
        {
            key: 'patient_no',
            label: 'Patient ID',
            render: (p) => (
                <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded inline-block">
                    {p.patient_identifier || `${p.patient_no}${p.patient_series || ''}`}
                </span>
            ),
        },
        {
            key: 'old_or_other_id',
            label: 'Old/Other ID',
            render: (p) => (
                <span className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded inline-block">
                    {p.old_or_other_id || '—'}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            render: (p) => (
                <div className="flex items-center space-x-3">
                    {p.photo_url ? (
                        <img
                            src={p.photo_url}
                            alt={p.name}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {p.name ? p.name.charAt(0) : 'P'}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900">{p.name}</span>
                            {p.blood_group && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                    {p.blood_group}
                                </span>
                            )}
                        </div>
                        {p.guardian_name && (
                            <span className="block text-xs text-gray-500">
                                {getGuardianRelationshipLabel(p.guardian_relationship, p.guardian_relationship_custom, relationshipOptions) || 'C/O'} {p.guardian_name}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (p) => {
                if (!p.phone) return <span className="text-sm text-gray-400">—</span>;
                const cleanPhone = p.phone.replace(/[^0-9]/g, '');
                return (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <a href={`tel:${p.phone}`} className="hover:text-primary-600 transition" title="Call patient">
                            {p.phone}
                        </a>
                        {cleanPhone.length >= 10 && (
                            <a
                                href={`https://wa.me/${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 transition"
                                title="Chat on WhatsApp"
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.127-.521-1.625-.676-2.656-2.34-2.736-2.449-.079-.11-1.002-1.334-1.002-2.544 0-1.21.636-1.805.862-2.052.226-.247.493-.309.658-.309.165 0 .329.002.473.009.153.008.358-.058.559.426.208.502.71 1.732.772 1.859.062.127.103.275.02.439-.082.164-.124.267-.246.411-.123.144-.26.321-.371.431-.124.123-.253.257-.109.505.144.247.641 1.058 1.378 1.716.949.847 1.751 1.11 2.001 1.233.249.123.395.109.541-.059.146-.168.625-.728.791-.977.166-.249.332-.207.559-.123.228.084 1.442.68 1.69 1.139.248.459.248.868.104 1.273z" />
                                </svg>
                            </a>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'age_gender',
            label: 'Age / Gender',
            render: (p) => (
                <span className="text-sm text-gray-700">
                    {formatAgeSummary(p.age_years, p.age_months, p.age_days) || p.dob || '—'}
                    {p.gender ? ` (${ucFirst(p.gender)})` : ''}
                </span>
            ),
        },
        {
            key: 'visits_and_queue',
            label: 'Visits & Queue',
            render: (p) => (
                <div className="space-y-1">
                    <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {p.visits_count || 0} {p.visits_count === 1 ? 'visit' : 'visits'}
                        </span>
                    </div>
                    {p.today_queue_token ? (
                        <div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                                p.today_queue_token.status === 'waiting'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : p.today_queue_token.status === 'in_consultation' || p.today_queue_token.status === 'calling'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                Token #{p.today_queue_token.token_number}
                            </span>
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (p) => (
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {canManageQueue && (
                        <Link
                            href={route('admin.queue.tokens.create', { patient_id: p.id })}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition flex items-center gap-1"
                            title="Check-in to Waiting Queue"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>+ Queue</span>
                        </Link>
                    )}
                    {canCreateVisit && (
                        <Link
                            href={route('admin.visits.create', { patient_id: p.id })}
                            className="rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition flex items-center gap-1"
                            title="Start Consultation Visit"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>+ Visit</span>
                        </Link>
                    )}
                    <Link
                        href={route('admin.patients.opd_card', p.id)}
                        className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                        title="Print OPD Card"
                    >
                        OPD Card
                    </Link>
                    <Link
                        href={route('admin.patients.show', p.id)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition"
                        title="View Record"
                    >
                        View
                    </Link>
                    {canUpdate && (
                        <Link
                            href={route('admin.patients.edit', p.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition"
                            title="Edit Record"
                        >
                            Edit
                        </Link>
                    )}
                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => setDeleteId(p.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                            title="Delete Record"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
        },
    ];

    function ucFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return (
        <AuthenticatedLayout header="Patients">
            <Head title="Patients" />

            <div className="mx-auto max-w-7xl">
                {/* KPI Summary Cards */}
                {kpis && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-gray-900">{kpis.total_patients ?? 0}</div>
                                <div className="text-xs text-gray-500 font-medium">Total Registered</div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-gray-900">{kpis.registered_today ?? 0}</div>
                                <div className="text-xs text-gray-500 font-medium">New Today</div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-gray-900">{kpis.in_queue_today ?? 0}</div>
                                <div className="text-xs text-gray-500 font-medium">In Queue Today</div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-xl font-bold text-gray-900">{kpis.total_visits ?? 0}</div>
                                <div className="text-xs text-gray-500 font-medium">Total Consultations</div>
                            </div>
                        </div>
                    </div>
                )}

                <PageHeader
                    title="Patients"
                    subtitle="Register and manage patient health records"
                    actions={
                        <div className="flex items-center gap-2">
                            <a
                                href={route('admin.patients.export', {
                                    search: data.search,
                                    guardian_name: data.guardian_name,
                                    gender: data.gender,
                                    blood_group: data.blood_group,
                                    date_filter: data.date_filter,
                                })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
                                title="Export filtered patient list to CSV"
                            >
                                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export CSV</span>
                            </a>
                            {canCreate ? (
                                <Link href={route('admin.patients.create')}>
                                    <PrimaryButton className="gap-1.5">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        <span>New Patient</span>
                                    </PrimaryButton>
                                </Link>
                            ) : null}
                        </div>
                    }
                />

                {/* Search & Filters */}
                <div className="mb-4 space-y-3">
                    <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
                        <div className="w-full sm:w-80 md:w-96">
                            <TextInput
                                type="text"
                                aria-label="Search patients by name, guardian, phone, or patient ID"
                                value={data.search}
                                onChange={(e) => setData('search', e.target.value)}
                                placeholder="Search by name, guardian, phone or ID..."
                                className="w-full text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition flex items-center gap-1.5 ${
                                showFilters || data.guardian_name || data.gender || data.blood_group || data.date_filter
                                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            aria-expanded={showFilters}
                            title="Toggle advanced filters"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Filters</span>
                            {data.guardian_name || data.gender || data.blood_group || data.date_filter ? (
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                            ) : null}
                        </button>
                        {hasActiveFilters ? (
                            <Link
                                href={route('admin.patients.index')}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                            >
                                Reset
                            </Link>
                        ) : null}
                    </form>

                    {showFilters && (
                        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-w-4xl">
                            <div className="flex-1 min-w-[200px]">
                                <label htmlFor="guardian-search-input" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Guardian / Contact Name
                                </label>
                                <TextInput
                                    id="guardian-search-input"
                                    type="text"
                                    value={data.guardian_name}
                                    onChange={(e) => setData('guardian_name', e.target.value)}
                                    placeholder="Filter by guardian name..."
                                    className="w-full text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSearch(e);
                                    }}
                                />
                            </div>

                            <div className="w-36">
                                <label htmlFor="gender-filter" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Gender
                                </label>
                                <select
                                    id="gender-filter"
                                    value={data.gender}
                                    onChange={(e) => {
                                        setData('gender', e.target.value);
                                        router.get(route('admin.patients.index'), {
                                            ...data,
                                            gender: e.target.value,
                                        }, { preserveState: true });
                                    }}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="">All Genders</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="w-36">
                                <label htmlFor="blood-group-filter" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Blood Group
                                </label>
                                <select
                                    id="blood-group-filter"
                                    value={data.blood_group}
                                    onChange={(e) => {
                                        setData('blood_group', e.target.value);
                                        router.get(route('admin.patients.index'), {
                                            ...data,
                                            blood_group: e.target.value,
                                        }, { preserveState: true });
                                    }}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="">All Groups</option>
                                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-40">
                                <label htmlFor="date-filter" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Registration Date
                                </label>
                                <select
                                    id="date-filter"
                                    value={data.date_filter}
                                    onChange={(e) => {
                                        setData('date_filter', e.target.value);
                                        router.get(route('admin.patients.index'), {
                                            ...data,
                                            date_filter: e.target.value,
                                        }, { preserveState: true });
                                    }}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="">All Time</option>
                                    <option value="today">Registered Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                </select>
                            </div>

                            <button
                                type="button"
                                onClick={onSearch}
                                disabled={processing}
                                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>

                <DataTable
                    columns={columns}
                    data={patients.data || []}
                    isLoading={processing}
                    emptyMessage="No patients found matching the criteria."
                />

                <Pagination links={patients.links} />

                {/* Accessible Confirmation Dialog */}
                <ConfirmDialog
                    show={Boolean(deleteId)}
                    title="Delete Patient"
                    message="Are you sure you want to delete this patient record? This action will safely archive the patient record."
                    confirmLabel="Delete Patient"
                    isLoading={isDeleting}
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteId(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
