import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops', 'Inhaler', 'Ointment', 'Cream', 'Suppository'];

export default function Edit({ pharmaceutical }) {
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
                    description="Update conventional pharmaceutical details in the drug catalog."
                />

                <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-6">
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
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Strength / Potency (মাত্রা) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.strength}
                                    onChange={(e) => setData('strength', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.strength && <p className="mt-1 text-xs text-red-600 font-medium">{errors.strength}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Pharmaceutical Manufacturer (কোম্পানি / প্রস্তুতকারক)
                                </label>
                                <input
                                    type="text"
                                    value={data.manufacturer}
                                    onChange={(e) => setData('manufacturer', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
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
