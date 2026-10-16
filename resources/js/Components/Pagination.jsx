import { Link } from '@inertiajs/react';

function cleanLabel(label) {
    if (!label) return '';
    return label
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»')
        .replace(/&lsaquo;/g, '‹')
        .replace(/&rsaquo;/g, '›');
}

export default function Pagination({ links = [], className = '' }) {
    if (!links || links.length <= 3) return null;

    return (
        <nav
            aria-label="Pagination"
            className={`flex flex-wrap items-center justify-center gap-1.5 pt-4 ${className}`}
        >
            {links.map((link, index) => {
                const label = cleanLabel(link.label);

                if (!link.url) {
                    return (
                        <span
                            key={index}
                            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-400 select-none cursor-not-allowed"
                            aria-disabled="true"
                        >
                            {label}
                        </span>
                    );
                }

                if (link.active) {
                    return (
                        <span
                            key={index}
                            aria-current="page"
                            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-primary-500 bg-primary-500 px-3 text-xs font-bold text-white shadow-sm"
                        >
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

