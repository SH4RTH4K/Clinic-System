import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { user, permissions = [], roles = [] } = usePage().props.auth;
    const isSuperAdmin = roles.includes('Super Admin');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Close mobile drawer on ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && sidebarOpen) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [sidebarOpen]);

    /**
     * Checks if current user has the required permission/role for a link.
     */
    const canSeeLink = ({ permission, role }) => {
        if (role && !roles.includes(role)) return false;
        if (permission && !isSuperAdmin && !permissions.includes(permission)) return false;
        return true;
    };

    const navGroups = [
        {
            title: 'Clinical Operations',
            items: [
                {
                    label: 'Dashboard',
                    route: 'dashboard',
                    active: 'dashboard',
                    permission: null,
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                        </svg>
                    ),
                },
                {
                    label: 'Patients',
                    route: 'admin.patients.index',
                    active: 'admin.patients.*',
                    permission: 'patients.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                    ),
                },
                {
                    label: 'Visits & Prescriptions',
                    route: 'admin.visits.index',
                    active: 'admin.visits.*',
                    permission: 'visits.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    ),
                },
                {
                    label: 'Appointments',
                    route: 'admin.appointment_requests.index',
                    active: 'admin.appointment_requests.*',
                    permission: 'appointments.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                    ),
                },
                {
                    label: 'Reports',
                    route: 'admin.reports.index',
                    active: 'admin.reports.*',
                    permission: 'reports.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                    ),
                },
            ],
        },
        {
            title: 'Medicines & Repertory',
            items: [
                {
                    label: 'Medicines',
                    route: 'admin.medicines.index',
                    active: 'admin.medicines.*',
                    permission: 'medicines.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.942a4.5 4.5 0 01-4.66 0L12 15.3l-1.57.942a4.5 4.5 0 01-4.66 0L4.2 15.3m15.6 0A2.25 2.25 0 0121 17.25v.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-.75a2.25 2.25 0 011.2-1.95" />
                        </svg>
                    ),
                },
                {
                    label: 'Symptoms',
                    route: 'admin.symptoms.index',
                    active: 'admin.symptoms.*',
                    permission: 'symptoms.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                    ),
                },
                {
                    label: 'Symptom Map',
                    route: 'admin.symptom_medicine_map.index',
                    active: 'admin.symptom_medicine_map.*',
                    permission: 'symptom_medicine_map.view',
                    role: null,
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                    ),
                },
                {
                    label: 'Advice Items',
                    route: 'admin.advice_items.index',
                    active: 'admin.advice_items.*',
                    permission: 'settings.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
                        </svg>
                    ),
                },
                {
                    label: 'Food Restrictions',
                    route: 'admin.food_restrictions.index',
                    active: 'admin.food_restrictions.*',
                    permission: 'settings.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    ),
                },
            ],
        },
        {
            title: 'Administration',
            items: [
                {
                    label: 'Doctors',
                    route: 'admin.doctors.index',
                    active: 'admin.doctors.*',
                    permission: 'settings.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    ),
                },
                {
                    label: 'Prescription Options',
                    route: 'admin.prescription_options.edit',
                    active: 'admin.prescription_options.*',
                    permission: 'settings.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    ),
                },
                {
                    label: 'Clinic Settings',
                    route: 'admin.settings.edit',
                    active: 'admin.settings.*',
                    permission: 'settings.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    ),
                },
                {
                    label: 'Users',
                    route: 'admin.users.index',
                    active: 'admin.users.*',
                    permission: 'users.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                    ),
                },
                {
                    label: 'Roles & Permissions',
                    route: 'admin.roles.index',
                    active: 'admin.roles.*',
                    permission: 'roles.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    ),
                },
                {
                    label: 'Activity Logs',
                    route: 'admin.activity_logs.index',
                    active: 'admin.activity_logs.*',
                    permission: 'activity_logs.view',
                    role: 'Super Admin',
                    icon: (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    ),
                },
            ],
        },
    ];

    const renderNavContent = () => (
        <div className="flex h-full flex-col min-h-0 bg-white">
            {/* Brand / Logo (Sticky Top) */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <Link href={route('dashboard')} className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg">
                    <ApplicationLogo className="h-8 w-8 text-primary-500 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-base font-bold text-gray-900 tracking-tight leading-tight">
                            JB Homeo Hall
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                            Clinic Management
                        </span>
                    </div>
                </Link>
            </div>

            {/* Scrollable Nav Area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-4 space-y-6">
                <nav className="space-y-6" aria-label="Sidebar Navigation">
                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter(canSeeLink);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.title} className="space-y-1">
                                <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    {group.title}
                                </h3>
                                <div className="space-y-1 pt-1">
                                    {visibleItems.map((item) => {
                                        const isActive = route().current(item.active);

                                        return (
                                             <Link
                                                key={item.label}
                                                href={route(item.route)}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                                    isActive
                                                        ? 'bg-primary-50 text-primary-700 shadow-xs font-bold'
                                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                            >
                                                <span
                                                    className={`shrink-0 transition ${
                                                        isActive
                                                            ? 'text-primary-600'
                                                            : 'text-gray-400 group-hover:text-gray-600'
                                                    }`}
                                                >
                                                    {item.icon}
                                                </span>
                                                <span className="truncate">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Pinned Bottom User Info & Logout Button */}
            <div className="shrink-0 border-t border-gray-100 p-3 bg-white">
                <div className="flex items-center gap-3 rounded-lg p-2 bg-gray-50/80 border border-gray-100">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-sm text-primary-700">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-gray-900">{user?.name || 'User'}</p>
                        <p className="truncate text-[11px] text-gray-500 font-medium">
                            {roles.length > 0 ? roles[0] : 'Staff'}
                        </p>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Log out"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-surface">
            {/* Mobile Drawer Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-xs transition-opacity md:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile Sliding Sidebar Drawer */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                aria-label="Mobile Navigation"
            >
                <div className="absolute right-2.5 top-3.5 z-10">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        aria-label="Close sidebar"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {renderNavContent()}
            </aside>

            {/* Desktop Fixed Left Sidebar */}
            <aside
                className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:border-r md:border-gray-200 md:bg-white"
                aria-label="Desktop Navigation"
            >
                {renderNavContent()}
            </aside>

            {/* Main Content Area (offset by sidebar on desktop) */}
            <div className="flex flex-col md:pl-64">
                {/* Topbar */}
                <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6 lg:px-8 shadow-xs">
                    {/* Mobile menu trigger */}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
                        aria-label="Open sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-2">
                        {header && <div className="text-lg font-bold text-gray-900 md:text-xl">{header}</div>}
                    </div>

                    {/* Right User Actions Dropdown */}
                    <div className="flex items-center gap-3">
                        <a
                            href="/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition sm:flex"
                        >
                            <span>View Website</span>
                            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>

                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                                >
                                    <span>{user?.name || 'Account'}</span>
                                    <svg
                                        className="h-4 w-4 text-gray-400"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content align="right" width="48">
                                <a
                                    href="/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full px-4 py-2 text-start text-sm text-gray-700 hover:bg-gray-100 sm:hidden"
                                >
                                    View Website
                                </a>
                                <Dropdown.Link href={route('profile.edit')}>
                                    Profile
                                </Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {/* Page Main Content */}
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
