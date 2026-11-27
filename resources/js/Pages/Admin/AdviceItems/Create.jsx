import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        text_bn: '',
        text_en: '',
        category: 'general',
        is_default: false,
        is_active: true,
        sort_order: 0,
    });

    const fastTrackPresets = [
        {
            label: 'Shake Bottle 10 Times',
            icon: '🍾',
            category: 'homeopathic',
            text_bn: 'নিয়মিত ঔষধ খাবেন এবং খাবার আগে শিশি ১০ বার ঝাঁকিয়ে নিবেন।',
            text_en: 'Take medicine regularly and shake the bottle 10 times before each dose/meal.',
            is_default: true,
        },
        {
            label: 'Pure Water & Rest',
            icon: '💧',
            category: 'general',
            text_bn: 'বিশুদ্ধ পানি পান করবেন এবং নিয়মিত বিশ্রাম নিবেন।',
            text_en: 'Drink pure boiled water and ensure adequate regular rest.',
            is_default: true,
        },
        {
            label: 'Bring Rx on Follow-up',
            icon: '📋',
            category: 'general',
            text_bn: 'পরবর্তী সাক্ষাতের সময় ব্যবস্থাপত্র অবশ্যই সঙ্গে আনিবেন।',
            text_en: 'Please bring this prescription along with you on your next follow-up visit.',
            is_default: true,
        },
        {
            label: 'Homeopathic 30-Min Rule',
            icon: '🌿',
            category: 'homeopathic',
            text_bn: 'ঔষধ সেবনের ৩০ মিনিট পূর্বে ও পরে যেকোনো খাবার বা পানীয় পরিহার করুন।',
            text_en: 'Avoid food or drinks 30 minutes before and after taking medicine.',
            is_default: true,
        },
        {
            label: 'Tongue Administration',
            icon: '👅',
            category: 'homeopathic',
            text_bn: 'ঔষধ জিহ্বায় রেখে ধীরে ধীরে চুষে সেবন করবেন, হাত দিয়ে স্পর্শ করবেন না।',
            text_en: 'Dissolve globules on the tongue slowly; do not touch with bare hands.',
            is_default: true,
        },
        {
            label: 'Pure Water Hydration',
            icon: '💧',
            category: 'general',
            text_bn: 'প্রতিদিন পর্যাপ্ত পরিমাণে (অন্তত ২.৫ থেকে ৩ লিটার) বিশুদ্ধ পানি পান করুন।',
            text_en: 'Drink adequate pure water daily (at least 2.5 to 3 liters).',
            is_default: true,
        },
        {
            label: 'Sound Sleep & Rest',
            icon: '🛌',
            category: 'lifestyle',
            text_bn: 'পর্যাপ্ত বিশ্রাম গ্রহণ করুন এবং প্রতিদিন অন্তত ৭-৮ ঘণ্টা নিরবচ্ছিন্ন ঘুমান।',
            text_en: 'Ensure adequate physical rest and maintain 7-8 hours of sound sleep daily.',
            is_default: true,
        },
        {
            label: 'Avoid Oily & Fast Food',
            icon: '🥗',
            category: 'diet',
            text_bn: 'অতিরিক্ত তৈলাক্ত, ভাজাপোড়া, ফাস্টফুড ও বাসি খাবার সম্পূর্ণ পরিহার করুন।',
            text_en: 'Avoid excessively oily, fried, fast foods, and heavy meals.',
            is_default: true,
        },
        {
            label: 'Hand Hygiene',
            icon: '🧼',
            category: 'hygiene',
            text_bn: 'খাবার গ্রহণের পূর্বে ও শৌচাগার ব্যবহারের পর সাবান দিয়ে হাত ভালোভাবে পরিষ্কার করুন।',
            text_en: 'Wash hands thoroughly with soap before meals and after restroom use.',
            is_default: true,
        },
        {
            label: 'Emergency Alert',
            icon: '⚠️',
            category: 'warning',
            text_bn: 'তীব্র শ্বাসকষ্ট, বুকে ব্যথা বা তীব্র প্রতিক্রিয়া দেখা দিলে অবিলম্বে জরুরি বিভাগে যোগাযোগ করুন।',
            text_en: 'Seek immediate emergency care in case of acute breathing distress or chest pain.',
            is_default: true,
        },
    ];

    const applyPreset = (preset) => {
        setData((prev) => ({
            ...prev,
            text_bn: preset.text_bn,
            text_en: preset.text_en,
            category: preset.category,
            is_default: preset.is_default,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.advice_items.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Create Advice Template" />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="New Advice Template (নতুন পরামর্শ)"
                    subtitle="Create pre-configured clinical instructions, homeopathic rules, or diet guidelines attached to prescriptions"
                    actions={
                        <Link
                            href={route('admin.advice_items.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-xs transition"
                        >
                            ← Back to Advice Directory
                        </Link>
                    }
                />

                {/* 1-Click Fast-Track Presets */}
                <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                            ⚡ 1-Click Fast-Track Clinical Presets:
                        </span>
                        <span className="text-[11px] text-teal-700">Click any preset to auto-fill</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {fastTrackPresets.map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => applyPreset(p)}
                                className="px-3 py-1.5 rounded-lg border border-teal-300 bg-white text-xs font-medium text-teal-900 hover:bg-teal-100/70 transition shadow-2xs flex items-center gap-1"
                            >
                                <span>{p.icon}</span>
                                <span>{p.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
                    {/* Content Fields */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="text_bn" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Advice Instruction Text (বাংলা) <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="text_bn"
                                rows={3}
                                value={data.text_bn}
                                onChange={(e) => setData('text_bn', e.target.value)}
                                placeholder="উদাহরণ: ঔষধ সেবনের ৩০ মিনিট পূর্বে ও পরে যেকোনো খাবার বা পানীয় পরিহার করুন।"
                                className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 font-bengali leading-relaxed"
                                required
                            />
                            {errors.text_bn && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.text_bn}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="text_en" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                English Translation (Optional)
                            </label>
                            <textarea
                                id="text_en"
                                rows={2}
                                value={data.text_en}
                                onChange={(e) => setData('text_en', e.target.value)}
                                placeholder="e.g. Avoid food or drinks 30 minutes before and after taking medicine."
                                className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                            />
                            {errors.text_en && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.text_en}</p>
                            )}
                        </div>
                    </div>

                    {/* Metadata & Classification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <label htmlFor="category" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Clinical Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="category"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                                required
                            >
                                <option value="general">💡 General Health &amp; Adherence</option>
                                <option value="homeopathic">🌿 Homeopathic Administration Rule</option>
                                <option value="diet">🍽️ Diet &amp; Nutrition</option>
                                <option value="lifestyle">🏃 Lifestyle, Rest &amp; Exercise</option>
                                <option value="hygiene">🧼 Hygiene &amp; Cleanliness</option>
                                <option value="warning">⚠️ Warning, Precaution &amp; Safety</option>
                            </select>
                            {errors.category && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.category}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="sort_order" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Sort Order on Prescription
                            </label>
                            <input
                                id="sort_order"
                                type="number"
                                min="0"
                                max="9999"
                                value={data.sort_order}
                                onChange={(e) => setData('sort_order', Number(e.target.value))}
                                className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500 shadow-xs"
                            />
                            <p className="text-[11px] text-gray-400 mt-0.5">Lower numbers appear first on prescription.</p>
                            {errors.sort_order && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.sort_order}</p>
                            )}
                        </div>
                    </div>

                    {/* Default & Active Switches */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <label className="flex items-start p-3.5 border border-amber-200 bg-amber-50/40 rounded-xl cursor-pointer hover:bg-amber-50 transition">
                            <input
                                type="checkbox"
                                checked={data.is_default}
                                onChange={(e) => setData('is_default', e.target.checked)}
                                className="mt-0.5 rounded border-amber-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div className="ml-3">
                                <span className="block text-xs font-bold text-amber-950">
                                    ⭐ Auto-Selected for New Visits
                                </span>
                                <span className="block text-[11px] text-amber-800/80 mt-0.5">
                                    When checked, this advice will be automatically selected in Step 5 for every new patient consultation.
                                </span>
                            </div>
                        </label>

                        <label className="flex items-start p-3.5 border border-gray-200 bg-gray-50/50 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <div className="ml-3">
                                <span className="block text-xs font-bold text-gray-900">
                                    Template Active Status
                                </span>
                                <span className="block text-[11px] text-gray-500 mt-0.5">
                                    Uncheck to temporarily hide from the consultation workbench without deleting historical data.
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            href={route('admin.advice_items.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : 'Save Advice Template'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
