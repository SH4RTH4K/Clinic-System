import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Edit({ adviceItem, hasLinkedVisits = false }) {
    const { data, setData, put, processing, errors } = useForm({
        text_bn: adviceItem.text_bn || '',
        text_en: adviceItem.text_en || '',
        category: adviceItem.category || 'general',
        is_default: Boolean(adviceItem.is_default),
        is_active: Boolean(adviceItem.is_active ?? true),
        sort_order: adviceItem.sort_order ?? 0,
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.advice_items.update', adviceItem.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Edit Advice Template" />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Edit Advice Template (পরামর্শ সম্পাদনা)"
                    subtitle={`Template #${adviceItem.id} — ${adviceItem.text_bn}`}
                    actions={
                        <Link
                            href={route('admin.advice_items.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-xs transition"
                        >
                            ← Back to Advice Directory
                        </Link>
                    }
                />

                {hasLinkedVisits && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs sm:text-sm text-blue-900 flex items-start gap-3 shadow-xs">
                        <span className="text-lg leading-none">📋</span>
                        <div>
                            <strong>Clinical History Protection:</strong> This advice item is currently attached to <strong>{adviceItem.visits_count || 1}</strong> patient prescription(s). Modifications will take effect on future consultations, while historical prescriptions remain securely preserved.
                        </div>
                    </div>
                )}

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
                            {processing ? 'Saving Changes...' : 'Update Advice Template'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
