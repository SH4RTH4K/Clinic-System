import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ roles }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Roles</h2>}>
            <Head title="Roles" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="mb-4">
                            <Link href={route('admin.roles.create')} className="bg-blue-500 text-white px-4 py-2 rounded">Create Role</Link>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b p-2">Role Name</th>
                                    <th className="border-b p-2">Permissions count</th>
                                    <th className="border-b p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map(role => (
                                    <tr key={role.id}>
                                        <td className="border-b p-2">{role.name}</td>
                                        <td className="border-b p-2">{role.permissions.length}</td>
                                        <td className="border-b p-2 space-x-2">
                                            <Link href={route('admin.roles.edit', role.id)} className="text-blue-600">Edit</Link>
                                            <Link href={route('admin.roles.destroy', role.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link>
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
