import AccessControlNavigation from '@/Components/AccessControlNavigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import usePermission from '@/Components/usePermission';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const MODULE_LABELS = {
    activity_logs: 'Activity logs',
    appointments: 'Appointments',
    clinic_settings: 'Clinic settings',
    clinical_records: 'Clinical chart access',
    doctors: 'Doctors',
    general_settings: 'General settings',
    medicines: 'Medicines',
    patient_config: 'Patient configurable',
    patients: 'Patients',
    prescription_options: 'Prescription options',
    reports: 'Reports',
    roles: 'Roles',
    settings: 'Advice & Food Restrictions',
    symptom_medicine_map: 'Symptom–medicine map',
    symptoms: 'Symptoms',
    users: 'Users',
    visits: 'Visits and prescriptions',
};

const ACTION_DETAILS = {
    amend: { label: 'Amend', description: 'Make changes to completed records' },
    cancel: { label: 'Cancel', description: 'Cancel an issued prescription with a reason' },
    cancel_other: { label: 'Cancel for another Doctor', description: 'Cancel another Doctor’s prescription with explicit authorization and a reason' },
    create: { label: 'Add', description: 'Add new records' },
    delete: { label: 'Delete', description: 'Remove existing records' },
    export: { label: 'Export', description: 'Download or export records' },
    finalize: { label: 'Finalize', description: 'Authorize and complete clinical records' },
    order: { label: 'Change order', description: 'Change patient form field order' },
    update: { label: 'Edit', description: 'Edit existing records' },
    view: { label: 'View', description: 'Open records and details' },
};

const PERMISSION_CATEGORIES = [
    {
        key: 'clinical_operations',
        label: 'Clinical Operations',
        description: 'Patient records, visits, appointments, and clinical reporting.',
        modules: ['patients', 'clinical_records', 'visits', 'appointments', 'reports'],
    },
    {
        key: 'medicines_repertory',
        label: 'Medicines & Repertory',
        description: 'Medicine catalog, symptom repertory, and prescription options.',
        modules: ['medicines', 'symptoms', 'symptom_medicine_map', 'prescription_options'],
    },
    {
        key: 'administration',
        label: 'Administration',
        description: 'Clinic setup, staff access, and administrative records.',
        modules: ['doctors', 'clinic_settings', 'general_settings', 'patient_config', 'settings', 'users', 'roles', 'activity_logs'],
    },
];

const MODULE_CATEGORIES = Object.fromEntries(
    PERMISSION_CATEGORIES.flatMap((category) => category.modules.map((moduleKey) => [moduleKey, category.key])),
);

const MODULE_ORDER = PERMISSION_CATEGORIES.flatMap((category) => category.modules);

const CATEGORY_LABELS = Object.fromEntries(PERMISSION_CATEGORIES.map((category) => [category.key, category.label]));

const ACTION_ORDER = ['view', 'create', 'update', 'finalize', 'cancel', 'cancel_other', 'order', 'delete', 'export', 'amend'];

const toTitle = (value) => value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getRolePermissions = (role) => role?.permissions.map((permission) => permission.name) ?? [];

export default function Index({ roles = [], permissions = [] }) {
    const can = usePermission();
    const canCreateRole = can('roles.create');
    const canUpdateRoles = can('roles.update');
    const [selectedRoleId, setSelectedRoleId] = useState(roles[0] ? String(roles[0].id) : '');
    const [search, setSearch] = useState('');
    const [roleDrafts, setRoleDrafts] = useState({});
    const selectedRole = roles.find((role) => String(role.id) === selectedRoleId);
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        permissions: getRolePermissions(selectedRole),
    });

    const groupedPermissions = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        return permissions.reduce((groups, permission) => {
            const [moduleKey, ...actionParts] = permission.name.split('.');
            const actionKey = actionParts.join('.');
            const moduleLabel = MODULE_LABELS[moduleKey] || toTitle(moduleKey);
            const categoryKey = MODULE_CATEGORIES[moduleKey] || 'other';
            const categoryLabel = CATEGORY_LABELS[categoryKey] || 'Other permissions';
            const action = ACTION_DETAILS[actionKey] || { label: toTitle(actionKey), description: 'Application permission' };
            const matchesSearch = !searchTerm
                || permission.name.toLowerCase().includes(searchTerm)
                || moduleLabel.toLowerCase().includes(searchTerm)
                || categoryLabel.toLowerCase().includes(searchTerm)
                || action.label.toLowerCase().includes(searchTerm)
                || action.description.toLowerCase().includes(searchTerm);

            if (!matchesSearch) {
                return groups;
            }

            groups[moduleKey] ??= { key: moduleKey, label: moduleLabel, categoryKey, permissions: [] };
            groups[moduleKey].permissions.push({ ...permission, actionLabel: action.label, description: action.description });

            return groups;
        }, {});
    }, [permissions, search]);

    const updatePermissionSelection = (nextPermissions) => {
        setData('permissions', nextPermissions);
        setRoleDrafts((currentDrafts) => ({ ...currentDrafts, [selectedRoleId]: nextPermissions }));
    };

    const selectRole = (role) => {
        const nextRoleId = String(role.id);
        setSelectedRoleId(nextRoleId);
        setData('permissions', roleDrafts[nextRoleId] ?? getRolePermissions(role));
        clearErrors();
    };

    const togglePermission = (permissionName) => {
        if (!canUpdateRoles) return;
        const isSelected = data.permissions.includes(permissionName);
        const nextPermissions = isSelected
            ? data.permissions.filter((name) => name !== permissionName)
            : [...data.permissions, permissionName];

        updatePermissionSelection(nextPermissions);
    };

    const toggleModule = (modulePermissions) => {
        if (!canUpdateRoles) return;
        const names = modulePermissions.map((permission) => permission.name);
        const allSelected = names.every((name) => data.permissions.includes(name));
        const nextPermissions = allSelected
            ? data.permissions.filter((name) => !names.includes(name))
            : [...new Set([...data.permissions, ...names])];

        updatePermissionSelection(nextPermissions);
    };

    const submit = (event) => {
        event.preventDefault();

        if (!canUpdateRoles || !selectedRole) {
            return;
        }

        put(route('admin.permissions.update', selectedRole.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRoleDrafts((currentDrafts) => {
                    const nextDrafts = { ...currentDrafts };
                    delete nextDrafts[selectedRoleId];
                    return nextDrafts;
                });
            },
        });
    };

    const groups = Object.values(groupedPermissions)
        .sort((first, second) => {
            const firstIndex = MODULE_ORDER.indexOf(first.key);
            const secondIndex = MODULE_ORDER.indexOf(second.key);
            const normalizedFirstIndex = firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex;
            const normalizedSecondIndex = secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex;

            return normalizedFirstIndex - normalizedSecondIndex || first.label.localeCompare(second.label);
        })
        .map((group) => ({
            ...group,
            permissions: [...group.permissions].sort((first, second) => {
                const firstAction = first.name.split('.').at(-1);
                const secondAction = second.name.split('.').at(-1);
                const firstIndex = ACTION_ORDER.indexOf(firstAction);
                const secondIndex = ACTION_ORDER.indexOf(secondAction);
                const normalizedFirstIndex = firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex;
                const normalizedSecondIndex = secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex;

                return normalizedFirstIndex - normalizedSecondIndex || first.name.localeCompare(second.name);
            }),
        }));
    const categorizedGroups = [
        ...PERMISSION_CATEGORIES.map((category) => ({
            ...category,
            groups: groups.filter((group) => category.modules.includes(group.key)),
        })),
        ...(groups.some((group) => !MODULE_CATEGORIES[group.key]) ? [{
            key: 'other',
            label: 'Other permissions',
            description: 'Permissions for additional application modules.',
            groups: groups.filter((group) => !MODULE_CATEGORIES[group.key]),
        }] : []),
    ].filter((category) => category.groups.length > 0);
    const hasUnsavedChanges = Boolean(selectedRole) && (
        data.permissions.length !== selectedRole.permissions.length
        || data.permissions.some((permissionName) => !selectedRole.permissions.some((permission) => permission.name === permissionName))
    );
    const permissionError = errors.permissions || errors['permissions.0'];

    return (
        <AuthenticatedLayout>
            <Head title="Permission Management" />
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-7">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.03 5.91c-.56-.1-1.16.03-1.56.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.59l6.5-6.5c.4-.41.53-1 .43-1.57A6 6 0 1121.75 8.25" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-700">Access control</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Permission management</h1>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                            Manage role access by workflow category, module, and action.
                        </p>
                    </div>
                </section>

                <AccessControlNavigation active="permissions" />

                {roles.length === 0 ? (
                    <section className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5a6.5 6.5 0 00-13 0M9.5 11a4 4 0 110-8 4 4 0 010 8zm6.25-5.5h5m-2.5-2.5v5" />
                            </svg>
                        </div>
                        <h2 className="mt-3 text-base font-semibold text-gray-900">No roles to configure</h2>
                        <p className="mt-1 text-sm text-gray-500">Create a staff role first, then assign access to it here.</p>
                        {canCreateRole ? (
                            <Link href={route('admin.roles.create')} className="mt-5 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                                Create a role
                            </Link>
                        ) : (
                            <button type="button" disabled className="mt-5 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white cursor-not-allowed opacity-50">
                                Create a role
                            </button>
                        )}
                    </section>
                ) : (
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                            <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-6">
                                <div className="border-b border-gray-100 px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="font-semibold text-gray-900">Choose a role</h2>
                                            <p className="mt-0.5 text-xs text-gray-500">{roles.length} roles available</p>
                                        </div>
                                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{roles.length}</span>
                                    </div>
                                </div>
                                <div className="max-h-[420px] space-y-1 overflow-y-auto p-2 xl:max-h-[calc(100vh-360px)]">
                                    {roles.map((role) => {
                                        const isSelected = String(role.id) === selectedRoleId;
                                        const rolePermissionCount = (roleDrafts[String(role.id)] ?? getRolePermissions(role)).length;

                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => selectRole(role)}
                                                disabled={processing}
                                                aria-pressed={isSelected}
                                                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                    isSelected
                                                        ? 'border-primary-200 bg-primary-50 ring-1 ring-inset ring-primary-100'
                                                        : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                                    {role.name.slice(0, 1).toUpperCase()}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className={`block truncate text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-800'}`}>{role.name}</span>
                                                    <span className="mt-0.5 block text-xs text-gray-500">
                                                        {role.users_count ?? 0} staff <span aria-hidden="true">|</span> {rolePermissionCount} permissions
                                                    </span>
                                                </span>
                                                {isSelected && (
                                                    <svg className="h-4 w-4 shrink-0 text-primary-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 011.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                                    <div className="flex items-start gap-2.5">
                                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 1.75a.75.75 0 01.67.414l7.25 14.25a.75.75 0 01-.67 1.086H2.75a.75.75 0 01-.67-1.086l7.25-14.25A.75.75 0 0110 1.75zm0 5a.75.75 0 00-.75.75v3.25a.75.75 0 001.5 0V7.5a.75.75 0 00-.75-.75zm0 7a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs leading-5 text-gray-600">
                                            <span className="font-semibold text-gray-800">Super Admin is protected.</span> System permissions cannot be changed here.
                                        </p>
                                    </div>
                                </div>
                            </aside>

                            <div className="min-w-0 space-y-5">
                                {selectedRole && (
                                    <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-700">
                                                {selectedRole.name.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Editing permissions for</p>
                                                <h2 className="truncate text-lg font-bold text-gray-900">{selectedRole.name}</h2>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-5">
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-gray-900">{data.permissions.length}</p>
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Selected</p>
                                            </div>
                                            <div className="h-9 border-l border-gray-200" />
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-gray-900">{selectedRole.users_count ?? 0}</p>
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Staff</p>
                                            </div>
                                            <span className={`ml-1 rounded-full px-2.5 py-1 text-xs font-semibold ${hasUnsavedChanges ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'}`}>
                                                {hasUnsavedChanges ? 'Unsaved changes' : 'Up to date'}
                                            </span>
                                        </div>
                                    </section>
                                )}

                                <section className="space-y-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Module access</h2>
                                            <p className="mt-1 text-sm text-gray-500">Choose the actions this role can perform.</p>
                                        </div>
                                        <div className="relative w-full sm:max-w-sm">
                                            <label htmlFor="permission-search" className="sr-only">Search permissions</label>
                                            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 103.478 9.762l3.63 3.63a.75.75 0 101.06-1.06l-3.63-3.63A5.5 5.5 0 009 3.5zM5 9a4 4 0 118 0 4 4 0 01-8 0z" clipRule="evenodd" />
                                            </svg>
                                            <input
                                                id="permission-search"
                                                type="search"
                                                value={search}
                                                onChange={(event) => setSearch(event.target.value)}
                                                placeholder="Search actions or modules"
                                                className="w-full rounded-lg border-gray-300 py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                            />
                                        </div>
                                    </div>

                                    {permissionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{permissionError}</p>}

                                    {groups.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                                            <p className="text-sm font-semibold text-gray-700">No matching permissions</p>
                                            <p className="mt-1 text-sm text-gray-500">Try a different action or module name.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-7">
                                            {categorizedGroups.map((category, categoryIndex) => {
                                                const categoryPermissions = category.groups.flatMap((group) => group.permissions);
                                                const selectedInCategory = categoryPermissions.filter((permission) => data.permissions.includes(permission.name)).length;

                                                return (
                                                    <section key={category.key} className="space-y-3">
                                                        <div className="flex flex-col gap-2 border-b border-gray-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                                                            <div>
                                                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">Category {String(categoryIndex + 1).padStart(2, '0')}</p>
                                                                <h2 className="mt-1 text-lg font-bold tracking-tight text-gray-900">{category.label}</h2>
                                                                <p className="mt-0.5 text-sm text-gray-500">{category.description}</p>
                                                            </div>
                                                            <p className="shrink-0 text-xs font-medium text-gray-500">
                                                                {category.groups.length} modules <span className="px-1 text-gray-300">|</span> {selectedInCategory} of {categoryPermissions.length} permissions selected
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                                                            {category.groups.map((group) => {
                                                                const groupIndex = groups.findIndex((item) => item.key === group.key);
                                                                const selectedInModule = group.permissions.filter((permission) => data.permissions.includes(permission.name)).length;
                                                                const allSelected = selectedInModule === group.permissions.length;

                                                                return (
                                                                    <section key={group.key} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                                                        <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-3.5 sm:px-5">
                                                                            <div className="flex min-w-0 items-center gap-3">
                                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-500 ring-1 ring-inset ring-gray-200">
                                                                                    {String(groupIndex + 1).padStart(2, '0')}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <h3 className="truncate font-semibold text-gray-900">{group.label}</h3>
                                                                                    <p className="text-xs text-gray-500">{selectedInModule} of {group.permissions.length} selected</p>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleModule(group.permissions)}
                                                                                disabled={!canUpdateRoles || processing}
                                                                                className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                                                                            >
                                                                                {allSelected ? 'Clear' : search.trim() ? 'Select shown' : 'Select all'}
                                                                            </button>
                                                                        </div>
                                                                        <div className="divide-y divide-gray-100 px-4 sm:px-5">
                                                                            {group.permissions.map((permission) => {
                                                                                const isSelected = data.permissions.includes(permission.name);

                                                                                return (
                                                                                    <label
                                                                                        key={permission.id}
                                                                                        className={`-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-3 transition ${isSelected ? 'bg-primary-50/60' : 'hover:bg-gray-50'}`}
                                                                                    >
                                                                                        <span className="min-w-0">
                                                                                            <span className="flex flex-wrap items-center gap-2">
                                                                                                <span className="text-sm font-semibold text-gray-800">{permission.actionLabel}</span>
                                                                                                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">{permission.name}</span>
                                                                                            </span>
                                                                                            <span className="mt-1 block text-xs text-gray-500">{permission.description}</span>
                                                                                        </span>
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isSelected}
                                                                                            onChange={() => togglePermission(permission.name)}
                                                                                            disabled={!canUpdateRoles || processing}
                                                                                            aria-label={`${group.label}: ${permission.actionLabel}`}
                                                                                            className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50"
                                                                                        />
                                                                                    </label>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </section>
                                                                );
                                                            })}
                                                        </div>
                                                    </section>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-8 lg:px-8">
                            <p className="text-sm text-gray-500">
                                {hasUnsavedChanges ? 'Review your changes, then save to apply them to this role.' : 'No pending permission changes.'}
                            </p>
                            <button
                                type="submit"
                                disabled={!canUpdateRoles || processing || !selectedRole || !hasUnsavedChanges}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
                            >
                                {processing ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Saving changes...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path d="M3.5 3.5A1.5 1.5 0 015 2h8.379a1.5 1.5 0 011.06.44l2.121 2.12A1.5 1.5 0 0117 5.622V15a3 3 0 01-3 3H6a3 3 0 01-3-3V3.5z" />
                                            <path fill="#fff" d="M6 3.5h7v4H6zM6 11h8v6H6z" />
                                        </svg>
                                        Save permissions
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
