import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import DataTable from '@/Components/DataTable';
import StatusBadge from '@/Components/StatusBadge';
import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ users = [] }) {
    const [deleteTarget, setDeleteTarget] = useState(null);

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('admin.users.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        {
            header: 'Full Name',
            accessor: 'name',
            cell: (user) => (
                <div>
                    <div className="font-semibold text-gray-900">{user.name}</div>
                    {(user.is_super_admin || user.roles?.some((r) => r.name === 'Super Admin')) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Super Admin
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Username',
            accessor: 'username',
            cell: (user) => <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono">{user.username}</code>,
        },
        {
            header: 'Email',
            accessor: 'email',
            cell: (user) => <span className="text-xs text-gray-600">{user.email}</span>,
        },
        {
            header: 'Roles',
            accessor: 'roles',
            cell: (user) => (
                <div className="flex flex-wrap gap-1">
                    {user.roles?.map((r) => (
                        <span key={r.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {r.name}
                        </span>
                    ))}
                    {(!user.roles || user.roles.length === 0) && (
                        <span className="text-gray-400 text-xs">No roles</span>
                    )}
                </div>
            ),
        },
        {
            header: 'Status',
            accessor: 'is_active',
            cell: (user) => <StatusBadge status={user.is_active ? 'active' : 'inactive'} />,
        },
        {
            header: 'Actions',
            className: 'text-right',
            cell: (user) => (
                <div className="flex justify-end gap-2 text-xs">
                    <Link
                        href={route('admin.users.edit', user.id)}
                        className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 rounded font-medium transition"
                    >
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded font-medium transition"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Staff Users" />
            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Staff &amp; User Accounts"
                    subtitle="Manage clinic staff access, login credentials, and assigned roles"
                    action={
                        <Link
                            href={route('admin.users.create')}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm font-semibold shadow-xs transition"
                        >
                            + Create User
                        </Link>
                    }
                />

                <div className="bg-white rounded-lg shadow-xs border border-gray-200 p-4">
                    <DataTable
                        columns={columns}
                        data={users}
                        keyExtractor={(u) => u.id}
                        emptyMessage="No users found."
                    />
                </div>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete User Account"
                    message={`Are you sure you want to delete user account "${deleteTarget?.name}" (@${deleteTarget?.username})?`}
                    confirmLabel="Delete Account"
                    isDestructive={true}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
