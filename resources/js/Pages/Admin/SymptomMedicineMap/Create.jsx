import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create({ symptoms, medicines }) {
    const { data, setData, post, processing } = useForm({ symptom_id: '', medicine_id: '', priority: 1, note: '' });
    const submit = (e) => { e.preventDefault(); post(route('admin.symptom_medicine_map.store')); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Add Mapping</h2>}>
            <Head title="Add Mapping" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm rounded-lg">
                <form onSubmit={submit} className="space-y-4 max-w-md">
                    <div>
                        <label className="block">Symptom</label>
                        <select value={data.symptom_id} onChange={e => setData('symptom_id', e.target.value)} className="w-full rounded" required>
                            <option value="">Select...</option>
                            {symptoms.map(s => <option key={s.id} value={s.id}>{s.name_en}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block">Medicine</label>
                        <select value={data.medicine_id} onChange={e => setData('medicine_id', e.target.value)} className="w-full rounded" required>
                            <option value="">Select...</option>
                            {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.potency})</option>)}
                        </select>
                    </div>
                    <div><label className="block">Priority (1 = highest)</label><input type="number" value={data.priority} onChange={e => setData('priority', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Note</label><input type="text" value={data.note} onChange={e => setData('note', e.target.value)} className="w-full rounded" /></div>
                    <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}