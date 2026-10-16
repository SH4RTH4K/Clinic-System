import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
export default function Create() {
    const { data, setData, post, processing } = useForm({ text_en: '', text_bn: '', is_default: false });
    const submit = (e) => { e.preventDefault(); post(route('admin.food_restrictions.store')); };
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Create Food Restriction</h2>}>
            <Head title="Create Restriction" />
            <div className="py-12 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm rounded-lg">
                <form onSubmit={submit} className="space-y-4">
                    <div><label className="block">Text (BN)</label><input type="text" value={data.text_bn} onChange={e => setData('text_bn', e.target.value)} className="w-full rounded" required /></div>
                    <div><label className="block">Text (EN)</label><input type="text" value={data.text_en} onChange={e => setData('text_en', e.target.value)} className="w-full rounded" /></div>
                    <label className="inline-flex items-center"><input type="checkbox" checked={data.is_default} onChange={e => setData('is_default', e.target.checked)} className="rounded"/><span className="ml-2">Selected by default</span></label>
                    <br/><button type="submit" disabled={processing} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}