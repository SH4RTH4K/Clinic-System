import { Link } from '@inertiajs/react';

const tabs = [
    { label: 'Roles', routeName: 'admin.roles.index', key: 'roles' },
    { label: 'Permissions', routeName: 'admin.permissions.index', key: 'permissions' },
];

export default function AccessControlNavigation({ active }) {
    return (
        <nav aria-label="Access control sections" className="flex w-full rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:w-fit">
            {tabs.map((tab) => {
                const isActive = active === tab.key;

                return (
                    <Link
                        key={tab.key}
                        href={route(tab.routeName)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
                            isActive
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        {tab.key === 'roles' ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 18.5a6.5 6.5 0 00-13 0M9.5 11a4 4 0 110-8 4 4 0 010 8zm6.25-5.5h5m-2.5-2.5v5" />
                            </svg>
                        ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.03 5.91c-.56-.1-1.16.03-1.56.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.59l6.5-6.5c.4-.41.53-1 .43-1.57A6 6 0 1121.75 8.25" />
                            </svg>
                        )}
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
