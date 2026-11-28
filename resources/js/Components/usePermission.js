import { usePage } from '@inertiajs/react';

export default function usePermission() {
    const page = usePage() || {};
    const props = page.props || {};
    const auth = (props.auth && typeof props.auth === 'object') ? props.auth : {};
    const rawPermissions = auth.permissions;
    const permissions = Array.isArray(rawPermissions)
        ? rawPermissions
        : (rawPermissions && typeof rawPermissions === 'object' ? Object.values(rawPermissions) : []);

    const rawRoles = auth.roles;
    const roles = Array.isArray(rawRoles)
        ? rawRoles
        : (rawRoles && typeof rawRoles === 'object' ? Object.values(rawRoles) : []);

    const isSuperAdmin = Array.isArray(roles) && roles.includes('Super Admin');

    return (permission) => {
        if (isSuperAdmin) {
            return true;
        }
        return Array.isArray(permissions) && permissions.includes(permission);
    };
}
