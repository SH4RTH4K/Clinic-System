import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Create({
    symptoms = [],
    medicines = [],
    preselectedSymptomId = '',
    preselectedMedicineId = '',
}) {
    const { data, setData, post, processing, errors } = useForm({
        symptom_id: preselectedSymptomId ? String(preselectedSymptomId) : '',
        medicine_id: preselectedMedicineId ? String(preselectedMedicineId) : '',
        priority: 1,
        note: '',
        source_title: '',
        source_author: '',
        source_edition: '',
        source_page: '',
        source_url: '',
    });

    const [symptomSearch, setSymptomSearch] = useState('');
    const [medicineSearch, setMedicineSearch] = useState('');

    const classicalPresets = [
        {
            name: 'Kent Repertory',
            icon: '📖',
            title: 'Repertory of the Homeopathic Materia Medica',
            author: 'Dr. James Tyler Kent',
            edition: '6th American Edition',
        },
        {
            name: 'Boericke Materia Medica',
            icon: '📗',
            title: 'Pocket Manual of Homeopathic Materia Medica & Repertory',
            author: 'Dr. William Boericke',
            edition: '9th Edition',
        },
        {
            name: 'Boger Boenninghausen',
            icon: '📙',
            title: "Boenninghausen's Characteristics & Repertory",
            author: 'Dr. C. M. Boger',
            edition: 'Historical Edition',
        },
        {
            name: "Allen's Keynotes",
            icon: '📕',
            title: 'Keynotes & Characteristics with Comparisons',
            author: 'Dr. H. C. Allen',
            edition: 'Revised Edition',
        },
    ];

    const applyPreset = (preset) => {
        setData((prev) => ({
            ...prev,
            source_title: preset.title,
            source_author: preset.author,
            source_edition: preset.edition,
        }));
    };

    const filteredSymptoms = symptoms.filter((s) => {
        if (!symptomSearch) return true;
        const q = symptomSearch.toLowerCase();
        return (
            s.name_en?.toLowerCase().includes(q) ||
            s.name_bn?.toLowerCase().includes(q) ||
            s.code?.toLowerCase().includes(q) ||
            s.category?.toLowerCase().includes(q)
        );
    });

    const filteredMedicines = medicines.filter((m) => {
        if (!medicineSearch) return true;
        const q = medicineSearch.toLowerCase();
        return (
            m.name?.toLowerCase().includes(q) ||
            m.common_name?.toLowerCase().includes(q) ||
            m.potency?.toLowerCase().includes(q)
        );
    });

    const grades = [
        {
            value: 1,
            label: 'Grade 1 ⭐',
            desc: 'Ordinary (1 pt) — Low frequency or occasional symptom match in provings.',
            color: 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-900',
        },
        {
            value: 2,
            label: 'Grade 2 ⭐⭐',
            desc: 'Moderate (2 pts) — Well-proved symptom, clinically confirmed in clinical practice.',
            color: 'border-teal-200 bg-teal-50/50 hover:bg-teal-50 text-teal-900',
        },
        {
            value: 3,
            label: 'Grade 3 ⭐⭐⭐',
            desc: 'Strong / Bold (3 pts) — Highly verified, prominent characteristic symptom.',
            color: 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-900',
        },
        {
            value: 4,
            label: 'Grade 4 (Keynote) 🌟',
            desc: 'Keynote (4 pts) — Invariable keynote symptom; primary guiding indicator.',
            color: 'border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-900',
        },
    ];

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.symptom_medicine_map.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Add Repertory Mapping" />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Add Repertory Mapping"
                    subtitle="Create a clinical relationship between a symptom rubric and an indicated homeopathic remedy"
                    actions={
                        <Link
                            href={route('admin.symptom_medicine_map.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 shadow-xs transition"
                        >
                            ← Back to Knowledge Graph
                        </Link>
                    }
                />

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3 shadow-xs">
                    <span className="text-lg leading-none">ℹ️</span>
                    <div>
                        <strong>Governance Note:</strong> Newly created mappings are saved in <strong>Draft</strong> status. To ensure clinical safety and data integrity, mappings only enter the live CDSS recommendation engine once independently submitted and approved by an authorized clinical reviewer.
                    </div>
                </div>

                <form onSubmit={submit} className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-6">
                    {/* Section 1: Clinical Entities */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                            1. Select Rubric &amp; Remedy
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Symptom Selection */}
                            <div className="space-y-1.5">
                                <label htmlFor="mapping-symptom" className="block text-xs font-semibold text-gray-700">
                                    Symptom / Rubric <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        placeholder="Type to filter symptoms..."
                                        value={symptomSearch}
                                        onChange={(e) => setSymptomSearch(e.target.value)}
                                        className="w-full text-xs py-1.5 rounded-lg border-gray-300 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    <select
                                        id="mapping-symptom"
                                        value={data.symptom_id}
                                        onChange={(e) => setData('symptom_id', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                        required
                                        size={filteredSymptoms.length > 8 ? 6 : Math.max(3, filteredSymptoms.length)}
                                    >
                                        <option value="">-- Choose Symptom Rubric --</option>
                                        {filteredSymptoms.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code ? `[${s.code}] ` : ''}{s.name_en} {s.name_bn ? `(${s.name_bn})` : ''} - {s.category || 'General'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.symptom_id && (
                                    <p className="text-xs text-red-600 font-medium">{errors.symptom_id}</p>
                                )}
                            </div>

                            {/* Medicine Selection */}
                            <div className="space-y-1.5">
                                <label htmlFor="mapping-medicine" className="block text-xs font-semibold text-gray-700">
                                    Homeopathic Remedy <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-1">
                                    <input
                                        type="text"
                                        placeholder="Type to filter remedies..."
                                        value={medicineSearch}
                                        onChange={(e) => setMedicineSearch(e.target.value)}
                                        className="w-full text-xs py-1.5 rounded-lg border-gray-300 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    <select
                                        id="mapping-medicine"
                                        value={data.medicine_id}
                                        onChange={(e) => setData('medicine_id', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                        required
                                        size={filteredMedicines.length > 8 ? 6 : Math.max(3, filteredMedicines.length)}
                                    >
                                        <option value="">-- Choose Homeopathic Remedy --</option>
                                        {filteredMedicines.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} {m.common_name ? `(${m.common_name})` : ''} {m.potency ? `[${m.potency}]` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {errors.medicine_id && (
                                    <p className="text-xs text-red-600 font-medium">{errors.medicine_id}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Repertory Grade */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                            2. Repertory Priority / Grade <span className="text-red-500">*</span>
                        </h3>
                        <p className="text-xs text-gray-500">
                            Select the rubric indication grade based on classical homeopathic provings and clinical verifications.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {grades.map((g) => (
                                <label
                                    key={g.value}
                                    className={`relative flex items-start p-3.5 border rounded-xl cursor-pointer transition ${
                                        Number(data.priority) === g.value
                                            ? `${g.color} ring-2 ring-teal-500 border-teal-500 shadow-xs`
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="priority"
                                        value={g.value}
                                        checked={Number(data.priority) === g.value}
                                        onChange={(e) => setData('priority', Number(e.target.value))}
                                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-xs font-bold text-gray-900">{g.label}</span>
                                        <span className="block text-[11px] text-gray-500 mt-0.5">{g.desc}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                        {errors.priority && (
                            <p className="text-xs text-red-600 font-medium">{errors.priority}</p>
                        )}
                    </div>

                    {/* Section 3: Clinical Note */}
                    <div className="space-y-1.5">
                        <label htmlFor="mapping-note" className="block text-xs font-semibold text-gray-700">
                            Clinical Repertory Context / Modalities Note
                        </label>
                        <textarea
                            id="mapping-note"
                            rows={3}
                            maxLength={5000}
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                            placeholder="e.g. Modalities: < Cold water, > Warm wraps; constitutional Chilly type."
                            className="w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                        />
                        {errors.note && (
                            <p className="text-xs text-red-600 font-medium">{errors.note}</p>
                        )}
                    </div>

                    {/* Section 4: Literature Reference Source */}
                    <fieldset className="rounded-xl border border-gray-200 p-4 space-y-4">
                        <legend className="px-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                            3. Reference Literature Source
                        </legend>

                        {/* 1-Click Classical Presets Toolbar */}
                        <div>
                            <span className="block text-xs font-medium text-gray-600 mb-1.5">
                                ⚡ Fast-Track 1-Click Classical Presets:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {classicalPresets.map((preset) => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 transition flex items-center gap-1 shadow-2xs"
                                    >
                                        <span>{preset.icon}</span>
                                        <span>{preset.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="source_title" className="block text-xs font-medium text-gray-700">
                                    Source Book / Repertory Title
                                </label>
                                <input
                                    id="source_title"
                                    type="text"
                                    value={data.source_title}
                                    onChange={(e) => setData('source_title', e.target.value)}
                                    placeholder="e.g. Repertory of the Homeopathic Materia Medica"
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                                {errors.source_title && (
                                    <p className="text-xs text-red-600 mt-0.5">{errors.source_title}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="source_author" className="block text-xs font-medium text-gray-700">
                                    Author / Authority
                                </label>
                                <input
                                    id="source_author"
                                    type="text"
                                    value={data.source_author}
                                    onChange={(e) => setData('source_author', e.target.value)}
                                    placeholder="e.g. Dr. James Tyler Kent"
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                                {errors.source_author && (
                                    <p className="text-xs text-red-600 mt-0.5">{errors.source_author}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="source_edition" className="block text-xs font-medium text-gray-700">
                                    Edition / Volume
                                </label>
                                <input
                                    id="source_edition"
                                    type="text"
                                    value={data.source_edition}
                                    onChange={(e) => setData('source_edition', e.target.value)}
                                    placeholder="e.g. 6th American Edition"
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                                {errors.source_edition && (
                                    <p className="text-xs text-red-600 mt-0.5">{errors.source_edition}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="source_page" className="block text-xs font-medium text-gray-700">
                                    Page / Rubric Citation
                                </label>
                                <input
                                    id="source_page"
                                    type="text"
                                    value={data.source_page}
                                    onChange={(e) => setData('source_page', e.target.value)}
                                    placeholder="e.g. p. 42 / Mind: Fear"
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                                {errors.source_page && (
                                    <p className="text-xs text-red-600 mt-0.5">{errors.source_page}</p>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label htmlFor="source_url" className="block text-xs font-medium text-gray-700">
                                    Digital Reference URL (Optional)
                                </label>
                                <input
                                    id="source_url"
                                    type="url"
                                    value={data.source_url}
                                    onChange={(e) => setData('source_url', e.target.value)}
                                    placeholder="https://..."
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                />
                                {errors.source_url && (
                                    <p className="text-xs text-red-600 mt-0.5">{errors.source_url}</p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    {/* Form Submit */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <Link
                            href={route('admin.symptom_medicine_map.index')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs transition disabled:opacity-50"
                        >
                            {processing ? 'Saving Draft...' : 'Save Draft Mapping'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
