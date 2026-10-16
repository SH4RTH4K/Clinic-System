import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create({ roles }) {
    const { data, setData, post, errors, processing } = useForm({
        name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        roles: [],
        is_active: true
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.users.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Create User</h2>}>
            <Head title="Create User" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Full Name</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                                {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Username (for login)</label>
                                <input type="text" value={data.username} onChange={e => setData('username', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                                {errors.username && <div className="text-red-500 text-xs mt-1">{errors.username}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                                {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Phone</label>
                                <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                                {errors.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Password</label>
                                <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                                {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Confirm Password</label>
                                <input type="password" value={data.password_confirmation} onChange={e => setData('password_confirmation', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Roles</label>
                                {roles.map(role => (
                                    <div key={role.id}>
                                        <label className="inline-flex items-center">
                                            <input type="checkbox" value={role.name} checked={data.roles.includes(role.name)} onChange={e => {
                                                if (e.target.checked) setData('roles', [...data.roles, role.name]);
                                                else setData('roles', data.roles.filter(r => r !== role.name));
                                            }} className="rounded border-gray-300 shadow-sm" />
                                            <span className="ml-2">{role.name}</span>
                                        </label>
                                    </div>
                                ))}
                                {errors.roles && <div className="text-red-500 text-xs mt-1">{errors.roles}</div>}
                            </div>
                            <div>
                                <label className="inline-flex items-center">
                                    <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded border-gray-300 shadow-sm" />
                                    <span className="ml-2">Is Active</span>
                                </label>
                            </div>
                            <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
