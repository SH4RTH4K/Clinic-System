import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link } from '@inertiajs/react';

export default function Index({ logs, filters }) {
    const { data, setData, get } = useForm({ search: filters.search || '' });
    const onSearch = (e) => { e.preventDefault(); get(route('admin.activity_logs.index')); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Activity Logs</h2>}>
            <Head title="Activity Logs" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <form onSubmit={onSearch} className="flex mb-4">
                    <input type="text" value={data.search} onChange={e => setData('search', e.target.value)} placeholder="Search logs..." className="rounded-l border-gray-300"/>
                    <button className="bg-gray-200 px-4 rounded-r border border-gray-300">Search</button>
                </form>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead><tr className="bg-gray-50 border-b"><th className="p-2">Time</th><th className="p-2">User</th><th className="p-2">Description</th><th className="p-2">Subject Type</th><th className="p-2">Subject ID</th></tr></thead>
                        <tbody>
                            {logs.data.map(log => (
                                <tr key={log.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="p-2">{log.causer?.name || 'System'}</td>
                                    <td className="p-2 font-semibold capitalize">{log.description}</td>
                                    <td className="p-2">{log.subject_type?.split('\\').pop() || '-'}</td>
                                    <td className="p-2">{log.subject_id || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex space-x-2">
                    {logs.links.map((link, i) => (
                        link.url ? <Link key={i} href={link.url} className={`px-2 py-1 border ${link.active ? 'bg-blue-500 text-white' : 'bg-white'}`} dangerouslySetInnerHTML={{__html: link.label}}></Link> : <span key={i} className={`px-2 py-1 border text-gray-400 bg-gray-50`} dangerouslySetInnerHTML={{__html: link.label}}></span>
                    ))}
                </div>
            </div></div>
        </AuthenticatedLayout>
    );
}
