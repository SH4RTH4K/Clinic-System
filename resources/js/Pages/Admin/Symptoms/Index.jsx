import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Index({ symptoms, filters }) {
    const { data, setData, get } = useForm({ search: filters.search || '' });
    const onSearch = (e) => { e.preventDefault(); get(route('admin.symptoms.index')); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Symptoms</h2>}>
            <Head title="Symptoms" />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6"><div className="bg-white p-6 shadow-sm rounded-lg">
                <div className="flex justify-between mb-4">
                    <form onSubmit={onSearch} className="flex"><input type="text" value={data.search} onChange={e => setData('search', e.target.value)} className="rounded-l border-gray-300"/><button className="bg-gray-200 px-4 rounded-r border border-gray-300">Search</button></form>
                    <Link href={route('admin.symptoms.create')} className="bg-blue-500 text-white px-4 py-2 rounded">New Symptom</Link>
                </div>
                <table className="w-full text-left border-collapse"><thead><tr><th className="border-b p-2">Name EN</th><th className="border-b p-2">Name BN</th><th className="border-b p-2">Active</th><th className="border-b p-2">Actions</th></tr></thead>
                <tbody>{symptoms.data.map(s => (<tr key={s.id}><td className="border-b p-2">{s.name_en}</td><td className="border-b p-2">{s.name_bn}</td><td className="border-b p-2">{s.is_active ? 'Yes' : 'No'}</td><td className="border-b p-2"><Link href={route('admin.symptoms.edit', s.id)} className="text-blue-600">Edit</Link> <Link href={route('admin.symptoms.destroy', s.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link></td></tr>))}</tbody></table>
            </div></div></div>
        </AuthenticatedLayout>
    );
}
