import { usePage } from '@inertiajs/react';

export default function usePermission() {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];
    const isSuperAdmin = (auth.roles || []).includes('Super Admin');

    return (permission) => isSuperAdmin || permissions.includes(permission);
}
