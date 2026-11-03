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
        <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="mt-0.5 rounded border-gray-300 text-primary-600 shadow-sm focus:ring-primary-500 disabled:opacity-60"
            />
            <span>
                <span className="block text-sm font-medium text-gray-800">{label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">{description}</span>
            </span>
        </label>
    );
}

export default function General({ profiles = [] }) {
    const can = usePermission();
    const canCreate = can('general_settings.create');
    const canUpdate = can('general_settings.update');
    const canDelete = can('general_settings.delete');
    const [editingProfile, setEditingProfile] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const { data, setData, post, put, processing, errors, clearErrors, reset } = useForm(EMPTY_PROFILE);

    const preview = useMemo(() => {
        const parts = [data.prefix.trim().toUpperCase() || 'PREFIX'];
        if (data.include_year) parts.push(String(new Date().getFullYear()));
        if (data.category_code.trim()) parts.push(data.category_code.trim().toUpperCase());
        const sequence = String(editingProfile?.next_number ?? data.starting_number ?? 1);
        const number = Number(data.number_padding) > 0
            ? sequence.padStart(Number(data.number_padding), '0')
            : sequence;

        return parts.join(data.separator) + data.separator + number;
    }, [data, editingProfile]);

    const startEditing = (profile) => {
        clearErrors();
        setEditingProfile(profile);
        setData({
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
    };

    const cancelEditing = () => {
        setEditingProfile(null);
        reset();
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        if (editingProfile ? !canUpdate : !canCreate) return;

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setEditingProfile(null);
                reset();
            },
        };

        if (editingProfile) {
            put(route('admin.general_settings.profiles.update', editingProfile.id), options);
        } else {
            post(route('admin.general_settings.profiles.store'), options);
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
            <Head title="General Settings" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">System configuration</p>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Patient numbering</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                        Create numbering options for patient categories. Staff select a category during registration, and the system assigns a unique ID using that option.
                    </p>
                </section>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <div>
                                <h2 className="font-semibold text-gray-900">Numbering options</h2>
                                <p className="mt-0.5 text-sm text-gray-500">{profiles.length} configured</p>
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
                                    <article key={profile.id} className="p-5">
                                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                                                    {profile.is_default && <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">Default</span>}
                                                    <span className={profile.is_active ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600'}>
                                                        {profile.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-gray-600">
                                                    Category: {profile.category}{profile.category_code ? ' (' + profile.category_code + ')' : ''}
                                                </p>
                                                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
                                                    <span>Prefix: <strong className="font-semibold text-gray-700">{profile.prefix}</strong></span>
                                                    <span>{profile.include_year ? 'Includes year' : 'No year in ID'}</span>
                                                    {profile.reset_annually && <span>Resets every year</span>}
                                                    <span>{profile.patients_count} registered</span>
                                                </div>
                                                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                                                    <span className="text-xs font-medium text-gray-500">Next ID</span>
                                                    <code className="text-sm font-semibold text-gray-900">{profile.preview}</code>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(profile)}
                                                    disabled={!canUpdate}
                                                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(profile)}
                                                    disabled={!canDelete || !profile.is_active || activeProfileCount <= 1}
                                                    className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
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

                        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-xs leading-5 text-gray-600">
                            Updating a profile affects new registrations only. Each patient keeps the ID and category assigned at registration.
                        </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5 border-b border-gray-100 pb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">
                                {editingProfile ? 'Update profile' : 'New profile'}
                            </p>
                            <h2 className="mt-1 text-lg font-bold text-gray-900">
                                {editingProfile ? editingProfile.name : 'Add numbering option'}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">Choose what staff see and how this option builds a new patient ID.</p>
                            <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
                                Example: prefix HC + year 2026 + category code CH + 4-digit sequence = HC-2026-CH-0001.
                            </p>
                        </div>

                        {((!canCreate && !editingProfile) || (!canUpdate && editingProfile)) ? (
                            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">You have view-only access to numbering options.</p>
                        ) : (
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="profile_name" className="mb-1 block text-sm font-medium text-gray-700">Numbering option name</label>
                                        <input id="profile_name" value={data.name} onChange={(event) => setData('name', event.target.value)} maxLength={100} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="e.g. Child patients" />
                                        <p className="mt-1 text-xs text-gray-500">This is the option name staff choose when registering a patient.</p>
                                        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="profile_category" className="mb-1 block text-sm font-medium text-gray-700">Patient category label</label>
                                        <input id="profile_category" value={data.category} onChange={(event) => setData('category', event.target.value)} maxLength={100} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="e.g. Child" />
                                        <p className="mt-1 text-xs text-gray-500">Saved on the patient record as their category.</p>
                                        {errors.category && <p className="mt-1 text-xs text-rose-600">{errors.category}</p>}
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="profile_prefix" className="mb-1 block text-sm font-medium text-gray-700">ID prefix</label>
                                        <input id="profile_prefix" value={data.prefix} onChange={(event) => setData('prefix', event.target.value.toUpperCase())} maxLength={10} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="e.g. HC" />
                                        <p className="mt-1 text-xs text-gray-500">The first letters or numbers in every ID from this option.</p>
                                        {errors.prefix && <p className="mt-1 text-xs text-rose-600">{errors.prefix}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="profile_category_code" className="mb-1 block text-sm font-medium text-gray-700">Category code in ID <span className="font-normal text-gray-400">(optional)</span></label>
                                        <input id="profile_category_code" value={data.category_code} onChange={(event) => setData('category_code', event.target.value.toUpperCase())} maxLength={10} className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="e.g. CH" />
                                        <p className="mt-1 text-xs text-gray-500">Adds a short code to the ID, such as CH for Child.</p>
                                        {errors.category_code && <p className="mt-1 text-xs text-rose-600">{errors.category_code}</p>}
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="profile_separator" className="mb-1 block text-sm font-medium text-gray-700">Character between ID parts</label>
                                        <select id="profile_separator" value={data.separator} onChange={(event) => setData('separator', event.target.value)} className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500">
                                            <option value="-">Hyphen (-)</option>
                                            <option value="/">Slash (/)</option>
                                            <option value=".">Period (.)</option>
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">For example, a hyphen makes HC-2026-CH-0001.</p>
                                    </div>
                                    <div>
                                        <label htmlFor="profile_padding" className="mb-1 block text-sm font-medium text-gray-700">Minimum digits in sequence</label>
                                        <input id="profile_padding" type="number" min={0} max={20} step={1} value={data.number_padding} onChange={(event) => setData('number_padding', event.target.value)} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                                        <p className="mt-1 text-xs text-gray-500">A width of 4 makes 1 appear as 0001. Enter 0 for no padding. The sequence grows normally when it gets longer.</p>
                                        <p className="mt-1 text-xs text-gray-500">4 makes 1 display as 0001. Use 0 for no leading zeros. Numbers are never cut off.</p>
                                        {errors.number_padding && <p className="mt-1 text-xs text-rose-600">{errors.number_padding}</p>}
                                    </div>
                                </div>

                                {!editingProfile && (
                                    <div>
                                        <label htmlFor="profile_start" className="mb-1 block text-sm font-medium text-gray-700">First sequence number</label>
                                        <input id="profile_start" type="number" min={1} max={99999999} value={data.starting_number} onChange={(event) => setData('starting_number', event.target.value)} required className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                                        <p className="mt-1 text-xs text-gray-500">The number assigned to the first patient using this option.</p>
                                        {errors.starting_number && <p className="mt-1 text-xs text-rose-600">{errors.starting_number}</p>}
                                    </div>
                                )}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Toggle checked={data.include_year} onChange={(event) => setData((current) => ({ ...current, include_year: event.target.checked, reset_annually: event.target.checked ? current.reset_annually : false }))} label="Put the year in the ID" description="Adds this calendar year, for example 2026." />
                                    <Toggle checked={data.reset_annually} onChange={(event) => setData('reset_annually', event.target.checked)} label="Restart sequence every year" description="Starts at the first number next January. Requires the year in the ID." disabled={!data.include_year} />
                                    <Toggle checked={data.is_active} onChange={(event) => setData((current) => ({ ...current, is_active: event.target.checked, is_default: event.target.checked ? current.is_default : false }))} label="Allow for new registrations" description="Staff can choose this option when adding a patient." />
                                    <Toggle checked={data.is_default} onChange={(event) => setData('is_default', event.target.checked)} label="Preselect this option" description="Selected automatically on the form; staff can change it." disabled={!data.is_active} />
                                </div>
                                {errors.reset_annually && <p className="text-xs text-rose-600">{errors.reset_annually}</p>}
                                {errors.is_active && <p className="text-xs text-rose-600">{errors.is_active}</p>}
                                {errors.is_default && <p className="text-xs text-rose-600">{errors.is_default}</p>}
                                {errors.profile && <p className="text-xs text-rose-600">{errors.profile}</p>}

                                <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-800">Live ID preview</p>
                                    <p className="mt-1 break-all font-mono text-lg font-bold text-gray-900">{preview}</p>
                                    <p className="mt-1 text-xs leading-5 text-gray-600">Built from the prefix, year (if enabled), category code (if entered), and next sequence number. Existing patient IDs stay the same.</p>
                                </div>

                                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                                    {editingProfile && <button type="button" onClick={cancelEditing} disabled={processing} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>}
                                    <button type="submit" disabled={processing || (editingProfile ? !canUpdate : !canCreate)} className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                                        {processing ? 'Saving...' : editingProfile ? 'Save changes' : 'Add option'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
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
