import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ users }) {
    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Users</h2>}
        >
            <Head title="Users" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="mb-4">
                            <Link href={route('admin.users.create')} className="bg-blue-500 text-white px-4 py-2 rounded">Create User</Link>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b p-2">Full Name</th>
                                    <th className="border-b p-2">Username</th>
                                    <th className="border-b p-2">Email</th>
                                    <th className="border-b p-2">Roles</th>
                                    <th className="border-b p-2">Active</th>
                                    <th className="border-b p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="border-b p-2">{user.name}</td>
                                        <td className="border-b p-2 font-mono text-sm text-gray-700">{user.username}</td>
                                        <td className="border-b p-2">{user.email}</td>
                                        <td className="border-b p-2">{user.roles.map(r => r.name).join(', ')}</td>
                                        <td className="border-b p-2">{user.is_active ? 'Yes' : 'No'}</td>
                                        <td className="border-b p-2 space-x-2">
                                            <Link href={route('admin.users.edit', user.id)} className="text-blue-600">Edit</Link>
                                            <Link href={route('admin.users.destroy', user.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
