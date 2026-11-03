import { Link } from '@inertiajs/react';
import usePermission from '@/Components/usePermission';

export default function PermissionLink({ permission, href, className = '', children, ...props }) {
    const canAccess = usePermission()(permission);

    if (!canAccess) {
        return (
            <span aria-disabled="true" className={`${className} pointer-events-none cursor-not-allowed opacity-50`}>
                {children}
            </span>
        );
    }

    return (
        <Link href={href} className={className} {...props}>
            {children}
        </Link>
    );
}
