import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

function FieldError({ id, message }) {
    return message ? <p id={id} className="mt-1 text-sm font-medium text-red-700">{message}</p> : null;
}

export default function Edit({ medicine }) {
    const { data, setData, put, processing, errors } = useForm({
        name: medicine.name,
        potency: medicine.potency,
        form: medicine.form,
        default_instruction: medicine.default_instruction || '',
        stock_qty: medicine.stock_qty || '',
        is_active: medicine.is_active,
    });
    const submit = (event) => {
        event.preventDefault();
        put(route('admin.medicines.update', medicine.id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold">Edit Medicine</h2>}>
            <Head title="Edit Medicine" />
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
                        <label htmlFor="medicine-active" className="inline-flex items-center">
                            <input id="medicine-active" type="checkbox" checked={data.is_active} onChange={(event) => setData('is_active', event.target.checked)} className="rounded" aria-invalid={Boolean(errors.is_active)} aria-describedby={errors.is_active ? 'medicine-active-error' : undefined} />
                            <span className="ml-2">Active</span>
                        </label>
                        <FieldError id="medicine-active-error" message={errors.is_active} />
                        <button type="submit" disabled={processing} className="rounded bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">{processing ? 'Updating...' : 'Update'}</button>
                        {processing && <p role="status" className="text-sm text-gray-700">Updating medicine...</p>}
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
