import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

const CATEGORIES = [
    { value: 'hematology', label: 'Hematology (রক্ত পরীক্ষা)' },
    { value: 'biochemistry', label: 'Biochemistry (বায়োকেমিস্ট্রি)' },
    { value: 'radiology', label: 'Radiology / X-Ray (রেডিওলজি)' },
    { value: 'ultrasound', label: 'Ultrasound / USG (আল্ট্রাসনোগ্রাম)' },
    { value: 'microbiology', label: 'Microbiology (মাইক্রোবায়োলজি)' },
    { value: 'other', label: 'Other Investigations (অন্যান্য)' },
];

export default function Edit({ labInvestigation }) {
    const { data, setData, put, processing, errors } = useForm({
        name: labInvestigation.name || '',
        category: labInvestigation.category || 'biochemistry',
        default_instructions: labInvestigation.default_instructions || '',
        is_active: Boolean(labInvestigation.is_active),
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.lab_investigations.update', labInvestigation.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit ${labInvestigation.name}`} />
            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Edit: ${labInvestigation.name}`}
                    description="Update laboratory or diagnostic investigation details."
                />

                <div className="bg-white rounded-xl shadow-2xs border border-gray-100 p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Investigation / Test Name (পরীক্ষার নাম) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Category (ধরন) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                {errors.category && <p className="mt-1 text-xs text-red-600 font-medium">{errors.category}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-800 mb-1">
                                    Default Patient Instructions (পরীক্ষার নির্দেশিকা)
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.default_instructions}
                                    onChange={(e) => setData('default_instructions', e.target.value)}
                                    className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                />
                                {errors.default_instructions && <p className="mt-1 text-xs text-red-600 font-medium">{errors.default_instructions}</p>}
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active in consultation investigation order selector</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link
                                href={route('admin.lab_investigations.index')}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition shadow-xs disabled:opacity-50"
                            >
                                {processing ? 'Updating...' : 'Update Investigation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
