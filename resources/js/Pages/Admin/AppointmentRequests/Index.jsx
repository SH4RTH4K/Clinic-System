import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';

export default function Index({ requests, filters }) {
    const { data, setData, get } = useForm({ status: filters.status || '' });
    const { put } = useForm();
    const { post } = useForm();

    const onSearch = (e) => { e.preventDefault(); get(route('admin.appointment_requests.index')); };

    const updateStatus = (id, newStatus) => {
        put(route('admin.appointment_requests.update', id), { data: { status: newStatus } });
    };

    const convertToPatient = (id) => {
        post(route('admin.appointment_requests.convert', id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Appointment Requests</h2>}>
            <Head title="Appointment Requests" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <form onSubmit={onSearch} className="flex space-x-2 mb-4">
                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="rounded border-gray-300">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <button className="bg-gray-200 px-4 rounded border border-gray-300">Filter</button>
                </form>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead><tr className="bg-gray-50 border-b"><th className="p-2">Date</th><th className="p-2">Name</th><th className="p-2">Phone</th><th className="p-2">Pref. Date</th><th className="p-2">Message</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
                        <tbody>
                            {requests.data.map(req => (
                                <tr key={req.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 whitespace-nowrap">{new Date(req.created_at).toLocaleDateString()}</td>
                                    <td className="p-2 font-bold">{req.name}</td>
                                    <td className="p-2">{req.phone}</td>
                                    <td className="p-2">{req.preferred_date ? new Date(req.preferred_date).toLocaleDateString() : '-'}</td>
                                    <td className="p-2 max-w-xs truncate" title={req.message}>{req.message}</td>
                                    <td className="p-2">
                                        <select value={req.status} onChange={(e) => updateStatus(req.id, e.target.value)} className="text-xs p-1 rounded border-gray-300">
                                            <option value="pending">Pending</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td className="p-2 space-x-2">
                                        <button onClick={() => convertToPatient(req.id)} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Convert to Patient</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex space-x-2">
                    {requests.links.map((link, i) => (
                        link.url ? <Link key={i} href={link.url} className={`px-2 py-1 border \${link.active ? 'bg-blue-500 text-white' : 'bg-white'}`} dangerouslySetInnerHTML={{__html: link.label}}></Link> : <span key={i} className={`px-2 py-1 border text-gray-400 bg-gray-50`} dangerouslySetInnerHTML={{__html: link.label}}></span>
                    ))}
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}
