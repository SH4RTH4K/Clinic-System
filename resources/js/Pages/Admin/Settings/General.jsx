import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const EMPTY_PROFILE = {
    name: '',
    category: '',
    category_code: '',
    prefix: '',
    include_year: true,
    reset_annually: true,
    separator: '-',
    number_padding: 4,
    starting_number: 1,
    is_active: true,
    is_default: false,
};

function Toggle({ checked, onChange, label, description, disabled = false }) {
    return (
        <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 cursor-pointer hover:bg-gray-50/50 transition">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="mt-0.5 rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500 disabled:opacity-60 cursor-pointer"
            />
            <span>
                <span className="block text-sm font-medium text-gray-800">{label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">{description}</span>
            </span>
        </label>
    );
}

export default function General({ profiles = [], oldOrOtherIdConfig = {} }) {
    const can = usePermission();
    const canCreate = can('general_settings.create');
    const canUpdate = can('general_settings.update');
    const canDelete = can('general_settings.delete');

    const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'old_id'
    const [editingProfile, setEditingProfile] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Form for Primary Category Profiles
    const {
        data: profileData,
        setData: setProfileData,
        post: postProfile,
        put: putProfile,
        processing: profileProcessing,
        errors: profileErrors,
        clearErrors: clearProfileErrors,
        reset: resetProfile,
    } = useForm(EMPTY_PROFILE);

    // Form for Old / Other ID Configuration
    const {
        data: oldIdData,
        setData: setOldIdData,
        put: putOldId,
        processing: savingOldId,
        errors: oldIdErrors,
        recentlySuccessful: oldIdSaved,
    } = useForm({
        mode: oldOrOtherIdConfig.mode || 'auto',
        prefix: oldOrOtherIdConfig.prefix || 'OLD-',
        number_padding: oldOrOtherIdConfig.number_padding ?? 4,
        allow_staff_override: oldOrOtherIdConfig.allow_staff_override ?? true,
        max_length: oldOrOtherIdConfig.max_length ?? 50,
    });

    const oldIdPreview = useMemo(() => {
        if (oldIdData.mode === 'manual') {
            return `[Manual Entry: varchar up to ${oldIdData.max_length || 50} chars]`;
        }
        const prefix = oldIdData.prefix || '';
        const padding = Number(oldIdData.number_padding) || 0;
        const sampleNum = '1';
        const padded = padding > 0 ? sampleNum.padStart(padding, '0') : sampleNum;
        return `${prefix}${padded}`;
    }, [oldIdData.mode, oldIdData.prefix, oldIdData.number_padding, oldIdData.max_length]);

    const submitOldIdConfig = (event) => {
        event.preventDefault();
        if (!canUpdate) return;
        putOldId(route('admin.general_settings.old_id_config.update'), {
            preserveScroll: true,
        });
    };

    const preview = useMemo(() => {
        const parts = [profileData.prefix.trim().toUpperCase() || 'PREFIX'];
        if (profileData.include_year) parts.push(String(new Date().getFullYear()));
        if (profileData.category_code.trim()) parts.push(profileData.category_code.trim().toUpperCase());
        const sequence = String(editingProfile?.next_number ?? profileData.starting_number ?? 1);
        const number = Number(profileData.number_padding) > 0
            ? sequence.padStart(Number(profileData.number_padding), '0')
            : sequence;

        return parts.join(profileData.separator) + profileData.separator + number;
    }, [profileData, editingProfile]);

    const startEditing = (profile) => {
        clearProfileErrors();
        setEditingProfile(profile);
        setProfileData({
            name: profile.name,
            category: profile.category,
            category_code: profile.category_code || '',
            prefix: profile.prefix,
            include_year: profile.include_year,
            reset_annually: profile.reset_annually,
            separator: profile.separator,
            number_padding: profile.number_padding,
            starting_number: profile.next_number,
            is_active: profile.is_active,
            is_default: profile.is_default,
        });
        setActiveTab('categories');
    };

    const cancelEditing = () => {
        setEditingProfile(null);
        resetProfile();
        clearProfileErrors();
    };

    const submitProfile = (event) => {
        event.preventDefault();
        if (editingProfile ? !canUpdate : !canCreate) return;

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setEditingProfile(null);
                resetProfile();
            },
        };

        if (editingProfile) {
            putProfile(route('admin.general_settings.profiles.update', editingProfile.id), options);
        } else {
            postProfile(route('admin.general_settings.profiles.store'), options);
        }
    };

    const confirmDeactivation = () => {
        if (!canDelete || !deleteTarget || deleting) return;
        setDeleting(true);
        router.delete(route('admin.general_settings.profiles.destroy', deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    };

    const activeProfileCount = profiles.filter((profile) => profile.is_active).length;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">General Settings</h2>}>
            <Head title="General Settings - Patient Numbering" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">

                {/* Page Header */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                                System Configuration
                            </span>
                            <h1 className="mt-1 text-2xl font-bold text-gray-900">Patient Numbering</h1>
                            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-gray-600">
                                Configure sequential Patient ID numbering options by category, and manage legacy Old/Other ID generation and validation rules.
                            </p>
                        </div>
                    </div>

                    {/* Segmented Navigation Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setActiveTab('categories')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                                activeTab === 'categories'
                                    ? 'border-primary-600 text-primary-700'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            <span>Primary Patient ID (Categories)</span>
                            <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                                {activeProfileCount} active
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('old_id')}
                            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                                activeTab === 'old_id'
                                    ? 'border-primary-600 text-primary-700'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span>Old / Other ID Numbering</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${oldIdData.mode === 'auto' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {oldIdData.mode === 'auto' ? 'Auto Mode' : 'Manual Mode'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* TAB 1: PRIMARY PATIENT ID (CATEGORIES) */}
                {activeTab === 'categories' && (
                    <div className="grid items-start gap-6 lg:grid-cols-2">
                        {/* Left Column: Numbering Options List */}
                        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                                <div>
                                    <h2 className="font-semibold text-gray-900">Configured Categories</h2>
                                    <p className="mt-0.5 text-sm text-gray-500">{profiles.length} category options configured</p>
                                </div>
                                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                                    {activeProfileCount} active
                                </span>
                            </div>

                            {profiles.length === 0 ? (
                                <div className="px-5 py-12 text-center">
                                    <h3 className="text-sm font-semibold text-gray-900">No numbering options</h3>
                                    <p className="mt-1 text-sm text-gray-500">Add an option before registering patients.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {profiles.map((profile) => (
                                        <article key={profile.id} className="p-5 hover:bg-gray-50/50 transition">
                                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                                                        {profile.is_default && (
                                                            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 border border-primary-100">
                                                                Default
                                                            </span>
                                                        )}
                                                        <span className={profile.is_active ? 'rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700' : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'}>
                                                            {profile.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        Category: <strong className="font-medium text-gray-800">{profile.category}</strong>{profile.category_code ? ' (' + profile.category_code + ')' : ''}
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                                                        <span>Prefix: <strong className="font-semibold text-gray-700">{profile.prefix}</strong></span>
                                                        <span>{profile.include_year ? 'Includes year' : 'No year in ID'}</span>
                                                        {profile.reset_annually && <span>Resets every year</span>}
                                                        <span>{profile.patients_count} registered</span>
                                                    </div>
                                                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 border border-gray-100">
                                                        <span className="text-xs font-medium text-gray-500">Next ID preview:</span>
                                                        <code className="text-sm font-semibold font-mono text-gray-900">{profile.preview}</code>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(profile)}
                                                        disabled={!canUpdate}
                                                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(profile)}
                                                        disabled={!canDelete || !profile.is_active || activeProfileCount <= 1}
                                                        className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                                                        title={activeProfileCount <= 1 ? 'At least one active option must remain' : 'Deactivate option'}
                                                    >
                                                        Deactivate
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3.5 text-xs leading-5 text-gray-500">
                                Updating a profile affects new registrations only. Each existing patient record maintains their assigned ID.
                            </div>
                        </section>

                        {/* Right Column: Add / Edit Option Form */}
                        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="mb-5 border-b border-gray-100 pb-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                                    {editingProfile ? 'Edit Profile' : 'New Category Profile'}
                                </span>
                                <h2 className="mt-1 text-lg font-bold text-gray-900">
                                    {editingProfile ? `Update: ${editingProfile.name}` : 'Add Numbering Option'}
                                </h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Configure how this category builds new sequential patient IDs.
                                </p>
                                <div className="mt-3 rounded-md bg-primary-50/50 border border-primary-100 p-2.5 text-xs text-primary-900 font-mono">
                                    Pattern: [Prefix]-[Year]-[CategoryCode]-[Sequence] &rarr; e.g. HC-2026-CH-0001
                                </div>
                            </div>

                            {((!canCreate && !editingProfile) || (!canUpdate && editingProfile)) ? (
                                <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">You have view-only access to numbering options.</p>
                            ) : (
                                <form onSubmit={submitProfile} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="profile_name" className="mb-1 block text-sm font-medium text-gray-700">Option Name</label>
                                            <input
                                                id="profile_name"
                                                value={profileData.name}
                                                onChange={(event) => setProfileData('name', event.target.value)}
                                                maxLength={100}
                                                required
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                placeholder="e.g. Child patients"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Name shown to staff during registration.</p>
                                            {profileErrors.name && <p className="mt-1 text-xs text-rose-600">{profileErrors.name}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="profile_category" className="mb-1 block text-sm font-medium text-gray-700">Category Label</label>
                                            <input
                                                id="profile_category"
                                                value={profileData.category}
                                                onChange={(event) => setProfileData('category', event.target.value)}
                                                maxLength={100}
                                                required
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                placeholder="e.g. Child"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Stored on patient profile as category.</p>
                                            {profileErrors.category && <p className="mt-1 text-xs text-rose-600">{profileErrors.category}</p>}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="profile_prefix" className="mb-1 block text-sm font-medium text-gray-700">ID Prefix</label>
                                            <input
                                                id="profile_prefix"
                                                value={profileData.prefix}
                                                onChange={(event) => setProfileData('prefix', event.target.value.toUpperCase())}
                                                maxLength={10}
                                                required
                                                className="w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                placeholder="e.g. HC"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Leading prefix letters for this option.</p>
                                            {profileErrors.prefix && <p className="mt-1 text-xs text-rose-600">{profileErrors.prefix}</p>}
                                        </div>
                                        <div>
                                            <label htmlFor="profile_category_code" className="mb-1 block text-sm font-medium text-gray-700">Category Code <span className="text-gray-400 font-normal">(optional)</span></label>
                                            <input
                                                id="profile_category_code"
                                                value={profileData.category_code}
                                                onChange={(event) => setProfileData('category_code', event.target.value.toUpperCase())}
                                                maxLength={10}
                                                className="w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                placeholder="e.g. CH"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Short code segment in ID.</p>
                                            {profileErrors.category_code && <p className="mt-1 text-xs text-rose-600">{profileErrors.category_code}</p>}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="profile_separator" className="mb-1 block text-sm font-medium text-gray-700">ID Separator</label>
                                            <select
                                                id="profile_separator"
                                                value={profileData.separator}
                                                onChange={(event) => setProfileData('separator', event.target.value)}
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            >
                                                <option value="-">Hyphen (-)</option>
                                                <option value="/">Slash (/)</option>
                                                <option value=".">Period (.)</option>
                                            </select>
                                            <p className="mt-1 text-xs text-gray-500">Character dividing parts (e.g. HC-2026-0001).</p>
                                        </div>
                                        <div>
                                            <label htmlFor="profile_padding" className="mb-1 block text-sm font-medium text-gray-700">Digits Padding</label>
                                            <input
                                                id="profile_padding"
                                                type="number"
                                                min={0}
                                                max={20}
                                                step={1}
                                                value={profileData.number_padding}
                                                onChange={(event) => setProfileData('number_padding', event.target.value)}
                                                required
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Sequence zero-padding (e.g. 4 renders 0001, 0 for unpadded). Numbers never truncate.</p>
                                            {profileErrors.number_padding && <p className="mt-1 text-xs text-rose-600">{profileErrors.number_padding}</p>}
                                        </div>
                                    </div>

                                    {!editingProfile && (
                                        <div>
                                            <label htmlFor="profile_start" className="mb-1 block text-sm font-medium text-gray-700">Starting Number</label>
                                            <input
                                                id="profile_start"
                                                type="number"
                                                min={1}
                                                max={99999999}
                                                value={profileData.starting_number}
                                                onChange={(event) => setProfileData('starting_number', event.target.value)}
                                                required
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">First sequential number for this category option.</p>
                                            {profileErrors.starting_number && <p className="mt-1 text-xs text-rose-600">{profileErrors.starting_number}</p>}
                                        </div>
                                    )}

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Toggle
                                            checked={profileData.include_year}
                                            onChange={(event) => setProfileData((current) => ({
                                                ...current,
                                                include_year: event.target.checked,
                                                reset_annually: event.target.checked ? current.reset_annually : false,
                                            }))}
                                            label="Include Year"
                                            description="Embeds current year (e.g. 2026) in ID."
                                        />
                                        <Toggle
                                            checked={profileData.reset_annually}
                                            onChange={(event) => setProfileData('reset_annually', event.target.checked)}
                                            label="Reset Annually"
                                            description="Restarts from start number each Jan 1st."
                                            disabled={!profileData.include_year}
                                        />
                                        <Toggle
                                            checked={profileData.is_active}
                                            onChange={(event) => setProfileData((current) => ({
                                                ...current,
                                                is_active: event.target.checked,
                                                is_default: event.target.checked ? current.is_default : false,
                                            }))}
                                            label="Active for Registration"
                                            description="Staff can choose this option on patient form."
                                        />
                                        <Toggle
                                            checked={profileData.is_default}
                                            onChange={(event) => setProfileData('is_default', event.target.checked)}
                                            label="Preselect as Default"
                                            description="Automatically chosen by default."
                                            disabled={!profileData.is_active}
                                        />
                                    </div>

                                    {profileErrors.reset_annually && <p className="text-xs text-rose-600">{profileErrors.reset_annually}</p>}
                                    {profileErrors.is_active && <p className="text-xs text-rose-600">{profileErrors.is_active}</p>}
                                    {profileErrors.is_default && <p className="text-xs text-rose-600">{profileErrors.is_default}</p>}
                                    {profileErrors.profile && <p className="text-xs text-rose-600">{profileErrors.profile}</p>}

                                    <div className="rounded-lg border border-primary-200 bg-primary-50/50 p-4">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-primary-800">
                                            Live ID Preview
                                        </span>
                                        <p className="mt-1 font-mono text-lg font-bold text-gray-900">{preview}</p>
                                        <p className="mt-1 text-xs text-gray-500">Live preview using current form settings and next sequence.</p>
                                    </div>

                                    <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                                        {editingProfile && (
                                            <button
                                                type="button"
                                                onClick={cancelEditing}
                                                disabled={profileProcessing}
                                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={profileProcessing || (editingProfile ? !canUpdate : !canCreate)}
                                            className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                                        >
                                            {profileProcessing ? 'Saving...' : editingProfile ? 'Save changes' : 'Add option'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </section>
                    </div>
                )}

                {/* TAB 2: OLD / OTHER ID NUMBERING */}
                {activeTab === 'old_id' && (
                    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                                    Secondary Identification
                                </span>
                                <h2 className="mt-1 text-xl font-bold text-gray-900">Old / Other ID Strategy</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Configure whether Old/Other ID is generated automatically as a sequential code, or entered manually by staff with length validation.
                                </p>
                            </div>
                            {oldIdSaved && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Settings saved successfully
                                </span>
                            )}
                        </div>

                        <form onSubmit={submitOldIdConfig} className="mt-6 space-y-6">
                            {/* Strategy Radio Cards */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900">
                                    Generation Strategy
                                </label>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Select the default mode for assigning Old/Other IDs during patient registration.
                                </p>

                                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                    <label
                                        className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                                            oldIdData.mode === 'auto'
                                                ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-500'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="radio"
                                                    name="old_id_mode"
                                                    value="auto"
                                                    checked={oldIdData.mode === 'auto'}
                                                    onChange={() => setOldIdData('mode', 'auto')}
                                                    disabled={!canUpdate}
                                                    className="text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                                <span className="text-base font-bold text-gray-900">Auto ID Generator</span>
                                            </div>
                                            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
                                                Automatic
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-gray-600">
                                            The system automatically computes the next sequential Old/Other ID upon patient creation (e.g. {oldIdData.prefix || 'OLD-'}0001).
                                        </p>
                                    </label>

                                    <label
                                        className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                                            oldIdData.mode === 'manual'
                                                ? 'border-primary-500 bg-primary-50/30 ring-2 ring-primary-500'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="radio"
                                                    name="old_id_mode"
                                                    value="manual"
                                                    checked={oldIdData.mode === 'manual'}
                                                    onChange={() => setOldIdData('mode', 'manual')}
                                                    disabled={!canUpdate}
                                                    className="text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                />
                                                <span className="text-base font-bold text-gray-900">Manual Entry</span>
                                            </div>
                                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                                Custom Varchar
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-gray-600">
                                            Staff manually enters custom legacy hospital card numbers, paper file IDs, or external references up to the configured max length.
                                        </p>
                                    </label>
                                </div>
                                {oldIdErrors.mode && <p className="mt-1 text-xs text-rose-600">{oldIdErrors.mode}</p>}
                            </div>

                            {/* Contextual Mode Settings */}
                            {oldIdData.mode === 'auto' ? (
                                <div className="rounded-xl border border-primary-100 bg-primary-50/30 p-5 space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary-800">
                                        Auto Generator Numbering Format
                                    </h3>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="old_id_prefix" className="mb-1 block text-sm font-medium text-gray-700">
                                                ID Prefix
                                            </label>
                                            <input
                                                id="old_id_prefix"
                                                type="text"
                                                value={oldIdData.prefix}
                                                onChange={(e) => setOldIdData('prefix', e.target.value.toUpperCase())}
                                                maxLength={20}
                                                disabled={!canUpdate}
                                                className="w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                                placeholder="e.g. OLD-"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Leading prefix string for generated IDs (e.g. OLD-, CARD-, LEG-).</p>
                                            {oldIdErrors.prefix && <p className="mt-1 text-xs text-rose-600">{oldIdErrors.prefix}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="old_id_padding" className="mb-1 block text-sm font-medium text-gray-700">
                                                Sequence Padding (Minimum Digits)
                                            </label>
                                            <input
                                                id="old_id_padding"
                                                type="number"
                                                min={0}
                                                max={10}
                                                value={oldIdData.number_padding}
                                                onChange={(e) => setOldIdData('number_padding', Number(e.target.value))}
                                                disabled={!canUpdate}
                                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">A padding of 4 renders 1 as 0001. Enter 0 for unpadded sequence.</p>
                                            {oldIdErrors.number_padding && <p className="mt-1 text-xs text-rose-600">{oldIdErrors.number_padding}</p>}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-5 space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                        Manual Varchar Validation
                                    </h3>
                                    <div className="max-w-xs">
                                        <label htmlFor="old_id_max_length" className="mb-1 block text-sm font-medium text-gray-700">
                                            Maximum Length Validation
                                        </label>
                                        <input
                                            id="old_id_max_length"
                                            type="number"
                                            min={1}
                                            max={255}
                                            value={oldIdData.max_length}
                                            onChange={(e) => setOldIdData('max_length', Number(e.target.value))}
                                            disabled={!canUpdate}
                                            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Character limit enforced on registration form (1–255).</p>
                                        {oldIdErrors.max_length && <p className="mt-1 text-xs text-rose-600">{oldIdErrors.max_length}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Staff Flexibility Policy */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                <Toggle
                                    checked={oldIdData.allow_staff_override}
                                    onChange={(e) => setOldIdData('allow_staff_override', e.target.checked)}
                                    disabled={!canUpdate}
                                    label="Allow staff to switch between Auto & Manual on registration form"
                                    description="When enabled, staff can toggle between Auto ID and Manual Entry on the patient registration form (with the strategy selected above preselected). When disabled, staff is strictly locked to your chosen strategy."
                                />
                            </div>

                            {/* Preview and Save Bar */}
                            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-primary-200 bg-primary-50/50 p-5 sm:flex-row sm:items-center">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-wider text-primary-800">
                                        Active Format Preview
                                    </span>
                                    <div className="mt-1 font-mono text-lg font-bold text-gray-900">
                                        {oldIdPreview}
                                    </div>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {oldIdData.mode === 'auto'
                                            ? 'The next sequential ID assigned upon registration.'
                                            : `Staff can enter any custom string up to ${oldIdData.max_length || 50} characters.`}
                                    </p>
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingOldId || !canUpdate}
                                    className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                                >
                                    {savingOldId ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </form>
                    </section>
                )}
            </div>

            <ConfirmDialog
                show={Boolean(deleteTarget)}
                title="Deactivate numbering option"
                message={deleteTarget ? '"' + deleteTarget.name + '" will be removed from new patient registrations. Existing patient IDs will remain unchanged.' : ''}
                confirmLabel="Deactivate option"
                isLoading={deleting}
                onConfirm={confirmDeactivation}
                onClose={() => setDeleteTarget(null)}
            />
        </AuthenticatedLayout>
    );
}
