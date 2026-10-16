import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ roles = [] }) {
    const [deleteTarget, setDeleteTarget] = useState(null);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('admin.roles.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Role Name',
            accessor: 'name',
            cell: (role) => (
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{role.name}</span>
                    {role.name === 'Super Admin' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            System Protected
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Granted Permissions',
            accessor: 'permissions',
            cell: (role) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {Array.isArray(role.permissions) ? role.permissions.length : 0} permissions
                </span>
            ),
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (role) => {
                const isSuperAdmin = role.name === 'Super Admin';
                return (
                    <div className="flex justify-end gap-2 text-xs">
                        <Link
                            href={route('admin.roles.edit', role.id)}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                        >
                            Edit
                        </Link>
                        {!isSuperAdmin && (
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(role)}
                                className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded font-medium transition"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Roles & Permissions" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Roles &amp; Permissions"
                    subtitle="Configure staff roles, access privileges, and system capability delegations"
                    action={
                        <Link
                            href={route('admin.roles.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + Create Role
                        </Link>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4">
                    <DataTable
                        columns={columns}
                        data={roles}
                        keyExtractor={(r) => r.id}
                        emptyMessage="No roles found."
                    />
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete Role"
                    message={`Are you sure you want to delete the role "${deleteTarget?.name}"? Users assigned to this role will lose its permissions.`}
                    confirmLabel="Delete Role"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
