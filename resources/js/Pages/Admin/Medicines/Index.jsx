import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Index({ medicines, filters }) {
    const { data, setData, get } = useForm({ search: filters.search || '' });
    const onSearch = (e) => { e.preventDefault(); get(route('admin.medicines.index')); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Medicines</h2>}>
            <Head title="Medicines" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between mb-4">
                            <form onSubmit={onSearch} className="flex">
                                <input type="text" value={data.search} onChange={e => setData('search', e.target.value)} placeholder="Search..." className="rounded-l-md border-gray-300" />
                                <button type="submit" className="bg-gray-200 px-4 rounded-r-md border border-gray-300 border-l-0">Search</button>
                            </form>
                            <Link href={route('admin.medicines.create')} className="bg-blue-500 text-white px-4 py-2 rounded">New Medicine</Link>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b p-2">Name</th>
                                    <th className="border-b p-2">Potency</th>
                                    <th className="border-b p-2">Form</th>
                                    <th className="border-b p-2">Active</th>
                                    <th className="border-b p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {medicines.data.map(m => (
                                    <tr key={m.id}>
                                        <td className="border-b p-2">{m.name}</td>
                                        <td className="border-b p-2">{m.potency}</td>
                                        <td className="border-b p-2">{m.form}</td>
                                        <td className="border-b p-2">{m.is_active ? 'Yes' : 'No'}</td>
                                        <td className="border-b p-2 space-x-2">
                                            <Link href={route('admin.medicines.edit', m.id)} className="text-blue-600">Edit</Link>
                                            <Link href={route('admin.medicines.destroy', m.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link>
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
