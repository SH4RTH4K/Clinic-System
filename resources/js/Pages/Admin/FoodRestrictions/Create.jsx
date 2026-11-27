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
            label: 'Raw Onion & Garlic',
            icon: '🧅',
            category: 'homeopathic_antidote',
            text_bn: 'কাঁচা পেঁয়াজ ও কাঁচা রসুন খাওয়া সম্পূর্ণ নিষেধ (হোমিও ঔষধের প্রতিষেধক)।',
            text_en: 'Avoid raw onion and raw garlic (antidotes homeopathic remedies).',
            is_default: true,
        },
        {
            label: 'Camphor & Menthol',
            icon: '🌿',
            category: 'homeopathic_antidote',
            text_bn: 'কর্পূর, মেন্থল, কড়া বাম, ইউক্যালিপটাস ও তীব্র সুগন্ধিযুক্ত বস্তু থেকে দূরে থাকুন।',
            text_en: 'Avoid camphor, menthol, strong pain balms, and intense perfumes.',
            is_default: true,
        },
        {
            label: 'Cold Water & Ice',
            icon: '❄️',
            category: 'sour_cold',
            text_bn: 'ফ্রিজের অতিরিক্ত ঠাণ্ডা পানি, বরফ ও আইসক্রিম খাওয়া সম্পূর্ণরূপে পরিহার করুন।',
            text_en: 'Avoid refrigerated cold water, ice, and ice cream.',
            is_default: true,
        },
        {
            label: 'Sour & Tamarind',
            icon: '🍋',
            category: 'sour_cold',
            text_bn: 'তেঁতুল, আচার, চালতা ও অতিরিক্ত টক জাতীয় খাবার পরিহার করুন।',
            text_en: 'Avoid tamarind, pickles, and excessively sour foods.',
            is_default: false,
        },
        {
            label: 'Deep Fried & Oily',
            icon: '🍟',
            category: 'spicy_oily',
            text_bn: 'অতিরিক্ত তৈলাক্ত, ভাজাপোড়া, পরোটা ও ফাস্টফুড খাওয়া নিষেধ।',
            text_en: 'Avoid deep-fried, oily snacks, parathas, and fast food.',
            is_default: true,
        },
        {
            label: 'Allergenic Seafood',
            icon: '🦐',
            category: 'allergic_histamine',
            text_bn: 'চিংড়ি মাছ, কাঁকড়া ও সামুদ্রিক মাছ খাওয়া পরিহার করুন।',
            text_en: 'Avoid prawns, shrimp, crab, and shellfish.',
            is_default: false,
        },
        {
            label: 'Table Salt Restriction',
            icon: '🧂',
            category: 'chronic_metabolic',
            text_bn: 'খাবারের সাথে আলাদা কাঁচা লবণ (Table Salt) গ্রহণ সম্পূর্ণরূপে বন্ধ রাখুন।',
            text_en: 'Strictly avoid raw/added table salt.',
            is_default: true,
        },
        {
            label: 'Refined Sugar & Sweets',
            icon: '🍬',
            category: 'chronic_metabolic',
            text_bn: 'চিনি, মিষ্টি, পায়েস ও মিষ্টিজাতীয় মিষ্টি খাদ্য সম্পূর্ণরূপে পরিহার করুন।',
            text_en: 'Avoid direct sugar, sweets, desserts, and confectionery.',
            is_default: false,
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
        post(route('admin.food_restrictions.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Create Dietary Restriction" />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="New Dietary Restriction (নতুন খাদ্য নিষেধ)"
                    subtitle="Create pre-configured dietary precautions, remedy antidotes, or lifestyle prohibitions attached to prescriptions"
                    actions={
                        <Link
                            href={route('admin.food_restrictions.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-xs transition"
                        >
                            ← Back to Restrictions Directory
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
                                Dietary Restriction Text (বাংলা) <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="text_bn"
                                rows={3}
                                value={data.text_bn}
                                onChange={(e) => setData('text_bn', e.target.value)}
                                placeholder="উদাঃ কাঁচা পেঁয়াজ ও কাঁচা রসুন খাওয়া সম্পূর্ণ নিষেধ (হোমিও ঔষধের প্রতিষেধক)..."
                                className="w-full mt-1.5 rounded-lg border-gray-300 font-bengali text-sm shadow-xs focus:border-teal-500 focus:ring-teal-500 leading-relaxed"
                                required
                            />
                            {errors.text_bn && <p className="text-xs text-red-600 mt-1">{errors.text_bn}</p>}
                        </div>

                        <div>
                            <label htmlFor="text_en" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                English Translation / Notes (Optional)
                            </label>
                            <textarea
                                id="text_en"
                                rows={2}
                                value={data.text_en}
                                onChange={(e) => setData('text_en', e.target.value)}
                                placeholder="e.g. Avoid raw onion and raw garlic (antidotes homeopathic remedies)..."
                                className="w-full mt-1.5 rounded-lg border-gray-300 text-sm shadow-xs focus:border-teal-500 focus:ring-teal-500"
                            />
                            {errors.text_en && <p className="text-xs text-red-600 mt-1">{errors.text_en}</p>}
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        {/* Category Dropdown */}
                        <div>
                            <label htmlFor="category" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Clinical Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="category"
                                value={data.category}
                                onChange={(e) => setData('category', e.target.value)}
                                className="w-full mt-1.5 rounded-lg border-gray-300 text-sm shadow-xs focus:border-teal-500 focus:ring-teal-500"
                            >
                                <option value="homeopathic_antidote">🌿 Homeopathic Antidote (হোমিও প্রতিষেধক)</option>
                                <option value="sour_cold">❄️ Sour &amp; Cold (টক ও ঠাণ্ডা খাবার)</option>
                                <option value="spicy_oily">🌶️ Spicy &amp; Oily (তৈলাক্ত ও ভাজাপোড়া)</option>
                                <option value="allergic_histamine">🦐 Allergenic &amp; Histamine (এলার্জিক খাদ্য)</option>
                                <option value="chronic_metabolic">🩺 Metabolic &amp; Chronic (লবণ, চিনি, ইউরিক এসিড)</option>
                                <option value="general">🚫 General (সাধারণ খাদ্য নিষেধ)</option>
                            </select>
                            {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
                        </div>

                        {/* Sort Order */}
                        <div>
                            <label htmlFor="sort_order" className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Display Sort Order
                            </label>
                            <input
                                id="sort_order"
                                type="number"
                                min={0}
                                max={9999}
                                value={data.sort_order}
                                onChange={(e) => setData('sort_order', parseInt(e.target.value, 10) || 0)}
                                className="w-full mt-1.5 rounded-lg border-gray-300 text-sm shadow-xs focus:border-teal-500 focus:ring-teal-500"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Lower numbers appear first in the consultation picker</p>
                        </div>
                    </div>

                    {/* Presets & Active Toggles */}
                    <div className="pt-4 border-t border-gray-100 space-y-4">
                        {/* Default for new visits Card */}
                        <div className="flex items-start gap-3 p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                            <input
                                id="is_default"
                                type="checkbox"
                                checked={data.is_default}
                                onChange={(e) => setData('is_default', e.target.checked)}
                                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                            />
                            <div>
                                <label htmlFor="is_default" className="text-xs font-bold text-amber-900 cursor-pointer">
                                    ⭐ Auto-Select as Default for New Prescriptions
                                </label>
                                <p className="text-[11px] text-amber-800/80 mt-0.5">
                                    When checked, this food restriction will automatically be pre-selected in Step 5 of every newly created patient consultation.
                                </p>
                            </div>
                        </div>

                        {/* Active Status */}
                        <div className="flex items-center gap-3">
                            <input
                                id="is_active"
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                            />
                            <label htmlFor="is_active" className="text-xs font-bold text-gray-700 cursor-pointer">
                                Active (Show in doctor consultation workbench)
                            </label>
                        </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            href={route('admin.food_restrictions.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-50 inline-flex items-center gap-2"
                        >
                            {processing ? 'Saving...' : 'Save Food Restriction'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
