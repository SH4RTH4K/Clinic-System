import AdminLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';

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

export default function GitRepository({ repository, settings, history = [] }) {
    const [busy, setBusy] = useState(false);
    const [expandedHistory, setExpandedHistory] = useState(null);
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
    }, [settings.enabled, settings.branch, settings.remote, settings.repository_type, settings.repository_url, settings.authentication, settings.run_migrations, settings.clear_cache, settings.health_check]);

    const run = (action) => {
        setBusy(true);
        router.post(route(`admin.git_repository.${action}`), {}, {
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

    const deployReviewedUpdate = () => {
        const migrationNotice = form.data.run_migrations
            ? ' Forward database migrations are enabled and may change the production schema.'
            : ' If incoming changes include migrations, deployment will be blocked.';

        if (window.confirm(`Apply the reviewed fast-forward update to the deployed application?${migrationNotice} This action cannot roll back database changes.`)) {
            run('pull');
        }
    };

    return (
        <AdminLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Git Repository</h2>}>
            <Head title="Git Repository" />

            <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
                <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">System / Deployment</p>
                    <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Git Repository</h1>
                            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-300">Check the Clinic repository, review incoming changes, and apply only eligible fast-forward updates.</p>
                        </div>
                        <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Current state</p>
                            <div className="mt-1"><StatusPill status={repository.status} /></div>
                        </div>
                    </div>
                </section>

                {(success || error) && (
                    <div role={error ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                        {error || success}
                    </div>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Connection</p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-900">Repository settings</h2>
                            <p className="mt-1 text-sm text-slate-600">Configure the Clinic GitHub repository. Private tokens and deploy keys are encrypted and never returned to the browser.</p>
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
                            <span className="mt-1 block font-normal text-slate-500">Use a GitHub HTTPS URL or SSH clone URL. On cPanel, a verified deployment registers the separate source checkout. Saving settings never initializes Git inside the live application.</span>
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
                                <span className="mt-1 block font-normal text-slate-500">Encrypted using the application key. SSH also requires the host to already trust GitHub in known_hosts. Keep APP_KEY unchanged.</span>
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
                            <p className="basis-full text-xs text-amber-800">Migrations default to off. Enabling them allows this page to alter the configured production database during deployment.</p>
                        </div>

                        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
                            <button type="submit" disabled={!settings.can_configure || form.processing} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {form.processing ? 'Saving...' : 'Save settings'}
                            </button>
                            <ActionButton tone="light" disabled={busy || !settings.can_configure || !form.data.enabled} onClick={testConnection}>
                                {busy ? 'Checking...' : 'Test connection'}
                            </ActionButton>
                            <p className="text-xs text-slate-500">Turn integration on to test. Current settings are saved securely before the connection check. This page never pushes to GitHub.</p>
                        </div>

                        {!settings.can_configure && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
                                {settings.configuration_message}
                            </p>
                        )}
                    </form>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Safe workflow</p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-900">Review before deployment</h2>
                            <p className="mt-1 text-sm text-slate-600">Fetch first, review the incoming commits and checkout state, then apply only an eligible fast-forward.</p>
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
                            <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">Fetch the configured GitHub branch and list incoming commits without changing application files.</p>
                            <ActionButton tone="blue" className="mt-3" disabled={busy || !repository.enabled} onClick={() => run('check')}>
                                {busy ? 'Checking...' : 'Check GitHub'}
                            </ActionButton>
                        </article>
                        <article className={`rounded-xl border p-4 ${repository.working_tree_changes > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">02</span>
                            <h3 className="mt-3 text-sm font-semibold text-slate-900">Review server state</h3>
                            <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">{repository.working_tree_changes > 0 ? `${repository.working_tree_changes} tracked source change(s) block an update.` : 'Only a clean, non-diverged source checkout can be updated.'}</p>
                            <StatusPill status={repository.status} />
                            {repository.source_reconnect_available && ['Unavailable', 'Not connected'].includes(repository.status) && (
                                <div className="mt-3">
                                    <p className="mb-2 text-xs leading-5 text-slate-600">Find the matching repository and branch in the private cPanel repositories directory. This updates only the source registration.</p>
                                    <ActionButton tone="blue" disabled={busy} onClick={() => run('reconnect_source')}>
                                        {busy ? 'Reconnecting...' : 'Reconnect source checkout'}
                                    </ActionButton>
                                </div>
                            )}
                        </article>
                        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">03</span>
                            <h3 className="mt-3 text-sm font-semibold text-slate-900">Deploy reviewed update</h3>
                            <p className="mt-1 min-h-10 text-xs leading-5 text-slate-600">Apply the reviewed update through the verified deployment path and record the result.</p>
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
                    <p className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 sm:px-5">History is stored in private application storage. Git updates are fast-forward only; this page does not push to GitHub or reverse database migrations.</p>
                </section>

                <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
                    Git integration is available in local and production environments when Git and PHP process execution are available. It is disabled in automated tests. The page protects environment files, private storage, uploads, and dependency directories. Untracked files are preserved; conflicting updates stop safely. Database migrations run only when explicitly enabled in settings.
                </aside>
            </div>
        </AdminLayout>
    );
}
