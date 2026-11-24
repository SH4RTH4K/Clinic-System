import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const FIELD_DETAILS = [
    { key: 'name', name: 'Patient full name', section: 'Identity' },
    { key: 'old_or_other_id', name: 'Old/Other ID', section: 'Identity' },
    { key: 'reference_number', name: 'Reference number', section: 'Identity' },
    { key: 'guardian_relationship', name: 'Relationship to patient', section: 'Identity' },
    { key: 'guardian_name', name: 'Relationship contact name', section: 'Identity' },
    { key: 'gender', name: 'Gender', section: 'Identity' },
    { key: 'age_years', orderKey: 'age_years', name: 'Age: years', section: 'Identity' },
    { key: 'age_months', orderKey: 'age_years', name: 'Age: months', section: 'Identity' },
    { key: 'age_days', orderKey: 'age_years', name: 'Age: days', section: 'Identity' },
    { key: 'dob', name: 'Date of birth', section: 'Identity' },
    { key: 'blood_group', name: 'Blood group', section: 'Medical background' },
    { key: 'known_allergies', name: 'Known allergies / sensitivities', section: 'Medical background' },
    { key: 'medical_history', name: 'Medical history / অতীত চিকিৎসা ইতিহাস', section: 'Medical background' },
    { key: 'phone', name: 'Mobile phone number', section: 'Contact' },
    { key: 'referred_by', name: 'Referred by', section: 'Contact' },
    { key: 'address', name: 'Residential address', section: 'Contact' },
    { key: 'manual_last_visit_date', name: 'Last visit date (Migration) / শেষ সাক্ষাতের তারিখ', section: 'Legacy migration' },
    { key: 'legacy_visits_count', name: 'Past visits count (Migration) / পূর্ববর্তী সাক্ষাত সংখ্যা', section: 'Legacy migration' },
];

const DEFAULT_SECTIONS = [
    { key: 'identity', name: 'Identity', label: 'Identity & Demographics', visible: true, is_core: true, order: 1 },
    { key: 'medical_background', name: 'Medical background', label: 'Medical Background (চিকিৎসা ইতিহাস)', visible: true, is_core: false, order: 2 },
    { key: 'contact', name: 'Contact', label: 'Contact & Residential Location', visible: true, is_core: false, order: 3 },
    { key: 'legacy_migration', name: 'Legacy migration', label: 'Legacy Migration (পূর্ববর্তী তথ্য স্থানান্তর)', visible: true, is_core: false, order: 4 },
];

export default function Edit({ fields, relationships, sections: initialSections }) {
    const can = usePermission();
    const { auth = {} } = usePage().props;
    const canCreate = can('patient_config.create');
    const canUpdate = can('patient_config.update');
    const canOrder = can('patient_config.order');
    const canDelete = can('patient_config.delete');
    const canViewClinicSettings = (auth.roles ?? []).includes('Super Admin') && can('clinic_settings.view');
    const resolvedSections = (initialSections && initialSections.length > 0) ? initialSections : DEFAULT_SECTIONS;
    const { data, setData, put, processing, errors } = useForm({
        fields,
        relationships,
        sections: resolvedSections,
    });
    const [newRelationshipLabel, setNewRelationshipLabel] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [relationshipDeleteError, setRelationshipDeleteError] = useState('');
    const [deletingRelationship, setDeletingRelationship] = useState(false);
    const [editingRelationshipValue, setEditingRelationshipValue] = useState(null);
    const [editingRelationshipLabel, setEditingRelationshipLabel] = useState('');
    const [updatingRelationship, setUpdatingRelationship] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({});

    const hasFieldOrderChanges = FIELD_DETAILS
        .filter((field) => (field.orderKey || field.key) === field.key)
        .some((field) => data.fields[field.key].order !== fields[field.key].order);
    const hasSectionOrderChanges = data.sections.some(
        (sec, idx) => sec.order !== resolvedSections[idx]?.order || sec.key !== resolvedSections[idx]?.key
    );
    const hasSectionConfigChanges = data.sections.some(
        (sec, idx) => sec.visible !== resolvedSections[idx]?.visible || sec.label !== resolvedSections[idx]?.label
    );
    const hasOrderChanges = hasFieldOrderChanges || hasSectionOrderChanges;

    const toggleCollapse = (sectionKey) => {
        setCollapsedSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    };

    const updateSection = (sectionKey, property, value) => {
        if (!canUpdate) {
            return;
        }

        setData('sections', data.sections.map((sec) => (
            sec.key === sectionKey ? { ...sec, [property]: value } : sec
        )));
    };

    const moveSection = (sectionKey, direction) => {
        if (!canOrder) {
            return;
        }

        const sortedSections = [...data.sections].sort((a, b) => a.order - b.order);
        const currentIndex = sortedSections.findIndex((s) => s.key === sectionKey);
        const targetIndex = currentIndex + direction;

        if (targetIndex < 0 || targetIndex >= sortedSections.length) {
            return;
        }

        const currentSec = sortedSections[currentIndex];
        const targetSec = sortedSections[targetIndex];

        const updatedSections = data.sections.map((sec) => {
            if (sec.key === currentSec.key) {
                return { ...sec, order: targetSec.order };
            }
            if (sec.key === targetSec.key) {
                return { ...sec, order: currentSec.order };
            }
            return sec;
        });

        setData('sections', updatedSections.sort((a, b) => a.order - b.order).map((s, idx) => ({ ...s, order: idx + 1 })));
    };

    const updateField = (fieldKey, property, value) => {
        if (!canUpdate) {
            return;
        }

        setData('fields', {
            ...data.fields,
            [fieldKey]: { ...data.fields[fieldKey], [property]: value },
        });
    };

    const moveField = (fieldKey, section, direction) => {
        if (!canOrder) {
            return;
        }

        const field = FIELD_DETAILS.find((item) => item.key === fieldKey);
        const orderKey = field.orderKey || field.key;
        const movableFields = FIELD_DETAILS
            .filter((item) => item.section === section && (item.orderKey || item.key) === item.key)
            .sort((first, second) => data.fields[first.key].order - data.fields[second.key].order);
        const currentIndex = movableFields.findIndex((item) => item.key === orderKey);
        const targetIndex = currentIndex + direction;

        if (targetIndex < 0 || targetIndex >= movableFields.length) {
            return;
        }

        const currentField = movableFields[currentIndex];
        const targetField = movableFields[targetIndex];
        const currentOrder = data.fields[currentField.key].order;
        const targetOrder = data.fields[targetField.key].order;
        const updatedFields = { ...data.fields };

        FIELD_DETAILS.filter((item) => item.section === section && (item.orderKey || item.key) === currentField.key)
            .forEach((item) => {
                updatedFields[item.key] = { ...updatedFields[item.key], order: targetOrder };
            });
        FIELD_DETAILS.filter((item) => item.section === section && (item.orderKey || item.key) === targetField.key)
            .forEach((item) => {
                updatedFields[item.key] = { ...updatedFields[item.key], order: currentOrder };
            });

        setData('fields', updatedFields);
    };

    const addRelationship = () => {
        if (!canCreate) {
            return;
        }

        const label = newRelationshipLabel.trim();
        if (!label) {
            return;
        }

        const baseValue = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'relationship'}`.slice(0, 50);
        let value = baseValue;
        let suffix = 2;

        while (data.relationships.some((relationship) => relationship.value === value)) {
            const suffixText = `_${suffix}`;
            value = `${baseValue.slice(0, 50 - suffixText.length)}${suffixText}`;
            suffix += 1;
        }

        setData('relationships', [...data.relationships, { value, label }]);
        setNewRelationshipLabel('');
    };

    const saveRelationshipEdit = (relationship) => {
        if (!canUpdate) {
            return;
        }

        const label = editingRelationshipLabel.trim();
        if (!label) {
            return;
        }

        const updatedRelationships = data.relationships.map((item) => (
            item.value === relationship.value ? { ...item, label } : item
        ));

        setUpdatingRelationship(true);
        router.put(route('admin.patient_config.update'), {
            fields: data.fields,
            relationships: updatedRelationships,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setData('relationships', updatedRelationships);
                setEditingRelationshipValue(null);
                setEditingRelationshipLabel('');
            },
            onFinish: () => setUpdatingRelationship(false),
        });
    };

    const deleteRelationship = () => {
        if (!canDelete || !deleteTarget) {
            return;
        }

        const target = deleteTarget;
        setRelationshipDeleteError('');

        if (!relationships.some((relationship) => relationship.value === target.value)) {
            setData('relationships', data.relationships.filter((relationship) => relationship.value !== target.value));
            setDeleteTarget(null);
            return;
        }

        setDeletingRelationship(true);

        router.delete(route('admin.patient_config.relationships.destroy', target.value), {
            preserveScroll: true,
            onSuccess: () => {
                setData('relationships', data.relationships.filter((relationship) => relationship.value !== target.value));
                setDeleteTarget(null);
            },
            onError: (validationErrors) => {
                setRelationshipDeleteError(validationErrors.relationshipDelete || validationErrors.relationship || 'Unable to delete this relationship.');
            },
            onFinish: () => setDeletingRelationship(false),
        });
    };

    const submit = (event) => {
        event.preventDefault();
        if (!canCreate && !canUpdate && (!canOrder || !hasOrderChanges) && !hasSectionConfigChanges) {
            return;
        }

        put(route('admin.patient_config.update'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Patient Configurable</h2>}>
            <Head title="Patient Configurable" />
            <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
                <PageHeader
                    title="Patient Configurable"
                    subtitle="Manage patient form sections, section order, visibility, custom labels, and field order within each section. Configure maximum lengths for identifiers."
                    actions={canViewClinicSettings ? (
                        <Link href={route('admin.settings.edit')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Clinic Settings
                        </Link>
                    ) : null}
                />

                <form onSubmit={submit} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="space-y-5 p-6">
                        <p className="text-sm text-gray-600">
                            Patient full name and gender stay visible and required. Other fields can be hidden or marked required. The relationship is optional; the contact name is recorded separately.
                        </p>
                        {!canCreate && !canUpdate && !canOrder && !canDelete && (
                            <p role="status" className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                                You have view-only access to this configuration.
                            </p>
                        )}

                        <section className="space-y-3">
                            <div>
                                <h3 className="border-b border-gray-100 pb-2 text-xs font-bold uppercase tracking-wider text-gray-700">Relationship options</h3>
                                <p className="mt-2 text-sm text-gray-600">Add, edit, and delete relationship options according to your assigned permissions. Options linked to patient records cannot be deleted; update those records first.</p>
                            </div>
                            <div className="space-y-2">
                                {data.relationships.map((relationship) => (
                                    <div key={relationship.value} className="grid grid-cols-1 items-center gap-3 rounded-md border border-gray-100 p-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                                        {editingRelationshipValue === relationship.value ? (
                                            <input
                                                type="text"
                                                value={editingRelationshipLabel}
                                                onChange={(event) => setEditingRelationshipLabel(event.target.value)}
                                                maxLength={80}
                                                aria-label={`Edit ${relationship.label} relationship`}
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-gray-800">{relationship.label}</span>
                                        )}
                                        <div className="flex gap-2 sm:justify-self-end">
                                            {editingRelationshipValue === relationship.value ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveRelationshipEdit(relationship)}
                                                        disabled={!canUpdate || !editingRelationshipLabel.trim() || updatingRelationship || processing}
                                                        className="rounded-md border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingRelationshipValue(null);
                                                            setEditingRelationshipLabel('');
                                                        }}
                                                        disabled={updatingRelationship}
                                                        className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!canUpdate) return;
                                                            setEditingRelationshipValue(relationship.value);
                                                            setEditingRelationshipLabel(relationship.label);
                                                        }}
                                                        disabled={!canUpdate || updatingRelationship || deletingRelationship || processing}
                                                        className="rounded-md border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!canDelete) return;
                                                            setRelationshipDeleteError('');
                                                            setDeleteTarget(relationship);
                                                        }}
                                                        disabled={!canDelete || deletingRelationship || updatingRelationship || processing}
                                                        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.relationships && <p className="text-sm text-red-600">{errors.relationships}</p>}
                            {relationshipDeleteError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{relationshipDeleteError}</p>}
                            <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="text"
                                        value={newRelationshipLabel}
                                        onChange={(event) => setNewRelationshipLabel(event.target.value)}
                                        disabled={!canCreate}
                                        maxLength={80}
                                        placeholder="Add a relationship, e.g. Step-parent"
                                        aria-label="New relationship label"
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addRelationship}
                                        disabled={!canCreate || !newRelationshipLabel.trim()}
                                        className="shrink-0 rounded-md border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Add relationship
                                    </button>
                            </div>
                        </section>

                        {[...data.sections].sort((a, b) => a.order - b.order).map((section, sectionIndex) => {
                            const isCollapsed = !!collapsedSections[section.key];
                            const isCore = section.is_core || section.key === 'identity';
                            const movableSections = [...data.sections].sort((a, b) => a.order - b.order);
                            const sectionFields = FIELD_DETAILS
                                .filter((field) => field.section === section.name)
                                .sort((first, second) => data.fields[first.orderKey || first.key].order - data.fields[second.orderKey || second.key].order);

                            return (
                                <section
                                    key={section.key}
                                    className={`rounded-lg border transition-all ${section.visible ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50/70'} p-4 shadow-sm`}
                                >
                                    <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => toggleCollapse(section.key)}
                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                                title={isCollapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
                                                aria-label={`Toggle ${section.name} section`}
                                            >
                                                <svg className={`h-4 w-4 transform transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                                                        {sectionIndex + 1}
                                                    </span>
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                                        {section.name}
                                                    </h3>
                                                    {isCore ? (
                                                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                                                            Core Section
                                                        </span>
                                                    ) : (
                                                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${section.visible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                                                            {section.visible ? 'Active Section' : 'Section Inactive'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <label htmlFor={`section-label-${section.key}`} className="sr-only">{section.name} display label</label>
                                                    <input
                                                        id={`section-label-${section.key}`}
                                                        type="text"
                                                        value={section.label}
                                                        onChange={(e) => updateSection(section.key, 'label', e.target.value)}
                                                        disabled={!canUpdate}
                                                        maxLength={120}
                                                        placeholder="Custom section title (English / বাংলা)"
                                                        className="w-full max-w-md rounded-md border-gray-300 py-1 text-xs text-gray-700 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <label className={`flex items-center gap-1.5 text-xs font-medium ${isCore ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={section.visible}
                                                    disabled={isCore || !canUpdate}
                                                    onChange={(e) => updateSection(section.key, 'visible', e.target.checked)}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                                                />
                                                <span>{isCore ? 'Always active' : (section.visible ? 'Show section' : 'Hide section')}</span>
                                            </label>

                                            <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
                                                <button
                                                    type="button"
                                                    onClick={() => moveSection(section.key, -1)}
                                                    disabled={!canOrder || sectionIndex === 0}
                                                    aria-label={`Move ${section.name} section up`}
                                                    title={`Move ${section.name} section up`}
                                                    className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    ↑ Up
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveSection(section.key, 1)}
                                                    disabled={!canOrder || sectionIndex >= movableSections.length - 1}
                                                    aria-label={`Move ${section.name} section down`}
                                                    title={`Move ${section.name} section down`}
                                                    className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    ↓ Down
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {section.key === 'legacy_migration' && (
                                        <p className="mt-2 text-xs text-amber-800 bg-amber-50 rounded p-2.5 border border-amber-200">
                                            Enable these fields during initial clinic onboarding to record historical visit counts and last visit dates for migrated patients. Turn off once migration is complete to prevent manual overrides.
                                        </p>
                                    )}

                                    {isCollapsed ? (
                                        <div className="mt-3 text-xs text-gray-500 italic">
                                            Section collapsed ({sectionFields.length} fields). Click chevron to expand and manage individual fields.
                                        </div>
                                    ) : (
                                        <div className="mt-3 space-y-3">
                                            {sectionFields.map((field) => {
                                                const config = data.fields[field.key];
                                                const isCoreField = ['name', 'gender'].includes(field.key);
                                                const orderKey = field.orderKey || field.key;
                                                const isOrderControl = field.key === orderKey;
                                                const movableFields = FIELD_DETAILS
                                                    .filter((item) => item.section === section.name && (item.orderKey || item.key) === item.key)
                                                    .sort((first, second) => data.fields[first.key].order - data.fields[second.key].order);
                                                const orderIndex = movableFields.findIndex((item) => item.key === orderKey);

                                                return (
                                                    <div key={field.key} className={`grid grid-cols-1 items-center gap-3 rounded-md border border-gray-100 p-3 ${['reference_number', 'old_or_other_id'].includes(field.key) ? 'sm:grid-cols-[minmax(0,1fr)_120px_120px_140px_120px]' : 'sm:grid-cols-[minmax(0,1fr)_120px_140px_120px]'}`}>
                                                        <div>
                                                            <label htmlFor={`field-label-${field.key}`} className="mb-1 block text-xs font-medium text-gray-600">{field.name} label</label>
                                                            <input
                                                                id={`field-label-${field.key}`}
                                                                type="text"
                                                                value={config.label}
                                                                onChange={(event) => updateField(field.key, 'label', event.target.value)}
                                                                disabled={!canUpdate}
                                                                maxLength={80}
                                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                            />
                                                        </div>
                                                        {['reference_number', 'old_or_other_id'].includes(field.key) && (
                                                            <div>
                                                                <label htmlFor={`field-max-length-${field.key}`} className="mb-1 block text-xs font-medium text-gray-600">Maximum length</label>
                                                                <input
                                                                    id={`field-max-length-${field.key}`}
                                                                    type="number"
                                                                    min="1"
                                                                    max="255"
                                                                    value={config.max_length ?? (field.key === 'old_or_other_id' ? 50 : 100)}
                                                                    onChange={(event) => updateField(field.key, 'max_length', Number(event.target.value))}
                                                                    disabled={!canUpdate}
                                                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                                />
                                                            </div>
                                                        )}
                                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={config.visible}
                                                                disabled={isCoreField || !canUpdate}
                                                                onChange={(event) => updateField(field.key, 'visible', event.target.checked)}
                                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                            />
                                                            Show field
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={config.required}
                                                                disabled={isCoreField || !canUpdate}
                                                                onChange={(event) => updateField(field.key, 'required', event.target.checked)}
                                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                            />
                                                            Required
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            {isOrderControl ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveField(field.key, section.name, -1)}
                                                                        disabled={!canOrder || orderIndex <= 0}
                                                                        aria-label={`Move ${field.name} up`}
                                                                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    >
                                                                        ↑
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveField(field.key, section.name, 1)}
                                                                        disabled={!canOrder || orderIndex < 0 || orderIndex >= movableFields.length - 1}
                                                                        aria-label={`Move ${field.name} down`}
                                                                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                                    >
                                                                        ↓
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">Moves with years</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <Link href={canViewClinicSettings ? route('admin.settings.edit') : route('dashboard')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </Link>
                            <button
                                type="submit"
                                disabled={(!canCreate && !canUpdate && (!canOrder || !hasOrderChanges) && !hasSectionConfigChanges) || processing}
                                className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Save Patient Configuration'}
                            </button>
                    </div>
                </form>

                <ConfirmDialog
                    isOpen={!!deleteTarget}
                    title="Delete relationship"
                    message={`Delete “${deleteTarget?.label ?? ''}”? The system will check patient records first. Relationships in use cannot be deleted.`}
                    confirmLabel="Delete relationship"
                    isDestructive
                    isLoading={deletingRelationship}
                    onConfirm={deleteRelationship}
                    onCancel={() => setDeleteTarget(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
