export default function PageHeader({ title, subtitle, actions, children }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-ink-muted">
                        {subtitle}
                    </p>
                )}
            </div>
            {(actions || children) && (
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                    {children}
                </div>
            )}
        </div>
    );
}

