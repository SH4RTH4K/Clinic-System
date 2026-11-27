import AccessControlNavigation from '@/Components/AccessControlNavigation';
import ConfirmDialog from '@/Components/ConfirmDialog';
import PageHeader from '@/Components/PageHeader';
import usePermission from '@/Components/usePermission';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Index({ roles = [], kpis = {}, filters = {} }) {
    const can = usePermission();
    const { auth = {} } = usePage().props;
    const isSuperAdmin = auth.roles?.includes('Super Admin') ?? false;
    const canCreate = isSuperAdmin || can('roles.create');
    const canUpdate = isSuperAdmin || can('roles.update');
    const canDelete = isSuperAdmin || can('roles.delete');

    const [search, setSearch] = useState(filters.search || '');
    const [selectedFilter, setSelectedFilter] = useState(filters.filter || 'all');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return undefined;
        }

        const timer = setTimeout(() => {
            router.get(
                route('admin.roles.index'),
                {
                    search: search.trim() || undefined,
                    filter: selectedFilter && selectedFilter !== 'all' ? selectedFilter : undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        return () => clearTimeout(timer);
    }, [search, selectedFilter]);

    const handleClearSearch = () => {
        setSearch('');
    };

    const handleResetFilters = () => {
        setSearch('');
        setSelectedFilter('all');
    };

    const closeDeleteDialog = () => {
        setDeleteTarget(null);
        setDeleteError('');
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteTarget) {
            return;
        }

        if (Number(deleteTarget.users_count) > 0 || deleteError) {
            closeDeleteDialog();
            return;
        }

        router.delete(route('admin.roles.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: closeDeleteDialog,
            onError: (errors) => setDeleteError(errors.role || errors.error || 'Unable to delete this role.'),
        });
    };

    const assignedUserCount = Number(deleteTarget?.users_count ?? 0);
    const deletionBlocked = assignedUserCount > 0 || Boolean(deleteError);
    const deleteMessage = deleteError || (assignedUserCount > 0
        ? `The "${deleteTarget?.name}" role is currently assigned to ${assignedUserCount} staff ${assignedUserCount === 1 ? 'member' : 'members'}. Reassign those staff members before deleting this role.`
        : `Are you sure you want to delete the "${deleteTarget?.name}" role? Its permission assignments will also be permanently removed.`);

    const filterPills = [
        { key: 'all', label: 'All Roles', count: kpis.total_roles ?? roles.length, icon: '🛡️' },
        { key: 'protected', label: 'Protected', count: kpis.protected_roles_count ?? 1, icon: '👑' },
        { key: 'custom', label: 'Custom Roles', count: kpis.custom_roles_count ?? 0, icon: '⚙️' },
        { key: 'assigned', label: 'Assigned', count: (kpis.total_roles ?? 0) - (kpis.unassigned_roles_count ?? 0), icon: '👥' },
        { key: 'unassigned', label: 'Unassigned', count: kpis.unassigned_roles_count ?? 0, icon: '⚪' },
    ];

    const hasActiveFilters = Boolean(search || (selectedFilter && selectedFilter !== 'all'));

    return (
        <AuthenticatedLayout>
            <Head title="Role Management & Access Control" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Role Management & Access Control (রোল ও এক্সেস কন্ট্রোল)"
                    subtitle="Define clinic roles, audit user assignments, and configure granular module permissions across your practice"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.users.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>👥</span> Staff Users
                            </Link>
                            <Link
                                href={route('admin.permissions.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🔑</span> Permissions Matrix
                            </Link>
                            <Link
                                href={route('admin.activity_logs.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>📜</span> Security Logs
                            </Link>
                            {canCreate && (
                                <Link
                                    href={route('admin.roles.create')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                >
                                    <span>➕</span> Create Role
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Sub-Navigation */}
                <AccessControlNavigation active="roles" />

                {/* Executive KPI Summary Ribbon (5 Cards) */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Role Metrics Summary">
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Total Roles 🛡️</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total_roles ?? roles.length}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">নির্ধারিত রোলসমূহ</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Staff Assigned 👥</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">{kpis.total_assignments ?? 0}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">মোট ইউজার অ্যাসাইনমেন্ট</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">Custom Roles ⚙️</div>
                        <div className="text-2xl font-bold text-violet-900 mt-1">{kpis.custom_roles_count ?? 0}</div>
                        <div className="text-[11px] text-violet-600 mt-0.5">কাস্টম ক্লিনিক্যাল রোল</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Unassigned ⚪</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{kpis.unassigned_roles_count ?? 0}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">স্টাফবিহীন রোল (অডিট)</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">System Protected 👑</div>
                        <div className="text-2xl font-bold text-rose-900 mt-1">{kpis.protected_roles_count ?? 1}</div>
                        <div className="text-[11px] text-rose-600 mt-0.5">সুরক্ষিত সুপার অ্যাডমিন</div>
                    </div>
                </section>

                {/* Search Bar & Fast-Track Filter Pills */}
                <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search roles by name (e.g. Doctor, Receptionist, Pharmacist, Cashier)..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 transition py-1 px-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100"
                            >
                                ✕ Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filter:</span>
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
                                    <span
                                        className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                                            isSelected ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {pill.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Roles Listing Presentation */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="font-semibold text-gray-900">Configured Clinic Roles</h2>
                            <p className="mt-0.5 text-sm text-gray-500">
                                Review role assignments, staff count, and module permission coverage.
                            </p>
                        </div>
                        <Link
                            href={route('admin.permissions.index')}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary-700 hover:text-primary-800"
                        >
                            Configure all permissions matrix
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.69L10.22 5.03a.75.75 0 111.06-1.06l5.5 5.5a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 11-1.06-1.06l4.22-4.22H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                            </svg>
                        </Link>
                    </div>

                    {roles.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <h3 className="mt-3 text-sm font-semibold text-gray-900">
                                {hasActiveFilters ? 'No roles match your search or filter' : 'No roles yet'}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {hasActiveFilters
                                    ? 'Try adjusting your search terms or clear the active filter pills.'
                                    : 'Create a role to start organizing staff access.'}
                            </p>
                            {hasActiveFilters ? (
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="mt-4 inline-flex rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                                >
                                    Reset filters
                                </button>
                            ) : canCreate ? (
                                <Link
                                    href={route('admin.roles.create')}
                                    className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                                >
                                    Create first role
                                </Link>
                            ) : null}
                        </div>
                    ) : (
                        <div>
                            {/* Desktop Data Table (hidden on mobile) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="py-3.5 pl-6 pr-3">Role Profile</th>
                                            <th className="px-3 py-3.5">Assigned Staff</th>
                                            <th className="px-3 py-3.5">Granted Permissions</th>
                                            <th className="py-3.5 pl-3 pr-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {roles.map((role) => {
                                            const isProtected = role.name === 'Super Admin';
                                            const userCount = Number(role.users_count ?? 0);
                                            const permCount = Number(role.permissions_count ?? 0);

                                            return (
                                                <tr key={role.id} className="transition hover:bg-gray-50/70">
                                                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                                                                    isProtected
                                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                        : 'bg-primary-50 text-primary-700 border border-primary-200'
                                                                }`}
                                                            >
                                                                {isProtected ? '👑' : role.name.slice(0, 1).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-gray-900 text-sm">{role.name}</span>
                                                                    {isProtected && (
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                                            Protected system role
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="mt-0.5 text-xs text-gray-500">
                                                                    {isProtected ? 'Full system authority & security clearance' : 'Operational staff profile'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-4 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('admin.users.index', { role: role.name })}
                                                                title={`View all ${userCount} users with ${role.name} role`}
                                                                className={`inline-flex items-center gap-1.5 font-semibold transition ${
                                                                    userCount > 0
                                                                        ? 'text-primary-700 hover:text-primary-900 hover:underline'
                                                                        : 'text-gray-400'
                                                                }`}
                                                            >
                                                                <span>👥</span>
                                                                <span>{userCount} {userCount === 1 ? 'user' : 'users'}</span>
                                                                {userCount > 0 && <span className="text-[10px] text-gray-400">→</span>}
                                                            </Link>
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-4 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                                                                <span>🔑</span>
                                                                <span>{permCount} permissions</span>
                                                            </span>
                                                            {!isProtected && (
                                                                <Link
                                                                    href={route('admin.permissions.index', { role: role.id })}
                                                                    className="ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition"
                                                                >
                                                                    <span>⚙️ Matrix</span>
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-xs">
                                                        {isProtected ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-400 border border-gray-200">
                                                                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                                    <path fillRule="evenodd" d="M5 8V6a5 5 0 0110 0v2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zm8.5 0V6a3.5 3.5 0 00-7 0v2h7z" clipRule="evenodd" />
                                                                </svg>
                                                                System Managed
                                                            </span>
                                                        ) : (
                                                            <div className="flex justify-end items-center gap-1.5">
                                                                {canUpdate ? (
                                                                    <Link
                                                                        href={route('admin.roles.edit', role.id)}
                                                                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:border-gray-300 hover:bg-gray-50"
                                                                    >
                                                                        Edit
                                                                    </Link>
                                                                ) : (
                                                                    <button type="button" disabled className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-400 cursor-not-allowed opacity-50">
                                                                        Edit
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDeleteError('');
                                                                        setDeleteTarget(role);
                                                                    }}
                                                                    disabled={!canDelete}
                                                                    className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-2xs transition enabled:hover:border-red-200 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Touch Cards View (visible on < md screens) */}
                            <div className="block md:hidden divide-y divide-gray-100">
                                {roles.map((role) => {
                                    const isProtected = role.name === 'Super Admin';
                                    const userCount = Number(role.users_count ?? 0);
                                    const permCount = Number(role.permissions_count ?? 0);

                                    return (
                                        <article key={role.id} className="p-4 space-y-3 hover:bg-gray-50/70 transition">
                                            {/* Header */}
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                                                            isProtected
                                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                                : 'bg-primary-50 text-primary-700 border border-primary-200'
                                                        }`}
                                                    >
                                                        {isProtected ? '👑' : role.name.slice(0, 1).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-gray-900 text-sm truncate">{role.name}</h3>
                                                        <p className="text-xs text-gray-500">
                                                            {isProtected ? 'Protected System Profile' : 'Staff Access Role'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isProtected && (
                                                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 ring-1 ring-inset ring-amber-200">
                                                        Protected
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                <div>
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">Assigned Staff</span>
                                                    <Link
                                                        href={route('admin.users.index', { role: role.name })}
                                                        className={`inline-flex items-center gap-1 font-bold mt-0.5 ${
                                                            userCount > 0 ? 'text-primary-700 underline' : 'text-gray-500'
                                                        }`}
                                                    >
                                                        <span>👥 {userCount} {userCount === 1 ? 'user' : 'users'}</span>
                                                    </Link>
                                                </div>

                                                <div>
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block">Permissions</span>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <span className="font-bold text-gray-800">🔑 {permCount}</span>
                                                        {!isProtected && (
                                                            <Link
                                                                href={route('admin.permissions.index', { role: role.id })}
                                                                className="text-[10px] text-primary-700 underline font-semibold ml-1"
                                                            >
                                                                Matrix →
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="pt-1">
                                                {isProtected ? (
                                                    <div className="text-center py-2 text-xs font-semibold text-gray-400 bg-gray-50 rounded-lg border border-gray-200">
                                                        🔒 System Managed Role (Locked)
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {canUpdate && (
                                                            <Link
                                                                href={route('admin.roles.edit', role.id)}
                                                                className="flex-1 min-h-[44px] flex items-center justify-center rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                                                            >
                                                                Edit Role
                                                            </Link>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDeleteError('');
                                                                setDeleteTarget(role);
                                                            }}
                                                            disabled={!canDelete}
                                                            className="flex-1 min-h-[44px] flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 shadow-2xs hover:bg-red-100 transition disabled:opacity-50"
                                                        >
                                                            Delete Role
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </section>

                {/* Smart Delete Modal with Reassignment Guidance */}
                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title={deletionBlocked ? 'Role Cannot Be Deleted' : 'Delete Role'}
                    message={
                        deletionBlocked && assignedUserCount > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600">{deleteMessage}</p>
                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                    <p className="text-xs font-semibold text-amber-800">
                                        💡 Required Action: Reassign staff before deleting
                                    </p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        You can view and reassign all staff members currently holding this role in the Staff Users directory.
                                    </p>
                                    <div className="mt-2.5">
                                        <Link
                                            href={route('admin.users.index', { role: deleteTarget?.name })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-bold transition shadow-2xs"
                                        >
                                            <span>👥</span> View & Reassign Staff Users →
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            deleteMessage
                        )
                    }
                    confirmLabel={deletionBlocked ? 'Close' : 'Delete Role'}
                    isDestructive={!deletionBlocked}
                    onConfirm={confirmDelete}
                    onCancel={closeDeleteDialog}
                />
            </div>
        </AuthenticatedLayout>
    );
}
