import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

function FieldError({ id, message }) {
    return message ? <p id={id} className="mt-1 text-sm font-medium text-red-700">{message}</p> : null;
}

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '', potency: '', form: 'drops', default_instruction: '', stock_qty: '', is_active: true,
    });
    const submit = (event) => {
        event.preventDefault();
        post(route('admin.medicines.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Create Medicine</h2>}>
            <Head title="Create Medicine" />
            <div className="mx-auto max-w-7xl px-4 py-12">
                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label htmlFor="medicine-name" className="block font-medium">Name <span className="text-sm text-gray-600">(required)</span></label>
                            <input id="medicine-name" type="text" value={data.name} onChange={(event) => setData('name', event.target.value)} className="w-full rounded" required aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'medicine-name-error' : undefined} />
                            <FieldError id="medicine-name-error" message={errors.name} />
                        </div>
                        <div>
                            <label htmlFor="medicine-potency" className="block font-medium">Potency <span className="text-sm text-gray-600">(required)</span></label>
                            <input id="medicine-potency" type="text" value={data.potency} onChange={(event) => setData('potency', event.target.value)} className="w-full rounded" required aria-required="true" aria-invalid={Boolean(errors.potency)} aria-describedby={errors.potency ? 'medicine-potency-error' : undefined} />
                            <FieldError id="medicine-potency-error" message={errors.potency} />
                        </div>
                        <div>
                            <label htmlFor="medicine-form" className="block font-medium">Form <span className="text-sm text-gray-600">(required)</span></label>
                            <select id="medicine-form" value={data.form} onChange={(event) => setData('form', event.target.value)} className="w-full rounded" required aria-required="true" aria-invalid={Boolean(errors.form)} aria-describedby={errors.form ? 'medicine-form-error' : undefined}>
                                <option value="drops">Drops</option>
                                <option value="pills">Pills</option>
                                <option value="liquid">Liquid</option>
                            </select>
                            <FieldError id="medicine-form-error" message={errors.form} />
                        </div>
                        {errors.default_instruction && <FieldError id="medicine-default-instruction-error" message={errors.default_instruction} />}
                        {errors.stock_qty && <FieldError id="medicine-stock-qty-error" message={errors.stock_qty} />}
                        <button type="submit" disabled={processing} className="rounded bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">{processing ? 'Saving...' : 'Save'}</button>
                        {processing && <p role="status" className="text-sm text-gray-700">Saving medicine...</p>}
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
