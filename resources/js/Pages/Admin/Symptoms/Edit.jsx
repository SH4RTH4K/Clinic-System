import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

const REPERTORY_CHAPTERS = [
    { value: 'mind', label: 'Mind & Emotion (মন ও আবেগ) 🧠' },
    { value: 'head', label: 'Head & Vertigo (মাথা ও মাথাঘোরা) 🤕' },
    { value: 'eyes_ent', label: 'Eyes, Ears, Nose & Throat (চোখ, কান, নাক ও গলা) 👃' },
    { value: 'digestion', label: 'Stomach, Thirst & Appetite (পাকস্থলী, পিপাসা ও ক্ষুধা) 🍽️' },
    { value: 'abdomen_stool', label: 'Abdomen, Rectum & Stool (তলপেট ও মল) 🩺' },
    { value: 'urinary', label: 'Urinary Organs (মূত্রযন্ত্র) 🧪' },
    { value: 'respiratory', label: 'Respiratory, Cough & Chest (শ্বাসযন্ত্র ও কাশি) 🫁' },
    { value: 'extremities', label: 'Joints & Extremities (হাত-পা ও বাতের ব্যথা) 🦵' },
    { value: 'skin', label: 'Skin & Eruptions (চর্মরোগ ও চুলকানি) 🩹' },
    { value: 'fever', label: 'Fever, Chills & Sweat (জ্বর, শীতভাব ও ঘাম) 🌡️' },
    { value: 'generalities', label: 'Generalities & Modalities (সাধারণ লক্ষণ ও উপশম/বৃদ্ধি) ⚡' },
    { value: 'other', label: 'Other Repertory Rubrics (অন্যান্য) 📋' },
];

export default function Edit({ symptom }) {
    const { data, setData, put, processing, errors } = useForm({
        name_en: symptom.name_en || '',
        code: symptom.code || '',
        name_bn: symptom.name_bn || '',
        category: symptom.category || 'mind',
        modalities: symptom.modalities || '',
        is_active: Boolean(symptom.is_active),
    });

    const mappedCount = symptom.medicines_count || 0;

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.symptoms.update', symptom.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit ${symptom.name_en}`} />
            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Edit Rubric: ${symptom.name_en}`}
                    description="Update homeopathic repertory rubric details and clinical modalities."
                />

                {/* Knowledge Graph Linked Remedies Banner */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">💊</span>
                        <div>
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                {mappedCount > 0 ? `${mappedCount} Remedies Mapped to this Rubric` : 'No Remedies Mapped Yet'}
                            </span>
                            <p className="text-[11px] text-gray-500">
                                {mappedCount > 0
                                    ? 'Remedies assigned with priority grades (1-4) in the clinical knowledge graph.'
                                    : 'Link homeopathic remedies to enable auto-repertorization suggestions.'}
                            </p>
                        </div>
                    </div>
                    <Link
                        href={
                            mappedCount > 0
                                ? route('admin.symptom_medicine_map.index', { symptom_id: symptom.id })
                                : route('admin.symptom_medicine_map.create', { symptom_id: symptom.id })
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300 rounded-lg transition shrink-0"
                    >
                        {mappedCount > 0 ? 'Manage Mappings ↗' : '+ Map Remedies'}
                    </Link>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-4">
                            {/* Row 1: English Name and Code */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Rubric / Symptom Name (English) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name_en}
                                        onChange={(e) => setData('name_en', e.target.value)}
                                        className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {errors.name_en && <p className="mt-1 text-xs text-red-600">{errors.name_en}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Rubric Code (সংক্ষিপ্ত কোড)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. MIND-01, DIG-02"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        className="w-full text-xs font-mono font-bold rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                                </div>
                            </div>

                            {/* Row 2: Bengali Local Name */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Bengali Local Name (বাংলা বিবরণ)
                                </label>
                                <input
                                    type="text"
                                    value={data.name_bn}
                                    onChange={(e) => setData('name_bn', e.target.value)}
                                    className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500 font-bengali"
                                />
                                {errors.name_bn && <p className="mt-1 text-xs text-red-600">{errors.name_bn}</p>}
                            </div>

                            {/* Row 3: Repertory Chapter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Repertory Chapter (রেপার্টরি অধ্যায়/বিভাগ) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.category}
                                    onChange={(e) => setData('category', e.target.value)}
                                    className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                >
                                    {REPERTORY_CHAPTERS.map((chap) => (
                                        <option key={chap.value} value={chap.value}>{chap.label}</option>
                                    ))}
                                </select>
                                {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
                            </div>

                            {/* Row 4: Clinical Modalities */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                    Clinical Modalities & Conditions (হ্রাস/বৃদ্ধি ও উপশম)
                                </label>
                                <textarea
                                    rows={2}
                                    value={data.modalities}
                                    onChange={(e) => setData('modalities', e.target.value)}
                                    className="w-full text-xs rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:border-teal-500 focus:ring-teal-500"
                                />
                                <p className="text-[11px] text-gray-400 mt-0.5">Use &lt; for Aggravation (বৃদ্ধি) and &gt; for Amelioration (উপশম).</p>
                                {errors.modalities && <p className="mt-1 text-xs text-red-600">{errors.modalities}</p>}
                            </div>

                            {/* Row 5: Active Checkbox */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
                                    />
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        Active in doctor consultation case-taking rubric selector
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Link
                                href={route('admin.symptoms.index')}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition shadow-xs disabled:opacity-50"
                            >
                                {processing ? 'Updating...' : 'Update Rubric'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
