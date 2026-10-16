import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing } = useForm({
        name: '', potency: '', form: 'drops', default_instruction: '', stock_qty: '', is_active: true
    });
    const submit = (e) => { e.preventDefault(); post(route('admin.medicines.store')); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Create Medicine</h2>}>
            <Head title="Create Medicine" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm rounded-lg">
                <form onSubmit={submit} className="space-y-4">
                    <div><label className="block">Name</label><input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Potency</label><input type="text" value={data.potency} onChange={e => setData('potency', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Form</label><select value={data.form} onChange={e => setData('form', e.target.value)} className="w-full rounded"><option value="drops">Drops</option><option value="pills">Pills</option><option value="liquid">Liquid</option></select></div>
                    <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}