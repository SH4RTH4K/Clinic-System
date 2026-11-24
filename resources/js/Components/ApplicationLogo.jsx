import { usePage } from '@inertiajs/react';

export default function ApplicationLogo({ className = 'h-9 w-auto', src, ...props }) {
    const clinic = usePage()?.props?.clinic;
    const logoSrc = src || clinic?.logo_url;

    if (logoSrc) {
        return (
            <img
                src={logoSrc}
                alt={clinic?.name_en || 'Clinic Logo'}
                className={`${className} object-contain`}
                {...props}
            />
        );
    }

    return (
        <svg
            className={className}
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <rect width="40" height="40" rx="10" fill="#147a96" />
            <path
                d="M16 11V29M24 11V29M16 20H24M11 20H29"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
