import AccessControlNavigation from '@/Components/AccessControlNavigation';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import usePermission from '@/Components/usePermission';
import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const MODULE_LABELS = {
    // Clinical Care & OPD
    patients: 'Patients Master (রোগী ব্যবস্থাপনা)',
    clinical_records: 'Clinical Chart Access (ক্লিনিক্যাল রেকর্ড)',
    visits: 'Consultations & Prescriptions (প্রেসক্রিপশন ও ভিজিট)',
    appointments: 'Appointments & Booking (অ্যাপয়েন্টমেন্ট)',
    calendar: 'Visual Doctor Calendar (ডক্টর ক্যালেন্ডার)',
    queue: 'Chamber Queue / Serial (চেম্বার সিরিয়াল)',
    attachments: 'Medical Scans & Reports (মেডিকেল রিপোর্ট)',
    reports: 'Clinical & Patient Reports (রিপোর্টস)',

    // Pharmacy, Medicines & Repertory
    medicines: 'Homeopathic Medicines (হোমিও ঔষধ ক্যাটালগ)',
    pharmaceuticals: 'General Pharmaceuticals (অ্যালোপ্যাথিক ঔষধ)',
    symptoms: 'Repertory Symptoms (লক্ষণ ভাণ্ডার)',
    symptom_medicine_map: 'Symptom-Medicine Rubrics (রুব্রিক ম্যাপিং)',
    advice_items: 'Clinical Advice Catalog (উপদেশ তালিকা)',
    food_restrictions: 'Dietary Restrictions (খাদ্য বিধি-নিষেধ)',
    prescription_options: 'Prescription Presets (প্রেসক্রিপশন কনফিগ)',
    manufacturers: 'Medicine Manufacturers (ঔষধ প্রস্তুতকারক)',
    inventory: 'Pharmacy & Stock Inventory (ইনভেন্টরি)',

    // Diagnostics & Labs
    lab_investigations: 'Diagnostic Lab Tests (ল্যাব পরীক্ষা ক্যাটালগ)',

    // Billing & POS
    billing: 'Billing & Cash Register (বিলিং ও ক্যাশ রেজিস্টার)',

    // Clinic Administration & Governance
    doctors: 'Doctor Profiles & Chambers (চিকিৎসক প্রোফাইল)',
    clinic_settings: 'Clinic Master Settings (ক্লিনিক সেটিংস)',
    general_settings: 'General Practice Settings (জেনারেল সেটিংস)',
    patient_config: 'Patient Form Configuration (রোগী ফর্ম কনফিগ)',
    system_health: 'System Health & Backups (সিস্টেম হেলথ)',
    users: 'Staff User Accounts (স্টাফ ইউজার)',
    roles: 'Role Definitions (রোল ব্যবস্থাপনা)',
    activity_logs: 'Audit & Security Logs (অডিট লগ)',
    communications: 'Patient Communications & SMS (যোগাযোগ)',
    settings: 'Legacy Clinic Settings (লেগ্যাসি সেটিংস)',
};

const ACTION_DETAILS = {
    amend: { label: 'Amend', description: 'Make changes to completed clinical records' },
    cancel: { label: 'Cancel', description: 'Cancel an issued prescription with an audit reason' },
    cancel_other: { label: 'Cancel for another Doctor', description: 'Cancel another practitioner’s prescription with authorization' },
    create: { label: 'Add / Create', description: 'Add new records to the catalog' },
    delete: { label: 'Delete', description: 'Permanently remove existing records' },
    export: { label: 'Export / Download', description: 'Download or export confidential records' },
    finalize: { label: 'Finalize / Issue', description: 'Authorize and complete clinical charts and prescriptions' },
    order: { label: 'Change Order', description: 'Change display or priority order' },
    review: { label: 'Review', description: 'Review clinical rubrics and mappings' },
    update: { label: 'Edit / Update', description: 'Modify existing records' },
    view: { label: 'View / Read', description: 'Access and view details' },
};

const PERMISSION_CATEGORIES = [
    {
        key: 'clinical_operations',
        label: 'Clinical Care & OPD (চিকিৎসা ও চেম্বার)',
        description: 'Patient records, consultation visits, clinical chart, appointments, queue, calendar, and reports.',
        icon: '🩺',
        modules: ['patients', 'clinical_records', 'visits', 'appointments', 'calendar', 'queue', 'attachments', 'reports'],
    },
    {
        key: 'medicines_repertory',
        label: 'Pharmacy, Medicines & Repertory (ঔষধ ও লক্ষণ ভাণ্ডার)',
        description: 'Homeopathic catalog, pharmaceuticals, symptom repertory, rubric map, advice, food restrictions, and inventory.',
        icon: '💊',
        modules: ['medicines', 'pharmaceuticals', 'symptoms', 'symptom_medicine_map', 'advice_items', 'food_restrictions', 'prescription_options', 'manufacturers', 'inventory'],
    },
    {
        key: 'diagnostics_investigations',
        label: 'Diagnostics & Lab Tests (ডায়াগনস্টিক ও ল্যাব)',
        description: 'Diagnostic test catalog, investigation orders, normal reference ranges, and test results.',
        icon: '🔬',
        modules: ['lab_investigations'],
    },
    {
        key: 'billing_pos',
        label: 'Billing & Cash Register (বিলিং ও ক্যাশ)',
        description: 'Chamber fees, patient billing, POS receipt printing, and bKash MFS payment records.',
        icon: '🧾',
        modules: ['billing'],
    },
    {
        key: 'administration',
        label: 'Clinic Administration & Governance (প্রশাসন ও নিরাপত্তা)',
        description: 'Doctor profiles, master settings, patient configuration, staff user accounts, role definitions, system health, and audit logs.',
        icon: '⚙️',
        modules: ['doctors', 'clinic_settings', 'general_settings', 'patient_config', 'system_health', 'users', 'roles', 'activity_logs', 'communications', 'settings'],
    },
];

const MODULE_CATEGORIES = Object.fromEntries(
    PERMISSION_CATEGORIES.flatMap((category) => category.modules.map((moduleKey) => [moduleKey, category.key])),
);

const MODULE_ORDER = PERMISSION_CATEGORIES.flatMap((category) => category.modules);

const CATEGORY_LABELS = Object.fromEntries(PERMISSION_CATEGORIES.map((category) => [category.key, category.label]));

const ACTION_ORDER = ['view', 'create', 'update', 'finalize', 'cancel', 'cancel_other', 'order', 'review', 'delete', 'export', 'amend'];

const toTitle = (value) => value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getRolePermissions = (role) => role?.permissions.map((permission) => permission.name) ?? [];

export default function Index({ roles = [], permissions = [], kpis = {}, filters = {} }) {
    const can = usePermission();
    const canCreateRole = can('roles.create');
    const canUpdateRoles = can('roles.update');

    // Role Selection Logic
    const initialRoleId = filters?.role || (typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('role')
        : null);
    const defaultRoleId = roles.some((r) => String(r.id) === String(initialRoleId))
        ? String(initialRoleId)
        : (roles[0] ? String(roles[0].id) : '');

    const [selectedRoleId, setSelectedRoleId] = useState(defaultRoleId);
    const [search, setSearch] = useState('');
    const [roleSearch, setRoleSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'granted', 'revoked'
    const [roleDrafts, setRoleDrafts] = useState({});

    const selectedRole = roles.find((role) => String(role.id) === selectedRoleId);
    const { data, setData, put, processing, errors, clearErrors } = useForm({
        permissions: getRolePermissions(selectedRole),
    });

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

    // Category Bulk Actions
    const grantCategory = (categoryGroups) => {
        if (!canUpdateRoles) return;
        const catPermNames = categoryGroups.flatMap((g) => g.permissions.map((p) => p.name));
        updatePermissionSelection([...new Set([...data.permissions, ...catPermNames])]);
    };

    const revokeCategory = (categoryGroups) => {
        if (!canUpdateRoles) return;
        const catPermNames = new Set(categoryGroups.flatMap((g) => g.permissions.map((p) => p.name)));
        updatePermissionSelection(data.permissions.filter((name) => !catPermNames.has(name)));
    };

    // Fast Clinical Presets
    const applyPreset = (presetKey) => {
        if (!canUpdateRoles || !selectedRole) return;
        let targetModules = [];
        if (presetKey === 'doctor') {
            targetModules = ['patients', 'clinical_records', 'visits', 'appointments', 'calendar', 'queue', 'attachments', 'reports', 'medicines', 'pharmaceuticals', 'symptoms', 'symptom_medicine_map', 'advice_items', 'food_restrictions', 'prescription_options', 'lab_investigations'];
        } else if (presetKey === 'receptionist') {
            targetModules = ['patients', 'appointments', 'calendar', 'queue', 'attachments', 'billing', 'patient_config'];
        } else if (presetKey === 'pharmacist') {
            targetModules = ['medicines', 'pharmaceuticals', 'inventory', 'manufacturers', 'visits'];
        } else if (presetKey === 'cashier') {
            targetModules = ['billing', 'patients', 'visits'];
        }

        const presetPermissions = permissions
            .filter((p) => {
                const mod = p.name.split('.')[0];
                return targetModules.includes(mod);
            })
            .map((p) => p.name);

        updatePermissionSelection([...new Set([...data.permissions, ...presetPermissions])]);
    };

    const resetCurrentRoleToOriginal = () => {
        if (!selectedRole) return;
        setData('permissions', getRolePermissions(selectedRole));
        setRoleDrafts((prev) => {
            const next = { ...prev };
            delete next[selectedRoleId];
            return next;
        });
        clearErrors();
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

    // Grouping & Filtering Permissions
    const groupedPermissions = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        return permissions.reduce((groups, permission) => {
            const [moduleKey, ...actionParts] = permission.name.split('.');
            const actionKey = actionParts.join('.');
            const moduleLabel = MODULE_LABELS[moduleKey] || toTitle(moduleKey);
            const categoryKey = MODULE_CATEGORIES[moduleKey] || 'other';
            const categoryLabel = CATEGORY_LABELS[categoryKey] || 'Other permissions';
            const action = ACTION_DETAILS[actionKey] || { label: toTitle(actionKey), description: 'Application permission' };

            const isGranted = data.permissions.includes(permission.name);

            // Status Filter check
            if (statusFilter === 'granted' && !isGranted) return groups;
            if (statusFilter === 'revoked' && isGranted) return groups;

            // Category Filter check
            if (selectedCategory !== 'all' && categoryKey !== selectedCategory) return groups;

            // Search Term check
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
    }, [permissions, search, selectedCategory, statusFilter, data.permissions]);

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
            icon: '📦',
            groups: groups.filter((group) => !MODULE_CATEGORIES[group.key]),
        }] : []),
    ].filter((category) => category.groups.length > 0);

    const hasUnsavedChanges = Boolean(selectedRole) && (
        data.permissions.length !== selectedRole.permissions.length
        || data.permissions.some((permissionName) => !selectedRole.permissions.some((permission) => permission.name === permissionName))
    );
    const permissionError = errors.permissions || errors['permissions.0'];

    const filteredRoles = useMemo(() => {
        if (!roleSearch.trim()) return roles;
        const q = roleSearch.toLowerCase();
        return roles.filter((r) => r.name.toLowerCase().includes(q));
    }, [roles, roleSearch]);

    // Live counts for status pills
    const totalSelected = data.permissions.length;
    const totalRevoked = permissions.length - totalSelected;
    const coveragePercent = permissions.length > 0 ? Math.round((totalSelected / permissions.length) * 100) : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Permission Management & Access Matrix" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 pb-24 sm:pb-16">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Permission Management Matrix (পারমিশন ও এক্সেস ম্যাট্রিক্স)"
                    subtitle="Configure granular module authorizations, clinical chart permissions, and action scopes across clinic roles"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.users.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>👥</span> Staff Users
                            </Link>
                            <Link
                                href={route('admin.roles.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🛡️</span> Roles Directory
                            </Link>
                            <Link
                                href={route('admin.activity_logs.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>📜</span> Security Logs
                            </Link>
                            <Link
                                href={route('admin.system_health.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🏥</span> System Health
                            </Link>
                            {canCreateRole && (
                                <Link
                                    href={route('admin.roles.create')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-primary-700"
                                >
                                    <span>➕</span> Create Role
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Sub-Navigation */}
                <AccessControlNavigation active="permissions" />

                {/* Executive KPI Summary Ribbon (5 Cards) */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Permission Matrix Overview">
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Configured Roles 🛡️</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{kpis.total_roles ?? roles.length}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">কনফিগারযোগ্য রোলসমূহ</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">System Catalog 🔑</div>
                        <div className="text-2xl font-bold text-violet-900 mt-1">{permissions.length}</div>
                        <div className="text-[11px] text-violet-600 mt-0.5">মোট পারমিশন অ্যাকশন</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-primary-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-primary-700 uppercase tracking-wider">Active Role In Focus 🎯</div>
                        <div className="text-xl font-bold text-primary-900 mt-1 truncate" title={selectedRole?.name}>
                            {selectedRole?.name ?? 'None'}
                        </div>
                        <div className="text-[11px] text-primary-600 mt-0.5">বর্তমান টার্গেট রোল</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Granted Coverage 📊</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1 flex items-baseline gap-1.5">
                            <span>{totalSelected}</span>
                            <span className="text-xs font-semibold text-emerald-600">({coveragePercent}%)</span>
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">প্রদত্ত অ্যাক্সেস কভারেজ</div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Staff Impacted 👥</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{selectedRole?.users_count ?? 0}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">সরাসরি কার্যকর স্টাফ</div>
                    </div>
                </section>

                {roles.length === 0 ? (
                    <section className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <span className="text-2xl">🛡️</span>
                        </div>
                        <h2 className="mt-3 text-base font-semibold text-gray-900">No roles to configure</h2>
                        <p className="mt-1 text-sm text-gray-500">Create a staff role first, then assign access to it here.</p>
                        {canCreateRole && (
                            <Link href={route('admin.roles.create')} className="mt-5 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
                                Create a role
                            </Link>
                        )}
                    </section>
                ) : (
                    <form onSubmit={submit} className="space-y-6">
                        {/* Mobile / Tablet Role Selector Carousel (visible on < xl) */}
                        <div className="block xl:hidden rounded-xl border border-gray-200 bg-white p-3 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 px-1">
                                <span>🎯 Select Role to Configure ({roles.length}):</span>
                                {selectedRole?.users_count > 0 && (
                                    <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                        ⚠️ {selectedRole.users_count} staff bound
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                                {roles.map((role) => {
                                    const isSelected = String(role.id) === selectedRoleId;
                                    const rolePermCount = (roleDrafts[String(role.id)] ?? getRolePermissions(role)).length;

                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() => selectRole(role)}
                                            disabled={processing}
                                            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                                                isSelected
                                                    ? 'bg-primary-600 text-white border-primary-700 shadow-2xs'
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                                                isSelected ? 'bg-primary-800 text-white' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {role.name.slice(0, 1).toUpperCase()}
                                            </span>
                                            <span>{role.name}</span>
                                            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                                                isSelected ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {rolePermCount}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Grid: Desktop Sticky Sidebar + Permission Matrix */}
                        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
                            {/* Desktop Sidebar (hidden on < xl) */}
                            <aside className="hidden xl:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-6">
                                <div className="border-b border-gray-100 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="font-semibold text-gray-900 text-sm">Choose Role</h2>
                                            <p className="text-xs text-gray-500">{roles.length} roles available</p>
                                        </div>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">{roles.length}</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={roleSearch}
                                            onChange={(e) => setRoleSearch(e.target.value)}
                                            placeholder="Filter roles..."
                                            className="w-full rounded-md border-gray-300 py-1.5 pl-3 pr-7 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                        />
                                        {roleSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setRoleSearch('')}
                                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-xs text-gray-400 hover:text-gray-600"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="max-h-[calc(100vh-420px)] space-y-1 overflow-y-auto p-2">
                                    {filteredRoles.map((role) => {
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
                                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                                    isSelected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {role.name.slice(0, 1).toUpperCase()}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className={`block truncate text-sm font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-800'}`}>
                                                        {role.name}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-gray-500">
                                                        {role.users_count ?? 0} staff <span aria-hidden="true">|</span> {rolePermissionCount} perms
                                                    </span>
                                                </span>
                                                {isSelected && (
                                                    <span className="text-primary-600 font-bold text-sm">✓</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="border-t border-gray-100 bg-amber-50/50 p-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-sm">👑</span>
                                        <p className="text-[11px] leading-4 text-amber-900">
                                            <span className="font-bold">Super Admin Protected:</span> System permissions are immutable for the Super Admin role.
                                        </p>
                                    </div>
                                </div>
                            </aside>

                            {/* Center Column: Permission Workstation Controls & Matrix */}
                            <div className="min-w-0 space-y-5">
                                {/* Role Header Card & Fast Clinical Presets */}
                                {selectedRole && (
                                    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-sm font-bold text-primary-700 border border-primary-200">
                                                    {selectedRole.name.slice(0, 1).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Editing Permissions For</p>
                                                    <h2 className="truncate text-lg font-bold text-gray-900 flex items-center gap-2">
                                                        <span>{selectedRole.name}</span>
                                                        <span className="text-xs font-normal text-gray-500">({selectedRole.guard_name})</span>
                                                    </h2>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-gray-900">{data.permissions.length}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Granted</p>
                                                </div>
                                                <div className="h-8 border-l border-gray-200" />
                                                <div className="text-center">
                                                    <p className="text-lg font-bold text-gray-900">{selectedRole.users_count ?? 0}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Staff</p>
                                                </div>
                                                <span className={`ml-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                    hasUnsavedChanges
                                                        ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 font-bold'
                                                        : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                                }`}>
                                                    {hasUnsavedChanges ? '⚠️ Unsaved Changes' : '✅ Up to date'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Clinical Role Quick Presets Strip */}
                                        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Clinical Presets:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('doctor')}
                                                    disabled={!canUpdateRoles || processing}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition disabled:opacity-50"
                                                    title="Auto-grant clinical, consultation, medicine, and diagnostic permissions"
                                                >
                                                    <span>🩺 Doctor</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('receptionist')}
                                                    disabled={!canUpdateRoles || processing}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition disabled:opacity-50"
                                                    title="Auto-grant queue, appointments, calendar, patient create/view"
                                                >
                                                    <span>📋 Front Desk</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('pharmacist')}
                                                    disabled={!canUpdateRoles || processing}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition disabled:opacity-50"
                                                    title="Auto-grant medicines, pharmaceuticals, and pharmacy inventory"
                                                >
                                                    <span>💊 Pharmacist</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyPreset('cashier')}
                                                    disabled={!canUpdateRoles || processing}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
                                                    title="Auto-grant billing and cash register"
                                                >
                                                    <span>💵 Cashier</span>
                                                </button>
                                            </div>

                                            {hasUnsavedChanges && (
                                                <button
                                                    type="button"
                                                    onClick={resetCurrentRoleToOriginal}
                                                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline transition"
                                                >
                                                    Revert to Saved
                                                </button>
                                            )}
                                        </div>

                                        {/* Impact Warning Banner if role has active users */}
                                        {Number(selectedRole.users_count) > 0 && (
                                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex items-center justify-between text-xs text-amber-900">
                                                <div className="flex items-center gap-2">
                                                    <span>⚠️</span>
                                                    <span>
                                                        <strong>Impact Alert:</strong> Changes to <strong>{selectedRole.name}</strong> will immediately take effect for <strong>{selectedRole.users_count}</strong> active staff members.
                                                    </span>
                                                </div>
                                                <Link
                                                    href={route('admin.users.index', { role: selectedRole.name })}
                                                    className="text-primary-700 font-bold hover:underline shrink-0 ml-2"
                                                >
                                                    View Staff →
                                                </Link>
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* Universal Search & Status Filters */}
                                <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="relative flex-1">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Search permissions by action (e.g. view, create, finalize) or module..."
                                                className="w-full rounded-lg border-gray-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            {search && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearch('')}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Status Filter Pills */}
                                        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden sm:inline">Status:</span>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                    statusFilter === 'all'
                                                        ? 'bg-primary-600 text-white shadow-2xs'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                All ({permissions.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('granted')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                    statusFilter === 'granted'
                                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                                }`}
                                            >
                                                ✅ Granted ({totalSelected})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('revoked')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                    statusFilter === 'revoked'
                                                        ? 'bg-gray-700 text-white shadow-2xs'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                ⚪ Revoked ({totalRevoked})
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Redesigned Category Navigation Tabs Bar */}
                                <section className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                            <span>📑</span>
                                            <span>Module Category Filter (ক্লিনিক্যাল ক্যাটাগরি ফিল্টার)</span>
                                        </span>
                                        {selectedCategory !== 'all' && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory('all')}
                                                className="text-xs text-primary-700 hover:text-primary-800 hover:underline font-bold transition"
                                            >
                                                View All Categories ({PERMISSION_CATEGORIES.length}) →
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategory('all')}
                                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                selectedCategory === 'all'
                                                    ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <span>🌐</span>
                                            <span>All Categories</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                selectedCategory === 'all' ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700'
                                            }`}>
                                                {PERMISSION_CATEGORIES.length}
                                            </span>
                                        </button>

                                        {PERMISSION_CATEGORIES.map((cat) => {
                                            const isCatSelected = selectedCategory === cat.key;
                                            const catPerms = permissions.filter((p) => cat.modules.includes(p.name.split('.')[0]));
                                            const catGranted = catPerms.filter((p) => data.permissions.includes(p.name)).length;

                                            return (
                                                <button
                                                    key={cat.key}
                                                    type="button"
                                                    onClick={() => setSelectedCategory(cat.key)}
                                                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                        isCatSelected
                                                            ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                                >
                                                    <span>{cat.icon}</span>
                                                    <span>{cat.label.split('(')[0].trim()}</span>
                                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                                        isCatSelected ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-600'
                                                    }`}>
                                                        {catGranted}/{catPerms.length}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>

                                {permissionError && (
                                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {permissionError}
                                    </div>
                                )}

                                {/* Permissions Categorized Matrix */}
                                {categorizedGroups.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                                        <p className="text-sm font-semibold text-gray-700">No matching permissions</p>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Try adjusting your search query or clear the active category and status filters.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearch('');
                                                setSelectedCategory('all');
                                                setStatusFilter('all');
                                            }}
                                            className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {categorizedGroups.map((category, categoryIndex) => {
                                            const categoryPermissions = category.groups.flatMap((group) => group.permissions);
                                            const selectedInCategory = categoryPermissions.filter((permission) => data.permissions.includes(permission.name)).length;
                                            const allInCategorySelected = selectedInCategory === categoryPermissions.length && categoryPermissions.length > 0;

                                            return (
                                                <section key={category.key} className="space-y-4">
                                                    {/* Category Header with Bulk Actions */}
                                                    <div className="flex flex-col gap-2 border-b border-gray-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg">{category.icon}</span>
                                                                <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
                                                                    {category.label}
                                                                </h2>
                                                            </div>
                                                            <p className="mt-0.5 text-xs text-gray-500">{category.description}</p>
                                                        </div>

                                                        {/* Category Bulk Controls */}
                                                        <div className="flex items-center gap-3 self-start sm:self-auto">
                                                            <span className="text-xs font-semibold text-gray-500">
                                                                {selectedInCategory} / {categoryPermissions.length} selected
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => grantCategory(category.groups)}
                                                                    disabled={!canUpdateRoles || processing || allInCategorySelected}
                                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition disabled:opacity-50"
                                                                >
                                                                    Grant Category
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => revokeCategory(category.groups)}
                                                                    disabled={!canUpdateRoles || processing || selectedInCategory === 0}
                                                                    className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition disabled:opacity-50"
                                                                >
                                                                    Revoke
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Modules Grid */}
                                                    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                                                        {category.groups.map((group) => {
                                                            const selectedInModule = group.permissions.filter((permission) => data.permissions.includes(permission.name)).length;
                                                            const allSelected = selectedInModule === group.permissions.length && group.permissions.length > 0;

                                                            return (
                                                                <section key={group.key} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                                                                    <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
                                                                        <div className="min-w-0">
                                                                            <h3 className="truncate font-bold text-gray-900 text-sm">{group.label}</h3>
                                                                            <p className="text-[11px] text-gray-500">
                                                                                {selectedInModule} of {group.permissions.length} actions granted
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleModule(group.permissions)}
                                                                            disabled={!canUpdateRoles || processing}
                                                                            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-2xs transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                                                                        >
                                                                            {allSelected ? 'Revoke All' : 'Select All'}
                                                                        </button>
                                                                    </div>

                                                                    <div className="divide-y divide-gray-100 px-4 sm:px-5">
                                                                        {group.permissions.map((permission) => {
                                                                            const isSelected = data.permissions.includes(permission.name);

                                                                            return (
                                                                                <label
                                                                                    key={permission.id}
                                                                                    className={`-mx-2 flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition ${
                                                                                        isSelected ? 'bg-primary-50/60' : 'hover:bg-gray-50'
                                                                                    }`}
                                                                                >
                                                                                    <span className="min-w-0">
                                                                                        <span className="flex flex-wrap items-center gap-2">
                                                                                            <span className="text-xs sm:text-sm font-semibold text-gray-800">
                                                                                                {permission.actionLabel}
                                                                                            </span>
                                                                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 border border-gray-200">
                                                                                                {permission.name}
                                                                                            </span>
                                                                                        </span>
                                                                                        <span className="mt-0.5 block text-[11px] text-gray-500">
                                                                                            {permission.description}
                                                                                        </span>
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
                            </div>
                        </div>

                        {/* Sticky Bottom Save Drawer */}
                        <div className="sticky bottom-0 z-20 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <span>Target Role: <strong>{selectedRole?.name}</strong></span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            hasUnsavedChanges
                                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        }`}>
                                            {hasUnsavedChanges ? '⚠️ Unsaved Changes' : '✅ Saved & Current'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {hasUnsavedChanges
                                            ? `Pending changes: ${data.permissions.length} total permissions will be granted to this role.`
                                            : `All permissions match the active security profile for ${selectedRole?.name}.`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    {hasUnsavedChanges && (
                                        <button
                                            type="button"
                                            onClick={resetCurrentRoleToOriginal}
                                            disabled={processing}
                                            className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition disabled:opacity-50"
                                        >
                                            Revert
                                        </button>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={!canUpdateRoles || processing || !selectedRole || !hasUnsavedChanges}
                                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                                    >
                                        {processing ? (
                                            <>
                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                Saving permissions...
                                            </>
                                        ) : (
                                            <>
                                                <span>💾 Save Permissions</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
