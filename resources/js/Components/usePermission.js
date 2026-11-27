import { usePage } from '@inertiajs/react';

export default function usePermission() {
    const { auth = {} } = usePage().props || {};
    const rawPermissions = auth?.permissions;
    const permissions = Array.isArray(rawPermissions)
        ? rawPermissions
        : (rawPermissions && typeof rawPermissions === 'object' ? Object.values(rawPermissions) : []);

    const rawRoles = auth?.roles;
    const roles = Array.isArray(rawRoles)
        ? rawRoles
        : (rawRoles && typeof rawRoles === 'object' ? Object.values(rawRoles) : []);

    const isSuperAdmin = roles.includes('Super Admin');

    return (permission) => {
        if (isSuperAdmin) {
            return true;
        }
        return permissions.includes(permission);
    };
}
