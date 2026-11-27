import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Index({ users = [], kpis = {}, filters = {}, availableRoles = [] }) {
    const can = usePermission();
    const { auth = {} } = usePage().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin') ?? false;
    const canCreate = isSuperAdmin || can('users.create');
    const canUpdate = isSuperAdmin || can('users.update');
    const canDelete = isSuperAdmin || can('users.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return undefined;
        }

        const timer = setTimeout(() => {
            router.get(
                route('admin.users.index'),
                {
                    search: search.trim() || undefined,
                    role: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                    status: selectedStatus && selectedStatus !== 'all' ? selectedStatus : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, selectedRole, selectedStatus]);

    const handleClearSearch = () => {
        setSearch('');
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedRole('');
        setSelectedStatus('all');
    };

    const handleToggleStatus = (user) => {
        if (!canUpdate || togglingId) return;
        setTogglingId(user.id);

        router.patch(
            route('admin.users.toggle_status', user.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setTogglingId(null),
            }
        );
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) return;
        router.delete(route('admin.users.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    // User avatar color helper
    const getAvatarBg = (user) => {
        if (user.roles?.some((r) => r.name === 'Super Admin')) return 'bg-amber-100 text-amber-800 border-amber-300';
        if (user.roles?.some((r) => r.name === 'Doctor')) return 'bg-blue-100 text-blue-800 border-blue-300';
        if (user.roles?.some((r) => r.name === 'Receptionist')) return 'bg-teal-100 text-teal-800 border-teal-300';
        return 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const columns = [
        {
            header: 'Staff Member',
            accessor: 'name',
            cell: (user) => {
                const isSuper = user.roles?.some((r) => r.name === 'Super Admin');
                return (
                    <div className="flex items-center gap-3">
                        <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${getAvatarBg(user)}`}>
                            {getInitials(user.name)}
                            <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                                    user.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}
                            />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSuper && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                        👑 Super Admin
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">@{user.username}</div>
                        </div>
                    </div>
                );
            },
        },
        {
            header: 'Contact Information',
            accessor: 'email',
            cell: (user) => (
                <div className="space-y-0.5 text-xs">
                    <div className="text-gray-800 font-medium">{user.email}</div>
                    {user.phone ? (
                        <div className="text-gray-500 flex items-center gap-1 font-mono">
                            <span>📞</span>
                            <a href={`tel:${user.phone}`} className="hover:text-primary-600 transition">
                                {user.phone}
                            </a>
                        </div>
                    ) : (
                        <span className="text-gray-400 italic text-[11px]">No phone</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Assigned Roles',
            accessor: 'roles',
            cell: (user) => (
                <div className="flex flex-wrap gap-1">
                    {user.roles?.map((r) => {
                        let badgeColor = 'bg-gray-100 text-gray-700 border-gray-200';
                        if (r.name === 'Super Admin') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200 font-bold';
                        else if (r.name === 'Doctor') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
                        else if (r.name === 'Receptionist') badgeColor = 'bg-teal-50 text-teal-700 border-teal-200';
                        else if (r.name === 'Accountant') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        return (
                            <span key={r.id} className={`px-2 py-0.5 text-[11px] rounded-md border ${badgeColor}`}>
                                {r.name}
                            </span>
                        );
                    })}
                    {(!user.roles || user.roles.length === 0) && (
                        <span className="text-gray-400 text-xs italic">No roles assigned</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Account Status',
            accessor: 'is_active',
            cell: (user) => (
                <div className="flex items-center gap-2">
                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                    {canUpdate && (
                        <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            disabled={togglingId === user.id}
                            title={user.is_active ? 'Click to deactivate' : 'Click to activate'}
                            className="text-[11px] font-semibold text-gray-500 hover:text-primary-700 underline transition disabled:opacity-50"
                        >
                            {togglingId === user.id ? '...' : (user.is_active ? 'Deactivate' : 'Activate')}
                        </button>
                    )}
                </div>
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (user) => (
                <div className="flex justify-end gap-1.5 text-xs">
                    {canUpdate ? (
                        <Link
                            href={route('admin.users.edit', user.id)}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md font-semibold transition border border-primary-200"
                        >
                            Edit
                        </Link>
                    ) : (
                        <button type="button" disabled className="px-2.5 py-1 text-gray-400 bg-gray-50 rounded-md font-medium cursor-not-allowed opacity-50">
                            Edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        disabled={!canDelete}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded-md font-semibold transition border border-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    const hasActiveFilters = Boolean(search || (selectedRole && selectedRole !== 'all') || (selectedStatus && selectedStatus !== 'all'));

    return (
        <AuthenticatedLayout>
            <Head title="Staff Users & Access Control" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Staff &amp; User Accounts (স্টাফ ও ইউজার অ্যাকাউন্ট)"
                    subtitle="Manage clinic staff access, system login credentials, assigned roles, and account security"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.roles.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🛡️</span> Roles &amp; Permissions
                            </Link>
                            <Link
                                href={route('admin.activity_logs.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>📜</span> Security Logs
                            </Link>
                            <Link
                                href={route('admin.system_health.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🏥</span> System Health
                            </Link>
                            {canCreate && (
                                <Link
                                    href={route('admin.users.create')}
                                    className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold shadow-2xs transition inline-flex items-center gap-1.5"
                                >
                                    <span>➕</span> Create User
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive KPI Summary Ribbon (5 Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-primary-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">Total Staff 👥</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total_users ?? users.length}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">নিবন্ধিত ব্যবহারকারী</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Active in Practice 🟢</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.active_users ?? 0}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">সক্রিয় লগইন অ্যাকাউন্ট</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Super Admins 👑</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{kpis.super_admins_count ?? 0}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">প্রধান সিস্টেম প্রশাসক</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Doctors 🩺</div>
                        <div className="text-2xl font-bold text-blue-900 mt-1">{kpis.doctors_count ?? 0}</div>
                        <div className="text-[11px] text-blue-600 mt-0.5">নিবন্ধিত চিকিৎসক</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Support Staff 📋</div>
                        <div className="text-2xl font-bold text-purple-900 mt-1">{kpis.support_staff_count ?? 0}</div>
                        <div className="text-[11px] text-purple-600 mt-0.5">রিসিপশন ও অন্যান্য</div>
                    </div>
                </div>

                {/* Search Bar & Fast-Track Filter Pills */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search staff by full name, username (@user), email address, or phone number..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Reset Filters Shortcut */}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition shrink-0"
                            >
                                ✕ Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Filter Pills Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        {/* Status Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto text-xs">
                            <span className="text-[11px] font-bold text-gray-500 mr-1 uppercase">Status:</span>
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('all')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                    selectedStatus === 'all'
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All Staff
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('active')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                    selectedStatus === 'active'
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                🟢 Active
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('inactive')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                    selectedStatus === 'inactive'
                                        ? 'bg-gray-700 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                ⏸️ Inactive
                            </button>
                        </div>

                        <span className="hidden sm:inline-block h-4 w-px bg-gray-200 mx-1" />

                        {/* Role Filter Pills */}
                        <div className="flex items-center gap-1 overflow-x-auto text-xs">
                            <span className="text-[11px] font-bold text-gray-500 mr-1 uppercase">Role:</span>
                            <button
                                type="button"
                                onClick={() => setSelectedRole('')}
                                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                                    !selectedRole || selectedRole === 'all'
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All Roles
                            </button>
                            {(availableRoles.length > 0 ? availableRoles : ['Super Admin', 'Doctor', 'Receptionist', 'Accountant']).map((rName) => (
                                <button
                                    key={rName}
                                    type="button"
                                    onClick={() => setSelectedRole(rName)}
                                    className={`px-2.5 py-1 rounded-md font-semibold transition shrink-0 ${
                                        selectedRole === rName
                                            ? 'bg-primary-600 text-white shadow-2xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {rName === 'Super Admin' && '👑 '}
                                    {rName === 'Doctor' && '🩺 '}
                                    {rName === 'Receptionist' && '📋 '}
                                    {rName === 'Accountant' && '💵 '}
                                    {rName}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* DESKTOP VIEW: Structured DataTable (hidden md:block) */}
                <div className="hidden md:block bg-white rounded-xl shadow-2xs border border-gray-200 p-4">
                    <DataTable
                        columns={columns}
                        data={users}
                        keyExtractor={(u) => u.id}
                        emptyMessage="No staff user accounts match the selected criteria."
                    />
                </div>

                {/* MOBILE VIEW: High-Density Touch Cards (block md:hidden) */}
                <div className="block md:hidden space-y-3">
                    {users.map((user) => {
                        const isSuper = user.roles?.some((r) => r.name === 'Super Admin');

                        return (
                            <div
                                key={user.id}
                                className={`rounded-xl border p-4 shadow-2xs bg-white space-y-3 transition ${
                                    user.is_active ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50/70'
                                }`}
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${getAvatarBg(user)}`}>
                                            {getInitials(user.name)}
                                            <span
                                                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                                                    user.is_active ? 'bg-emerald-500' : 'bg-gray-400'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 text-base leading-tight flex items-center gap-1.5">
                                                <span>{user.name}</span>
                                                {isSuper && <span>👑</span>}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">@{user.username}</div>
                                        </div>
                                    </div>
                                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                </div>

                                {/* Roles Strip */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {user.roles?.map((r) => (
                                        <span
                                            key={r.id}
                                            className={`px-2 py-0.5 text-xs rounded-md border font-semibold ${
                                                r.name === 'Super Admin'
                                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                                    : r.name === 'Doctor'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-gray-100 text-gray-700 border-gray-200'
                                            }`}
                                        >
                                            {r.name}
                                        </span>
                                    ))}
                                    {(!user.roles || user.roles.length === 0) && (
                                        <span className="text-gray-400 text-xs italic">No roles assigned</span>
                                    )}
                                </div>

                                {/* Contact Details */}
                                <div className="rounded-lg bg-gray-50 p-2.5 text-xs space-y-1.5 border border-gray-100">
                                    <div className="text-gray-700 font-medium flex items-center gap-2">
                                        <span className="text-gray-400">✉️</span>
                                        <a href={`mailto:${user.email}`} className="text-primary-700 hover:underline">
                                            {user.email}
                                        </a>
                                    </div>
                                    {user.phone && (
                                        <div className="text-gray-700 font-medium flex items-center gap-2">
                                            <span className="text-gray-400">📞</span>
                                            <a href={`tel:${user.phone}`} className="text-primary-700 font-mono hover:underline">
                                                {user.phone}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons (44px+ tap targets) */}
                                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                    {canUpdate && (
                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(user)}
                                            disabled={togglingId === user.id}
                                            className="flex-1 py-2 text-xs font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition text-center shadow-2xs disabled:opacity-50"
                                        >
                                            {togglingId === user.id ? 'Updating...' : (user.is_active ? '⏸️ Deactivate' : '🟢 Activate')}
                                        </button>
                                    )}

                                    {canUpdate ? (
                                        <Link
                                            href={route('admin.users.edit', user.id)}
                                            className="flex-1 py-2 text-xs font-bold rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition text-center shadow-2xs"
                                        >
                                            ✏️ Edit
                                        </Link>
                                    ) : (
                                        <button type="button" disabled className="flex-1 py-2 text-xs font-bold rounded-lg border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50">
                                            Edit
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(user)}
                                        disabled={!canDelete}
                                        className="py-2 px-3 text-xs font-bold rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition shadow-2xs disabled:opacity-50"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {users.length === 0 && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                            No staff user accounts match the selected criteria.
                        </div>
                    )}
                </div>

                {/* Confirm Delete Dialog */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete User Account"
                    message={`Are you sure you want to delete user account "${deleteTarget?.name}" (@${deleteTarget?.username})? This action will permanently remove access.`}
                    confirmLabel="Delete Account"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
