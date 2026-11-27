import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import ConfirmDialog from '@/Components/ConfirmDialog';
import usePermission from '@/Components/usePermission';
import { Head, Link, router, useForm } from '@inertiajs/react';
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
                className="mt-0.5 rounded border-gray-300 text-teal-600 shadow-sm focus:ring-teal-500 disabled:opacity-60 cursor-pointer"
            />
            <span>
                <span className="block text-sm font-medium text-gray-800">{label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">{description}</span>
            </span>
        </label>
    );
}

export default function General({ profiles = [], kpis = {}, oldOrOtherIdConfig = {} }) {
    const can = usePermission();
    const canCreate = can('general_settings.create');
    const canUpdate = can('general_settings.update');
    const canDelete = can('general_settings.delete');

    const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'old_id'
    const [editingProfile, setEditingProfile] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Search and Status Filters for Categories
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

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

    // Form for Old / Other ID Configuration (Preserved 100% Business Logic)
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

    // Executive KPI Summary Metrics
    const stats = useMemo(() => {
        const totalProfiles = profiles.length;
        const activeProfiles = profiles.filter((p) => p.is_active).length;
        const defaultProfile = profiles.find((p) => p.is_default);
        const totalPatients = profiles.reduce((sum, p) => sum + (Number(p.patients_count) || 0), 0);

        return {
            total_profiles: kpis.total_profiles ?? totalProfiles,
            active_profiles: kpis.active_profiles ?? activeProfiles,
            default_profile_name: defaultProfile?.name ?? kpis.default_profile_name ?? 'None',
            default_profile_preview: defaultProfile?.preview ?? kpis.default_profile_preview ?? 'None',
            old_id_mode: oldIdData.mode === 'auto' ? 'Auto Generator' : 'Manual Entry',
            old_id_preview: oldOrOtherIdConfig.preview ?? `${oldIdData.prefix || 'OLD-'}0001`,
            total_registered_patients: kpis.total_registered_patients ?? totalPatients,
        };
    }, [profiles, kpis, oldOrOtherIdConfig, oldIdData.mode, oldIdData.prefix]);

    // Live Old / Other ID Preview
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

    // Live Primary Category ID Preview
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

    // Fast-Track Clinical Numbering Presets
    const FAST_PRESETS = [
        { label: '🩺 General', name: 'General Patients', category: 'General', category_code: 'GEN', prefix: 'HC', number_padding: 4 },
        { label: '👶 Pediatric', name: 'Pediatric Patients', category: 'Child', category_code: 'CH', prefix: 'HC', number_padding: 4 },
        { label: '🧓 Senior', name: 'Senior Citizens', category: 'Senior', category_code: 'SNR', prefix: 'HC', number_padding: 4 },
        { label: '🎪 Free Camp', name: 'Free Camp Patients', category: 'Camp', category_code: 'FREE', prefix: 'CAMP', number_padding: 4 },
    ];

    const applyPreset = (preset) => {
        setProfileData((current) => ({
            ...current,
            name: preset.name,
            category: preset.category,
            category_code: preset.category_code,
            prefix: preset.prefix,
            number_padding: preset.number_padding,
            separator: '-',
            include_year: true,
            reset_annually: true,
        }));
        clearProfileErrors();
    };

    // Filtered Category Profiles
    const filteredProfiles = useMemo(() => {
        let list = profiles;
        if (statusFilter === 'active') {
            list = list.filter((p) => p.is_active);
        } else if (statusFilter === 'inactive') {
            list = list.filter((p) => !p.is_active);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((p) =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q)) ||
                (p.category_code && p.category_code.toLowerCase().includes(q)) ||
                (p.prefix && p.prefix.toLowerCase().includes(q)) ||
                (p.preview && p.preview.toLowerCase().includes(q))
            );
        }
        return list;
    }, [profiles, searchQuery, statusFilter]);

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

        // On mobile, auto-scroll to the form container
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setTimeout(() => {
                document.getElementById('profile-form-container')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
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
        <AuthenticatedLayout>
            <Head title="General Settings - Patient Numbering" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* RemediQ PageHeader with Cross-Module Navigation */}
                <PageHeader
                    title="General Settings &amp; Patient Numbering (সাধারণ সেটিংস ও রোগী আইডি বিন্যাস)"
                    subtitle="Configure category numbering series, barcode formatting, digit zero-padding, and legacy Old/Other ID generation strategies"
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
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>➕</span> Register Patient
                            </Link>
                            <Link
                                href={route('admin.settings.edit')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>⚙️</span> Clinic Settings
                            </Link>
                            <Link
                                href={route('admin.prescription_options.edit')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>📝</span> Rx Presets
                            </Link>
                        </div>
                    }
                />

                {/* Executive KPI Ribbon (5 Tiles) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Numbering Profiles</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_profiles}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">ক্যাটাগরি সিরিজ অপশন</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Active in Intake 🩺</div>
                        <div className="text-2xl font-bold text-teal-800 mt-1">{stats.active_profiles}</div>
                        <div className="text-[11px] text-teal-600 mt-0.5">ফর্ম নিবন্ধনে সক্রিয়</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Default Category</div>
                        <div className="text-sm font-bold text-blue-900 truncate mt-1" title={stats.default_profile_name}>
                            {stats.default_profile_name}
                        </div>
                        <div className="text-[11px] text-blue-600 font-mono mt-0.5">{stats.default_profile_preview}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Old ID Strategy</div>
                        <div className="text-sm font-bold text-purple-900 mt-1">
                            {stats.old_id_mode}
                        </div>
                        <div className="text-[11px] text-purple-600 font-mono mt-0.5">{stats.old_id_preview}</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Total Patients</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">{stats.total_registered_patients}</div>
                        <div className="text-[11px] text-amber-600 mt-0.5">ধারাবাহিক কোডে নিবন্ধিত</div>
                    </div>
                </div>

                {/* Segmented Navigation Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4">
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('categories')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                                activeTab === 'categories'
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>🏷️</span>
                            <span>Primary Patient ID (Categories)</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${activeTab === 'categories' ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {activeProfileCount} active
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('old_id')}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                                activeTab === 'old_id'
                                    ? 'bg-teal-600 text-white shadow-2xs'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>📇</span>
                            <span>Old / Other ID Numbering</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${oldIdData.mode === 'auto' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {oldIdData.mode === 'auto' ? 'Auto Mode' : 'Manual Mode'}
                            </span>
                        </button>
                    </div>

                    {/* TAB 1: PRIMARY PATIENT ID (CATEGORIES) */}
                    {activeTab === 'categories' && (
                        <div className="pt-4 grid items-start gap-6 lg:grid-cols-2">
                            {/* Left Column: Numbering Options List & Search Bar */}
                            <section className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                                    <div>
                                        <h2 className="text-sm font-bold text-gray-900">Configured Categories ({profiles.length})</h2>
                                        <p className="text-xs text-gray-500">Categories assign unique sequential ID series during intake.</p>
                                    </div>
                                    <span className="self-start sm:self-auto rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200">
                                        {activeProfileCount} active series
                                    </span>
                                </div>

                                {/* Category Search Bar & Status Filter Pills */}
                                <div className="space-y-2">
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search categories by name, code, category, or prefix (e.g. child, HC, CH)..."
                                            className="w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white shadow-2xs"
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchQuery('')}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 font-bold text-xs"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Status Filter Tabs */}
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-2 py-0.5 rounded-md font-medium transition ${
                                                    statusFilter === 'all'
                                                        ? 'bg-gray-800 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                All ({profiles.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('active')}
                                                className={`px-2 py-0.5 rounded-md font-medium transition ${
                                                    statusFilter === 'active'
                                                        ? 'bg-teal-700 text-white'
                                                        : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                                                }`}
                                            >
                                                Active ({activeProfileCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('inactive')}
                                                className={`px-2 py-0.5 rounded-md font-medium transition ${
                                                    statusFilter === 'inactive'
                                                        ? 'bg-gray-700 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                Inactive ({profiles.length - activeProfileCount})
                                            </button>
                                        </div>
                                        {searchQuery && (
                                            <span className="text-[11px] font-semibold text-teal-700">
                                                Matching {filteredProfiles.length} of {profiles.length}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Profiles Listing Container */}
                                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-2xs">
                                    {filteredProfiles.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-gray-400">
                                            No category profiles match &quot;{searchQuery}&quot;.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {filteredProfiles.map((profile) => (
                                                <article key={profile.id} className="p-4 hover:bg-gray-50/50 transition">
                                                    {/* Desktop Presentation */}
                                                    <div className="hidden sm:flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="font-bold text-gray-900 text-sm">{profile.name}</h3>
                                                                {profile.is_default && (
                                                                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800 border border-teal-200">
                                                                        ⭐ Default Series
                                                                    </span>
                                                                )}
                                                                <span className={profile.is_active ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700' : 'rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600'}>
                                                                    {profile.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-gray-600">
                                                                Category: <strong className="font-semibold text-gray-800">{profile.category}</strong>
                                                                {profile.category_code ? ' (' + profile.category_code + ')' : ''}
                                                            </p>
                                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                                                                <span>Prefix: <strong className="font-mono font-semibold text-gray-700">{profile.prefix}</strong></span>
                                                                <span>{profile.include_year ? 'Year included' : 'No year'}</span>
                                                                {profile.reset_annually && <span>Annual reset</span>}
                                                                <span className="font-medium text-gray-700">{profile.patients_count} registered</span>
                                                            </div>
                                                            <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1 border border-gray-200 text-xs font-mono">
                                                                <span className="text-[11px] text-gray-500 font-sans">Next ID:</span>
                                                                <strong className="text-teal-900 font-bold">{profile.preview}</strong>
                                                            </div>
                                                        </div>
                                                        <div className="flex shrink-0 items-center gap-1.5 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditing(profile)}
                                                                disabled={!canUpdate}
                                                                className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget(profile)}
                                                                disabled={!canDelete || !profile.is_active || activeProfileCount <= 1}
                                                                className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                                                                title={activeProfileCount <= 1 ? 'At least one active option must remain' : 'Deactivate profile'}
                                                            >
                                                                Deactivate
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Mobile High-Density Touch Card (block sm:hidden) */}
                                                    <div className="block sm:hidden space-y-2.5">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 text-sm leading-tight">{profile.name}</h3>
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    Category: <strong className="text-gray-700">{profile.category}</strong>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {profile.is_default && (
                                                                    <span className="rounded-full bg-teal-50 px-2 py-0.2 text-[9px] font-bold text-teal-800 border border-teal-200">
                                                                        Default
                                                                    </span>
                                                                )}
                                                                <span className={profile.is_active ? 'rounded-full bg-emerald-50 px-2 py-0.2 text-[9px] font-bold text-emerald-700' : 'rounded-full bg-gray-100 px-2 py-0.2 text-[9px] font-medium text-gray-600'}>
                                                                    {profile.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Next ID Preview Badge */}
                                                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex items-center justify-between text-xs font-mono">
                                                            <span className="text-[11px] text-gray-500 font-sans">Next ID:</span>
                                                            <span className="font-bold text-teal-900">{profile.preview}</span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                                                            <span>Prefix: <strong className="font-mono text-gray-700">{profile.prefix}</strong></span>
                                                            <span>{profile.patients_count} patients</span>
                                                        </div>

                                                        {/* Touch Bottom Action Bar (44px min height) */}
                                                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditing(profile)}
                                                                disabled={!canUpdate}
                                                                className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
                                                            >
                                                                Edit Profile
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeleteTarget(profile)}
                                                                disabled={!canDelete || !profile.is_active || activeProfileCount <= 1}
                                                                className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-40 transition"
                                                            >
                                                                Deactivate
                                                            </button>
                                                        </div>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}

                                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                                        Updating a profile affects newly registered patients only. Existing patient permanent IDs are preserved.
                                    </div>
                                </div>
                            </section>

                            {/* Right Column: Add / Edit Option Form */}
                            <section id="profile-form-container" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                                <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                                            {editingProfile ? 'Edit Profile' : 'New Category Profile'}
                                        </span>
                                        <h2 className="text-base font-bold text-gray-900 mt-0.5">
                                            {editingProfile ? `Update: ${editingProfile.name}` : 'Add Numbering Option'}
                                        </h2>
                                    </div>

                                    {/* 1-Click Fast-Track Presets Toolbar */}
                                    {!editingProfile && (
                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-[10px] text-gray-400 font-medium mr-0.5">Presets:</span>
                                            {FAST_PRESETS.map((p, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => applyPreset(p)}
                                                    className="px-2 py-0.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-800 text-gray-700 rounded text-[11px] font-medium border border-gray-200 transition"
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {((!canCreate && !editingProfile) || (!canUpdate && editingProfile)) ? (
                                    <p className="rounded-lg bg-gray-50 p-4 text-xs text-gray-600">You have view-only access to numbering options.</p>
                                ) : (
                                    <form onSubmit={submitProfile} className="space-y-4 text-xs">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="profile_name" className="mb-1 block font-semibold text-gray-700">Option Name</label>
                                                <input
                                                    id="profile_name"
                                                    value={profileData.name}
                                                    onChange={(event) => setProfileData('name', event.target.value)}
                                                    maxLength={100}
                                                    required
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                                    placeholder="e.g. Pediatric Patients"
                                                />
                                                {profileErrors.name && <p className="mt-1 text-[11px] text-red-600">{profileErrors.name}</p>}
                                            </div>
                                            <div>
                                                <label htmlFor="profile_category" className="mb-1 block font-semibold text-gray-700">Category Label</label>
                                                <input
                                                    id="profile_category"
                                                    value={profileData.category}
                                                    onChange={(event) => setProfileData('category', event.target.value)}
                                                    maxLength={100}
                                                    required
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                                    placeholder="e.g. Child"
                                                />
                                                {profileErrors.category && <p className="mt-1 text-[11px] text-red-600">{profileErrors.category}</p>}
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="profile_prefix" className="mb-1 block font-semibold text-gray-700">ID Prefix</label>
                                                <input
                                                    id="profile_prefix"
                                                    value={profileData.prefix}
                                                    onChange={(event) => setProfileData('prefix', event.target.value.toUpperCase())}
                                                    maxLength={10}
                                                    required
                                                    className="w-full rounded-md border-gray-300 font-mono text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                                    placeholder="e.g. HC"
                                                />
                                                {profileErrors.prefix && <p className="mt-1 text-[11px] text-red-600">{profileErrors.prefix}</p>}
                                            </div>
                                            <div>
                                                <label htmlFor="profile_category_code" className="mb-1 block font-semibold text-gray-700">
                                                    Category Code <span className="text-gray-400 font-normal">(optional)</span>
                                                </label>
                                                <input
                                                    id="profile_category_code"
                                                    value={profileData.category_code}
                                                    onChange={(event) => setProfileData('category_code', event.target.value.toUpperCase())}
                                                    maxLength={10}
                                                    className="w-full rounded-md border-gray-300 font-mono text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                                    placeholder="e.g. CH"
                                                />
                                                {profileErrors.category_code && <p className="mt-1 text-[11px] text-red-600">{profileErrors.category_code}</p>}
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="profile_separator" className="mb-1 block font-semibold text-gray-700">ID Separator</label>
                                                <select
                                                    id="profile_separator"
                                                    value={profileData.separator}
                                                    onChange={(event) => setProfileData('separator', event.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                                >
                                                    <option value="-">Hyphen (-)</option>
                                                    <option value="/">Slash (/)</option>
                                                    <option value=".">Period (.)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="profile_padding" className="mb-1 block font-semibold text-gray-700">Digits Padding</label>
                                                <input
                                                    id="profile_padding"
                                                    type="number"
                                                    min={0}
                                                    max={20}
                                                    step={1}
                                                    value={profileData.number_padding}
                                                    onChange={(event) => setProfileData('number_padding', event.target.value)}
                                                    required
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500 font-mono"
                                                />
                                                {profileErrors.number_padding && <p className="mt-1 text-[11px] text-red-600">{profileErrors.number_padding}</p>}
                                            </div>
                                        </div>

                                        {!editingProfile && (
                                            <div>
                                                <label htmlFor="profile_start" className="mb-1 block font-semibold text-gray-700">Starting Number</label>
                                                <input
                                                    id="profile_start"
                                                    type="number"
                                                    min={1}
                                                    max={99999999}
                                                    value={profileData.starting_number}
                                                    onChange={(event) => setProfileData('starting_number', event.target.value)}
                                                    required
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500 font-mono"
                                                />
                                                {profileErrors.starting_number && <p className="mt-1 text-[11px] text-red-600">{profileErrors.starting_number}</p>}
                                            </div>
                                        )}

                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                            <Toggle
                                                checked={profileData.include_year}
                                                onChange={(event) => setProfileData((current) => ({
                                                    ...current,
                                                    include_year: event.target.checked,
                                                    reset_annually: event.target.checked ? current.reset_annually : false,
                                                }))}
                                                label="Include Year"
                                                description="Embeds current year (e.g. 2026) in ID pattern."
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

                                        {profileErrors.reset_annually && <p className="text-[11px] text-red-600">{profileErrors.reset_annually}</p>}
                                        {profileErrors.is_active && <p className="text-[11px] text-red-600">{profileErrors.is_active}</p>}
                                        {profileErrors.is_default && <p className="text-[11px] text-red-600">{profileErrors.is_default}</p>}
                                        {profileErrors.profile && <p className="text-[11px] text-red-600">{profileErrors.profile}</p>}

                                        {/* Live ID Preview Box */}
                                        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3.5 space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                                Live Sequential Pattern Preview:
                                            </span>
                                            <div className="font-mono text-base font-bold text-teal-950">{preview}</div>
                                            <p className="text-[11px] text-teal-700">Dynamic preview computed using current form attributes.</p>
                                        </div>

                                        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                                            {editingProfile && (
                                                <button
                                                    type="button"
                                                    onClick={cancelEditing}
                                                    disabled={profileProcessing}
                                                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={profileProcessing || (editingProfile ? !canUpdate : !canCreate)}
                                                className="rounded-lg bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 disabled:opacity-50 transition"
                                            >
                                                {profileProcessing ? 'Saving...' : editingProfile ? 'Save Changes' : 'Add Option'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </section>
                        </div>
                    )}

                    {/* TAB 2: OLD / OTHER ID NUMBERING (PRESERVED 100% BUSINESS LOGIC) */}
                    {activeTab === 'old_id' && (
                        <section className="pt-4 space-y-5">
                            <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Old / Other ID Strategy (সেকেন্ডারি আইডি কৌশল)</h2>
                                    <p className="text-xs text-gray-500">
                                        Configure whether Old/Other ID is computed sequentially as an auto number, or manually entered by staff from legacy paper cards.
                                    </p>
                                </div>
                                {oldIdSaved && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                        <span>✓</span> Settings saved successfully
                                    </span>
                                )}
                            </div>

                            <form onSubmit={submitOldIdConfig} className="space-y-5 text-xs">
                                {/* Strategy Radio Cards */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-900 mb-1">
                                        Generation Strategy Mode
                                    </label>
                                    <p className="text-[11px] text-gray-500 mb-3">
                                        Select the baseline mode for assigning Old/Other IDs during patient registration.
                                    </p>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label
                                            className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                                                oldIdData.mode === 'auto'
                                                    ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="old_id_mode"
                                                        value="auto"
                                                        checked={oldIdData.mode === 'auto'}
                                                        onChange={() => setOldIdData('mode', 'auto')}
                                                        disabled={!canUpdate}
                                                        className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold text-gray-900">Auto ID Generator</span>
                                                </div>
                                                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                                    Automatic
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
                                                The system automatically computes the next sequential Old/Other ID upon patient creation (e.g. {oldIdData.prefix || 'OLD-'}0001).
                                            </p>
                                        </label>

                                        <label
                                            className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition ${
                                                oldIdData.mode === 'manual'
                                                    ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="old_id_mode"
                                                        value="manual"
                                                        checked={oldIdData.mode === 'manual'}
                                                        onChange={() => setOldIdData('mode', 'manual')}
                                                        disabled={!canUpdate}
                                                        className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold text-gray-900">Manual Entry</span>
                                                </div>
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                                    Custom Varchar
                                                </span>
                                            </div>
                                            <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
                                                Staff manually enters legacy paper book cards, hospital slip IDs, or external serials up to max length.
                                            </p>
                                        </label>
                                    </div>
                                    {oldIdErrors.mode && <p className="mt-1 text-[11px] text-red-600">{oldIdErrors.mode}</p>}
                                </div>

                                {/* Contextual Mode Settings */}
                                {oldIdData.mode === 'auto' ? (
                                    <div className="rounded-xl border border-teal-100 bg-teal-50/30 p-4 space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                                            Auto Generator Numbering Format
                                        </h3>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="old_id_prefix" className="mb-1 block font-semibold text-gray-700">
                                                    ID Prefix
                                                </label>
                                                <input
                                                    id="old_id_prefix"
                                                    type="text"
                                                    value={oldIdData.prefix}
                                                    onChange={(e) => setOldIdData('prefix', e.target.value.toUpperCase())}
                                                    maxLength={20}
                                                    disabled={!canUpdate}
                                                    className="w-full rounded-md border-gray-300 font-mono text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                                    placeholder="e.g. OLD-"
                                                />
                                                <p className="mt-1 text-[10px] text-gray-500">Leading prefix string for generated IDs (e.g. OLD-, CARD-).</p>
                                                {oldIdErrors.prefix && <p className="mt-1 text-[11px] text-red-600">{oldIdErrors.prefix}</p>}
                                            </div>

                                            <div>
                                                <label htmlFor="old_id_padding" className="mb-1 block font-semibold text-gray-700">
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
                                                    className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500 font-mono"
                                                />
                                                <p className="mt-1 text-[10px] text-gray-500">Padding of 4 renders 1 as 0001. Set 0 for unpadded sequence.</p>
                                                {oldIdErrors.number_padding && <p className="mt-1 text-[11px] text-red-600">{oldIdErrors.number_padding}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 space-y-3">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                                            Manual Varchar Validation
                                        </h3>
                                        <div className="max-w-xs">
                                            <label htmlFor="old_id_max_length" className="mb-1 block font-semibold text-gray-700">
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
                                                className="w-full rounded-md border-gray-300 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500 font-mono"
                                            />
                                            <p className="mt-1 text-[10px] text-gray-500">Character limit enforced on registration form (1–255).</p>
                                            {oldIdErrors.max_length && <p className="mt-1 text-[11px] text-red-600">{oldIdErrors.max_length}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Staff Flexibility Policy */}
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                                    <Toggle
                                        checked={oldIdData.allow_staff_override}
                                        onChange={(e) => setOldIdData('allow_staff_override', e.target.checked)}
                                        disabled={!canUpdate}
                                        label="Allow staff to switch between Auto & Manual on registration form"
                                        description="When enabled, staff can toggle between Auto ID and Manual Entry on the patient registration form. When disabled, staff is strictly locked to your chosen strategy."
                                    />
                                </div>

                                {/* Active Preview & Save Bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                                            Active Secondary Format Preview
                                        </span>
                                        <div className="mt-0.5 font-mono text-base font-bold text-gray-900">
                                            {oldIdPreview}
                                        </div>
                                        <p className="text-[11px] text-gray-500">
                                            {oldIdData.mode === 'auto'
                                                ? 'Next sequential ID automatically assigned upon patient intake.'
                                                : `Staff can enter any custom reference string up to ${oldIdData.max_length || 50} chars.`}
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={savingOldId || !canUpdate}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 disabled:opacity-50 transition min-h-[44px] sm:min-h-0"
                                    >
                                        {savingOldId ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={Boolean(deleteTarget)}
                title="Deactivate numbering option?"
                message={deleteTarget ? `"${deleteTarget.name}" will be deactivated and removed from new patient registrations. Existing patient IDs will remain unchanged.` : ''}
                confirmLabel="Deactivate option"
                isDestructive={true}
                onConfirm={confirmDeactivation}
                onCancel={() => setDeleteTarget(null)}
            />
        </AuthenticatedLayout>
    );
}
