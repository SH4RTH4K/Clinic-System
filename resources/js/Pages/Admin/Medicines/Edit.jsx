import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Edit({ medicine }) {
    const { data, setData, put, processing } = useForm({
        name: medicine.name, potency: medicine.potency, form: medicine.form, default_instruction: medicine.default_instruction || '', stock_qty: medicine.stock_qty || '', is_active: medicine.is_active
    });
    const submit = (e) => { e.preventDefault(); put(route('admin.medicines.update', medicine.id)); };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Edit Medicine</h2>}>
            <Head title="Edit Medicine" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm rounded-lg">
                <form onSubmit={submit} className="space-y-4">
                    <div><label className="block">Name</label><input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Potency</label><input type="text" value={data.potency} onChange={e => setData('potency', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Form</label><select value={data.form} onChange={e => setData('form', e.target.value)} className="w-full rounded"><option value="drops">Drops</option><option value="pills">Pills</option><option value="liquid">Liquid</option></select></div>
                    <label className="inline-flex items-center"><input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} className="rounded" /><span className="ml-2">Active</span></label>
                    <br/><button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Update</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}