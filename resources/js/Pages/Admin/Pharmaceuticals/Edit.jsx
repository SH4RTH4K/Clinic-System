import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { DOSAGE_FORMS } from './Create';

const QUICK_STRENGTHS = ['500mg', '650mg', '20mg', '40mg', '100ml', '1g', '10mg', '5mg'];
const QUICK_MANUFACTURERS = [
    'Square Pharmaceuticals Ltd',
    'Beximco Pharmaceuticals Ltd',
    'Incepta Pharmaceuticals Ltd',
    'Renata Limited',
    'ACI Limited',
    'Opsonin Pharma Ltd',
];

export default function Edit({ pharmaceutical, manufacturers = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        generic_name: pharmaceutical.generic_name || '',
        brand_name: pharmaceutical.brand_name || '',
        dosage_form: pharmaceutical.dosage_form || 'Tablet',
        strength: pharmaceutical.strength || '',
        manufacturer: pharmaceutical.manufacturer || '',
        description: pharmaceutical.description || '',
        is_active: Boolean(pharmaceutical.is_active),
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.pharmaceuticals.update', pharmaceutical.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit ${pharmaceutical.brand_name}`} />
            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Edit Drug: ${pharmaceutical.brand_name}`}
                    subtitle="Update conventional pharmaceutical details, strength, or formulation in the clinical formulary."
                    actions={
                        <Link
                            href={route('admin.pharmaceuticals.index')}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            Back to Catalog
                        </Link>
                    }
                />

                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Brand / Commercial Name (ব্র্যান্ড নাম) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.brand_name}
                                    onChange={(e) => setData('brand_name', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.brand_name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.brand_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Generic Name (জেনেরিক নাম) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.generic_name}
                                    onChange={(e) => setData('generic_name', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.generic_name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.generic_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Dosage Form (ফর্ম) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.dosage_form}
                                    onChange={(e) => setData('dosage_form', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                >
                                    {DOSAGE_FORMS.map((form) => (
                                        <option key={form} value={form}>{form}</option>
                                    ))}
                                </select>
                                {errors.dosage_form && <p className="mt-1 text-xs text-red-600 font-medium">{errors.dosage_form}</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-semibold text-gray-800">
                                        Strength / Potency (মাত্রা) <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[11px] text-gray-500">Tap chip to fill:</span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={data.strength}
                                    onChange={(e) => setData('strength', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {QUICK_STRENGTHS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setData('strength', s)}
                                            className={`text-[11px] px-2 py-0.5 rounded font-medium border transition ${
                                                data.strength === s
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                                {errors.strength && <p className="mt-1 text-xs text-red-600 font-medium">{errors.strength}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-semibold text-gray-800">
                                        Pharmaceutical Manufacturer (কোম্পানি / প্রস্তুতকারক)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-gray-500">Tap chip or select:</span>
                                        <Link
                                            href={route('admin.manufacturers.create')}
                                            className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 underline"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            + Add New Company
                                        </Link>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    list="registered-manufacturers-edit-list"
                                    placeholder="Type or select company name..."
                                    value={data.manufacturer}
                                    onChange={(e) => setData('manufacturer', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                <datalist id="registered-manufacturers-edit-list">
                                    {manufacturers.map((m) => (
                                        <option key={m.id} value={m.name}>
                                            {m.short_name ? `${m.short_name} (${m.type})` : m.type}
                                        </option>
                                    ))}
                                </datalist>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {(manufacturers.length > 0
                                        ? manufacturers.slice(0, 8).map((m) => ({ name: m.name, label: m.short_name || m.name }))
                                        : QUICK_MANUFACTURERS.map((m) => ({ name: m, label: m.replace(' Pharmaceuticals Ltd', '').replace(' Limited', '') }))
                                    ).map((chip) => (
                                        <button
                                            key={chip.name}
                                            type="button"
                                            onClick={() => setData('manufacturer', chip.name)}
                                            className={`text-[11px] px-2 py-0.5 rounded font-medium border transition ${
                                                data.manufacturer === chip.name
                                                    ? 'bg-primary-600 text-white border-primary-600'
                                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                                            }`}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                                {errors.manufacturer && <p className="mt-1 text-xs text-red-600 font-medium">{errors.manufacturer}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Clinical Description / Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.description && <p className="mt-1 text-xs text-red-600 font-medium">{errors.description}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active in prescription suggestions and autocomplete</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link
                                href={route('admin.pharmaceuticals.index')}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition shadow-xs disabled:opacity-50"
                            >
                                {processing ? 'Updating...' : 'Update Drug'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
