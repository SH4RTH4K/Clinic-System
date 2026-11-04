import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const FIELD_DETAILS = [
    { key: 'name', name: 'Patient full name', section: 'Identity' },
    { key: 'guardian_relationship', name: 'Relationship to patient', section: 'Identity' },
    { key: 'guardian_name', name: 'Relationship contact name', section: 'Identity' },
    { key: 'gender', name: 'Gender', section: 'Identity' },
    { key: 'age_years', orderKey: 'age_years', name: 'Age: years', section: 'Identity' },
    { key: 'age_months', orderKey: 'age_years', name: 'Age: months', section: 'Identity' },
    { key: 'age_days', orderKey: 'age_years', name: 'Age: days', section: 'Identity' },
    { key: 'dob', name: 'Date of birth', section: 'Identity' },
    { key: 'phone', name: 'Mobile phone number', section: 'Contact' },
    { key: 'referred_by', name: 'Referred by', section: 'Contact' },
    { key: 'address', name: 'Residential address', section: 'Contact' },
    { key: 'blood_group', name: 'Blood group', section: 'Medical background' },
    { key: 'known_allergies', name: 'Known allergies / sensitivities', section: 'Medical background' },
];

export default function Edit({ fields, relationships }) {
    const can = usePermission();
    const canCreate = can('patient_config.create');
    const canUpdate = can('patient_config.update');
    const canOrder = can('patient_config.order');
    const canDelete = can('patient_config.delete');
    const canViewClinicSettings = can('clinic_settings.view');
    const { data, setData, put, processing, errors } = useForm({ fields, relationships });
    const [newRelationshipLabel, setNewRelationshipLabel] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [relationshipDeleteError, setRelationshipDeleteError] = useState('');
    const [deletingRelationship, setDeletingRelationship] = useState(false);
    const [editingRelationshipValue, setEditingRelationshipValue] = useState(null);
    const [editingRelationshipLabel, setEditingRelationshipLabel] = useState('');
    const [updatingRelationship, setUpdatingRelationship] = useState(false);
    const hasOrderChanges = FIELD_DETAILS
        .filter((field) => (field.orderKey || field.key) === field.key)
        .some((field) => data.fields[field.key].order !== fields[field.key].order);

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
        if (!canCreate && !canUpdate && (!canOrder || !hasOrderChanges)) {
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
                    subtitle="Set field labels, visibility, required status, and order within each section. Age fields move together."
                    action={canViewClinicSettings ? (
                        <Link href={route('admin.settings.edit')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Clinic Settings
                        </Link>
                    ) : (
                        <button type="button" disabled className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 cursor-not-allowed opacity-50">
                            Clinic Settings
                        </button>
                    )}
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

                        {['Identity', 'Contact', 'Medical background'].map((section) => (
                            <section key={section} className="space-y-3">
                                <h3 className="border-b border-gray-100 pb-2 text-xs font-bold uppercase tracking-wider text-gray-700">{section}</h3>
                                <div className="space-y-3">
                                    {FIELD_DETAILS
                                        .filter((field) => field.section === section)
                                        .sort((first, second) => data.fields[first.orderKey || first.key].order - data.fields[second.orderKey || second.key].order)
                                        .map((field) => {
                                        const config = data.fields[field.key];
                                        const isCoreField = ['name', 'gender'].includes(field.key);
                                        const orderKey = field.orderKey || field.key;
                                        const isOrderControl = field.key === orderKey;
                                        const movableFields = FIELD_DETAILS
                                            .filter((item) => item.section === section && (item.orderKey || item.key) === item.key)
                                            .sort((first, second) => data.fields[first.key].order - data.fields[second.key].order);
                                        const orderIndex = movableFields.findIndex((item) => item.key === orderKey);

                                        return (
                                            <div key={field.key} className="grid grid-cols-1 items-center gap-3 rounded-md border border-gray-100 p-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_120px]">
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
                                                                onClick={() => moveField(field.key, section, -1)}
                                                                disabled={!canOrder || orderIndex <= 0}
                                                                aria-label={`Move ${field.name} up`}
                                                                className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                ↑
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => moveField(field.key, section, 1)}
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
                            </section>
                        ))}
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        {canViewClinicSettings ? <Link href={route('admin.settings.edit')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </Link> : <button type="button" disabled className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 cursor-not-allowed opacity-50">Cancel</button>}
                            <button
                                type="submit"
                                disabled={(!canCreate && !canUpdate && (!canOrder || !hasOrderChanges)) || processing}
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
