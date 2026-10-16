import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Index({ patients, filters }) {
    const { data, setData, get } = useForm({
        search: filters.search || ''
    });

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.patients.index'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Patients</h2>}>
            <Head title="Patients" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                        <div className="flex justify-between mb-4">
                            <form onSubmit={onSearch} className="flex">
                                <input type="text" value={data.search} onChange={e => setData('search', e.target.value)} placeholder="Search patients..." className="rounded-l-md border-gray-300" />
                                <button type="submit" className="bg-gray-200 px-4 rounded-r-md border border-gray-300 border-l-0">Search</button>
                            </form>
                            <Link href={route('admin.patients.create')} className="bg-blue-500 text-white px-4 py-2 rounded">New Patient</Link>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="border-b p-2">Patient No</th>
                                    <th className="border-b p-2">Name</th>
                                    <th className="border-b p-2">Phone</th>
                                    <th className="border-b p-2">Age/DOB</th>
                                    <th className="border-b p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.data.map(p => (
                                    <tr key={p.id}>
                                        <td className="border-b p-2">{p.patient_no} {p.patient_series}</td>
                                        <td className="border-b p-2">{p.name}</td>
                                        <td className="border-b p-2">{p.phone}</td>
                                        <td className="border-b p-2">{p.age_years || p.dob}</td>
                                        <td className="border-b p-2 space-x-2">
                                            <Link href={route('admin.patients.show', p.id)} className="text-gray-600">View</Link>
                                            <Link href={route('admin.patients.edit', p.id)} className="text-blue-600">Edit</Link>
                                            <Link href={route('admin.patients.destroy', p.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Basic Pagination */}
                        <div className="mt-4 flex space-x-2">
                            {patients.links.map((link, i) => (
                                link.url ? <Link key={i} href={link.url} className={`px-2 py-1 border ${link.active ? 'bg-blue-500 text-white' : 'bg-white'}`} dangerouslySetInnerHTML={{__html: link.label}}></Link> : <span key={i} className={`px-2 py-1 border text-gray-400 bg-gray-50`} dangerouslySetInnerHTML={{__html: link.label}}></span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
