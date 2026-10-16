import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create({ permissions }) {
    const { data, setData, post, errors, processing } = useForm({
        name: '',
        permissions: []
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.roles.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Create Role</h2>}>
            <Head title="Create Role" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Role Name</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                                {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Permissions</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {permissions.map(perm => (
                                        <div key={perm.id}>
                                            <label className="inline-flex items-center">
                                                <input type="checkbox" value={perm.name} checked={data.permissions.includes(perm.name)} onChange={e => {
                                                    if (e.target.checked) setData('permissions', [...data.permissions, perm.name]);
                                                    else setData('permissions', data.permissions.filter(p => p !== perm.name));
                                                }} className="rounded border-gray-300 shadow-sm" />
                                                <span className="ml-2 text-sm">{perm.name}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
