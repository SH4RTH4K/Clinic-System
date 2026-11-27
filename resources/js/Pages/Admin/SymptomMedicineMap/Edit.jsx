import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Edit({ mapping, symptoms = [], medicines = [], versions = [] }) {
    const can = usePermission();
    const canUpdate = can('symptom_medicine_map.update');
    const canReview = can('symptom_medicine_map.review');
    const sharedErrors = usePage().props.errors || {};
    const [reviewNote, setReviewNote] = useState('');
    const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
    const [reviewing, setReviewing] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        symptom_id: String(mapping.symptom_id),
        medicine_id: String(mapping.medicine_id),
        priority: mapping.priority,
        note: mapping.note || '',
        source_title: mapping.source_title || '',
        source_author: mapping.source_author || '',
        source_edition: mapping.source_edition || '',
        source_page: mapping.source_page || '',
        source_url: mapping.source_url || '',
    });

    const classicalPresets = [
        {
            name: 'Kent Repertory',
            title: 'Repertory of the Homeopathic Materia Medica',
            author: 'Dr. James Tyler Kent',
            edition: '6th American Edition',
        },
        {
            name: 'Boericke Materia Medica',
            title: 'Pocket Manual of Homeopathic Materia Medica & Repertory',
            author: 'Dr. William Boericke',
            edition: '9th Edition',
        },
        {
            name: 'Boger Boenninghausen',
            title: "Boenninghausen's Characteristics & Repertory",
            author: 'Dr. C. M. Boger',
            edition: 'Historical Edition',
        },
        {
            name: "Allen's Keynotes",
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

    const submit = (event) => {
        event.preventDefault();
        if (canUpdate) put(route('admin.symptom_medicine_map.update', mapping.id));
    };

    const submitForReview = () => {
        if (canUpdate && reviewAcknowledged) {
            setReviewing(true);
            router.post(
                route('admin.symptom_medicine_map.submit_review', mapping.id),
                { confirmed: true },
                {
                    onFinish: () => setReviewing(false),
                }
            );
        }
    };

    const review = (decision) => {
        if (!canReview) return;
        setReviewing(true);
        router.post(
            route('admin.symptom_medicine_map.review', mapping.id),
            {
                decision,
                review_note: reviewNote,
                ...(decision === 'approved' ? { review_acknowledged: reviewAcknowledged } : {}),
            },
            {
                onFinish: () => setReviewing(false),
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Edit Repertory Reference" />
            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title={canUpdate ? 'Edit Repertory Reference' : 'Review Repertory Reference'}
                    subtitle={`${mapping.symptom?.name_en || 'Symptom'} → ${mapping.medicine?.name || 'Medicine'}`}
                    actions={
                        <Link
                            href={route('admin.symptom_medicine_map.index')}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition"
                        >
                            ← Back to Knowledge Graph
                        </Link>
                    }
                />

                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950 flex items-start gap-3 shadow-xs">
                    <span className="text-lg leading-none">⚖️</span>
                    <div>
                        <strong>Clinical Reference Advisory:</strong> A repertory entry or match does not establish guaranteed effectiveness or patient suitability and is not a substitute for individualized constitutional diagnosis. Modifying clinical attributes moves the reference back to Draft until reviewed.
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Reference Details</h2>
                            <p className="text-xs text-gray-500">
                                Last updated: {new Date(mapping.updated_at).toLocaleString()}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                mapping.review_status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : mapping.review_status === 'rejected' || mapping.review_status === 'inactive'
                                    ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                        >
                            {String(mapping.review_status).replace('_', ' ')}
                        </span>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        {/* Clinical Entities */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="symptom_id" className="block text-xs font-semibold text-gray-700">
                                    Symptom / Rubric <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="symptom_id"
                                    disabled={!canUpdate}
                                    value={data.symptom_id}
                                    onChange={(e) => setData('symptom_id', e.target.value)}
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                    aria-required="true"
                                >
                                    {symptoms.map((symptom) => (
                                        <option key={symptom.id} value={symptom.id}>
                                            {symptom.name_en}
                                            {symptom.is_active ? '' : ' (inactive — current reference)'}
                                        </option>
                                    ))}
                                </select>
                                {errors.symptom_id && (
                                    <p className="mt-1 text-xs font-medium text-red-600">{errors.symptom_id}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="medicine_id" className="block text-xs font-semibold text-gray-700">
                                    Homeopathic Remedy <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="medicine_id"
                                    disabled={!canUpdate}
                                    value={data.medicine_id}
                                    onChange={(e) => setData('medicine_id', e.target.value)}
                                    className="mt-1 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                    aria-required="true"
                                >
                                    {medicines.map((medicine) => (
                                        <option key={medicine.id} value={medicine.id}>
                                            {medicine.name} ({medicine.potency})
                                            {medicine.is_active ? '' : ' (inactive — current reference)'}
                                        </option>
                                    ))}
                                </select>
                                {errors.medicine_id && (
                                    <p className="mt-1 text-xs font-medium text-red-600">{errors.medicine_id}</p>
                                )}
                            </div>
                        </div>

                        {/* Priority / Grade */}
                        <div className="space-y-3">
                            <label htmlFor="priority" className="block text-xs font-semibold text-gray-700">
                                Repertory Priority / Grade <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {grades.map((g) => (
                                    <label
                                        key={g.value}
                                        className={`relative flex items-start p-3 border rounded-xl cursor-pointer transition ${
                                            Number(data.priority) === g.value
                                                ? `${g.color} ring-2 ring-teal-500 border-teal-500 shadow-xs`
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        } ${!canUpdate ? 'opacity-70 pointer-events-none' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="priority"
                                            value={g.value}
                                            disabled={!canUpdate}
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
                            <input
                                id="priority"
                                type="hidden"
                                value={data.priority}
                            />
                            {errors.priority && (
                                <p className="text-xs font-medium text-red-600">{errors.priority}</p>
                            )}
                        </div>

                        {/* Clinical Note */}
                        <div>
                            <label htmlFor="note" className="block text-xs font-semibold text-gray-700">
                                Clinical Repertory Context / Notes
                            </label>
                            <textarea
                                id="note"
                                disabled={!canUpdate}
                                value={data.note}
                                onChange={(e) => setData('note', e.target.value)}
                                rows={3}
                                maxLength={5000}
                                className="mt-1 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="General repertory context; do not add patient-specific treatment rules."
                            />
                            {errors.note && (
                                <p className="mt-1 text-xs font-medium text-red-600">{errors.note}</p>
                            )}
                        </div>

                        {/* Literature Source */}
                        <fieldset disabled={!canUpdate} className="space-y-4 rounded-xl border border-gray-200 p-4 disabled:opacity-80">
                            <legend className="px-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                                Reference Source Metadata
                            </legend>

                            {/* 1-Click Classical Presets */}
                            {canUpdate && (
                                <div>
                                    <span className="block text-xs font-medium text-gray-500 mb-1.5">
                                        ⚡ Fast-Track 1-Click Classical Presets:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {classicalPresets.map((preset) => (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => applyPreset(preset)}
                                                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="source_title" className="block text-xs font-medium text-gray-700">Source title</label>
                                    <input
                                        id="source_title"
                                        type="text"
                                        value={data.source_title}
                                        onChange={(e) => setData('source_title', e.target.value)}
                                        maxLength={255}
                                        className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    {errors.source_title && <p className="mt-1 text-xs text-red-600">{errors.source_title}</p>}
                                </div>

                                <div>
                                    <label htmlFor="source_author" className="block text-xs font-medium text-gray-700">Author</label>
                                    <input
                                        id="source_author"
                                        type="text"
                                        value={data.source_author}
                                        onChange={(e) => setData('source_author', e.target.value)}
                                        maxLength={255}
                                        className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    {errors.source_author && <p className="mt-1 text-xs text-red-600">{errors.source_author}</p>}
                                </div>

                                <div>
                                    <label htmlFor="source_edition" className="block text-xs font-medium text-gray-700">Edition</label>
                                    <input
                                        id="source_edition"
                                        type="text"
                                        value={data.source_edition}
                                        onChange={(e) => setData('source_edition', e.target.value)}
                                        maxLength={255}
                                        className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    {errors.source_edition && <p className="mt-1 text-xs text-red-600">{errors.source_edition}</p>}
                                </div>

                                <div>
                                    <label htmlFor="source_page" className="block text-xs font-medium text-gray-700">Page / section</label>
                                    <input
                                        id="source_page"
                                        type="text"
                                        value={data.source_page}
                                        onChange={(e) => setData('source_page', e.target.value)}
                                        maxLength={100}
                                        className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    {errors.source_page && <p className="mt-1 text-xs text-red-600">{errors.source_page}</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label htmlFor="source_url" className="block text-xs font-medium text-gray-700">Source URL</label>
                                    <input
                                        id="source_url"
                                        type="url"
                                        value={data.source_url}
                                        onChange={(e) => setData('source_url', e.target.value)}
                                        maxLength={2048}
                                        className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    {errors.source_url && <p className="mt-1 text-xs text-red-600">{errors.source_url}</p>}
                                </div>
                            </div>
                        </fieldset>

                        {canUpdate && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-teal-600 hover:bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50"
                                >
                                    {processing ? 'Saving...' : 'Save as Draft'}
                                </button>
                            </div>
                        )}
                    </form>

                    {/* Reviewer Note Display */}
                    {(mapping.reviewer_name || mapping.review_note) && (
                        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600 space-y-1">
                            {mapping.reviewer_name && (
                                <p>
                                    Last reviewed by <strong>{mapping.reviewer_name}</strong>
                                    {mapping.reviewed_at ? ` on ${new Date(mapping.reviewed_at).toLocaleString()}` : ''}.
                                </p>
                            )}
                            {mapping.review_note && <p>Reviewer note: {mapping.review_note}</p>}
                        </div>
                    )}
                </div>

                {/* Submit for Review Box */}
                {canUpdate && ['draft', 'legacy_unreviewed', 'rejected', 'inactive'].includes(mapping.review_status) && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
                        <label htmlFor="submit-review-acknowledgement" className="flex items-start gap-3 text-sm text-blue-950 cursor-pointer">
                            <input
                                id="submit-review-acknowledgement"
                                type="checkbox"
                                checked={reviewAcknowledged}
                                onChange={(e) => setReviewAcknowledged(e.target.checked)}
                                className="mt-0.5 rounded border-blue-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>
                                I have checked the cited source and submit this general reference for independent clinical review. This does not create or authorize any patient prescription.
                            </span>
                        </label>
                        {sharedErrors.confirmed && (
                            <p className="text-xs font-medium text-red-700">{sharedErrors.confirmed}</p>
                        )}
                        <button
                            type="button"
                            disabled={!reviewAcknowledged || reviewing}
                            onClick={submitForReview}
                            className="rounded-lg bg-teal-600 hover:bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {reviewing ? 'Submitting...' : 'Submit for Clinical Review'}
                        </button>
                    </div>
                )}

                {/* Reviewer Action Box */}
                {canReview && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-xs">
                        <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                            Independent Clinical Review
                        </h2>
                        {mapping.review_status === 'pending_review' && (
                            <label htmlFor="review-acknowledgement" className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
                                <input
                                    id="review-acknowledgement"
                                    type="checkbox"
                                    checked={reviewAcknowledged}
                                    onChange={(e) => setReviewAcknowledged(e.target.checked)}
                                    className="mt-0.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span>
                                    I independently assessed this cited general repertory reference for inclusion in the tool. Approval does not establish effectiveness, patient suitability, or authorize treatment.
                                </span>
                            </label>
                        )}
                        {sharedErrors.review_acknowledged && (
                            <p className="text-xs font-medium text-red-700">{sharedErrors.review_acknowledged}</p>
                        )}
                        <div>
                            <label htmlFor="review-note" className="block text-xs font-medium text-gray-700">
                                Reviewer note / reason for decision:
                            </label>
                            <textarea
                                id="review-note"
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                maxLength={2000}
                                rows={3}
                                className="mt-1 w-full rounded-lg border-gray-300 text-sm focus:ring-teal-500 focus:border-teal-500"
                                placeholder="Add notes on source verification, rubrics, or clinical comments..."
                            />
                            {sharedErrors.review_note && (
                                <p className="text-xs font-medium text-red-700 mt-1">{sharedErrors.review_note}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {mapping.review_status === 'pending_review' && (
                                <>
                                    <button
                                        type="button"
                                        disabled={!reviewAcknowledged || !mapping.source_title || reviewing}
                                        onClick={() => review('approved')}
                                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {reviewing ? 'Saving review...' : 'Approve Reference'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!reviewNote.trim() || reviewing}
                                        onClick={() => review('rejected')}
                                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </>
                            )}
                            {mapping.review_status !== 'inactive' && (
                                <button
                                    type="button"
                                    disabled={!reviewNote.trim() || reviewing}
                                    onClick={() => review('inactive')}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Deactivate
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Version History */}
                {versions.length > 0 && (
                    <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 shadow-xs">
                        <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Version History</h2>
                        <div className="space-y-3">
                            {versions.map((version) => (
                                <article key={version.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-gray-900">
                                            Version {version.version_number}
                                        </p>
                                        <span className="text-gray-400">
                                            {new Date(version.archived_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-800">
                                        {version.snapshot.symptom_name} → {version.snapshot.medicine_name} · Priority {version.snapshot.priority}
                                    </p>
                                    <p className="text-gray-600">
                                        Review status: {String(version.snapshot.review_status || 'legacy_unreviewed').replace('_', ' ')}
                                        {version.snapshot.reviewer_name ? ` · Reviewed by ${version.snapshot.reviewer_name}` : ''}
                                    </p>
                                    <p className="text-gray-500">
                                        Source: {version.snapshot.source_title || 'Not recorded'}
                                        {version.snapshot.source_author ? ` · ${version.snapshot.source_author}` : ''}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
