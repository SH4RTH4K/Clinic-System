import { usePage } from '@inertiajs/react';

export default function usePermission() {
    const { auth = {} } = usePage().props;
    const permissions = auth.permissions || [];

    return (permission) => permissions.includes(permission);
}
