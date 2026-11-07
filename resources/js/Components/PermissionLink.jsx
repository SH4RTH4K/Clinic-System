import { Link, usePage } from '@inertiajs/react';
import usePermission from '@/Components/usePermission';

export default function PermissionLink({ permission, href, className = '', children, superAdminAccess = false, ...props }) {
    const { auth = {} } = usePage().props;
    const can = usePermission();
    const canAccess = can(permission)
        || (superAdminAccess && (auth.roles || []).includes('Super Admin'));

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
