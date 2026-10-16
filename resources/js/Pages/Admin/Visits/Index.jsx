import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Index({ visits }) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Visits</h2>}>
            <Head title="Visits" />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6 lg:px-8"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <div className="mb-4">
                    <Link href={route('admin.visits.create')} className="bg-blue-500 text-white px-4 py-2 rounded">New Visit</Link>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr><th className="border-b p-2">Date</th><th className="border-b p-2">Patient</th><th className="border-b p-2">Status</th><th className="border-b p-2">Actions</th></tr>
                    </thead>
                    <tbody>
                        {visits.data.map(v => (
                            <tr key={v.id}>
                                <td className="border-b p-2">{new Date(v.visit_date).toLocaleDateString()}</td>
                                <td className="border-b p-2">{v.patient?.name}</td>
                                <td className="border-b p-2 capitalize">{v.status}</td>
                                <td className="border-b p-2 space-x-2">
                                    <Link href={route('admin.visits.show', v.id)} className="text-blue-600">View</Link>
                                    <Link href={route('admin.visits.edit', v.id)} className="text-green-600">Edit</Link>
                                    <a href={route('admin.visits.pdf', v.id)} target="_blank" className="text-purple-600">PDF</a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div></div></div>
        </AuthenticatedLayout>
    );
}
