import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

const SECTION_TABS = [
    { id: 'all', label: 'All Sections', icon: '⚙️' },
    { id: 'identity', label: 'Identity & Demographics', icon: '👤' },
    { id: 'medical_background', label: 'Medical Background', icon: '🩺' },
    { id: 'contact', label: 'Contact & Location', icon: '📞' },
    { id: 'legacy_migration', label: 'Legacy Migration', icon: '📜' },
    { id: 'relationships', label: 'Relationship Options', icon: '👨‍👩‍👦' },
];

const QUICK_RELATIONSHIPS = [
    'Step-Father',
    'Step-Mother',
    'Foster Parent',
    'Hostel Warden',
    'Colleague',
    'Roommate',
];

export default function Edit({ fields, relationships, sections: initialSections, kpis = {} }) {
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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');

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

    const addRelationshipWithLabel = (customLabel) => {
        if (!canCreate) {
            return;
        }

        const label = (customLabel || newRelationshipLabel).trim();
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

    const addRelationship = () => addRelationshipWithLabel(newRelationshipLabel);

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
            sections: data.sections,
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

    // 1-Click Form Presets
    const applyStandardOpdPreset = () => {
        const nextFields = { ...data.fields };
        // Ensure core and medical are visible
        ['name', 'gender', 'dob', 'phone', 'address', 'blood_group', 'known_allergies', 'medical_history'].forEach((k) => {
            if (nextFields[k]) nextFields[k].visible = true;
        });
        // Hide migration
        if (nextFields['manual_last_visit_date']) nextFields['manual_last_visit_date'].visible = false;
        if (nextFields['legacy_visits_count']) nextFields['legacy_visits_count'].visible = false;

        const nextSections = data.sections.map((s) => ({
            ...s,
            visible: s.key !== 'legacy_migration',
        }));

        setData((prev) => ({
            ...prev,
            fields: nextFields,
            sections: nextSections,
        }));
    };

    const applyFastTrackMinimalPreset = () => {
        const nextFields = { ...data.fields };
        // Hide non-essentials
        ['old_or_other_id', 'reference_number', 'referred_by', 'known_allergies', 'medical_history', 'manual_last_visit_date', 'legacy_visits_count'].forEach((k) => {
            if (nextFields[k]) nextFields[k].visible = false;
        });
        // Core essentials visible
        ['name', 'gender', 'age_years', 'phone'].forEach((k) => {
            if (nextFields[k]) nextFields[k].visible = true;
        });

        const nextSections = data.sections.map((s) => ({
            ...s,
            visible: s.key !== 'legacy_migration',
        }));

        setData((prev) => ({
            ...prev,
            fields: nextFields,
            sections: nextSections,
        }));
    };

    const applyHistoricalMigrationPreset = () => {
        const nextFields = { ...data.fields };
        if (nextFields['manual_last_visit_date']) nextFields['manual_last_visit_date'].visible = true;
        if (nextFields['legacy_visits_count']) nextFields['legacy_visits_count'].visible = true;

        const nextSections = data.sections.map((s) => ({
            ...s,
            visible: true,
        }));

        setData((prev) => ({
            ...prev,
            fields: nextFields,
            sections: nextSections,
        }));
    };

    // In-page search evaluation
    const matchesSearch = (textToMatch) => {
        if (!searchQuery.trim()) return false;
        return (textToMatch || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    };

    const fieldMatchesSearch = (field) => {
        if (!searchQuery.trim()) return true;
        const config = data.fields[field.key] || {};
        return (
            matchesSearch(field.name) ||
            matchesSearch(field.key) ||
            matchesSearch(field.section) ||
            matchesSearch(config.label)
        );
    };

    const relationshipMatchesSearch = (rel) => {
        if (!searchQuery.trim()) return true;
        return matchesSearch(rel.label) || matchesSearch(rel.value);
    };

    // Live computed stats
    const stats = useMemo(() => {
        const totalFields = Object.keys(data.fields).length;
        const visibleFields = Object.values(data.fields).filter((f) => f.visible).length;
        const requiredFields = Object.values(data.fields).filter((f) => f.required).length;
        const totalSections = data.sections.length;
        const activeSections = data.sections.filter((s) => s.visible).length;
        const migrationSec = data.sections.find((s) => s.key === 'legacy_migration');
        const isMigrationActive = Boolean(migrationSec?.visible);

        return {
            totalFields,
            visibleFields,
            requiredFields,
            totalSections,
            activeSections,
            isMigrationActive,
            totalRelationships: data.relationships.length,
        };
    }, [data]);

    const submit = (event) => {
        event.preventDefault();
        if (!canCreate && !canUpdate && (!canOrder || !hasOrderChanges) && !hasSectionConfigChanges) {
            return;
        }

        put(route('admin.patient_config.update'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Patient Registration Form Configuration" />

            <div className="space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Patient Registration Form Configuration (রোগী নিবন্ধন ফর্ম বিন্যাস)"
                    subtitle="Manage patient demographic fields, visibility, required criteria, custom bilingual labels, section ordering, and guardian relationships"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.patients.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>👥</span> Patients
                            </Link>
                            <Link
                                href={route('admin.patients.create')}
                                className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>➕</span> Register Patient
                            </Link>
                            <Link
                                href={route('admin.general_settings.edit')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🔢</span> Numbering Profiles
                            </Link>
                            {canViewClinicSettings && (
                                <Link
                                    href={route('admin.settings.edit')}
                                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                                >
                                    <span>⚙️</span> Clinic Settings
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Executive KPI Summary Ribbon (5 Tiles) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-primary-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">Form Sections 📑</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">
                            {stats.activeSections} / {stats.totalSections} Active
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">নিবন্ধন ফর্ম সেকশন</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Demographic Fields 📝</div>
                        <div className="text-xl font-bold text-emerald-800 mt-1">
                            {stats.visibleFields} / {stats.totalFields} Visible
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">সক্রিয় ইনপুট ফিল্ড সংখ্যা</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Mandatory Criteria ⚠️</div>
                        <div className="text-xl font-bold text-blue-900 mt-1">
                            {stats.requiredFields} Required
                        </div>
                        <div className="text-[11px] text-blue-600 mt-0.5">বাধ্যতামূলক ফিল্ড সংখ্যা</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Relationships 👨‍👩‍👦</div>
                        <div className="text-xl font-bold text-purple-900 mt-1">
                            {stats.totalRelationships} Options
                        </div>
                        <div className="text-[11px] text-purple-600 mt-0.5">অভিভাবক সম্পর্কের ধরন</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Legacy Migration 📜</div>
                        <div className="text-sm font-bold text-amber-900 mt-1">
                            {stats.isMigrationActive ? 'Active in Intake' : 'Turned Off (Safe)'}
                        </div>
                        <div className="text-[11px] text-amber-600 mt-0.5">
                            {stats.isMigrationActive ? 'পুরোনো তথ্য স্থানান্তর চালু' : 'স্বাভাবিক প্র্যাকটিস মোড'}
                        </div>
                    </div>
                </div>

                {/* Real-time In-Page Search Bar & Category Navigation Strip */}
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search form fields, labels, sections, or relationships (e.g. blood group, allergies, medical history, step-parent, phone)..."
                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                                ⚡ Filter Active
                            </span>
                        )}
                    </div>

                    {/* Category Filter Tabs Strip */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs scrollbar-none">
                        {SECTION_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition ${
                                    activeTab === tab.id
                                        ? 'bg-primary-600 text-white shadow-2xs'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 1-Click Clinical Form Presets Toolbar */}
                    {canUpdate && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                            <span className="text-xs font-bold text-gray-700">⚡ 1-Click Intake Presets:</span>
                            <button
                                type="button"
                                onClick={applyStandardOpdPreset}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-primary-300 bg-primary-50/50 text-primary-800 hover:bg-primary-100 transition shadow-2xs"
                            >
                                🌿 Standard OPD Intake
                            </button>
                            <button
                                type="button"
                                onClick={applyFastTrackMinimalPreset}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-blue-300 bg-blue-50/50 text-blue-800 hover:bg-blue-100 transition shadow-2xs"
                            >
                                ⚡ Fast-Track Minimal OPD
                            </button>
                            <button
                                type="button"
                                onClick={applyHistoricalMigrationPreset}
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100 transition shadow-2xs"
                            >
                                📜 Historical Migration Pack
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Form Configuration Studio */}
                <form onSubmit={submit} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                    <div className="space-y-6 p-4 sm:p-6">
                        <div className="rounded-lg bg-blue-50/60 p-3.5 border border-blue-100 text-xs text-blue-900 leading-relaxed">
                            <span className="font-bold">Clinical Data Invariant Safeguard:</span> Patient Full Name (`name`) and Gender (`gender`) remain permanently active and strictly mandatory across all registration workflows. The Identity section cannot be hidden.
                        </div>

                        {!canCreate && !canUpdate && !canOrder && !canDelete && (
                            <p role="status" className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                                You have view-only access to this configuration. Contact Super Admin to request schema editing privileges.
                            </p>
                        )}

                        {/* SECTION: Relationship Options */}
                        {(activeTab === 'all' || activeTab === 'relationships') && (
                            <section className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/20 p-4 sm:p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-purple-100 pb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                                            <span>👨‍👩‍👦</span> Guardian / Primary Contact Relationships (অভিভাবক সম্পর্কের ধরন)
                                        </h3>
                                        <p className="mt-1 text-xs text-purple-700">
                                            Add, edit, and delete relationship options. Options actively linked to patient records are strictly protected against deletion.
                                        </p>
                                    </div>

                                    {/* Quick Preset Chips */}
                                    {canCreate && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="text-[11px] font-semibold text-purple-800">Quick add:</span>
                                            {QUICK_RELATIONSHIPS.map((chipLabel) => (
                                                <button
                                                    key={chipLabel}
                                                    type="button"
                                                    onClick={() => addRelationshipWithLabel(chipLabel)}
                                                    className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 transition shadow-2xs"
                                                >
                                                    + {chipLabel}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                    {data.relationships.filter(relationshipMatchesSearch).map((relationship) => (
                                        <div
                                            key={relationship.value}
                                            className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 transition ${
                                                matchesSearch(relationship.label) || matchesSearch(relationship.value)
                                                    ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-400'
                                                    : 'border-gray-200 bg-white hover:border-purple-300'
                                            }`}
                                        >
                                            {editingRelationshipValue === relationship.value ? (
                                                <input
                                                    type="text"
                                                    value={editingRelationshipLabel}
                                                    onChange={(event) => setEditingRelationshipLabel(event.target.value)}
                                                    maxLength={80}
                                                    aria-label={`Edit ${relationship.label} relationship`}
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-xs focus:border-primary-500 focus:ring-primary-500 py-1"
                                                />
                                            ) : (
                                                <span className="text-xs font-semibold text-gray-800">{relationship.label}</span>
                                            )}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {editingRelationshipValue === relationship.value ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => saveRelationshipEdit(relationship)}
                                                            disabled={!canUpdate || !editingRelationshipLabel.trim() || updatingRelationship || processing}
                                                            className="rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
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
                                                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
                                                            className="rounded-md border border-primary-200 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
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
                                                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {errors.relationships && <p className="text-xs text-red-600 font-semibold">{errors.relationships}</p>}
                                {relationshipDeleteError && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{relationshipDeleteError}</p>}

                                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                    <input
                                        type="text"
                                        value={newRelationshipLabel}
                                        onChange={(event) => setNewRelationshipLabel(event.target.value)}
                                        disabled={!canCreate}
                                        maxLength={80}
                                        placeholder="Add custom relationship (e.g. Legal Guardian / পালক পিতা)..."
                                        aria-label="New relationship label"
                                        className="w-full rounded-md border-gray-300 text-xs shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addRelationship}
                                        disabled={!canCreate || !newRelationshipLabel.trim()}
                                        className="shrink-0 rounded-md border border-primary-200 bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 disabled:opacity-50 shadow-2xs transition"
                                    >
                                        + Add Relationship
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* SECTIONS & FORM FIELDS */}
                        {[...data.sections]
                            .sort((a, b) => a.order - b.order)
                            .filter((section) => activeTab === 'all' || activeTab === section.key)
                            .map((section, sectionIndex) => {
                                const isCollapsed = !!collapsedSections[section.key];
                                const isCore = section.is_core || section.key === 'identity';
                                const movableSections = [...data.sections].sort((a, b) => a.order - b.order);
                                const sectionFields = FIELD_DETAILS
                                    .filter((field) => field.section === section.name)
                                    .filter(fieldMatchesSearch)
                                    .sort((first, second) => data.fields[first.orderKey || first.key].order - data.fields[second.orderKey || second.key].order);

                                return (
                                    <section
                                        key={section.key}
                                        className={`rounded-xl border transition-all ${
                                            section.visible ? 'border-gray-200 bg-white' : 'border-dashed border-gray-300 bg-gray-50/70'
                                        } p-4 sm:p-5 shadow-2xs`}
                                    >
                                        <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCollapse(section.key)}
                                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
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
                                                            className="w-full max-w-md rounded-md border-gray-300 py-1 text-xs text-gray-700 shadow-xs focus:border-primary-500 focus:ring-primary-500"
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
                                                        className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"
                                                    >
                                                        ↑ Up
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveSection(section.key, 1)}
                                                        disabled={!canOrder || sectionIndex >= movableSections.length - 1}
                                                        aria-label={`Move ${section.name} section down`}
                                                        title={`Move ${section.name} section down`}
                                                        className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"
                                                    >
                                                        ↓ Down
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {section.key === 'legacy_migration' && (
                                            <p className="mt-2 text-xs text-amber-800 bg-amber-50 rounded p-2.5 border border-amber-200 leading-relaxed">
                                                Enable these fields during initial clinic onboarding to record historical visit counts and last visit dates for migrated patients. Turn off once migration is complete to prevent manual overrides.
                                            </p>
                                        )}

                                        {isCollapsed ? (
                                            <div className="mt-3 text-xs text-gray-500 italic">
                                                Section collapsed ({sectionFields.length} fields). Click chevron to expand and manage individual fields.
                                            </div>
                                        ) : (
                                            <div className="mt-3 space-y-2.5">
                                                {sectionFields.map((field) => {
                                                    const config = data.fields[field.key];
                                                    const isCoreField = ['name', 'gender'].includes(field.key);
                                                    const orderKey = field.orderKey || field.key;
                                                    const isOrderControl = field.key === orderKey;
                                                    const movableFields = FIELD_DETAILS
                                                        .filter((item) => item.section === section.name && (item.orderKey || item.key) === item.key)
                                                        .sort((first, second) => data.fields[first.key].order - data.fields[second.key].order);
                                                    const orderIndex = movableFields.findIndex((item) => item.key === orderKey);
                                                    const isHighlighted = matchesSearch(field.name) || matchesSearch(field.key) || matchesSearch(config.label);

                                                    return (
                                                        <div
                                                            key={field.key}
                                                            className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 rounded-lg border p-3 transition ${
                                                                isHighlighted
                                                                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-400'
                                                                    : 'border-gray-200 bg-white hover:bg-gray-50/60'
                                                            }`}
                                                        >
                                                            {/* Field Label Input & Info */}
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <label htmlFor={`field-label-${field.key}`} className="text-xs font-bold text-gray-800">
                                                                        {field.name}
                                                                    </label>
                                                                    <code className="text-[10px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded">
                                                                        {field.key}
                                                                    </code>
                                                                    {isCoreField && (
                                                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                                            Required Core
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    id={`field-label-${field.key}`}
                                                                    type="text"
                                                                    value={config.label}
                                                                    onChange={(event) => updateField(field.key, 'label', event.target.value)}
                                                                    disabled={!canUpdate}
                                                                    maxLength={80}
                                                                    placeholder="Custom label (English / বাংলা)"
                                                                    className="w-full rounded-md border-gray-300 text-xs shadow-xs focus:border-primary-500 focus:ring-primary-500 py-1"
                                                                />
                                                            </div>

                                                            {/* Maximum Length Input (For Ref# and Old ID) */}
                                                            {['reference_number', 'old_or_other_id'].includes(field.key) && (
                                                                <div className="w-28">
                                                                    <label htmlFor={`field-max-length-${field.key}`} className="mb-1 block text-[10px] font-semibold text-gray-500 uppercase">
                                                                        Max Length
                                                                    </label>
                                                                    <input
                                                                        id={`field-max-length-${field.key}`}
                                                                        type="number"
                                                                        min="1"
                                                                        max="255"
                                                                        value={config.max_length ?? (field.key === 'old_or_other_id' ? 50 : 100)}
                                                                        onChange={(event) => updateField(field.key, 'max_length', Number(event.target.value))}
                                                                        disabled={!canUpdate}
                                                                        className="w-full rounded-md border-gray-300 text-xs shadow-xs focus:border-primary-500 focus:ring-primary-500 py-1"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Checkboxes: Show Field & Required */}
                                                            <div className="flex items-center gap-4 sm:gap-3">
                                                                <label className={`flex items-center gap-1.5 text-xs font-semibold ${isCoreField ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={config.visible}
                                                                        disabled={isCoreField || !canUpdate}
                                                                        onChange={(event) => updateField(field.key, 'visible', event.target.checked)}
                                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    <span>Show Field</span>
                                                                </label>
                                                                <label className={`flex items-center gap-1.5 text-xs font-semibold ${isCoreField ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer text-gray-700'}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={config.required}
                                                                        disabled={isCoreField || !canUpdate}
                                                                        onChange={(event) => updateField(field.key, 'required', event.target.checked)}
                                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    <span>Required</span>
                                                                </label>
                                                            </div>

                                                            {/* Reorder Buttons */}
                                                            <div className="flex items-center gap-1">
                                                                {isOrderControl ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => moveField(field.key, section.name, -1)}
                                                                            disabled={!canOrder || orderIndex <= 0}
                                                                            aria-label={`Move ${field.name} up`}
                                                                            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"
                                                                        >
                                                                            ↑
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => moveField(field.key, section.name, 1)}
                                                                            disabled={!canOrder || orderIndex < 0 || orderIndex >= movableFields.length - 1}
                                                                            aria-label={`Move ${field.name} down`}
                                                                            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition"
                                                                        >
                                                                            ↓
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-[11px] text-gray-400 italic">Moves with age</span>
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

                    {/* Desktop Form Save Action */}
                    <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50">
                        <Link href={canViewClinicSettings ? route('admin.settings.edit') : route('dashboard')} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={(!canCreate && !canUpdate && (!canOrder || !hasOrderChanges) && !hasSectionConfigChanges) || processing}
                            className="rounded-lg bg-primary-600 px-6 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700 disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : '💾 Save Patient Configuration'}
                        </button>
                    </div>
                </form>

                {/* Mobile Sticky Save Drawer */}
                {canUpdate && (
                    <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 z-30 sm:hidden flex items-center justify-between shadow-lg">
                        <div className="text-xs text-gray-600 font-medium">
                            {processing ? 'Saving changes...' : 'Ready to save'}
                        </div>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={processing}
                            className="rounded-lg bg-primary-600 px-5 py-2 font-bold text-xs text-white shadow-2xs transition hover:bg-primary-700 disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : '💾 Save Config'}
                        </button>
                    </div>
                )}

                {/* Confirm Delete Relationship Dialog */}
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
