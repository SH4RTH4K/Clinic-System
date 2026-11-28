import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return 'Not available';
    }

    if (bytes === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

    return `${(bytes / (1024 ** unitIndex)).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function triggerFileDownload(filename) {
    if (!filename) {
        return;
    }

    const downloadUrl = route('admin.system_health.backups.download', filename);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

function StatusCard({ label, value, detail, healthy = true }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-start gap-3">
                <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                    }`}
                >
                    {healthy ? '✓' : '!'}
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{label}</h2>
                    <p className={`mt-1 text-sm font-medium ${healthy ? 'text-emerald-700' : 'text-amber-800'}`}>{value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
            </div>
        </section>
    );
}

function StorageLine({ label, summary, note }) {
    return (
        <li className="flex items-center justify-between gap-4 text-xs text-slate-600">
            <span>
                {label}
                {note && <span className="block text-[10px] text-slate-400 font-normal">{note}</span>}
            </span>
            <span className="text-right shrink-0">{summary.files.toLocaleString()} files · {formatBytes(summary.bytes)}</span>
        </li>
    );
}

function BackupButton({ type, label, description, available }) {
    const [creating, setCreating] = useState(false);
    const [downloadAfterCreate, setDownloadAfterCreate] = useState(false);

    function submit() {
        setCreating(true);

        router.post(route('admin.system_health.backup'), {
            backup_type: type,
            download_after_create: downloadAfterCreate ? '1' : '0',
        }, {
            preserveScroll: true,
            onFinish: () => setCreating(false),
        });
    }

    const typeIcons = {
        database: '🗄️',
        media: '📁',
        full: '📦',
        cpanel: '⚡',
    };

    return (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center">
            <div>
                <div className="flex items-center gap-2">
                    <span className="text-base">{typeIcons[type] || '💾'}</span>
                    <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
                <label htmlFor={`download-backup-${type}`} className="mt-3 flex w-fit items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                        id={`download-backup-${type}`}
                        type="checkbox"
                        checked={downloadAfterCreate}
                        onChange={(e) => setDownloadAfterCreate(e.target.checked)}
                        className="rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                    />
                    Also download a copy to this device
                </label>
            </div>
            <button
                type="button"
                onClick={submit}
                disabled={!available || creating}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
                {creating ? 'Creating…' : 'Create Backup'}
            </button>
        </div>
    );
}

function RestoreForm({ backups, available = {}, activeDatabase, databaseEmpty, uploadsEmpty, backupStorageWritable, csrfToken, errors = {} }) {
    const [type, setType] = useState('database');
    const [restoreMode, setRestoreMode] = useState('empty');
    const [backupFilename, setBackupFilename] = useState('');
    const [uploadedFilename, setUploadedFilename] = useState('');
    const [targetDatabase, setTargetDatabase] = useState('');
    const uploadInputRef = useRef(null);
    const matchingBackups = backups.filter((backup) => backup.type === type);
    const includesDatabase = type === 'database' || type === 'full';
    const includesUploads = type === 'media' || type === 'full';
    const overwriting = restoreMode === 'overwrite';
    const confirmationPhrase = overwriting ? 'OVERWRITE EXISTING TARGET' : 'RESTORE EMPTY TARGET';
    const validTargetName = /^(?:[A-Za-z0-9_]{1,64}|:memory:)$/.test(targetDatabase);
    const activeTargetIsPopulated = includesDatabase && targetDatabase === activeDatabase && !databaseEmpty;
    const hasSavedBackup = Boolean(backupFilename);
    const hasUploadedBackup = Boolean(uploadedFilename);
    const hasOneBackupSource = hasSavedBackup !== hasUploadedBackup;
    const canRestore = available[type] === true
        && hasOneBackupSource
        && (!includesDatabase || validTargetName)
        && ((overwriting && backupStorageWritable) || (!overwriting && !activeTargetIsPopulated && (!includesUploads || uploadsEmpty)));
    const blockers = [];

    if (available[type] !== true) {
        blockers.push('Required database or archive support is unavailable.');
    }
    if (!hasSavedBackup && !hasUploadedBackup) {
        blockers.push(matchingBackups.length > 0
            ? 'Choose a saved backup or browse for a backup file from your device.'
            : `No saved ${type} backup is available. Browse for a backup file from your device.`);
    } else if (!hasOneBackupSource) {
        blockers.push('Choose either a saved backup or an uploaded backup file, not both.');
    }
    if (includesDatabase && !validTargetName) {
        blockers.push(`Enter an existing target database name using letters, numbers, or underscores. The server will verify it is ${overwriting ? 'available before replacing it' : 'empty before restoring'}.`);
    }
    if (!overwriting && activeTargetIsPopulated) {
        blockers.push(`The selected target (${targetDatabase}) is the populated application database. Choose a separate empty database; existing records will not be replaced.`);
    }
    if (!overwriting && includesUploads && !uploadsEmpty) {
        blockers.push('Upload storage contains files. Media restore is available only when the upload target is empty.');
    }
    if (overwriting && !backupStorageWritable) {
        blockers.push('Overwrite is unavailable because private backup storage is not writable. Fix its cPanel permissions before retrying.');
    }
    return (
        <form method="post" encType="multipart/form-data" action={route('admin.system_health.restore')} className="mt-4 space-y-4 border-t border-amber-200 pt-4">
            <input type="hidden" name="_token" value={csrfToken} />
            <fieldset>
                <legend className="block text-sm font-medium text-slate-700">Restore mode</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                        <input type="radio" name="restore_mode" value="empty" checked={!overwriting} onChange={() => setRestoreMode('empty')} className="mt-0.5 border-emerald-400 text-emerald-700 focus:ring-emerald-600" />
                        <span><span className="block font-semibold">Restore to empty target</span>Keep the existing safeguard; no files or tables are replaced.</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
                        <input type="radio" name="restore_mode" value="overwrite" checked={overwriting} disabled={!backupStorageWritable} onChange={() => setRestoreMode('overwrite')} className="mt-0.5 border-rose-400 text-rose-700 focus:ring-rose-600 disabled:cursor-not-allowed" />
                        <span><span className="block font-semibold">Overwrite existing target</span>Replaces tables or files. A recovery backup is created first.</span>
                    </label>
                </div>
            </fieldset>

            <div>
                <label className="block text-sm font-medium text-slate-700">Restore package type</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                        <input type="radio" name="restore_type" value="database" checked={type === 'database'} onChange={() => setType('database')} className="text-cyan-700 focus:ring-cyan-600" />
                        <span>Database backup</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                        <input type="radio" name="restore_type" value="media" checked={type === 'media'} onChange={() => setType('media')} className="text-cyan-700 focus:ring-cyan-600" />
                        <span>Media archive</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
                        <input type="radio" name="restore_type" value="full" checked={type === 'full'} onChange={() => setType('full')} className="text-cyan-700 focus:ring-cyan-600" />
                        <span>Full backup package</span>
                    </label>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor="restore-backup-filename" className="block text-sm font-medium text-slate-700">Saved backup</label>
                    <select
                        id="restore-backup-filename"
                        name="backup_filename"
                        value={backupFilename}
                        disabled={matchingBackups.length === 0}
                        onChange={(event) => {
                            const filename = event.target.value;
                            setBackupFilename(filename);
                            if (filename) {
                                setUploadedFilename('');
                                if (uploadInputRef.current) {
                                    uploadInputRef.current.value = '';
                                }
                            }
                        }}
                        aria-invalid={Boolean(errors.backup_filename)}
                        aria-describedby={errors.backup_filename ? 'restore-backup-error' : undefined}
                        className="mt-1 min-h-10 w-full rounded-lg border-slate-300 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                        <option value="">Choose a saved backup</option>
                        {matchingBackups.map((backup) => <option key={backup.filename} value={backup.filename}>{new Date(backup.created_at).toLocaleString()} · {formatBytes(backup.size_bytes)}</option>)}
                    </select>
                    {errors.backup_filename && <p id="restore-backup-error" className="mt-1 text-xs text-rose-700">{errors.backup_filename}</p>}
                </div>
                <div>
                    <label htmlFor="restore-backup-file" className="block text-sm font-medium text-slate-700">Or browse for a backup file</label>
                    <input
                        ref={uploadInputRef}
                        id="restore-backup-file"
                        name="backup_file"
                        type="file"
                        accept={type === 'database' ? '.sql.gz,application/gzip' : '.zip,application/zip'}
                        disabled={available[type] !== true}
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setUploadedFilename(file?.name ?? '');
                            if (file) {
                                setBackupFilename('');
                            }
                        }}
                        aria-invalid={Boolean(errors.backup_file)}
                        aria-describedby={errors.backup_file ? 'restore-upload-error' : 'restore-upload-help'}
                        className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white text-sm file:mr-3 file:min-h-10 file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-medium file:text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                    <p id="restore-upload-help" className="mt-1 text-xs text-slate-500">Choose a compatible .sql.gz or .zip backup. The archive contents are verified before restore. Maximum upload size is 2 GB and may be lower on your hosting plan.</p>
                    {errors.backup_file && <p id="restore-upload-error" className="mt-1 text-xs text-rose-700">{errors.backup_file}</p>}
                </div>
            </div>

            {includesDatabase && (
                <div>
                    <label htmlFor="restore-target-database" className="block text-xs font-medium text-slate-700">
                        Target database name (must already exist{overwriting ? '' : ' and be empty'})
                    </label>
                    <input
                        id="restore-target-database"
                        name="target_database"
                        type="text"
                        required
                        maxLength={64}
                        pattern="[A-Za-z0-9_]{1,64}|:memory:"
                        value={targetDatabase}
                        onChange={(event) => setTargetDatabase(event.target.value)}
                        aria-invalid={Boolean(errors.target_database)}
                        aria-describedby={errors.target_database ? 'restore-target-error' : 'restore-target-help'}
                        className="mt-1 min-h-10 w-full rounded-lg border-slate-300 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 sm:max-w-md"
                    />
                    <p id="restore-target-help" className="mt-1 text-xs text-slate-500">{overwriting ? 'The server creates a recovery backup, then clears this database before restoring. No database is created by this page.' : 'The server verifies this target is empty before restoring. No database is created by this page.'}</p>
                    {errors.target_database && <p id="restore-target-error" className="mt-1 text-xs text-rose-700">{errors.target_database}</p>}
                </div>
            )}

            <div>
                <label htmlFor="restore-confirmation-phrase" className="block text-xs text-slate-700">
                    Type <span className="font-semibold">{confirmationPhrase}</span> to confirm.
                </label>
                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input
                        id="restore-confirmation-phrase"
                        name="confirmation_phrase"
                        type="text"
                        required
                        disabled={!canRestore}
                        pattern={confirmationPhrase}
                        aria-invalid={Boolean(errors.confirmation_phrase)}
                        aria-describedby={errors.confirmation_phrase ? 'restore-confirmation-error' : undefined}
                        className="min-h-10 w-full rounded-lg border-slate-300 text-sm focus:border-cyan-600 focus:ring-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-100 sm:max-w-md"
                    />
                    <button
                        type="submit"
                        disabled={!canRestore}
                        className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${overwriting ? 'bg-rose-700 hover:bg-rose-800 focus:ring-rose-700' : 'bg-slate-900 hover:bg-slate-700 focus:ring-cyan-600'}`}
                    >
                        {overwriting ? 'Create recovery backup & overwrite target' : 'Restore to empty target'}
                    </button>
                </div>
                {errors.confirmation_phrase && <p id="restore-confirmation-error" className="mt-1 text-xs text-rose-700">{errors.confirmation_phrase}</p>}
            </div>

            <div role={canRestore ? 'status' : 'note'} className={`rounded-lg px-3 py-2 text-xs ${canRestore ? (overwriting ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-800') : 'bg-amber-100 text-amber-900'}`}>
                {canRestore ? (overwriting
                    ? `Ready to create a recovery backup and overwrite the selected ${type === 'media' ? 'upload storage' : `database${type === 'full' ? ' and upload storage' : ''}`}.`
                    : `Ready to restore into the empty ${type === 'media' ? 'upload storage' : `database${type === 'full' ? ' and upload storage' : ''}`}.`)
                    : blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}
            </div>
        </form>
    );
}

function ResetAsNewForm({ csrfToken, errors = {} }) {
    const [confirmationPhrase, setConfirmationPhrase] = useState('');
    const [resetting, setResetting] = useState(false);
    const confirmed = confirmationPhrase === 'RESET AS NEW';

    function submit(event) {
        event.preventDefault();

        if (!confirmed || !window.confirm('Permanently delete all clinical and operational data, uploaded media, and attachments? This cannot be undone.')) {
            return;
        }

        router.post(route('admin.system_health.reset_as_new'), { confirmation_phrase: confirmationPhrase }, {
            preserveScroll: true,
            onStart: () => setResetting(true),
            onFinish: () => setResetting(false),
        });
    }

    return (
        <form method="post" action={route('admin.system_health.reset_as_new')} onSubmit={submit} className="mt-4 space-y-3 border-t border-rose-200 pt-4">
            <input type="hidden" name="_token" value={csrfToken} />
            <p className="text-xs leading-5 text-rose-900">
                This permanently deletes clinical and operational records, media, and attachments without making a recovery backup. Administrator accounts, roles, clinic configuration, migration history, sessions, and saved backups are kept.
            </p>
            <div>
                <label htmlFor="reset-as-new-confirmation" className="block text-xs font-medium text-rose-900">
                    Type <span className="font-semibold">RESET AS NEW</span> to confirm.
                </label>
                <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input
                        id="reset-as-new-confirmation"
                        name="confirmation_phrase"
                        type="text"
                        required
                        value={confirmationPhrase}
                        onChange={(event) => setConfirmationPhrase(event.target.value)}
                        aria-invalid={Boolean(errors.confirmation_phrase)}
                        aria-describedby={errors.confirmation_phrase ? 'reset-as-new-confirmation-error' : undefined}
                        className="min-h-10 w-full rounded-lg border-rose-300 text-sm focus:border-rose-700 focus:ring-rose-700 sm:max-w-md"
                    />
                    <button type="submit" disabled={!confirmed || resetting} className="min-h-10 rounded-lg bg-rose-700 px-5 text-sm font-semibold text-white hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        {resetting ? 'Resetting…' : 'Reset as new'}
                    </button>
                </div>
                {errors.confirmation_phrase && <p id="reset-as-new-confirmation-error" className="mt-1 text-xs text-rose-700">{errors.confirmation_phrase}</p>}
            </div>
        </form>
    );
}

export default function SystemHealth({ health = {}, backups = [], backupCapabilities = {}, restoreTarget = null, kpis = {}, csrfToken }) {
    const { auth, flash, errors = {} } = usePage().props;
    const isSuperAdmin = (auth?.roles ?? []).includes('Super Admin');
    const canManage = isSuperAdmin || (auth?.permissions ?? []).includes('system_health.manage');
    const migrations = health.migrations ?? {};
    const storage = health.storage ?? {};
    const databaseHealthy = health.database?.status === 'Connected';
    const storageHealthy = in_storage_status();
    const migrationsHealthy = migrations.status === 'Up to date';
    const downloadedFileRef = useRef(null);

    function in_storage_status() {
        return health.private_storage === 'Writable' && health.backup_storage !== 'Check permissions';
    }

    // Consolidated KPI Computations (with safe fallbacks)
    const computedKpis = {
        overall_status: kpis.overall_status ?? (databaseHealthy && storageHealthy && migrationsHealthy ? 'healthy' : 'warning'),
        total_backups_count: kpis.total_backups_count ?? backups.length,
        total_backups_bytes: kpis.total_backups_bytes ?? backups.reduce((acc, b) => acc + (b.size_bytes || 0), 0),
        database_size_bytes: kpis.database_size_bytes ?? (health.database?.size_bytes || 0),
        uploads_size_bytes: kpis.uploads_size_bytes ?? (health.storage?.uploads?.bytes || 0),
        uploads_files_count: kpis.uploads_files_count ?? (health.storage?.uploads?.files || 0),
        scheduler_enabled: kpis.scheduler_enabled ?? (health.scheduler?.enabled === true),
        scheduler_time: kpis.scheduler_time ?? (health.scheduler?.backup_time || '02:00'),
        scheduler_timezone: kpis.scheduler_timezone ?? (health.scheduler?.timezone || 'UTC'),
    };

    // Tab state
    const [activeTab, setActiveTab] = useState('diagnostics');

    // Backup search, filter & sorting state
    const [backupSearch, setBackupSearch] = useState('');
    const [backupTypeFilter, setBackupTypeFilter] = useState('all');
    const [backupSort, setBackupSort] = useState('newest');

    useEffect(() => {
        if (flash?.download_backup && downloadedFileRef.current !== flash.download_backup) {
            downloadedFileRef.current = flash.download_backup;
            triggerFileDownload(flash.download_backup);
        }
    }, [flash?.download_backup]);

    // Filter & sort backups client-side with 0ms lag
    const filteredBackups = useMemo(() => {
        let list = [...backups];

        if (backupTypeFilter !== 'all') {
            list = list.filter((b) => b.type === backupTypeFilter);
        }

        const query = backupSearch.trim().toLowerCase();
        if (query) {
            list = list.filter((b) => {
                const typeStr = (b.type || '').toLowerCase();
                const filenameStr = (b.filename || '').toLowerCase();
                const sizeStr = formatBytes(b.size_bytes).toLowerCase();
                const dateStr = new Date(b.created_at).toLocaleString().toLowerCase();
                return filenameStr.includes(query) || typeStr.includes(query) || sizeStr.includes(query) || dateStr.includes(query);
            });
        }

        if (backupSort === 'newest') {
            list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (backupSort === 'oldest') {
            list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        } else if (backupSort === 'size') {
            list.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0));
        }

        return list;
    }, [backups, backupTypeFilter, backupSearch, backupSort]);

    const backupTypeCounts = useMemo(() => {
        const counts = { all: backups.length, database: 0, media: 0, full: 0, cpanel: 0 };
        for (const b of backups) {
            if (counts[b.type] !== undefined) {
                counts[b.type] += 1;
            }
        }
        return counts;
    }, [backups]);

    const getBackupTypeBadge = (type) => {
        switch (type) {
            case 'database':
                return { label: 'Database Backup (.sql.gz)', class: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🗄️' };
            case 'media':
                return { label: 'Media Archive (.zip)', class: 'bg-purple-50 text-purple-700 border-purple-200', icon: '📁' };
            case 'full':
                return { label: 'Full Archive (Package)', class: 'bg-amber-50 text-amber-800 border-amber-200', icon: '📦' };
            case 'cpanel':
                return { label: 'cPanel Application Bundle', class: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '⚡' };
            default:
                return { label: `${type} backup`, class: 'bg-slate-100 text-slate-700 border-slate-200', icon: '💾' };
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="System Health & Backups" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20 sm:pb-8">
                {/* RemediQ Standard PageHeader with Quick Links */}
                <PageHeader
                    title="System Health &amp; Disaster Recovery (সিস্টেম হেলথ ও ব্যাকআপ ওয়ার্কস্টেশন)"
                    subtitle="Operational diagnostics, automated schedules, private backups, and disaster recovery tools"
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
                                <span>🛡️</span> Roles
                            </Link>
                            <Link
                                href={route('admin.permissions.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🔑</span> Permissions
                            </Link>
                            <Link
                                href={route('admin.activity_logs.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>📜</span> Security Logs
                            </Link>
                        </div>
                    }
                />

                {/* Executive 5-Card KPI Summary Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="System Health Metrics">
                    {/* Card 1: Overall Health Status */}
                    <div className={`p-3.5 rounded-xl border shadow-2xs flex flex-col justify-between ${
                        computedKpis.overall_status === 'healthy' ? 'bg-white border-emerald-200' : 'bg-white border-amber-300'
                    }`}>
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                            <span>System Status 🏥</span>
                            <span className={`inline-flex h-2 w-2 rounded-full ${computedKpis.overall_status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        </div>
                        <div className={`text-xl font-bold mt-1 ${computedKpis.overall_status === 'healthy' ? 'text-emerald-800' : 'text-amber-800'}`}>
                            {computedKpis.overall_status === 'healthy' ? 'Optimal & Ready' : 'Attention Needed'}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            {computedKpis.overall_status === 'healthy' ? 'সব সার্ভিস সক্রিয় ও সুরক্ষিত' : 'কিছু কনফিগ যাচাই প্রয়োজন'}
                        </div>
                    </div>

                    {/* Card 2: Database Storage & Engine */}
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Database Engine 🗄️</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{formatBytes(computedKpis.database_size_bytes)}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                            {health.database?.status === 'Connected' ? `সক্রিয় (${health.database?.table_count ?? 0} টেবিল)` : 'সংযোগ বিচ্ছিন্ন'}
                        </div>
                    </div>

                    {/* Card 3: Media & Uploads Storage */}
                    <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">Media &amp; Uploads 📁</div>
                        <div className="text-xl font-bold text-violet-900 mt-1">{formatBytes(computedKpis.uploads_size_bytes)}</div>
                        <div className="text-[11px] text-violet-600 mt-0.5">
                            {computedKpis.uploads_files_count.toLocaleString()} ফাইল সংরক্ষিত
                        </div>
                    </div>

                    {/* Card 4: Backup Archive Count & Disk Footprint */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Backup Archive 📦</div>
                        <div className="text-xl font-bold text-amber-900 mt-1">
                            {computedKpis.total_backups_count} ব্যাকআপ
                        </div>
                        <div className="text-[11px] text-amber-700 mt-0.5">
                            মোট {formatBytes(computedKpis.total_backups_bytes)} স্পেস
                        </div>
                    </div>

                    {/* Card 5: Automated Daily Schedule */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Automated Backup 🕒</div>
                        <div className="text-xl font-bold text-slate-900 mt-1">
                            {computedKpis.scheduler_enabled ? `Daily ${computedKpis.scheduler_time}` : 'Manual Only'}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                            {computedKpis.scheduler_enabled ? `প্রতিদিন ${computedKpis.scheduler_time} (${computedKpis.scheduler_timezone})` : 'স্বয়ংক্রিয় ব্যাকআপ বন্ধ'}
                        </div>
                    </div>
                </section>

                {/* Flash Notifications */}
                {flash?.success && (
                    <div role="status" className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="font-semibold">{flash.success}</p>
                            {flash?.download_backup && (
                                <p className="mt-1 text-xs text-emerald-700">
                                    Your download should begin automatically. If it did not start,{' '}
                                    <a
                                        href={route('admin.system_health.backups.download', flash.download_backup)}
                                        download={flash.download_backup}
                                        className="font-bold underline hover:text-emerald-950"
                                    >
                                        click here to download {flash.download_backup}
                                    </a>.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {flash?.error && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-2xs font-medium">
                        {flash.error}
                    </div>
                )}

                {health.backup_storage === 'Check permissions' && (
                    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 shadow-2xs">
                        <div className="flex items-start gap-2">
                            <span className="font-bold text-amber-800 shrink-0">cPanel Backup Storage Notice:</span>
                            <span>
                                On cPanel shared hosting, set <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SYSTEM_HEALTH_BACKUP_PATH</code> in your <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> to an absolute directory outside <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">public_html</code> (e.g. <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">/home/username/remediq_backups</code>) with write permissions (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">chmod 755</code>) to satisfy private storage security requirements.
                            </span>
                        </div>
                    </div>
                )}

                {/* Segmented Workstation Navigation Tabs */}
                <section className="border-b border-gray-200 bg-white rounded-xl shadow-2xs p-1.5 flex flex-wrap gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('diagnostics')}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                            activeTab === 'diagnostics'
                                ? 'bg-primary-600 text-white shadow-2xs font-bold'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                        <span>📊</span>
                        <span>System Diagnostics (ডায়াগনস্টিকস)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('backups')}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                            activeTab === 'backups'
                                ? 'bg-primary-600 text-white shadow-2xs font-bold'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                    >
                        <span>⚡</span>
                        <span>Backup &amp; Archive (ব্যাকআপ ও হিস্ট্রি)</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            activeTab === 'backups' ? 'bg-primary-700 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                            {backups.length}
                        </span>
                    </button>

                    {canManage && (
                        <>
                            <button
                                type="button"
                                onClick={() => setActiveTab('recovery')}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                                    activeTab === 'recovery'
                                        ? 'bg-primary-600 text-white shadow-2xs font-bold'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <span>🔄</span>
                                <span>Disaster Recovery (রিস্টোর ও রিকভারি)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('maintenance')}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                                    activeTab === 'maintenance'
                                        ? 'bg-primary-600 text-white shadow-2xs font-bold'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <span>🧹</span>
                                <span>Maintenance &amp; Reset (মেইনটেন্যান্স ও রিসেট)</span>
                            </button>
                        </>
                    )}
                </section>

                {/* TAB 1: SYSTEM DIAGNOSTICS */}
                {activeTab === 'diagnostics' && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            <StatusCard
                                label="Database Status"
                                value={health.database?.status ?? 'Unknown'}
                                detail={`Configured connection · size ${formatBytes(health.database?.size_bytes)}`}
                                healthy={databaseHealthy}
                            />
                            <StatusCard
                                label="Storage & Backups"
                                value={health.private_storage ?? 'Unknown'}
                                detail={`Private backup storage · ${health.backup_storage ?? 'status unavailable'}`}
                                healthy={storageHealthy}
                            />
                            <StatusCard
                                label="PHP Runtime"
                                value={health.php_version ?? 'Unknown'}
                                detail="Installed PHP runtime version"
                                healthy={true}
                            />
                            <StatusCard
                                label="Laravel Framework"
                                value={health.laravel_version ?? 'Unknown'}
                                detail="Target framework version"
                                healthy={true}
                            />
                            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:col-span-2 xl:col-span-1">
                                <h2 className="text-sm font-semibold text-slate-900">Application Storage Breakdown</h2>
                                <p className="mt-1 text-sm font-medium text-cyan-800">{formatBytes(storage.total?.bytes)} across {(storage.total?.files ?? 0).toLocaleString()} files</p>
                                <ul className="mt-3 space-y-2">
                                    <StorageLine label="Uploads" summary={storage.uploads ?? { files: 0, bytes: 0 }} />
                                    <StorageLine label="Build assets" summary={storage.build_assets ?? { files: 0, bytes: 0 }} />
                                    <StorageLine label="Private files" note="Includes managed in-app Git checkout repository" summary={storage.private ?? { files: 0, bytes: 0 }} />
                                    <StorageLine label="Logs" summary={storage.logs ?? { files: 0, bytes: 0 }} />
                                    <StorageLine label="Framework cache" summary={storage.framework_cache ?? { files: 0, bytes: 0 }} />
                                </ul>
                            </section>
                            <StatusCard
                                label="Environment &amp; Debug Mode"
                                value={`${health.environment ?? 'Unknown'} · debug ${health.debug ? 'ON (Warning)' : 'off'}`}
                                detail="Production should always have debug mode turned off"
                                healthy={!health.debug}
                            />
                        </div>

                        {/* Database Migrations Status Card */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                        <span>🧬</span>
                                        <span>Database Migrations Status</span>
                                    </h2>
                                    <p className={`mt-1 text-sm font-medium ${migrationsHealthy ? 'text-emerald-700' : 'text-amber-800'}`}>
                                        {migrations.status ?? 'Migration state unavailable'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                                    <span className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1">Applied: {migrations.applied ?? '—'}</span>
                                    <span className="rounded-lg bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1">Total: {migrations.total ?? '—'}</span>
                                    <span className={`rounded-lg px-3 py-1 border ${Number(migrations.pending) > 0 ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        Pending: {migrations.pending ?? '0'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Database migrations applied" aria-valuemin="0" aria-valuemax={migrations.total ?? 0} aria-valuenow={migrations.applied ?? 0}>
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${migrationsHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${migrations.total ? Math.min(100, ((migrations.applied ?? 0) / migrations.total) * 100) : 0}%` }}
                                />
                            </div>
                        </section>
                    </div>
                )}

                {/* TAB 2: BACKUP & ARCHIVE */}
                {activeTab === 'backups' && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                        {/* Section A: Create Manual Backups */}
                        {canManage && (
                            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span>⚡</span>
                                        <span>Create Immediate Backup</span>
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-600">
                                        Backups are generated and stored securely in private application storage. Generated archives older than 14 days are automatically pruned after a successful backup run.
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <BackupButton
                                        type="database"
                                        label="Database Backup"
                                        description="Compressed logical MySQL/SQLite SQL dump (.sql.gz)."
                                        available={backupCapabilities.database}
                                    />
                                    <BackupButton
                                        type="media"
                                        label="Media &amp; Scans Archive"
                                        description="Compressed archive of patient uploads and clinical scans (.zip)."
                                        available={backupCapabilities.media}
                                    />
                                    <BackupButton
                                        type="full"
                                        label="Full Clinic Backup"
                                        description="Combined package with complete database dump and all patient media."
                                        available={backupCapabilities.full}
                                    />
                                    {isSuperAdmin && (
                                        <BackupButton
                                            type="cpanel"
                                            label="cPanel Deployment Bundle"
                                            description="Copy-ready code and vendor bundle with dependencies. No credentials or patient media included."
                                            available={backupCapabilities.cpanel}
                                        />
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Section B: Searchable Backup History & Archive */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span>📦</span>
                                        <span>Backup History &amp; Archive ({filteredBackups.length})</span>
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Available recovery points stored on disk. Download archives for off-site disaster redundancy.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label htmlFor="backup-sort-select" className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort:</label>
                                    <select
                                        id="backup-sort-select"
                                        value={backupSort}
                                        onChange={(e) => setBackupSort(e.target.value)}
                                        className="rounded-lg border-slate-300 py-1.5 pl-3 pr-8 text-xs font-semibold shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                    >
                                        <option value="newest">Newest First (সর্বশেষ)</option>
                                        <option value="oldest">Oldest First (পুরাতন)</option>
                                        <option value="size">Largest Size (সর্ববৃহৎ)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search & Filter Controls */}
                            <div className="flex flex-col gap-3">
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
                                    <input
                                        type="text"
                                        value={backupSearch}
                                        onChange={(e) => setBackupSearch(e.target.value)}
                                        placeholder="Search backups by filename, type, size (e.g. 5.2 MB) or creation date..."
                                        className="w-full rounded-lg border-slate-300 pl-9 pr-9 text-xs sm:text-sm shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {backupSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setBackupSearch('')}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* 1-Click Fast Filter Pills */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setBackupTypeFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            backupTypeFilter === 'all'
                                                ? 'bg-primary-600 text-white font-bold shadow-2xs'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        All Backups ({backupTypeCounts.all})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBackupTypeFilter('database')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            backupTypeFilter === 'database'
                                                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                        }`}
                                    >
                                        🗄️ Database ({backupTypeCounts.database})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBackupTypeFilter('media')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            backupTypeFilter === 'media'
                                                ? 'bg-purple-600 text-white font-bold shadow-2xs'
                                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                                        }`}
                                    >
                                        📁 Media ({backupTypeCounts.media})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBackupTypeFilter('full')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                            backupTypeFilter === 'full'
                                                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                        }`}
                                    >
                                        📦 Full ({backupTypeCounts.full})
                                    </button>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setBackupTypeFilter('cpanel')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                                backupTypeFilter === 'cpanel'
                                                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                            }`}
                                        >
                                            ⚡ cPanel ({backupTypeCounts.cpanel})
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Dual-Mode Presentation: Desktop Table vs Mobile Touch Cards */}
                            {filteredBackups.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50">
                                    <div className="text-3xl">📦</div>
                                    <p className="mt-2 text-sm font-semibold text-slate-800">No backups match your search</p>
                                    <p className="mt-1 text-xs text-slate-500">Try adjusting your keyword or filter criteria.</p>
                                    {(backupSearch || backupTypeFilter !== 'all') && (
                                        <button
                                            type="button"
                                            onClick={() => { setBackupSearch(''); setBackupTypeFilter('all'); }}
                                            className="mt-3 text-xs font-bold text-primary-700 hover:underline"
                                        >
                                            Clear All Filters →
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Data Table (sm:block hidden) */}
                                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                            <thead className="bg-slate-50 uppercase tracking-wide text-slate-500 font-semibold">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3">Type &amp; Identifier</th>
                                                    <th scope="col" className="px-4 py-3">Archive Size</th>
                                                    <th scope="col" className="px-4 py-3">Creation Date</th>
                                                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                                                {filteredBackups.map((backup) => {
                                                    const badge = getBackupTypeBadge(backup.type);
                                                    return (
                                                        <tr key={backup.filename} className="hover:bg-slate-50/80 transition">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.class}`}>
                                                                        <span>{badge.icon}</span>
                                                                        <span>{badge.label}</span>
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 font-mono text-[11px] text-slate-500 truncate max-w-sm" title={backup.filename}>
                                                                    {backup.filename}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                                                {formatBytes(backup.size_bytes)}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="text-slate-900 font-medium">
                                                                    {new Date(backup.created_at).toLocaleString([], {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                    })}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">
                                                                    {formatRelativeTime(backup.created_at)}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <a
                                                                        download={backup.filename}
                                                                        href={route('admin.system_health.backups.download', backup.filename)}
                                                                        className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800 hover:bg-cyan-100 border border-cyan-200 transition"
                                                                        title="Download to local device"
                                                                    >
                                                                        <span>⬇️</span> Download
                                                                    </a>

                                                                    {isSuperAdmin && (
                                                                        <form
                                                                            method="post"
                                                                            action={route('admin.system_health.backups.destroy', backup.filename)}
                                                                            onSubmit={(event) => {
                                                                                if (!window.confirm(`Permanently delete ${backup.filename}? This cannot be undone.`)) {
                                                                                    event.preventDefault();
                                                                                }
                                                                            }}
                                                                            className="inline-block"
                                                                        >
                                                                            <input type="hidden" name="_token" value={csrfToken} />
                                                                            <input type="hidden" name="_method" value="DELETE" />
                                                                            <button
                                                                                type="submit"
                                                                                className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                                                                                aria-label={`Permanently delete ${backup.filename}`}
                                                                            >
                                                                                <span>🗑️</span> Delete
                                                                            </button>
                                                                        </form>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Touch Cards (sm:hidden block) */}
                                    <div className="sm:hidden space-y-3">
                                        {filteredBackups.map((backup) => {
                                            const badge = getBackupTypeBadge(backup.type);
                                            return (
                                                <div key={backup.filename} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.class}`}>
                                                            <span>{badge.icon}</span>
                                                            <span>{badge.label}</span>
                                                        </span>
                                                        <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                                            {formatBytes(backup.size_bytes)}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <p className="font-mono text-[11px] text-slate-700 break-all">{backup.filename}</p>
                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                            Created: {new Date(backup.created_at).toLocaleString()} ({formatRelativeTime(backup.created_at)})
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                                        <a
                                                            download={backup.filename}
                                                            href={route('admin.system_health.backups.download', backup.filename)}
                                                            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800 transition"
                                                        >
                                                            <span>⬇️</span> Download Archive
                                                        </a>

                                                        {isSuperAdmin && (
                                                            <form
                                                                method="post"
                                                                action={route('admin.system_health.backups.destroy', backup.filename)}
                                                                onSubmit={(event) => {
                                                                    if (!window.confirm(`Permanently delete ${backup.filename}? This cannot be undone.`)) {
                                                                        event.preventDefault();
                                                                    }
                                                                }}
                                                            >
                                                                <input type="hidden" name="_token" value={csrfToken} />
                                                                <input type="hidden" name="_method" value="DELETE" />
                                                                <button
                                                                    type="submit"
                                                                    className="min-h-[44px] px-3.5 inline-flex items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition"
                                                                    aria-label="Delete backup"
                                                                >
                                                                    <span>🗑️</span>
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </section>
                    </div>
                )}

                {/* TAB 3: DISASTER RECOVERY & RESTORE */}
                {activeTab === 'recovery' && canManage && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                        <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-2xs space-y-4">
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                                <h2 className="text-base font-bold text-amber-900 flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>Disaster Recovery &amp; System Restore Guidelines</span>
                                </h2>
                                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                                    System restore operations directly modify application database tables and file storage. Choose a saved backup or upload a valid archive. Overwrite mode is guarded by automatic pre-restore recovery point creation and strict phrase validation.
                                </p>
                            </div>

                            {isSuperAdmin ? (
                                <RestoreForm
                                    backups={backups}
                                    available={backupCapabilities.restore}
                                    activeDatabase={restoreTarget}
                                    databaseEmpty={health.database?.table_count === 0 && health.database?.view_count === 0}
                                    uploadsEmpty={(health.storage?.uploads?.files ?? 0) === 0}
                                    backupStorageWritable={['Writable', 'Ready to create'].includes(health.backup_storage)}
                                    csrfToken={csrfToken}
                                    errors={errors}
                                />
                            ) : (
                                <div className="p-4 text-xs text-slate-600 bg-slate-50 rounded-lg">
                                    Only a <strong>Super Admin</strong> can execute disaster recovery restorations.
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* TAB 4: MAINTENANCE & RESET */}
                {activeTab === 'maintenance' && canManage && (
                    <div className="space-y-6 animate-in fade-in duration-150">
                        {/* Section A: Framework Caches */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                        <span>🧹</span>
                                        <span>Clear Compiled Framework Caches</span>
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-600">
                                        Flushes compiled configuration (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">config:clear</code>), route table (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">route:clear</code>), Blade views (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">view:clear</code>), and event discovery caches.
                                    </p>
                                </div>

                                <form
                                    method="post"
                                    action={route('admin.system_health.clear_caches')}
                                    onSubmit={(event) => {
                                        if (!window.confirm('Clear compiled configuration, route, event, and view caches? This does not flush database sessions or patient records.')) {
                                            event.preventDefault();
                                        }
                                    }}
                                >
                                    <input type="hidden" name="_token" value={csrfToken} />
                                    <button
                                        type="submit"
                                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                                    >
                                        <span>⚡</span> Clear All Compiled Caches
                                    </button>
                                </form>
                            </div>
                        </section>

                        {/* Section B: Automated Schedule Configuration */}
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <span>🕒</span>
                                    <span>Automated Daily Backup Schedule</span>
                                </h2>
                                <p className="mt-1 text-xs text-slate-600">
                                    {health.scheduler?.summary ?? 'Scheduler configuration is unavailable.'}
                                </p>
                            </div>

                            <form method="post" action={route('admin.system_health.backup_schedule')} className="space-y-4 border-t border-slate-100 pt-4">
                                <input type="hidden" name="_token" value={csrfToken} />
                                <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="enabled"
                                        value="1"
                                        defaultChecked={health.scheduler?.enabled === true}
                                        className="rounded border-slate-300 text-cyan-700 focus:ring-cyan-600 h-4 w-4"
                                    />
                                    <span>Enable automatic daily full backup</span>
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
                                    <div>
                                        <label htmlFor="backup-schedule-time" className="block text-xs font-medium text-slate-700">
                                            Daily backup execution time
                                        </label>
                                        <input
                                            id="backup-schedule-time"
                                            type="time"
                                            name="backup_time"
                                            required
                                            defaultValue={health.scheduler?.backup_time ?? '02:00'}
                                            aria-invalid={Boolean(errors.backup_time)}
                                            aria-describedby={errors.backup_time ? 'backup-schedule-time-error' : undefined}
                                            className="mt-1 min-h-10 w-full rounded-lg border-slate-300 text-sm focus:border-cyan-600 focus:ring-cyan-600"
                                        />
                                        {errors.backup_time && <p id="backup-schedule-time-error" className="mt-1 text-xs text-rose-700">{errors.backup_time}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="backup-timezone" className="block text-xs font-medium text-slate-700">
                                            Schedule Timezone (সময় অঞ্চল)
                                        </label>
                                        <select
                                            id="backup-timezone"
                                            name="timezone"
                                            defaultValue={health.scheduler?.timezone ?? 'Asia/Dhaka'}
                                            className="mt-1 min-h-10 w-full rounded-lg border-slate-300 text-sm focus:border-cyan-600 focus:ring-cyan-600 bg-white"
                                        >
                                            <option value="Asia/Dhaka">Asia/Dhaka (GMT+6 - Bangladesh Standard Time)</option>
                                            <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30 - India Standard Time)</option>
                                            <option value="Asia/Karachi">Asia/Karachi (GMT+5 - Pakistan Standard Time)</option>
                                            <option value="Asia/Dubai">Asia/Dubai (GMT+4 - Gulf Standard Time)</option>
                                            <option value="Asia/Riyadh">Asia/Riyadh (GMT+3 - Arabia Standard Time)</option>
                                            <option value="Europe/London">Europe/London (GMT/BST - UK Time)</option>
                                            <option value="America/New_York">America/New_York (EST/EDT - US Eastern)</option>
                                            <option value="UTC">UTC (Coordinated Universal Time)</option>
                                        </select>
                                        {errors.timezone && <p className="mt-1 text-xs text-rose-700">{errors.timezone}</p>}
                                    </div>
                                </div>

                                <div className="max-w-2xl">
                                    <label htmlFor="backup-path" className="block text-xs font-medium text-slate-700">
                                        Backup Storage Directory Location (ব্যাকআপ সংরক্ষণের ফোল্ডার পাথ / লোকেশন)
                                    </label>
                                    <input
                                        id="backup-path"
                                        type="text"
                                        name="backup_path"
                                        defaultValue={health.scheduler?.backup_path ?? ''}
                                        placeholder="e.g. /home/account/clinic-backups (Leave blank for default private storage)"
                                        className="mt-1 min-h-10 w-full font-mono text-xs rounded-lg border-slate-300 focus:border-cyan-600 focus:ring-cyan-600"
                                    />
                                    {errors.backup_path && <p className="mt-1 text-xs text-rose-700">{errors.backup_path}</p>}

                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                        <span className="font-semibold">Active storage directory:</span>
                                        <code className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 break-all">
                                            {health.scheduler?.active_backup_path ?? 'Default storage'}
                                        </code>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            health.scheduler?.backup_path_source === 'saved'
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                : health.scheduler?.backup_path_source === 'env'
                                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                            {health.scheduler?.backup_path_source === 'saved'
                                                ? '✓ Saved via Application'
                                                : health.scheduler?.backup_path_source === 'env'
                                                ? 'Configured via .env'
                                                : 'Default Private Storage'}
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500">
                                        Saved securely in private application storage without editing .env or invalidating config caches. On cPanel hosting, enter an absolute directory owned by your cPanel account outside public_html.
                                    </p>
                                </div>

                                <div>
                                    <button
                                        type="submit"
                                        className="min-h-10 rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 transition"
                                    >
                                        Save Schedule &amp; Storage Settings
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Default recommended time is 02:00 AM off-peak. Ensure your server cron executes <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">php artisan schedule:run</code> every minute.
                                </p>
                            </form>
                        </section>

                        {/* Section C: Danger Zone - Reset As New */}
                        {isSuperAdmin && (
                            <section className="rounded-xl border border-rose-300 bg-rose-50/60 p-5 shadow-2xs space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">🚨</span>
                                    <h2 className="text-base font-bold text-rose-950">Danger Zone: Reset Application As New</h2>
                                </div>
                                <p className="text-xs text-rose-800 leading-relaxed">
                                    Permanently clears all clinical patient records, visit consultations, prescriptions, medicines, appointments, and uploaded files. Keeps administrator user accounts, roles, permissions, clinic configuration, and saved backups intact.
                                </p>
                                <ResetAsNewForm csrfToken={csrfToken} errors={errors} />
                            </section>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
