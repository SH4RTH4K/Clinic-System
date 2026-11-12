import { Head, router, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

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

function StatusCard({ label, value, detail, healthy = true }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <span
                    aria-hidden="true"
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}
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

function StorageLine({ label, summary }) {
    return (
        <li className="flex items-center justify-between gap-4 text-xs text-slate-600">
            <span>{label}</span>
            <span className="text-right">{summary.files.toLocaleString()} files · {formatBytes(summary.bytes)}</span>
        </li>
    );
}

function BackupButton({ type, label, description, available, csrfToken }) {
    const [creating, setCreating] = useState(false);

    function submit(event) {
        const downloadAfterCreate = event.currentTarget.elements.download_after_create.checked;

        if (downloadAfterCreate) {
            return;
        }

        event.preventDefault();
        router.post(route('admin.system_health.backup'), { backup_type: type }, {
            preserveScroll: true,
            onStart: () => setCreating(true),
            onFinish: () => setCreating(false),
        });
    }

    return (
        <form method="post" action={route('admin.system_health.backup')} onSubmit={submit} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="backup_type" value={type} />
            <div>
                <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
                <label htmlFor={`download-backup-${type}`} className="mt-3 flex w-fit items-center gap-2 text-xs text-slate-600">
                    <input
                        id={`download-backup-${type}`}
                        type="checkbox"
                    name="download_after_create"
                        value="1"
                        className="rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                    />
                    Also download a copy to this device
                </label>
            </div>
            <button
                type="submit"
                disabled={!available || creating}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
                {creating ? 'Creating…' : 'Create'}
            </button>
        </form>
    );
}

function RestoreForm({ backups, available = {}, activeDatabase, databaseEmpty, uploadsEmpty, csrfToken, errors = {} }) {
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
        && (overwriting || (!activeTargetIsPopulated && (!includesUploads || uploadsEmpty)));
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
                        <input type="radio" name="restore_mode" value="overwrite" checked={overwriting} onChange={() => setRestoreMode('overwrite')} className="mt-0.5 border-rose-400 text-rose-700 focus:ring-rose-600" />
                        <span><span className="block font-semibold">Overwrite existing target</span>Create a recovery backup first, then permanently replace existing tables and uploads.</span>
                    </label>
                </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor="restore-type" className="block text-sm font-medium text-slate-700">Backup type</label>
                    <select
                        id="restore-type"
                        name="restore_type"
                        value={type}
                        onChange={(event) => {
                            setType(event.target.value);
                            setBackupFilename('');
                            setUploadedFilename('');
                            if (uploadInputRef.current) {
                                uploadInputRef.current.value = '';
                            }
                        }}
                        className="mt-1 min-h-10 w-full rounded-lg border-slate-300 text-sm focus:border-cyan-600 focus:ring-cyan-600"
                    >
                        <option value="database">Database</option>
                        <option value="media">Media</option>
                        <option value="full">Full backup</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="restore-backup" className="block text-sm font-medium text-slate-700">Saved backup</label>
                    <select
                        id="restore-backup"
                        name="backup_filename"
                        disabled={available[type] !== true || matchingBackups.length === 0}
                        value={backupFilename}
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
                        className="min-h-10 w-full rounded-lg border-slate-300 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 sm:max-w-md"
                    />
                    <button type="submit" disabled={!canRestore} className={`min-h-10 rounded-lg px-5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${overwriting ? 'bg-rose-700 hover:bg-rose-800 focus:ring-rose-700' : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600'}`}>
                        {overwriting ? 'Overwrite selected target' : 'Restore selected backup'}
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

export default function SystemHealth({ health = {}, backups = [], backupCapabilities = {}, restoreTarget = null, csrfToken }) {
    const { auth, flash, errors = {} } = usePage().props;
    const isSuperAdmin = (auth?.roles ?? []).includes('Super Admin');
    const canManage = isSuperAdmin || (auth?.permissions ?? []).includes('system_health.manage');
    const migrations = health.migrations ?? {};
    const storage = health.storage ?? {};
    const databaseHealthy = health.database?.status === 'Connected';
    const migrationsHealthy = migrations.status === 'Up to date';

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-slate-800">System Health</h2>}>
            <Head title="System Health & Backups" />

            <div className="space-y-5">
                <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Operations</p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-900">System health &amp; backups</h1>
                        <p className="mt-1 text-sm text-slate-600">Operational checks and recovery tools. No patient or clinical records are displayed.</p>
                    </div>
                    <p className="text-xs text-slate-500">{health.backup_retention ?? 'Backup retention has not been configured.'}</p>
                </header>

                {flash?.success && (
                    <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {flash.error}
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <StatusCard label="Database" value={health.database?.status ?? 'Unknown'} detail={`Configured connection · size ${formatBytes(health.database?.size_bytes)}`} healthy={databaseHealthy} />
                    <StatusCard label="Storage" value={health.private_storage ?? 'Unknown'} detail={`Private backup storage · ${health.backup_storage ?? 'status unavailable'}`} healthy={health.private_storage === 'Writable' && health.backup_storage !== 'Check permissions'} />
                    <StatusCard label="PHP runtime" value={health.php_version ?? 'Unknown'} detail="Required PHP runtime" />
                    <StatusCard label="Laravel" value={health.laravel_version ?? 'Unknown'} detail="Framework version" />
                    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 xl:col-span-1">
                        <h2 className="text-sm font-semibold text-slate-900">Application storage</h2>
                        <p className="mt-1 text-sm font-medium text-cyan-800">{formatBytes(storage.total?.bytes)} across {(storage.total?.files ?? 0).toLocaleString()} files</p>
                        <ul className="mt-3 space-y-2">
                            <StorageLine label="Uploads" summary={storage.uploads ?? { files: 0, bytes: 0 }} />
                            <StorageLine label="Build assets" summary={storage.build_assets ?? { files: 0, bytes: 0 }} />
                            <StorageLine label="Private files" summary={storage.private ?? { files: 0, bytes: 0 }} />
                            <StorageLine label="Logs" summary={storage.logs ?? { files: 0, bytes: 0 }} />
                            <StorageLine label="Framework cache" summary={storage.framework_cache ?? { files: 0, bytes: 0 }} />
                        </ul>
                    </section>
                    <StatusCard
                        label="Environment"
                        value={`${health.environment ?? 'Unknown'} · debug ${health.debug ? 'on' : 'off'}`}
                        detail="Application environment configuration"
                        healthy={!health.debug}
                    />
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Database migrations</h2>
                            <p className={`mt-1 text-sm ${migrationsHealthy ? 'text-emerald-700' : 'text-amber-800'}`}>
                                {migrations.status ?? 'Migration state unavailable'}
                            </p>
                        </div>
                        <div className="flex gap-2 text-xs text-slate-600">
                            <span className="rounded-full bg-slate-100 px-3 py-1">Applied: {migrations.applied ?? '—'}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Total: {migrations.total ?? '—'}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">Pending: {migrations.pending ?? '—'}</span>
                        </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Database migrations applied" aria-valuemin="0" aria-valuemax={migrations.total ?? 0} aria-valuenow={migrations.applied ?? 0}>
                        <div className={`h-full rounded-full ${migrationsHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${migrations.total ? Math.min(100, ((migrations.applied ?? 0) / migrations.total) * 100) : 0}%` }} />
                    </div>
                </section>

                {canManage && (
                    <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">Create backups</h2>
                                <p className="mt-1 text-sm text-slate-600">Backups are stored in private application storage. Generated archives older than 14 days are removed after a successful backup run.</p>
                            </div>
                            <div className="mt-4 space-y-3">
                                <BackupButton type="database" label="Database backup" description="Compressed logical export of the configured database." available={backupCapabilities.database} csrfToken={csrfToken} />
                                <BackupButton type="media" label="Media backup" description="Archive files from the application's upload storage." available={backupCapabilities.media} csrfToken={csrfToken} />
                                <BackupButton type="full" label="Full backup" description="Database export and media archive in one package." available={backupCapabilities.full} csrfToken={csrfToken} />
                                {isSuperAdmin && (
                                    <BackupButton type="cpanel" label="cPanel application package" description="Copy-ready private application and public_html bundle with Composer dependencies. No database, uploads, or .env files are included." available={backupCapabilities.cpanel} csrfToken={csrfToken} />
                                )}
                            </div>

                            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <h3 className="text-sm font-semibold text-amber-900">Restore backups</h3>
                                <p className="mt-1 text-xs leading-5 text-amber-800">Choose a saved backup and an existing empty target. The server checks the database before writing; it never replaces existing tables or files. Restore is restricted to Super Admin.</p>
                                {isSuperAdmin ? (
                                    <RestoreForm
                                        backups={backups}
                                        available={backupCapabilities.restore}
                                        activeDatabase={restoreTarget}
                                        databaseEmpty={health.database?.table_count === 0 && health.database?.view_count === 0}
                                        uploadsEmpty={(health.storage?.uploads?.files ?? 0) === 0}
                                        csrfToken={csrfToken}
                                        errors={errors}
                                    />
                                ) : (
                                    <p className="mt-3 text-xs text-slate-600">Only a Super Admin can restore backups.</p>
                                )}
                            </div>

                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-slate-900">Backup history</h3>
                                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                        <thead className="bg-slate-50 uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th scope="col" className="px-3 py-3 font-semibold">Backup</th>
                                                <th scope="col" className="px-3 py-3 font-semibold">Size</th>
                                                <th scope="col" className="px-3 py-3 font-semibold">Created</th>
                                                <th scope="col" className="px-3 py-3 font-semibold">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                                            {backups.length === 0 ? (
                                                <tr><td colSpan="4" className="px-3 py-8 text-center text-slate-500">No backups exist yet.</td></tr>
                                            ) : backups.map((backup) => (
                                                <tr key={backup.filename}>
                                                    <td className="px-3 py-3 font-medium">{backup.type === 'cpanel' ? 'cPanel application package' : `${backup.type} backup`}</td>
                                                    <td className="px-3 py-3">{formatBytes(backup.size_bytes)}</td>
                                                    <td className="px-3 py-3">{new Date(backup.created_at).toLocaleString()}</td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <a className="font-semibold text-cyan-800 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-600" href={route('admin.system_health.backups.download', backup.filename)}>Download</a>
                                                            {isSuperAdmin ? (
                                                                <form
                                                                    method="post"
                                                                    action={route('admin.system_health.backups.destroy', backup.filename)}
                                                                    onSubmit={(event) => {
                                                                        if (!window.confirm('Permanently delete this backup? This cannot be undone.')) {
                                                                            event.preventDefault();
                                                                        }
                                                                    }}
                                                                >
                                                                    <input type="hidden" name="_token" value={csrfToken} />
                                                                    <input type="hidden" name="_method" value="DELETE" />
                                                                    <button
                                                                        type="submit"
                                                                        className="font-semibold text-rose-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-rose-600"
                                                                        aria-label={`Permanently delete ${backup.type} backup`}
                                                                    >
                                                                        Delete permanently
                                                                    </button>
                                                                </form>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-base font-semibold text-slate-900">Maintenance</h2>
                            <p className="mt-1 text-sm text-slate-600">Clear compiled framework caches after application changes.</p>
                            <form
                                method="post"
                                action={route('admin.system_health.clear_caches')}
                                className="mt-4"
                                onSubmit={(event) => {
                                    if (!window.confirm('Clear compiled configuration, route, event, and view caches? This does not flush the shared application cache store.')) {
                                        event.preventDefault();
                                    }
                                }}
                            >
                                <input type="hidden" name="_token" value={csrfToken} />
                                <button type="submit" className="min-h-10 rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                                    Clear compiled caches
                                </button>
                            </form>
                            <div className="mt-5 rounded-lg bg-slate-50 p-4">
                                <h3 className="text-sm font-semibold text-slate-800">Scheduled tasks</h3>
                                <p className="mt-2 text-xs leading-5 text-slate-600">{health.scheduler?.summary ?? 'Scheduler configuration is unavailable.'}</p>
                                <form method="post" action={route('admin.system_health.backup_schedule')} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                    <input type="hidden" name="_token" value={csrfToken} />
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                                        <input
                                            type="checkbox"
                                            name="enabled"
                                            value="1"
                                            defaultChecked={health.scheduler?.enabled === true}
                                            className="rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                                        />
                                        Enable automatic full backup
                                    </label>
                                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                                        <div>
                                            <label htmlFor="backup-schedule-time" className="block text-xs font-medium text-slate-700">
                                                Daily backup time ({health.scheduler?.timezone ?? 'UTC'})
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
                                        <button type="submit" className="min-h-10 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:ring-offset-2">
                                            Save schedule
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">The default is 02:00. Changes take effect on the next scheduler run. Manual backups remain available when automatic backups are disabled.</p>
                                </form>
                                <p className="mt-2 text-xs text-slate-500">The server scheduler/Task Scheduler trigger has not been checked here.</p>
                            </div>
                            {isSuperAdmin && (
                                <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4">
                                    <h3 className="text-sm font-semibold text-rose-950">Reset as new</h3>
                                    <p className="mt-1 text-xs leading-5 text-rose-800">Permanently clear the application database data, uploaded media, and attachments to start with a clean workspace and reclaim storage.</p>
                                    <ResetAsNewForm csrfToken={csrfToken} errors={errors} />
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
