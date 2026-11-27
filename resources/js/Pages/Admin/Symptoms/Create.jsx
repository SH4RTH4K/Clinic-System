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

const RUBRIC_PRESETS = [
    {
        name_en: 'Anxiety with restless tossing and fear of death',
        name_bn: 'মৃত্যুভয় ও তীব্র মানসিক অস্থিরতা সহ ছটফটানি',
        category: 'mind',
        code: 'MIND-01',
        modalities: '< Midnight (12 AM - 2 AM), solitary; > Company, warm drinks',
    },
    {
        name_en: 'Throbbing congestive headache with hot red face',
        name_bn: 'রক্তাধিক্য দপদপানি মাথাব্যথা, লালচে উত্তপ্ত মুখমণ্ডল',
        category: 'head',
        code: 'HEAD-01',
        modalities: '< Touch, noise, light, jarring, lying flat; > Semi-erect posture',
    },
    {
        name_en: 'Intense thirst for small sips of cold water at frequent intervals',
        name_bn: 'ঘন ঘন সামান্য পরিমাণে পানি পানের তৃষ্ণা যা পেটে বেশিক্ষণ থাকে না',
        category: 'digestion',
        code: 'DIG-02',
        modalities: '< Cold drinks, midnight (12-2 AM); > Warm drinks, warm applications',
    },
    {
        name_en: 'Severe griping abdominal colic relieved by bending double',
        name_bn: 'তীব্র পেট কামড়ানো খিল ধরা ব্যথা যা সামনে কুঁজো হলে ও শক্ত চাপে উপশম',
        category: 'abdomen_stool',
        code: 'ABD-01',
        modalities: '< Anger, slight food intake; > Bending double, hard pressure, warmth',
    },
    {
        name_en: 'Early morning diarrhea driving patient out of bed at 5 AM',
        name_bn: 'ভোরবেলা (৫টায়) বিছানা ত্যাগে বাধ্যকারী ডায়রিয়া ও মলদ্বারে জ্বালা',
        category: 'abdomen_stool',
        code: 'ABD-02',
        modalities: '< 5 AM, standing, warmth of bed; > Dry warm weather',
    },
    {
        name_en: 'Joint pain worse on first motion, better continued gentle movement',
        name_bn: 'প্রথম নড়াচড়ায় তীব্র বাতের ব্যথা কিন্তু কিছুক্ষণ হাঁটাচলা করলে উপশম',
        category: 'extremities',
        code: 'EXT-01',
        modalities: '< Initial motion, cold damp weather, rest; > Continued motion, heat',
    },
    {
        name_en: 'Intense voluptuous itching worse warmth of bed and washing',
        name_bn: 'বিছানার গরমে ও পানিতে ধুলে তীব্র চুলকানি বৃদ্ধি',
        category: 'skin',
        code: 'SKIN-01',
        modalities: '< Warmth of bed, bathing/washing, evening; > Scratching until it bleeds',
    },
    {
        name_en: 'Burning pains throughout body relieved by warm applications and hot drinks',
        name_bn: 'শরীরের বিভিন্ন অঙ্গে তীব্র জ্বালাপোড়া যা গরম সেঁক বা গরম পানীয়ে উপশম',
        category: 'generalities',
        code: 'GEN-02',
        modalities: '< Cold applications, midnight; > Warmth, hot drinks, heat',
    },
];

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name_en: '',
        code: '',
        name_bn: '',
        category: 'mind',
        modalities: '',
        is_active: true,
    });

    const applyPreset = (preset) => {
        setData((prev) => ({
            ...prev,
            name_en: preset.name_en,
            code: preset.code,
            name_bn: preset.name_bn,
            category: preset.category,
            modalities: preset.modalities,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.symptoms.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Add Repertory Rubric" />
            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Add Homeopathic Symptom / Repertory Rubric"
                    description="Register a new characteristic symptom rubric for doctor consultation case-taking and auto-repertorization."
                />

                {/* 1-Click Repertory Rubric Presets */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                            ⚡ Common Kent Rubric Presets (জনপ্রিয় রুব্রিক্স):
                        </span>
                        <span className="text-[11px] text-teal-600 dark:text-teal-400">Click any preset to auto-fill</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {RUBRIC_PRESETS.map((preset) => (
                            <button
                                key={preset.code}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-800 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 text-gray-700 dark:text-gray-200 rounded-lg border border-teal-200 dark:border-teal-700 shadow-2xs transition"
                            >
                                + {preset.name_en.slice(0, 32)}...
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xs border border-gray-100 dark:border-gray-700 p-6">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-4">
                            {/* Row 1: English Name and Short Code */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        Rubric / Symptom Name (English) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Anxiety with restlessness, Throbbing headache"
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
                                    placeholder="e.g. মৃত্যুভয় ও তীব্র মানসিক অস্থিরতা সহ ছটফটানি"
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
                                    placeholder="e.g. < Midnight, cold drinks, motion; > Heat, warm drinks, rest"
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
                                {processing ? 'Saving...' : 'Save Rubric'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
