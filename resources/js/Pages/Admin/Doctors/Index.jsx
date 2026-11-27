import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import Pagination from '@/Components/Pagination';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

export default function Index({
    doctors = [],
    kpis = { total: 0, active: 0, inactive: 0, linked_account: 0, scheduled: 0, total_visits: 0 },
    filters = {},
}) {
    const can = usePermission();
    const { auth = {} } = usePage().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin') ?? false;
    const canCreate = isSuperAdmin || can('doctors.create');
    const canView = isSuperAdmin || can('doctors.view');
    const canUpdate = isSuperAdmin || can('doctors.update');
    const canDelete = isSuperAdmin || can('doctors.delete');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [account, setAccount] = useState(filters.account || 'all');

    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            applyFilters({ search, status, account });
        }, 300);

        return () => clearTimeout(timer);
    }, [search, status, account]);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : search,
            status: overrides.status !== undefined ? overrides.status : status,
            account: overrides.account !== undefined ? overrides.account : account,
        };

        Object.keys(query).forEach((key) => {
            if (query[key] === '' || query[key] === null || query[key] === 'all') {
                delete query[key];
            }
        });

        router.get(route('admin.doctors.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        setAccount('all');
        router.get(route('admin.doctors.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;

        if (deleteTarget.visits_count > 0) {
            // Safe deactivation route
            router.patch(route('admin.doctors.toggle-status', deleteTarget.id), {}, {
                onSuccess: () => setDeleteTarget(null),
            });
            return;
        }

        router.delete(route('admin.doctors.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const toggleStatus = (doctor) => {
        if (!canUpdate) return;
        router.patch(route('admin.doctors.toggle-status', doctor.id), {}, {
            preserveScroll: true,
        });
    };

    const doctorList = Array.isArray(doctors) ? doctors : (doctors.data || []);
    const paginationLinks = !Array.isArray(doctors) && doctors.links ? doctors.links : null;

    const columns = [
        {
            header: 'Doctor & Qualifications',
            accessor: 'name',
            cell: (doctor) => (
                <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-200 shadow-2xs">
                        {doctor.photo_path ? (
                            <img
                                src={route('admin.doctors.photo', doctor.id)}
                                alt={doctor.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-500 bg-gray-100">
                                {(doctor.name || 'D').charAt(0)}
                            </div>
                        )}
                        <span
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                doctor.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                            title={doctor.is_active ? 'Active' : 'Inactive'}
                        />
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                            <span>{doctor.name}</span>
                            {doctor.name_bn && (
                                <span className="text-xs text-gray-500 font-bengali font-normal">
                                    ({doctor.name_bn})
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-teal-800 font-medium mt-0.5">
                            {doctor.credentials || 'Practitioner'}
                        </div>
                        {doctor.govt_reg_no && (
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                Reg: <span className="font-semibold text-gray-700">{doctor.govt_reg_no}</span>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: 'Specialty',
            accessor: 'specialty',
            cell: (doctor) => (
                <div className="min-w-0 max-w-xs break-words">
                    <span className="block whitespace-normal break-words text-xs font-semibold text-gray-800">
                        {doctor.specialty || 'General Practitioner'}
                    </span>
                    {doctor.specialty_bn && (
                        <div className="whitespace-normal break-words text-[11px] text-gray-500 font-bengali">
                            {doctor.specialty_bn}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: 'Chamber & Contact',
            accessor: 'phone',
            cell: (doctor) => (
                <div className="text-xs text-gray-700 space-y-0.5">
                    {doctor.phone && (
                        <div>
                            <a href={`tel:${doctor.phone}`} className="text-gray-900 hover:text-teal-700 font-mono">
                                📞 {doctor.phone}
                            </a>
                        </div>
                    )}
                    {doctor.appointment_phone && (
                        <div className="text-[11px] text-gray-500">
                            Appt: <a href={`tel:${doctor.appointment_phone}`} className="font-mono hover:text-teal-700">{doctor.appointment_phone}</a>
                        </div>
                    )}
                    {doctor.email && <div className="text-[11px] text-gray-400 truncate max-w-[150px]">{doctor.email}</div>}
                </div>
            ),
        },
        {
            header: 'System Login',
            accessor: 'user_id',
            cell: (doctor) => (
                doctor.user ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        @{doctor.user.username || doctor.user.name}
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal text-gray-400 bg-gray-50 border border-gray-200">
                        Unlinked
                    </span>
                )
            ),
        },
        {
            header: 'Activity',
            accessor: 'visits_count',
            cell: (doctor) => (
                <div className="text-xs space-y-0.5 font-mono text-gray-600">
                    <div>{doctor.visits_count || 0} visits</div>
                    <div className="text-[11px] text-gray-400">{doctor.schedules_count || 0} schedule days</div>
                </div>
            ),
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (doctor) => (
                <button
                    type="button"
                    onClick={() => toggleStatus(doctor)}
                    disabled={!canUpdate}
                    className={`cursor-pointer transition ${canUpdate ? 'hover:opacity-80' : 'cursor-default'}`}
                    title={canUpdate ? 'Click to toggle status' : ''}
                >
                    <StatusBadge status={doctor.is_active ? 'active' : 'inactive'} />
                </button>
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (doctor) => (
                <div className="flex justify-end gap-1.5 text-xs">
                    {canView ? (
                        <Link
                            href={route('admin.doctors.show', doctor.id)}
                            className="px-2 py-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition"
                        >
                            View
                        </Link>
                    ) : null}
                    {canUpdate ? (
                        <Link
                            href={route('admin.doctors.edit', doctor.id)}
                            className="px-2 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md font-medium transition"
                        >
                            Edit
                        </Link>
                    ) : null}
                    <Link
                        href={route('admin.doctor_schedules.index', { doctor_id: doctor.id })}
                        className="px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md font-medium transition inline-flex items-center gap-1"
                        title="Configure weekly chamber schedule and leaves"
                    >
                        <span>📅</span> Schedule
                    </Link>
                    {canDelete && (
                        <button
                            type="button"
                            onClick={() => setDeleteTarget(doctor)}
                            className="px-2 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md font-medium transition"
                        >
                            {doctor.visits_count > 0 ? 'Deactivate' : 'Delete'}
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Doctors & Practitioners" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Doctors &amp; Practitioners (চিকিৎসক তালিকা)"
                    subtitle="Manage clinic physicians, medical qualifications, government registrations, digital signatures, and chamber schedules"
                    actions={
                        canCreate ? (
                            <Link
                                href={route('admin.doctors.create')}
                                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition inline-flex items-center gap-1.5"
                            >
                                + Add Doctor
                            </Link>
                        ) : null
                    }
                />

                {/* Executive KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Doctors</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total}</div>
                        <div className="text-[11px] text-gray-400 mt-1">Medical practitioners</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Active in Practice 🩺</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.active}</div>
                        <div className="text-[11px] text-emerald-600 mt-1">Available for OPD queue</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-blue-700 uppercase tracking-wider">System Accounts 👤</div>
                        <div className="text-2xl font-bold text-blue-800 mt-1">{kpis.linked_account}</div>
                        <div className="text-[11px] text-blue-600 mt-1">Bound to user login</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs flex flex-col justify-between">
                        <div className="text-xs font-medium text-purple-700 uppercase tracking-wider">Chamber Scheduled 📅</div>
                        <div className="text-2xl font-bold text-purple-800 mt-1">{kpis.scheduled}</div>
                        <div className="text-[11px] text-purple-600 mt-1">With weekly hours set</div>
                    </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        <button
                            type="button"
                            onClick={() => setStatus('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                status === 'all'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>📋</span> All Doctors ({kpis.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('active')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                status === 'active'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>🩺</span> Active in Practice ({kpis.active})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('inactive')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                                status === 'inactive'
                                    ? 'bg-teal-600 text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>⏸️</span> Inactive / On Leave ({kpis.inactive})
                        </button>
                    </div>

                    {/* Search & Select Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                        {/* Search Input */}
                        <div className="relative sm:col-span-2">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by doctor name, credentials, reg no, specialty, phone..."
                                className="w-full pl-9 pr-8 py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                🔍
                            </div>
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 text-sm"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Account Linkage Filter & Reset */}
                        <div className="flex items-center gap-2">
                            <select
                                value={account}
                                onChange={(e) => setAccount(e.target.value)}
                                className="w-full py-2 rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            >
                                <option value="all">All Account States</option>
                                <option value="linked">👤 Linked Login Account</option>
                                <option value="unlinked">📄 Profile Only (No Login)</option>
                            </select>
                            {(search || status !== 'all' || account !== 'all') && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
                    <DataTable
                        columns={columns}
                        data={doctorList}
                        keyExtractor={(d) => d.id}
                        emptyMessage="No doctors match the selected search criteria."
                    />
                    {paginationLinks && <Pagination links={paginationLinks} />}
                </div>

                {/* Mobile High-Density Touch Cards View */}
                <div className="block md:hidden space-y-3">
                    {doctorList.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
                            No doctors match the selected search criteria.
                        </div>
                    ) : (
                        doctorList.map((doc) => (
                            <div
                                key={doc.id}
                                className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 ${
                                    !doc.is_active ? 'border-gray-200 bg-gray-50/50 opacity-80' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                                            {doc.photo_path ? (
                                                <img
                                                    src={route('admin.doctors.photo', doc.id)}
                                                    alt={doc.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-500">
                                                    {(doc.name || 'D').charAt(0)}
                                                </div>
                                            )}
                                            <span
                                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                                    doc.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 leading-snug">
                                                {doc.name}
                                            </h4>
                                            {doc.name_bn && (
                                                <div className="text-xs text-gray-500 font-bengali">
                                                    {doc.name_bn}
                                                </div>
                                            )}
                                            <div className="text-xs font-semibold text-teal-800 mt-0.5">
                                                {doc.credentials || 'Practitioner'}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => toggleStatus(doc)}
                                        disabled={!canUpdate}
                                    >
                                        <StatusBadge status={doc.is_active ? 'active' : 'inactive'} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Specialty</span>
                                        <span className="font-medium text-gray-800">{doc.specialty || 'General Practice'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Govt. Reg No</span>
                                        <span className="font-mono font-semibold text-gray-700">{doc.govt_reg_no || '—'}</span>
                                    </div>
                                </div>

                                {doc.phone && (
                                    <div className="text-xs text-gray-700 flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                        <a href={`tel:${doc.phone}`} className="font-mono text-teal-700 font-bold">
                                            📞 {doc.phone}
                                        </a>
                                        {doc.appointment_phone && (
                                            <a href={`tel:${doc.appointment_phone}`} className="text-[11px] text-gray-500 font-mono">
                                                Appt: {doc.appointment_phone}
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                                    <div>
                                        {doc.user ? (
                                            <span className="text-emerald-700 font-medium">@{doc.user.username || doc.user.name}</span>
                                        ) : (
                                            <span className="text-gray-400 italic">No system login</span>
                                        )}
                                    </div>
                                    <div className="font-mono">
                                        {doc.visits_count || 0} visits
                                    </div>
                                </div>

                                {/* Touch Bottom Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    {canView && (
                                        <Link
                                            href={route('admin.doctors.show', doc.id)}
                                            className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                        >
                                            View
                                        </Link>
                                    )}
                                    {canUpdate && (
                                        <Link
                                            href={route('admin.doctors.edit', doc.id)}
                                            className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
                                        >
                                            Edit
                                        </Link>
                                    )}
                                    <Link
                                        href={route('admin.doctor_schedules.index', { doctor_id: doc.id })}
                                        className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition gap-1"
                                    >
                                        <span>📅</span> Hours
                                    </Link>
                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(doc)}
                                            className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                                        >
                                            {doc.visits_count > 0 ? 'Deactivate' : 'Delete'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}

                    {paginationLinks && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <Pagination links={paginationLinks} />
                        </div>
                    )}
                </div>

                {/* Smart Confirm Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title={deleteTarget?.visits_count > 0 ? 'Deactivate Doctor Profile' : 'Delete Doctor Profile'}
                    message={
                        deleteTarget?.visits_count > 0
                            ? `Dr. ${deleteTarget.name} has conducted ${deleteTarget.visits_count} patient consultations. To safeguard legal prescription records and clinical authorship, this profile cannot be permanently erased. Would you like to deactivate this doctor instead?`
                            : `Are you sure you want to permanently delete the profile for "Dr. ${deleteTarget?.name}"?`
                    }
                    confirmLabel={deleteTarget?.visits_count > 0 ? 'Deactivate Profile' : 'Delete Profile'}
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
