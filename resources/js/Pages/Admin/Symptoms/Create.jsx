import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing } = useForm({ name_en: '', name_bn: '', category: '', is_active: true });
    const submit = (e) => { e.preventDefault(); post(route('admin.symptoms.store')); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Create Symptom</h2>}>
            <Head title="Create Symptom" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm rounded-lg">
                <form onSubmit={submit} className="space-y-4">
                    <div><label className="block">Name (EN)</label><input type="text" value={data.name_en} onChange={e => setData('name_en', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Name (BN)</label><input type="text" value={data.name_bn} onChange={e => setData('name_bn', e.target.value)} className="w-full rounded" /></div>
                    <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}