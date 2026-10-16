import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Edit({ symptom }) {
    const { data, setData, put, processing } = useForm({ name_en: symptom.name_en, name_bn: symptom.name_bn || '', category: symptom.category || '', is_active: symptom.is_active });
    const submit = (e) => { e.preventDefault(); put(route('admin.symptoms.update', symptom.id)); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Edit Symptom</h2>}>
            <Head title="Edit Symptom" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm rounded-lg">
                <form onSubmit={submit} className="space-y-4">
                    <div><label className="block">Name (EN)</label><input type="text" value={data.name_en} onChange={e => setData('name_en', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Name (BN)</label><input type="text" value={data.name_bn} onChange={e => setData('name_bn', e.target.value)} className="w-full rounded" /></div>
                    <label className="inline-flex items-center"><input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded" /><span className="ml-2">Active</span></label>
                    <br/><button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Update</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}