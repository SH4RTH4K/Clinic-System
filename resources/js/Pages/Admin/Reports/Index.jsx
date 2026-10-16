import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Index({ visits, filters }) {
    const { data, setData, get, processing } = useForm({
        start_date: filters.start_date || '',
        end_date: filters.end_date || ''
    });

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.reports.index'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Reports</h2>}>
            <Head title="Reports" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <form onSubmit={onSearch} className="flex space-x-4 mb-6 items-end border-b pb-4">
                    <div><label className="block text-sm font-bold">Start Date</label><input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} className="rounded border-gray-300"/></div>
                    <div><label className="block text-sm font-bold">End Date</label><input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} className="rounded border-gray-300"/></div>
                    <button type="submit" disabled={processing} className="bg-blue-600 text-white px-4 py-2 rounded">Filter</button>
                    <button type="button" onClick={() => window.print()} className="bg-gray-200 px-4 py-2 rounded ml-auto">Print Report</button>
                </form>

                <table className="w-full text-left border-collapse border">
                    <thead><tr className="bg-gray-50"><th className="border p-2">Date</th><th className="border p-2">Patient</th><th className="border p-2">Phone</th><th className="border p-2">Chief Complaint</th><th className="border p-2">Status</th></tr></thead>
                    <tbody>
                        {visits.length === 0 && <tr><td colSpan="5" className="p-4 text-center text-gray-500">No visits found in this date range.</td></tr>}
                        {visits.map(v => (
                            <tr key={v.id}>
                                <td className="border p-2">{new Date(v.visit_date).toLocaleDateString()}</td>
                                <td className="border p-2">{v.patient?.name} ({v.patient?.patient_no} {v.patient?.patient_series})</td>
                                <td className="border p-2">{v.patient?.phone}</td>
                                <td className="border p-2 text-sm">{v.chief_complaint}</td>
                                <td className="border p-2 capitalize">{v.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div></div>
        </AuthenticatedLayout>
    );
}
