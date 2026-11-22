import AdminLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useMemo, useState } from 'react';

const statusStyles = {
    'Up to date': 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    'Update available': 'bg-blue-100 text-blue-800 ring-blue-200',
    'Local changes detected': 'bg-amber-100 text-amber-900 ring-amber-200',
    'Branches diverged': 'bg-rose-100 text-rose-800 ring-rose-200',
    'Wrong branch': 'bg-rose-100 text-rose-800 ring-rose-200',
    Unavailable: 'bg-amber-100 text-amber-900 ring-amber-200',
    Disabled: 'bg-slate-100 text-slate-700 ring-slate-200',
    'Not checked': 'bg-slate-100 text-slate-700 ring-slate-200',
    Completed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    Failed: 'bg-rose-100 text-rose-800 ring-rose-200',
};

function shortCommit(commit) {
    return commit ? String(commit).slice(0, 12) : 'Not available';
}

function formatDate(value) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

function StatusPill({ status }) {
    return (
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[status] ?? statusStyles.Disabled}`}>
            {status || 'Unknown'}
        </span>
    );
}

function ActionButton({ children, tone = 'dark', className = '', ...props }) {
    const tones = {
        dark: 'bg-slate-900 text-white hover:bg-slate-700',
        blue: 'bg-blue-600 text-white hover:bg-blue-700',
        cyan: 'bg-cyan-700 text-white hover:bg-cyan-800',
        amber: 'bg-amber-600 text-white hover:bg-amber-700',
        emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
        rose: 'bg-rose-600 text-white hover:bg-rose-700',
        light: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    };

    return (
        <button
            type="button"
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

export default function GitRepository({ repository, settings, history = [], database = {} }) {
    const [activeTab, setActiveTab] = useState('git');
    const [busy, setBusy] = useState(false);
    const [expandedHistory, setExpandedHistory] = useState(null);
    const [migrationSearch, setMigrationSearch] = useState('');
    const [migrationFilter, setMigrationFilter] = useState('all'); // all | pending | ran

    const { props } = usePage();
    const { success, error } = props.flash ?? {};

    const form = useForm({
        enabled: settings.enabled,
        branch: settings.branch,
        remote: settings.remote,
        repository_type: settings.repository_type,
        repository_url: settings.repository_url,
        authentication: settings.authentication,
        credential: '',
        clear_credential: false,
        run_migrations: settings.run_migrations,
        clear_cache: settings.clear_cache,
        health_check: settings.health_check,
    });

    useEffect(() => {
        form.setData({
            enabled: settings.enabled,
            branch: settings.branch,
            remote: settings.remote,
            repository_type: settings.repository_type,
            repository_url: settings.repository_url,
            authentication: settings.authentication,
            credential: '',
            clear_credential: false,
            run_migrations: settings.run_migrations,
            clear_cache: settings.clear_cache,
            health_check: settings.health_check,
        });
    }, [
        settings.enabled,
        settings.branch,
        settings.remote,
        settings.repository_type,
        settings.repository_url,
        settings.authentication,
        settings.run_migrations,
        settings.clear_cache,
        settings.health_check,
    ]);

    const run = (action, data = {}) => {
        setBusy(true);
        router.post(route(`admin.git_repository.${action}`), data, {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    };

    const saveSettings = (event) => {
        event.preventDefault();
        form.post(route('admin.git_repository.settings'), {
            preserveScroll: true,
            onSuccess: () => form.setData('credential', ''),
        });
    };

    const testConnection = () => {
        let checkStarted = false;
        const checkRepository = () => {
            checkStarted = true;
            router.post(route('admin.git_repository.check'), {}, {
                preserveScroll: true,
                onFinish: () => setBusy(false),
            });
        };

        setBusy(true);
        form.post(route('admin.git_repository.settings'), {
            preserveScroll: true,
            onSuccess: (page) => {
                form.setData('credential', '');
                if (page.props.flash?.error) {
                    setBusy(false);
                    return;
                }

                checkRepository();
            },
            onError: () => setBusy(false),
            onFinish: () => {
                if (!checkStarted) {
                    setBusy(false);
                }
            },
        });
    };

    const initializeManagedRepo = () => {
        if (window.confirm('Initialize or repair the application-managed private Git checkout? This will safely clone the configured repository into private storage and establish internal Git management.')) {
            run('initialize');
        }
    };

    const deployReviewedUpdate = () => {
        const migrationNotice = form.data.run_migrations
            ? ' Forward database migrations are enabled and will run automatically if included in the release.'
            : ' Database migrations are currently turned off in settings.';

        if (window.confirm(`Apply the reviewed fast-forward update to the deployed application?${migrationNotice}`)) {
            run('pull');
        }
    };

    const handleRunMigrations = () => {
        if (window.confirm('Run all pending database migrations now? This will execute "php artisan migrate --force" on the production database.')) {
            run('database.migrate');
        }
    };

    const handleRollbackMigrations = () => {
        if (window.confirm('Are you sure you want to rollback the last migration batch? This will revert the most recent database schema changes.')) {
            run('database.rollback', { step: 1 });
        }
    };

    const handleRemigrate = () => {
        if (window.confirm('Re-migrate the latest batch? This will rollback the last migration batch and immediately re-run it.')) {
            run('database.remigrate', { step: 1 });
        }
    };

    const handleClearCaches = () => {
        run('database.clear_caches');
    };

    const handleRebuildCaches = () => {
        run('database.rebuild_caches');
    };

    const filteredMigrations = useMemo(() => {
        const list = database.migrations || [];
        return list.filter((m) => {
            if (migrationFilter === 'pending' && m.ran) return false;
            if (migrationFilter === 'ran' && !m.ran) return false;
            if (!migrationSearch.trim()) return true;
            const q = migrationSearch.toLowerCase();
            return m.name.toLowerCase().includes(q) || m.filename.toLowerCase().includes(q);
        });
    }, [database.migrations, migrationFilter, migrationSearch]);

    const isGitCheckoutIssue = ['Unavailable', 'Not connected', 'Disabled', 'Wrong branch'].includes(repository.status);

    return (
        <AdminLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">System Management</h2>}>
            <Head title="Git Repository & Database Management" />

            <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
                {/* Header Banner */}
                <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">System / Management</p>
                    <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Git & Database Management</h1>
                            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-300">
                                In-application Git deployment and database migration control. No cPanel Git Version Control or SSH required.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Git State</p>
                                <div className="mt-1"><StatusPill status={repository.status} /></div>
                            </div>
                            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Database</p>
                                <div className="mt-1">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${database.connected ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30' : 'bg-rose-500/20 text-rose-200 ring-rose-400/30'}`}>
                                        {database.connected ? `${database.driver?.toUpperCase() || 'DB'} Connected` : 'Disconnected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Segmented Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('git')}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'git' ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/40' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                            </svg>
                            Git Repository & Updates
                            <StatusPill status={repository.status} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('database')}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'database' ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/40' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                            </svg>
                            Database & Migrations
                            {database.pending_count > 0 ? (
                                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-950">
                                    {database.pending_count} pending
                                </span>
                            ) : (
                                <span className="rounded-full bg-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                                    All migrated
                                </span>
                            )}
                        </button>
                    </div>
                </section>

                {/* Flash Messages */}
                {(success || error) && (
                    <div
                        role={error ? 'alert' : 'status'}
                        className={`rounded-xl border p-4 text-sm font-medium leading-5 ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-lg">{error ? '⚠️' : '✅'}</span>
                            <div className="flex-1 whitespace-pre-wrap font-mono text-xs sm:text-sm">{error || success}</div>
                        </div>
                    </div>
                )}

                {/* TAB 1: GIT REPOSITORY */}
                {activeTab === 'git' && (
                    <div className="space-y-5">
                        {/* Quick In-App Git Checkout Callout if checkout issue detected */}
                        {isGitCheckoutIssue && (
                            <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm sm:p-5">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                    <div>
                                        <h3 className="text-base font-semibold text-blue-950">Self-Contained In-App Git Management</h3>
                                        <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-800">
                                            The application manages its own private Git checkout directly in private storage. If your repository checkout is missing or unreadable, click below to initialize or repair it directly.
                                        </p>
                                    </div>
                                    <ActionButton tone="blue" disabled={busy} onClick={initializeManagedRepo}>
                                        {busy ? 'Cloning & initializing...' : 'Initialize / Repair Managed Checkout'}
                                    </ActionButton>
                                </div>
                            </section>
                        )}

                        {/* Repository Settings */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Connection</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Repository settings</h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Configure the Clinic GitHub repository. Tokens and deploy keys are encrypted and stored in private application storage.
                                    </p>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {settings.enabled ? 'Integration enabled' : 'Integration disabled'}
                                </span>
                            </div>

                            <form onSubmit={saveSettings} className="mt-4 space-y-4">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Integration
                                        <select
                                            value={form.data.enabled ? '1' : '0'}
                                            onChange={(event) => form.setData('enabled', event.target.value === '1')}
                                            disabled={!settings.can_configure || form.processing}
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                        >
                                            <option value="0">Off</option>
                                            <option value="1">On</option>
                                        </select>
                                    </label>
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Repository type
                                        <select
                                            value={form.data.repository_type}
                                            onChange={(event) => form.setData('repository_type', event.target.value)}
                                            disabled={!settings.can_configure || form.processing}
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                        >
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                        </select>
                                    </label>
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Branch
                                        <input
                                            value={form.data.branch}
                                            onChange={(event) => form.setData('branch', event.target.value)}
                                            disabled={!settings.can_configure || form.processing}
                                            maxLength={100}
                                            required
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                        />
                                        {form.errors.branch && <span className="mt-1 block text-xs text-rose-700">{form.errors.branch}</span>}
                                    </label>
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Remote name
                                        <input
                                            value={form.data.remote}
                                            onChange={(event) => form.setData('remote', event.target.value)}
                                            disabled={!settings.can_configure || form.processing}
                                            maxLength={50}
                                            required
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                        />
                                        {form.errors.remote && <span className="mt-1 block text-xs text-rose-700">{form.errors.remote}</span>}
                                    </label>
                                </div>

                                <label className="block text-xs font-semibold text-slate-600">
                                    GitHub repository URL
                                    <input
                                        value={form.data.repository_url}
                                        onChange={(event) => form.setData('repository_url', event.target.value)}
                                        disabled={!settings.can_configure || form.processing}
                                        maxLength={255}
                                        required
                                        autoComplete="url"
                                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                    />
                                    {form.errors.repository_url && <span className="mt-1 block text-xs text-rose-700">{form.errors.repository_url}</span>}
                                    <span className="mt-1 block font-normal text-slate-500">
                                        Use a GitHub HTTPS URL or SSH clone URL. When enabled, the application creates and protects its own private checkout under Laravel storage; cPanel Git Version Control is not required.
                                    </span>
                                </label>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Authentication
                                        <select
                                            value={form.data.authentication}
                                            onChange={(event) => form.setData('authentication', event.target.value)}
                                            disabled={!settings.can_configure || form.processing}
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                        >
                                            <option value="none">None (public repository)</option>
                                            <option value="personal_access_token">Personal access token</option>
                                            <option value="ssh_deploy_key">SSH deploy key</option>
                                        </select>
                                    </label>
                                    <label className="block text-xs font-semibold text-slate-600">
                                        Replace credential
                                        <input
                                            type="password"
                                            value={form.data.credential}
                                            onChange={(event) => form.setData('credential', event.target.value)}
                                            disabled={!settings.can_configure || form.processing || form.data.authentication === 'none'}
                                            autoComplete="new-password"
                                            maxLength={10000}
                                            placeholder={settings.has_credential ? 'Saved securely; leave blank to keep it' : form.data.authentication === 'ssh_deploy_key' ? 'Paste the private deploy key' : 'Required for private repositories'}
                                            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-800 disabled:bg-slate-100"
                                        />
                                        {form.errors.credential && <span className="mt-1 block text-xs text-rose-700">{form.errors.credential}</span>}
                                        <span className="mt-1 block font-normal text-slate-500">
                                            Encrypted using the application key. SSH also requires the host to already trust GitHub in known_hosts.
                                        </span>
                                    </label>
                                </div>

                                {settings.has_credential && form.data.authentication !== 'none' && (
                                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={form.data.clear_credential}
                                            onChange={(event) => form.setData('clear_credential', event.target.checked)}
                                            disabled={!settings.can_configure || form.processing}
                                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                        />
                                        Clear the saved credential
                                    </label>
                                )}

                                {form.errors.authentication && <p className="text-xs text-rose-700">{form.errors.authentication}</p>}

                                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                                    {[
                                        ['run_migrations', 'Run migrations after deployment'],
                                        ['clear_cache', 'Clear and rebuild application cache'],
                                        ['health_check', 'Run a database health check'],
                                    ].map(([field, label]) => (
                                        <label key={field} className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={form.data[field]}
                                                onChange={(event) => form.setData(field, event.target.checked)}
                                                disabled={!settings.can_configure || form.processing}
                                                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                                            />
                                            {label}
                                        </label>
                                    ))}
                                    <p className="basis-full text-xs text-amber-800">
                                        Migrations default to off. Enabling them allows this page to alter the configured production database during deployment.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                                    <button
                                        type="submit"
                                        disabled={!settings.can_configure || form.processing}
                                        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {form.processing ? 'Saving...' : 'Save settings'}
                                    </button>
                                    <ActionButton tone="light" disabled={busy || !settings.can_configure || !form.data.enabled} onClick={testConnection}>
                                        {busy ? 'Checking...' : 'Test connection'}
                                    </ActionButton>
                                    <ActionButton tone="blue" disabled={busy || !settings.can_configure} onClick={initializeManagedRepo}>
                                        {busy ? 'Initializing...' : 'Initialize / Repair Checkout'}
                                    </ActionButton>
                                    <p className="text-xs text-slate-500">
                                        Settings are saved securely in private storage. This page never pushes commits to GitHub.
                                    </p>
                                </div>

                                {!settings.can_configure && (
                                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                                        {settings.configuration_message}
                                    </p>
                                )}
                            </form>
                        </section>

                        {/* Safe Workflow */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Safe workflow</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Review before deployment</h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Fetch first, review the incoming commits and checkout state, then apply only an eligible fast-forward update.
                                    </p>
                                </div>
                                <div className="text-left text-xs text-slate-500 sm:text-right">
                                    <p>Live <code className="font-semibold text-slate-800">{shortCommit(repository.local_commit)}</code></p>
                                    {repository.source_commit && repository.source_commit !== repository.local_commit && (
                                        <p>Source <code className="font-semibold text-slate-800">{shortCommit(repository.source_commit)}</code></p>
                                    )}
                                    <p>Remote <code className="font-semibold text-slate-800">{shortCommit(repository.remote_commit)}</code></p>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">01</span>
                                    <h3 className="mt-3 text-sm font-semibold text-slate-900">Check for updates</h3>
                                    <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">
                                        Fetch the configured GitHub branch and list incoming commits without changing application files.
                                    </p>
                                    <ActionButton tone="blue" className="mt-3" disabled={busy || !repository.enabled} onClick={() => run('check')}>
                                        {busy ? 'Checking...' : 'Check GitHub'}
                                    </ActionButton>
                                </article>

                                <article className={`rounded-xl border p-4 ${repository.working_tree_changes > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">02</span>
                                    <h3 className="mt-3 text-sm font-semibold text-slate-900">Review server state</h3>
                                    <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">
                                        {repository.working_tree_changes > 0 ? `${repository.working_tree_changes} tracked source change(s) block an update.` : 'Only a clean, non-diverged source checkout can be updated.'}
                                    </p>
                                    <StatusPill status={repository.status} />

                                    {repository.message && repository.status === 'Update available' && !repository.pull_available && (
                                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900" role="status">
                                            {repository.message}
                                        </p>
                                    )}

                                    {isGitCheckoutIssue && (
                                        <div className="mt-3">
                                            <p className="mb-2 text-xs leading-5 text-slate-600">
                                                Initialize or repair the private application-managed checkout in local storage.
                                            </p>
                                            <ActionButton tone="blue" disabled={busy} onClick={initializeManagedRepo}>
                                                {busy ? 'Preparing checkout...' : 'Initialize checkout'}
                                            </ActionButton>
                                        </div>
                                    )}
                                </article>

                                <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">03</span>
                                    <h3 className="mt-3 text-sm font-semibold text-slate-900">Deploy reviewed update</h3>
                                    <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">
                                        Apply the reviewed update through the verified deployment path and record the result.
                                    </p>
                                    <ActionButton tone="cyan" disabled={busy || !repository.pull_available} onClick={deployReviewedUpdate}>
                                        Deploy reviewed update
                                    </ActionButton>
                                </article>
                            </div>

                            {repository.incoming_commit_details?.length > 0 && (
                                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                                    <table className="w-full min-w-[620px] text-left text-sm">
                                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                            <tr><th className="px-4 py-3">Commit</th><th className="px-4 py-3">Summary</th><th className="px-4 py-3">Author</th><th className="px-4 py-3">Date</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {repository.incoming_commit_details.map((commit) => (
                                                <tr key={commit.hash}>
                                                    <td className="px-4 py-3 font-mono text-xs">{commit.short}</td>
                                                    <td className="px-4 py-3">{commit.subject}</td>
                                                    <td className="px-4 py-3">{commit.author}</td>
                                                    <td className="px-4 py-3">{formatDate(commit.date)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {repository.working_tree_paths?.length > 0 && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                    <h3 className="text-sm font-semibold text-amber-950">Local server changes</h3>
                                    <ul className="mt-2 grid gap-1 font-mono text-xs text-amber-900 sm:grid-cols-2">
                                        {repository.working_tree_paths.map((path) => <li key={path}>{path}</li>)}
                                    </ul>
                                </div>
                            )}
                        </section>

                        {/* Audit Trail */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Audit trail</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Deployment history</h2>
                                </div>
                                <ActionButton tone="light" disabled={busy || !repository.enabled} onClick={() => run('check')}>
                                    {busy ? 'Checking...' : 'Refresh status'}
                                </ActionButton>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                        <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Commit</th><th className="px-4 py-3">Checks</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.length === 0 ? (
                                            <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-slate-500">No deployments recorded yet.</td></tr>
                                        ) : history.map((entry, index) => (
                                            <Fragment key={`${entry.finished_at}-${index}`}>
                                                <tr>
                                                    <td className="px-4 py-3">{formatDate(entry.finished_at)}</td>
                                                    <td className="px-4 py-3">{entry.change}</td>
                                                    <td className="px-4 py-3 font-mono text-xs">{shortCommit(entry.target_commit)}</td>
                                                    <td className="px-4 py-3">{entry.checks?.length ?? 0} checks</td>
                                                    <td className="px-4 py-3"><StatusPill status={entry.status === 'completed' ? 'Completed' : 'Failed'} /></td>
                                                    <td className="px-4 py-3">
                                                        <button type="button" onClick={() => setExpandedHistory(expandedHistory === index ? null : index)} className="font-semibold text-cyan-800 underline underline-offset-2">
                                                            {expandedHistory === index ? 'Hide details' : 'Details'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {expandedHistory === index && (
                                                    <tr>
                                                        <td colSpan="6" className="bg-slate-50 px-4 py-3 text-xs text-slate-600">
                                                            <p>Branch: <span className="font-medium text-slate-800">{entry.branch}</span></p>
                                                            <p className="mt-1">Previous commit: <code>{shortCommit(entry.previous_commit)}</code></p>
                                                            <p className="mt-1">Checks: {entry.checks?.join(' · ') || 'No check details recorded'}</p>
                                                            <p className="mt-1">Incoming commits applied: {entry.commits_applied}</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">
                                History is stored in private application storage. Updates are fast-forward only; this page never pushes to GitHub.
                            </p>
                        </section>
                    </div>
                )}

                {/* TAB 2: DATABASE & MIGRATIONS */}
                {activeTab === 'database' && (
                    <div className="space-y-5">
                        {/* Pending Migrations Alert Banner */}
                        {database.pending_count > 0 && (
                            <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-xl bg-amber-500/20 p-2 text-2xl">⚡</div>
                                        <div>
                                            <h3 className="text-base font-bold text-amber-950">
                                                {database.pending_count} Pending Database Migration{database.pending_count > 1 ? 's' : ''} Ready to Apply
                                            </h3>
                                            <p className="mt-1 text-xs leading-5 text-amber-800">
                                                New migration files were detected in the codebase that have not yet been executed against the database.
                                                Running migrations will update your tables and columns safely.
                                            </p>
                                        </div>
                                    </div>
                                    <ActionButton tone="amber" className="shadow-md" disabled={busy} onClick={handleRunMigrations}>
                                        {busy ? 'Running migrations...' : 'Run Pending Migrations Now'}
                                    </ActionButton>
                                </div>
                            </section>
                        )}

                        {/* Database Health Cards */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Connection & Driver</p>
                                <div className="mt-2 flex items-baseline justify-between">
                                    <p className="text-xl font-bold text-slate-900">{database.driver?.toUpperCase() || 'MYSQL'}</p>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${database.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {database.connected ? 'Connected' : 'Offline'}
                                    </span>
                                </div>
                                <p className="mt-1 truncate font-mono text-xs text-slate-500">{database.database || 'Default database'}</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Database Engine</p>
                                <p className="mt-2 text-xl font-bold text-slate-900 truncate" title={database.version}>{database.version || 'Unknown'}</p>
                                <p className="mt-1 text-xs text-slate-500">Production SQL runtime</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Migrations Executed</p>
                                <div className="mt-2 flex items-baseline justify-between">
                                    <p className="text-xl font-bold text-emerald-700">{database.ran_count || 0}</p>
                                    <span className="text-xs text-slate-500">of {database.total_count || 0} total</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Latest Batch: #{database.latest_batch || 0}</p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Migrations</p>
                                <div className="mt-2 flex items-baseline justify-between">
                                    <p className={`text-xl font-bold ${database.pending_count > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {database.pending_count || 0}
                                    </p>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${database.pending_count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {database.pending_count > 0 ? 'Action required' : 'Up to date'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Files awaiting execution</p>
                            </div>
                        </div>

                        {/* Database Operations Toolbar */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Database Tools</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Migration & Cache Controls</h2>
                                    <p className="mt-1 text-xs text-slate-600">
                                        Execute migrations, revert schema changes, or refresh compiled application caches without command-line access.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2.5">
                                <ActionButton
                                    tone={database.pending_count > 0 ? 'amber' : 'emerald'}
                                    disabled={busy || database.pending_count === 0}
                                    onClick={handleRunMigrations}
                                >
                                    {busy ? 'Processing...' : `Run Pending Migrations (${database.pending_count || 0})`}
                                </ActionButton>

                                <ActionButton
                                    tone="dark"
                                    disabled={busy || database.ran_count === 0}
                                    onClick={handleRollbackMigrations}
                                >
                                    {busy ? 'Processing...' : 'Rollback Last Batch (Step 1)'}
                                </ActionButton>

                                <ActionButton
                                    tone="light"
                                    disabled={busy || database.ran_count === 0}
                                    onClick={handleRemigrate}
                                >
                                    {busy ? 'Processing...' : 'Re-migrate / Refresh Last Batch'}
                                </ActionButton>

                                <ActionButton
                                    tone="light"
                                    disabled={busy}
                                    onClick={handleClearCaches}
                                >
                                    {busy ? 'Clearing...' : 'Clear All Caches'}
                                </ActionButton>

                                <ActionButton
                                    tone="light"
                                    disabled={busy}
                                    onClick={handleRebuildCaches}
                                >
                                    {busy ? 'Rebuilding...' : 'Rebuild Caches'}
                                </ActionButton>
                            </div>
                            <p className="mt-3 text-xs text-slate-500">
                                Rollback operations alter database structure. Always ensure data backups exist before rolling back in production.
                            </p>
                        </section>

                        {/* Migrations List */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Catalog</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Database Migration Files</h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Search input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={migrationSearch}
                                            onChange={(e) => setMigrationSearch(e.target.value)}
                                            placeholder="Search migrations..."
                                            className="w-48 rounded-lg border border-slate-200 py-1.5 pl-3 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 sm:w-60"
                                        />
                                        {migrationSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setMigrationSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>

                                    {/* Filter buttons */}
                                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                                        {[
                                            ['all', `All (${database.total_count || 0})`],
                                            ['pending', `Pending (${database.pending_count || 0})`],
                                            ['ran', `Executed (${database.ran_count || 0})`],
                                        ].map(([key, label]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setMigrationFilter(key)}
                                                className={`rounded-md px-2.5 py-1 font-semibold transition ${migrationFilter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full min-w-[620px] text-left text-sm">
                                    <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Migration Name</th>
                                            <th className="px-4 py-3">Filename</th>
                                            <th className="px-4 py-3 text-right">Batch</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredMigrations.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-8 text-center text-xs text-slate-500">
                                                    No migrations found matching the current search or filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredMigrations.map((m) => (
                                                <tr key={m.filename} className={!m.ran ? 'bg-amber-50/50' : ''}>
                                                    <td className="px-4 py-2.5">
                                                        {m.ran ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                                </svg>
                                                                Executed
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 ring-1 ring-amber-300">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2.5 font-medium text-slate-900 text-xs">{m.name}</td>
                                                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{m.filename}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-slate-700">
                                                        {m.batch ? `#${m.batch}` : '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Database Tables Overview */}
                        {database.tables?.length > 0 && (
                            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="border-b border-slate-100 pb-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Database Schema</p>
                                    <h2 className="mt-1 text-lg font-semibold text-slate-900">Key Clinic Tables & Records</h2>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                    {database.tables.map((t) => (
                                        <div key={t.table} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <p className="text-xs font-semibold text-slate-900">{t.label}</p>
                                            <p className="font-mono text-[10px] text-slate-500">{t.table}</p>
                                            <p className="mt-2 text-lg font-bold text-slate-900">
                                                {t.exists ? t.rows.toLocaleString() : <span className="text-xs font-normal text-rose-600">Missing</span>}
                                            </p>
                                            <p className="text-[10px] text-slate-500">records</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Footer Notice */}
                <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
                    System operations (Git repository updates and database migrations) are restricted to the Super Admin role.
                    All actions are performed directly on the server without external SSH or cPanel dependencies.
                    Always verify patient data backups in System Health before performing major database rollbacks.
                </aside>
            </div>
        </AdminLayout>
    );
}
