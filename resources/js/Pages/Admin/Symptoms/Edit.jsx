import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

function FieldError({ id, message }) {
    return message ? <p id={id} className="mt-1 text-sm font-medium text-red-700">{message}</p> : null;
}

export default function Edit({ symptom }) {
    const { data, setData, put, processing, errors } = useForm({
        name_en: symptom.name_en,
        name_bn: symptom.name_bn || '',
        category: symptom.category || '',
        is_active: symptom.is_active,
    });
    const submit = (event) => {
        event.preventDefault();
        put(route('admin.symptoms.update', symptom.id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Edit Symptom</h2>}>
            <Head title="Edit Symptom" />
            <div className="mx-auto max-w-7xl px-4 py-12">
                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label htmlFor="symptom-name-en" className="block font-medium">Name (EN) <span className="text-sm text-gray-600">(required)</span></label>
                            <input id="symptom-name-en" type="text" value={data.name_en} onChange={(event) => setData('name_en', event.target.value)} className="w-full rounded" required aria-required="true" aria-invalid={Boolean(errors.name_en)} aria-describedby={errors.name_en ? 'symptom-name-en-error' : undefined} />
                            <FieldError id="symptom-name-en-error" message={errors.name_en} />
                        </div>
                        <div>
                            <label htmlFor="symptom-name-bn" className="block font-medium">Name (BN)</label>
                            <input id="symptom-name-bn" type="text" value={data.name_bn} onChange={(event) => setData('name_bn', event.target.value)} className="w-full rounded" aria-invalid={Boolean(errors.name_bn)} aria-describedby={errors.name_bn ? 'symptom-name-bn-error' : undefined} />
                            <FieldError id="symptom-name-bn-error" message={errors.name_bn} />
                        </div>
                        <div>
                            <label htmlFor="symptom-category" className="block font-medium">Category</label>
                            <input id="symptom-category" type="text" value={data.category} onChange={(event) => setData('category', event.target.value)} className="w-full rounded" aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'symptom-category-error' : undefined} />
                            <FieldError id="symptom-category-error" message={errors.category} />
                        </div>
                        <label htmlFor="symptom-active" className="inline-flex items-center">
                            <input id="symptom-active" type="checkbox" checked={data.is_active} onChange={(event) => setData('is_active', event.target.checked)} className="rounded" aria-invalid={Boolean(errors.is_active)} aria-describedby={errors.is_active ? 'symptom-active-error' : undefined} />
                            <span className="ml-2">Active</span>
                        </label>
                        <FieldError id="symptom-active-error" message={errors.is_active} />
                        <button type="submit" disabled={processing} className="rounded bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">{processing ? 'Updating...' : 'Update'}</button>
                        {processing && <p role="status" className="text-sm text-gray-700">Updating symptom...</p>}
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
