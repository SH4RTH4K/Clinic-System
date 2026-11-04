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

    const submit = (event) => {
        event.preventDefault();
        if (canUpdate) put(route('admin.symptom_medicine_map.update', mapping.id));
    };

    const submitForReview = () => {
        if (canUpdate && reviewAcknowledged) {
            setReviewing(true);
            router.post(route('admin.symptom_medicine_map.submit_review', mapping.id), { confirmed: true }, {
                onFinish: () => setReviewing(false),
            });
        }
    };

    const review = (decision) => {
        if (!canReview) return;
        setReviewing(true);
        router.post(route('admin.symptom_medicine_map.review', mapping.id), {
            decision,
            review_note: reviewNote,
            ...(decision === 'approved' ? { review_acknowledged: reviewAcknowledged } : {}),
        }, {
            onFinish: () => setReviewing(false),
        });
    };

    const sourceFields = [
        ['source_title', 'Source title', 'text', 255],
        ['source_author', 'Author', 'text', 255],
        ['source_edition', 'Edition', 'text', 255],
        ['source_page', 'Page / section', 'text', 100],
        ['source_url', 'Source URL', 'url', 2048],
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Review Symptom-Medicine Reference" />
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title={canUpdate ? 'Edit repertory reference' : 'Review repertory reference'}
                    subtitle={`${mapping.symptom?.name_en || 'Symptom'} → ${mapping.medicine?.name || 'Medicine'}`}
                    action={<Link href={route('admin.symptom_medicine_map.index')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Back to mappings</Link>}
                />

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                    <strong>Reference information only.</strong> A repertory entry or match does not establish effectiveness or patient suitability and is not a substitute for established medical treatment. Assess each case independently. No patient-specific clinical rule is applied.
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
                        <h2 className="text-base font-semibold text-gray-900">Reference details</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${mapping.review_status === 'approved' ? 'bg-green-50 text-green-800' : mapping.review_status === 'rejected' || mapping.review_status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-amber-50 text-amber-800'}`}>{String(mapping.review_status).replace('_', ' ')}</span>
                    </div>
                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label htmlFor="symptom_id" className="block text-sm font-semibold text-gray-700">Symptom <span className="text-sm font-normal text-gray-600">(required)</span></label>
                            <select id="symptom_id" disabled={!canUpdate} value={data.symptom_id} onChange={(event) => setData('symptom_id', event.target.value)} className="mt-1 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50" required aria-required="true" aria-invalid={Boolean(errors.symptom_id)} aria-describedby={errors.symptom_id ? 'symptom_id-error' : undefined}>
                                {symptoms.map((symptom) => <option key={symptom.id} value={symptom.id}>{symptom.name_en}{symptom.is_active ? '' : ' (inactive — current reference)'}</option>)}
                            </select>
                            {errors.symptom_id && <p id="symptom_id-error" className="mt-1 text-sm font-medium text-red-700">{errors.symptom_id}</p>}
                        </div>
                        <div>
                            <label htmlFor="medicine_id" className="block text-sm font-semibold text-gray-700">Medicine <span className="text-sm font-normal text-gray-600">(required)</span></label>
                            <select id="medicine_id" disabled={!canUpdate} value={data.medicine_id} onChange={(event) => setData('medicine_id', event.target.value)} className="mt-1 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50" required aria-required="true" aria-invalid={Boolean(errors.medicine_id)} aria-describedby={errors.medicine_id ? 'medicine_id-error' : undefined}>
                                {medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} ({medicine.potency}){medicine.is_active ? '' : ' (inactive — current reference)'}</option>)}
                            </select>
                            {errors.medicine_id && <p id="medicine_id-error" className="mt-1 text-sm font-medium text-red-700">{errors.medicine_id}</p>}
                        </div>
                        <div>
                            <label htmlFor="priority" className="block text-sm font-semibold text-gray-700">Repertory priority <span className="text-sm font-normal text-gray-600">(required)</span></label>
                            <p className="mt-1 text-xs text-gray-500">This is an ordering value for reference results, not a measure of effectiveness or suitability.</p>
                            <input id="priority" type="number" min="1" max="9999" disabled={!canUpdate} value={data.priority} onChange={(event) => setData('priority', event.target.value)} className="mt-2 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50" required aria-required="true" aria-invalid={Boolean(errors.priority)} aria-describedby={errors.priority ? 'priority-error' : undefined} />
                            {errors.priority && <p id="priority-error" className="mt-1 text-sm font-medium text-red-700">{errors.priority}</p>}
                        </div>
                        <div>
                            <label htmlFor="note" className="block text-sm font-semibold text-gray-700">Reference note</label>
                            <textarea id="note" disabled={!canUpdate} value={data.note} onChange={(event) => setData('note', event.target.value)} rows={4} maxLength={5000} className="mt-1 w-full rounded-lg border-gray-300 text-sm disabled:bg-gray-50" placeholder="General repertory context; do not add patient-specific treatment rules." aria-invalid={Boolean(errors.note)} aria-describedby={errors.note ? 'note-error' : undefined} />
                            {errors.note && <p id="note-error" className="mt-1 text-sm font-medium text-red-700">{errors.note}</p>}
                        </div>
                        <fieldset disabled={!canUpdate} className="space-y-3 rounded-lg border border-gray-200 p-4 disabled:opacity-80">
                            <legend className="px-1 text-sm font-semibold text-gray-800">Reference-source metadata</legend>
                            <p className="text-xs text-gray-600">Record the source so a reviewer can assess the reference.</p>
                            {sourceFields.map(([field, label, type, maxLength]) => (
                                <div key={field}>
                                    <label htmlFor={field} className="block text-sm font-medium text-gray-700">{label}</label>
                                    <input id={field} type={type} value={data[field]} onChange={(event) => setData(field, event.target.value)} maxLength={maxLength} className="mt-1 w-full rounded-lg border-gray-300 text-sm" aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} />
                                    {errors[field] && <p id={`${field}-error`} className="mt-1 text-sm font-medium text-red-700">{errors[field]}</p>}
                                </div>
                            ))}
                        </fieldset>
                        {canUpdate && <div className="flex justify-end border-t border-gray-100 pt-4"><button type="submit" disabled={processing} className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{processing ? 'Saving...' : 'Save as draft'}</button>{processing && <span role="status" className="sr-only">Saving reference changes...</span>}</div>}
                    </form>

                    <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
                        {mapping.reviewer_name && <p>Last reviewed by <strong>{mapping.reviewer_name}</strong>{mapping.reviewed_at ? ` on ${new Date(mapping.reviewed_at).toLocaleString()}` : ''}.</p>}
                        {mapping.review_note && <p className="mt-1">Reviewer note: {mapping.review_note}</p>}
                    </div>
                </div>

                {canUpdate && ['draft', 'legacy_unreviewed', 'rejected', 'inactive'].includes(mapping.review_status) && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                        <label htmlFor="submit-review-acknowledgement" className="flex items-start gap-3 text-sm text-blue-950"><input id="submit-review-acknowledgement" type="checkbox" checked={reviewAcknowledged} onChange={(event) => setReviewAcknowledged(event.target.checked)} className="mt-0.5 rounded border-blue-300 text-primary-700" aria-invalid={Boolean(sharedErrors.confirmed)} aria-describedby={sharedErrors.confirmed ? 'submit-review-error' : undefined} /><span>I have checked the cited source and submit this general reference for independent clinical review. This does not create or authorize any patient prescription.</span></label>
                        {sharedErrors.confirmed && <p id="submit-review-error" className="mt-2 text-sm font-medium text-red-700">{sharedErrors.confirmed}</p>}
                        <button type="button" disabled={!reviewAcknowledged || reviewing} onClick={submitForReview} className="mt-3 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{reviewing ? 'Submitting...' : 'Submit for review'}</button>
                        {reviewing && <p role="status" className="mt-2 text-sm text-blue-900">Submitting reference for review...</p>}
                    </div>
                )}

                {canReview && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="font-semibold text-gray-900">Independent clinical review</h2>
                        {mapping.review_status === 'pending_review' && <label htmlFor="review-acknowledgement" className="mt-3 flex items-start gap-3 text-sm text-gray-700"><input id="review-acknowledgement" type="checkbox" checked={reviewAcknowledged} onChange={(event) => setReviewAcknowledged(event.target.checked)} className="mt-0.5 rounded border-gray-300 text-primary-700" aria-invalid={Boolean(sharedErrors.review_acknowledged)} aria-describedby={sharedErrors.review_acknowledged ? 'review-acknowledgement-error' : undefined} /><span>I independently assessed this cited general repertory reference for inclusion in the tool. Approval does not establish effectiveness, patient suitability, or authorize treatment.</span></label>}
                        {sharedErrors.review_acknowledged && <p id="review-acknowledgement-error" className="mt-2 text-sm font-medium text-red-700">{sharedErrors.review_acknowledged}</p>}
                        <label htmlFor="review-note" className="mt-3 block text-sm font-medium text-gray-700">Reviewer note / reason for rejection or deactivation<textarea id="review-note" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border-gray-300 text-sm" aria-invalid={Boolean(sharedErrors.review_note)} aria-describedby={sharedErrors.review_note ? 'review-note-error' : undefined} /></label>
                        {sharedErrors.review_note && <p id="review-note-error" className="mt-1 text-sm font-medium text-red-700">{sharedErrors.review_note}</p>}
                        <div className="mt-4 flex flex-wrap gap-2">
                            {mapping.review_status === 'pending_review' && <>
                                <button type="button" disabled={!reviewAcknowledged || !mapping.source_title || reviewing} onClick={() => review('approved')} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{reviewing ? 'Saving review...' : 'Approve reference'}</button>
                                <button type="button" disabled={!reviewNote.trim() || reviewing} onClick={() => review('rejected')} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50">Reject</button>
                            </>}
                            {mapping.review_status !== 'inactive' && <button type="button" disabled={!reviewNote.trim() || reviewing} onClick={() => review('inactive')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50">{reviewing ? 'Saving review...' : 'Deactivate'}</button>}
                        </div>
                        {reviewing && <p role="status" className="mt-3 text-sm text-gray-700">Saving clinical review...</p>}
                    </div>
                )}

                {versions.length > 0 && (
                    <section className="rounded-xl border border-gray-200 bg-white p-5">
                        <h2 className="font-semibold text-gray-900">Version history</h2>
                        <div className="mt-3 space-y-3">
                            {versions.map((version) => <article key={version.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                                <p className="font-semibold">Version {version.version_number} · archived {new Date(version.archived_at).toLocaleString()}</p>
                                <p className="mt-1">{version.snapshot.symptom_name} → {version.snapshot.medicine_name} · Priority {version.snapshot.priority}</p>
                                <p className="text-xs text-gray-600">Review status: {String(version.snapshot.review_status || 'legacy_unreviewed').replace('_', ' ')}{version.snapshot.reviewer_name ? ` · Reviewed by ${version.snapshot.reviewer_name}` : ''}{version.snapshot.reviewed_at ? ` · ${new Date(version.snapshot.reviewed_at).toLocaleString()}` : ''}</p>
                                <p className="text-xs text-gray-600">Source: {version.snapshot.source_title || 'Not recorded'}{version.snapshot.source_author ? ` · ${version.snapshot.source_author}` : ''}{version.snapshot.source_page ? ` · p. ${version.snapshot.source_page}` : ''}</p>
                            </article>)}
                        </div>
                    </section>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
