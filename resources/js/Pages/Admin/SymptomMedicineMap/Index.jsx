import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Index({ maps }) {
    const { data, setData, post, processing } = useForm({ csv_file: null });
    
    const uploadCsv = (e) => {
        e.preventDefault();
        post(route('admin.symptom_medicine_map.import'), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Symptom & Medicine Mapping</h2>}>
            <Head title="Mappings" />
            <div className="py-12"><div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-4">
                
                <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                    <h3 className="text-lg font-bold mb-2">Import from CSV</h3>
                    <form onSubmit={uploadCsv} className="flex space-x-2 items-center">
                        <input type="file" onChange={e => setData('csv_file', e.target.files[0])} accept=".csv" required className="border p-1" />
                        <button type="submit" disabled={processing} className="bg-blue-600 text-white px-4 py-2 rounded">Upload & Import</button>
                    </form>
                    <p className="text-sm text-gray-500 mt-2">Format: symptom_name, medicine_name, priority, note</p>
                </div>

                <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                    <div className="mb-4 text-right">
                        <Link href={route('admin.symptom_medicine_map.create')} className="bg-blue-500 text-white px-4 py-2 rounded">Add Mapping</Link>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead><tr><th className="border-b p-2">Symptom</th><th className="border-b p-2">Medicine</th><th className="border-b p-2">Priority</th><th className="border-b p-2">Actions</th></tr></thead>
                        <tbody>
                            {maps.data.map(m => (
                                <tr key={m.id}>
                                    <td className="border-b p-2">{m.symptom?.name_en}</td>
                                    <td className="border-b p-2">{m.medicine?.name}</td>
                                    <td className="border-b p-2">{m.priority}</td>
                                    <td className="border-b p-2">
                                        <Link href={route('admin.symptom_medicine_map.destroy', map.id)} method="delete" as="button" onClick={(e) => { if (!confirm('Are you sure? This cannot be undone.')) e.preventDefault(); }} className="text-red-600">Delete</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div></div>
        </AuthenticatedLayout>
    );
}
