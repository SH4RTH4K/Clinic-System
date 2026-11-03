import AccessControlNavigation from '@/Components/AccessControlNavigation';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ roles = [] }) {
    const can = usePermission();
    const canCreate = can('roles.create');
    const canUpdate = can('roles.update');
    const canDelete = can('roles.delete');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState('');

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

    const totalAssignments = roles.reduce((total, role) => total + Number(role.users_count ?? 0), 0);
    const customRoleCount = roles.filter((role) => role.name !== 'Super Admin').length;
    const protectedRoleCount = roles.filter((role) => role.name === 'Super Admin').length;
    const statCards = [
        { label: 'Total roles', value: roles.length, tone: 'bg-sky-50 text-sky-700', icon: 'users' },
        { label: 'Staff assignments', value: totalAssignments, tone: 'bg-emerald-50 text-emerald-700', icon: 'assignment' },
        { label: 'Custom roles', value: customRoleCount, tone: 'bg-violet-50 text-violet-700', icon: 'custom' },
        { label: 'Protected roles', value: protectedRoleCount, tone: 'bg-amber-50 text-amber-700', icon: 'lock' },
    ];

    const assignedUserCount = Number(deleteTarget?.users_count ?? 0);
    const deletionBlocked = assignedUserCount > 0 || Boolean(deleteError);
    const deleteMessage = deleteError || (assignedUserCount > 0
        ? `${deleteTarget?.name} is assigned to ${assignedUserCount} ${assignedUserCount === 1 ? 'user' : 'users'}. Reassign them before deleting this role.`
        : `Delete the ${deleteTarget?.name} role? Its permission assignments will also be removed.`);

    return (
        <AuthenticatedLayout>
            <Head title="Role Management" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5a6.5 6.5 0 00-13 0M9.5 11a4 4 0 110-8 4 4 0 010 8zm6.25-5.5h5m-2.5-2.5v5" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Access control</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Role management</h1>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                                Organize staff access into clear roles. Configure each role's module permissions separately.
                            </p>
                        </div>
                    </div>
                    {canCreate ? <Link
                        href={route('admin.roles.create')}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M10 4a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 0110 4z" />
                        </svg>
                        Create role
                    </Link> : <button type="button" disabled className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm cursor-not-allowed opacity-50">
                        Create role
                    </button>}
                </section>

                <AccessControlNavigation active="roles" />

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map((stat) => (
                        <div key={stat.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
                                {stat.icon === 'lock' ? (
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10V7a4.5 4.5 0 019 0v3m-10.5 0h12A1.5 1.5 0 0119.5 11.5v8A1.5 1.5 0 0118 21H6a1.5 1.5 0 01-1.5-1.5v-8A1.5 1.5 0 016 10z" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                        {stat.icon === 'assignment' ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5a6.5 6.5 0 00-13 0M9.5 11a4 4 0 110-8 4 4 0 010 8zm7-2.5 1.5 1.5 3-3" />
                                        ) : (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5a6.5 6.5 0 00-13 0M9.5 11a4 4 0 110-8 4 4 0 010 8zm6.25-5.5h5m-2.5-2.5v5" />
                                        )}
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div>
                            <h2 className="font-semibold text-gray-900">Staff roles</h2>
                            <p className="mt-0.5 text-sm text-gray-500">Review role membership and granted access at a glance.</p>
                        </div>
                        <Link
                            href={route('admin.permissions.index')}
                            className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary-700 hover:text-primary-800 sm:self-auto"
                        >
                            Manage permissions
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.69L10.22 5.03a.75.75 0 111.06-1.06l5.5 5.5a.75.75 0 010 1.06l-5.5 5.5a.75.75 0 11-1.06-1.06l4.22-4.22H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                            </svg>
                        </Link>
                    </div>

                    {roles.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5a6.5 6.5 0 00-13 0M9.5 11a4 4 0 110-8 4 4 0 010 8zm6.25-5.5h5m-2.5-2.5v5" />
                                </svg>
                            </div>
                            <h3 className="mt-3 text-sm font-semibold text-gray-900">No roles yet</h3>
                            <p className="mt-1 text-sm text-gray-500">Create a role to start organizing staff access.</p>
                            {canCreate ? (
                                <Link href={route('admin.roles.create')} className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                                    Create first role
                                </Link>
                            ) : (
                                <button type="button" disabled className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white cursor-not-allowed opacity-50">
                                    Create first role
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {roles.map((role) => {
                                const isProtected = role.name === 'Super Admin';

                                return (
                                    <article key={role.id} className="grid grid-cols-1 gap-4 px-5 py-5 transition hover:bg-gray-50/70 sm:px-6 xl:grid-cols-[minmax(0,1fr)_150px_150px_170px] xl:items-center">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isProtected ? 'bg-amber-100 text-amber-800' : 'bg-primary-50 text-primary-700'}`}>
                                                {role.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="truncate font-semibold text-gray-900">{role.name}</h3>
                                                    {isProtected && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                            Protected system role
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-sm text-gray-500">{isProtected ? 'Full system access' : 'Staff access profile'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:max-w-xs xl:border-0 xl:pt-0">
                                            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 xl:hidden">Assigned staff</span>
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a6.5 6.5 0 0113.07 0A1.5 1.5 0 0115.037 16H4.963a1.5 1.5 0 01-1.498-1.507zM16.5 5.5a2.5 2.5 0 11-1.69 4.342 5.99 5.99 0 011.338 3.097A2.25 2.25 0 0018.25 10.7V8a2.5 2.5 0 00-1.75-2.386V5.5z" />
                                                </svg>
                                                {role.users_count ?? 0}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 sm:max-w-xs xl:border-0 xl:pt-0">
                                            <span className="text-xs font-medium uppercase tracking-wide text-gray-400 xl:hidden">Granted permissions</span>
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                                                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path d="M10 1.75a.75.75 0 01.75.75v.5h2.5a2.75 2.75 0 012.75 2.75v8.5A2.75 2.75 0 0113.25 17h-6.5A2.75 2.75 0 014 14.25v-8.5A2.75 2.75 0 016.75 3h2.5v-.5a.75.75 0 01.75-.75zM6.75 4.5a1.25 1.25 0 00-1.25 1.25v8.5a1.25 1.25 0 001.25 1.25h6.5a1.25 1.25 0 001.25-1.25v-8.5a1.25 1.25 0 00-1.25-1.25h-2.5v.25a.75.75 0 01-1.5 0V4.5h-2.5z" />
                                                </svg>
                                                {role.permissions_count ?? 0}
                                                <span className="font-normal text-gray-500">permissions</span>
                                            </span>
                                        </div>

                                        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 xl:border-0 xl:pt-0">
                                            {isProtected ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400">
                                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M5 8V6a5 5 0 0110 0v2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zm8.5 0V6a3.5 3.5 0 00-7 0v2h7z" clipRule="evenodd" />
                                                    </svg>
                                                    System managed
                                                </span>
                                            ) : (
                                                <>
                                                    {canUpdate ? <Link
                                                        href={route('admin.roles.edit', role.id)}
                                                        className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                                                    >
                                                        Edit role
                                                    </Link> : <button type="button" disabled className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm cursor-not-allowed opacity-50">Edit role</button>}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setDeleteError('');
                                                            setDeleteTarget(role);
                                                        }}
                                                        disabled={!canDelete}
                                                        className="rounded-lg border border-red-100 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition enabled:hover:border-red-200 enabled:hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title={deletionBlocked ? 'Role cannot be deleted' : 'Delete role'}
                    message={deleteMessage}
                    confirmLabel={deletionBlocked ? 'Close' : 'Delete role'}
                    isDestructive={!deletionBlocked}
                    onConfirm={confirmDelete}
                    onCancel={closeDeleteDialog}
                />
            </div>
        </AuthenticatedLayout>
    );
}
