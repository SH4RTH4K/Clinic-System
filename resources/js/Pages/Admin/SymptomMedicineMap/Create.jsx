import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create({ symptoms, medicines }) {
    const { data, setData, post, processing, errors } = useForm({ symptom_id: '', medicine_id: '', priority: 1, note: '', source_title: '', source_author: '', source_edition: '', source_page: '', source_url: '' });
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
                        {errors.symptom_id && <p className="mt-1 text-sm text-red-600">{errors.symptom_id}</p>}
                    </div>
                    <div>
                        <label className="block">Medicine</label>
                        <select value={data.medicine_id} onChange={e => setData('medicine_id', e.target.value)} className="w-full rounded" required>
                            <option value="">Select...</option>
                            {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.potency})</option>)}
                        </select>
                        {errors.medicine_id && <p className="mt-1 text-sm text-red-600">{errors.medicine_id}</p>}
                    </div>
                    <div>
                        <label className="block">Priority (1 = highest)</label>
                        <input type="number" min="1" max="9999" value={data.priority} onChange={e => setData('priority', e.target.value)} className="w-full rounded" required />
                        {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority}</p>}
                    </div>
                    <div>
                        <label className="block">Clinical note</label>
                        <textarea rows="3" maxLength="5000" value={data.note} onChange={e => setData('note', e.target.value)} className="w-full rounded" />
                        {errors.note && <p className="mt-1 text-sm text-red-600">{errors.note}</p>}
                    </div>
                    <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
                        <legend className="px-1 text-sm font-semibold">Reference source</legend>
                        <p className="text-xs text-gray-600">Record where this general repertory relationship came from. New mappings start as drafts and are not used in consultation suggestions until independently approved.</p>
                        {[
                            ['source_title', 'Source title', 'e.g. repertory or materia medica title'],
                            ['source_author', 'Author', 'Author or editor'],
                            ['source_edition', 'Edition', 'Edition or publication year'],
                            ['source_page', 'Page / section', 'Page, rubric, or section'],
                            ['source_url', 'Source URL', 'https://...'],
                        ].map(([field, label, placeholder]) => (
                            <div key={field}>
                                <label htmlFor={field} className="block text-xs font-medium text-gray-700">{label}</label>
                                <input id={field} type={field === 'source_url' ? 'url' : 'text'} value={data[field]} onChange={(event) => setData(field, event.target.value)} maxLength={field === 'source_url' ? 2048 : field === 'source_page' ? 100 : 255} placeholder={placeholder} className="mt-1 w-full rounded border-gray-300 text-sm" />
                                {errors[field] && <p className="mt-1 text-xs text-red-600">{errors[field]}</p>}
                            </div>
                        ))}
                    </fieldset>
                    <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">New entries are Draft references. They do not appear in consultation suggestions until a reviewer approves them. Repertory information does not establish effectiveness or replace established medical treatment.</p>
                    <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-50">{processing ? 'Saving...' : 'Save draft'}</button>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}
