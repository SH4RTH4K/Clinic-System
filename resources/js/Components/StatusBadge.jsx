export default function StatusBadge({ status, className = '' }) {
    if (!status) return null;

    const normalized = String(status).toLowerCase().trim();

    const variants = {
        finalized: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',

        draft: 'bg-amber-50 text-amber-700 border-amber-200',
        pending: 'bg-amber-50 text-amber-700 border-amber-200',

        inactive: 'bg-rose-50 text-rose-700 border-rose-200',
        cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
        rejected: 'bg-rose-50 text-rose-700 border-rose-200',

        default: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    const badgeStyle = variants[normalized] || variants.default;

    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeStyle} ${className}`}
        >
            <span
                className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-75"
                aria-hidden="true"
            />
            {status}
        </span>
    );
}

