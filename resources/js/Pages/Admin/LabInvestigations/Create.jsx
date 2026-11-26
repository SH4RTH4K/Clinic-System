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

const CLINICAL_PRESETS = [
    {
        name: 'Complete Blood Count (CBC) with ESR',
        code: 'CBC',
        name_bn: 'কমপ্লিট ব্লাড কাউন্ট ও ইএসআর',
        category: 'hematology',
        specimen_type: 'blood',
        standard_cost: '400.00',
        default_instructions: 'No special preparation needed. EDTA purple top vial.',
        reference_range: 'Hb: 12-16 g/dL, WBC: 4,000-11,000/uL, Platelets: 150k-450k/uL, ESR: 0-20 mm/hr',
        turnaround_time: '2 Hours',
    },
    {
        name: 'Fasting Blood Sugar (FBS)',
        code: 'FBS',
        name_bn: 'ফাস্টিং ব্লাড সুগার',
        category: 'biochemistry',
        specimen_type: 'blood',
        standard_cost: '100.00',
        default_instructions: '8-10 hours overnight fasting required. Plain water allowed.',
        reference_range: '3.9 - 5.6 mmol/L (70 - 100 mg/dL)',
        turnaround_time: '1 Hour',
    },
    {
        name: 'HbA1c (Glycated Hemoglobin)',
        code: 'HbA1c',
        name_bn: 'এইচবিএ১সি (৩ মাসের গড় সুগার)',
        category: 'biochemistry',
        specimen_type: 'blood',
        standard_cost: '800.00',
        default_instructions: 'No fasting required. Measures 3-month average glucose control.',
        reference_range: 'Normal: < 5.7%, Pre-diabetic: 5.7-6.4%, Diabetic: >= 6.5%',
        turnaround_time: '4 Hours',
    },
    {
        name: 'Serum Creatinine',
        code: 'S.Creat',
        name_bn: 'সিরাম ক্রিয়েটিনিন (কিডনি পরীক্ষা)',
        category: 'biochemistry',
        specimen_type: 'blood',
        standard_cost: '300.00',
        default_instructions: 'Assesses renal filtration function.',
        reference_range: 'Male: 0.7 - 1.3 mg/dL, Female: 0.6 - 1.1 mg/dL',
        turnaround_time: '2 Hours',
    },
    {
        name: 'Lipid Profile (Cholesterol, TG, HDL, LDL)',
        code: 'Lipid',
        name_bn: 'লিপিড প্রোফাইল (রক্তের চর্বি পরীক্ষা)',
        category: 'biochemistry',
        specimen_type: 'blood',
        standard_cost: '900.00',
        default_instructions: '10-12 hours strict fasting required prior to blood collection.',
        reference_range: 'Total Chol: < 200, TG: < 150, HDL: > 40, LDL: < 100 mg/dL',
        turnaround_time: '4 Hours',
    },
    {
        name: 'Liver Function Test (SGPT/ALT, SGOT/AST, Bilirubin)',
        code: 'LFT',
        name_bn: 'লিভার ফাংশন টেস্ট (এলএফটি/জন্ডিস)',
        category: 'biochemistry',
        specimen_type: 'blood',
        standard_cost: '800.00',
        default_instructions: 'Assesses hepatic enzymes and jaundice profile.',
        reference_range: 'SGPT: < 45 U/L, SGOT: < 40 U/L, Total Bilirubin: 0.2 - 1.2 mg/dL',
        turnaround_time: '3 Hours',
    },
    {
        name: 'Urine Routine & Microscopic Examination (R/M/E)',
        code: 'Urine R/M/E',
        name_bn: 'ইউরিন রুটিন ও মাইক্রোস্কোপিক',
        category: 'microbiology',
        specimen_type: 'urine',
        standard_cost: '150.00',
        default_instructions: 'Clean-catch midstream early morning urine sample.',
        reference_range: 'Pus cells: 0-4/HPF, RBC: Nil, Protein: Nil, Sugar: Nil',
        turnaround_time: '1 Hour',
    },
    {
        name: 'Ultrasonography (USG) of Whole Abdomen',
        code: 'USG-WA',
        name_bn: 'পেটের আল্ট্রাসনোগ্রাম (হোল অ্যাবডোমেন)',
        category: 'ultrasound',
        specimen_type: 'imaging',
        standard_cost: '1500.00',
        default_instructions: '6-8 hours fasting; drink 1 liter water for full bladder prior to scan.',
        reference_range: 'Normal hepatobiliary, pancreatic, renal, and pelvic morphology',
        turnaround_time: '1 Hour',
    },
    {
        name: 'X-Ray Chest P/A View',
        code: 'CXR',
        name_bn: 'বুকের এক্স-রে (পি/এ ভিউ)',
        category: 'radiology',
        specimen_type: 'imaging',
        standard_cost: '500.00',
        default_instructions: 'Remove metallic jewelry and metal buttons before exposure.',
        reference_range: 'Clear lung fields, normal cardiothoracic ratio (< 50%)',
        turnaround_time: '1 Hour',
    },
    {
        name: 'Electrocardiogram (ECG - 12 Lead)',
        code: 'ECG',
        name_bn: 'ইসিজি (১২ লিড হৃদরোগ পরীক্ষা)',
        category: 'other',
        specimen_type: 'imaging',
        standard_cost: '300.00',
        default_instructions: 'Rest calmly for 5 minutes prior to recording.',
        reference_range: 'Normal sinus rhythm, normal axis, no ischemic ST-T changes',
        turnaround_time: '15 Minutes',
    },
];

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        code: '',
        name_bn: '',
        category: 'biochemistry',
        specimen_type: 'blood',
        standard_cost: '0.00',
        default_instructions: '',
        reference_range: '',
        turnaround_time: '',
        is_active: true,
    });

    const applyPreset = (preset) => {
        setData((prev) => ({
            ...prev,
            name: preset.name,
            code: preset.code,
            name_bn: preset.name_bn,
            category: preset.category,
            specimen_type: preset.specimen_type,
            standard_cost: preset.standard_cost,
            default_instructions: preset.default_instructions,
            reference_range: preset.reference_range,
            turnaround_time: preset.turnaround_time,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.lab_investigations.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Add Lab Investigation" />
            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Add Diagnostic Lab Investigation"
                    description="Register a new laboratory test, imaging scan, or diagnostic procedure in the clinical order catalog."
                />

                {/* 1-Click Clinical Presets */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                            ⚡ Quick Presets (দ্রুত প্যাকেজ নির্বাচন):
                        </span>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400">Click any preset to auto-fill</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {CLINICAL_PRESETS.map((preset) => (
                            <button
                                key={preset.code}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 text-gray-700 dark:text-gray-200 rounded-lg border border-teal-200 dark:border-teal-700 shadow-2xs transition"
                            >
                                + {preset.code} ({preset.name_bn})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-4">
                            {/* Row 1: Name and Short Code */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Investigation / Test Name (English) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Complete Blood Count (CBC) with ESR, Serum Creatinine"
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
                                        placeholder="0.00 (leave 0 if referral only)"
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

                            {/* Row 6: Default Preparation Instructions */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Default Patient Instructions (রোগীর প্রস্তুতি নির্দেশিকা)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. 10-12 hours overnight fasting required, full bladder required, no metallic jewelry..."
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
                                {processing ? 'Saving...' : 'Save Investigation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
