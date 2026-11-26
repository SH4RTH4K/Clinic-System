import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

const CATEGORIES = [
    { value: 'hematology', label: 'Hematology (রক্ত পরীক্ষা) 🩸' },
    { value: 'biochemistry', label: 'Biochemistry (বায়োকেমিস্ট্রি) 🧪' },
    { value: 'radiology', label: 'Radiology / X-Ray (রেডিওলজি) 🩻' },
    { value: 'ultrasound', label: 'Ultrasound / USG (আল্ট্রাসনোগ্রাম) 🔬' },
    { value: 'microbiology', label: 'Microbiology (মাইক্রোবায়োলজি) 🧫' },
    { value: 'other', label: 'Other Diagnostics (অন্যান্য) 🩺' },
];

const SPECIMEN_TYPES = [
    { value: 'blood', label: 'Blood (রক্ত) 💉' },
    { value: 'urine', label: 'Urine (প্রস্রাব) 🧪' },
    { value: 'stool', label: 'Stool (মল) 🔬' },
    { value: 'sputum', label: 'Sputum (কফ) 🧫' },
    { value: 'swab', label: 'Swab (সোয়াব) 🥢' },
    { value: 'imaging', label: 'Imaging / Scan (এক্স-রে/আল্ট্রা) 🩻' },
    { value: 'tissue', label: 'Biopsy / Tissue (টিস্যু) ✂️' },
    { value: 'other', label: 'Other Specimen (অন্যান্য) 📦' },
];

export default function Edit({ labInvestigation }) {
    const { data, setData, put, processing, errors } = useForm({
        name: labInvestigation.name || '',
        code: labInvestigation.code || '',
        name_bn: labInvestigation.name_bn || '',
        category: labInvestigation.category || 'biochemistry',
        specimen_type: labInvestigation.specimen_type || 'blood',
        standard_cost: labInvestigation.standard_cost ? String(labInvestigation.standard_cost) : '0.00',
        default_instructions: labInvestigation.default_instructions || '',
        reference_range: labInvestigation.reference_range || '',
        turnaround_time: labInvestigation.turnaround_time || '',
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
                    description="Update laboratory or diagnostic investigation formulary details."
                />

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-4">
                            {/* Row 1: Name and Code */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Investigation / Test Name (English) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Short Code / Acronym (সংক্ষিপ্ত কোড)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CBC, FBS, LFT, CXR"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        className="w-full text-xs font-mono font-bold rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                                </div>
                            </div>

                            {/* Row 2: Bengali Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Bengali Local Name (বাংলা নাম)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. কমপ্লিট ব্লাড কাউন্ট, ফাস্টিং সুগার, পেটের আল্ট্রাসনোগ্রাম"
                                    value={data.name_bn}
                                    onChange={(e) => setData('name_bn', e.target.value)}
                                    className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500 font-bengali"
                                />
                                {errors.name_bn && <p className="mt-1 text-xs text-red-600">{errors.name_bn}</p>}
                            </div>

                            {/* Row 3: Category and Specimen Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Category (বিভাগ) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Specimen / Sample Type (নমুনার ধরন) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.specimen_type}
                                        onChange={(e) => setData('specimen_type', e.target.value)}
                                        className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    >
                                        {SPECIMEN_TYPES.map((spec) => (
                                            <option key={spec.value} value={spec.value}>{spec.label}</option>
                                        ))}
                                    </select>
                                    {errors.specimen_type && <p className="mt-1 text-xs text-red-600">{errors.specimen_type}</p>}
                                </div>
                            </div>

                            {/* Row 4: Standard Cost and Turnaround Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Standard In-House Fee (৳ খরচ/বিলিং রেট)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.standard_cost}
                                        onChange={(e) => setData('standard_cost', e.target.value)}
                                        className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-0.5">Auto-fills billing amount when advised in consultation.</p>
                                    {errors.standard_cost && <p className="mt-1 text-xs text-red-600">{errors.standard_cost}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Turnaround Time (রিপোর্ট প্রদানের সময়)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 15 Minutes, 2 Hours, Same Day, 24 Hours"
                                        value={data.turnaround_time}
                                        onChange={(e) => setData('turnaround_time', e.target.value)}
                                        className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {errors.turnaround_time && <p className="mt-1 text-xs text-red-600">{errors.turnaround_time}</p>}
                                </div>
                            </div>

                            {/* Row 5: Reference / Normal Range */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Normal / Reference Range (স্বাভাবিক মাত্রা ও একক)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Fasting: 70-100 mg/dL, Total Cholesterol: < 200 mg/dL, Hb: 12-16 g/dL"
                                    value={data.reference_range}
                                    onChange={(e) => setData('reference_range', e.target.value)}
                                    className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.reference_range && <p className="mt-1 text-xs text-red-600">{errors.reference_range}</p>}
                            </div>

                            {/* Row 6: Default Instructions */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Default Patient Instructions (রোগীর প্রস্তুতি নির্দেশিকা)
                                </label>
                                <textarea
                                    rows={3}
                                    value={data.default_instructions}
                                    onChange={(e) => setData('default_instructions', e.target.value)}
                                    className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.default_instructions && <p className="mt-1 text-xs text-red-600">{errors.default_instructions}</p>}
                            </div>

                            {/* Row 7: Active Checkbox */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                    />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        Active in consultation investigation order selector
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Link
                                href={route('admin.lab_investigations.index')}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition shadow-xs disabled:opacity-50"
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
