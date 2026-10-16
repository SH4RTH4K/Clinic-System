import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { user, permissions = [] } = usePage().props.auth;

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    const navLinks = [
        { label: 'Dashboard', route: 'dashboard', active: 'dashboard', permission: null },
        { label: 'Visits', route: 'admin.visits.index', active: 'admin.visits.*', permission: 'visits.view' },
        { label: 'Patients', route: 'admin.patients.index', active: 'admin.patients.*', permission: 'patients.view' },
        { label: 'Appts', route: 'admin.appointment_requests.index', active: 'admin.appointment_requests.*', permission: 'appointments.view' },
        { label: 'Medicines', route: 'admin.medicines.index', active: 'admin.medicines.*', permission: 'medicines.view' },
        { label: 'Symptoms', route: 'admin.symptoms.index', active: 'admin.symptoms.*', permission: 'symptoms.view' },
        { label: 'Mappings', route: 'admin.symptom_medicine_map.index', active: 'admin.symptom_medicine_map.*', permission: 'symptom_medicine_map.view' },
        { label: 'Users', route: 'admin.users.index', active: 'admin.users.*', permission: 'users.view' },
        { label: 'Roles', route: 'admin.roles.index', active: 'admin.roles.*', permission: 'roles.view' },
        { label: 'Settings', route: 'admin.settings.edit', active: 'admin.settings.*', permission: 'settings.view' },
        { label: 'Doctors', route: 'admin.doctors.index', active: 'admin.doctors.*', permission: 'settings.view' },
        { label: 'Advice', route: 'admin.advice_items.index', active: 'admin.advice_items.*', permission: 'settings.view' },
        { label: 'Restrictions', route: 'admin.food_restrictions.index', active: 'admin.food_restrictions.*', permission: 'settings.view' },
        { label: 'Reports', route: 'admin.reports.index', active: 'admin.reports.*', permission: 'reports.view' },
        { label: 'Logs', route: 'admin.activity_logs.index', active: 'admin.activity_logs.*', permission: 'reports.view' },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="border-b border-gray-100 bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex min-h-[4rem] justify-between gap-4 py-2 sm:py-0">
                        <div className="flex flex-1 items-stretch">
                            <div className="flex shrink-0 items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800" />
                                </Link>
                            </div>

                            <div className="hidden flex-1 flex-wrap items-center gap-x-4 gap-y-1 sm:ms-8 sm:flex">
                                {navLinks.map((link) => {
                                    if (link.permission && !permissions.includes(link.permission)) {
                                        return null;
                                    }
                                    return (
                                        <NavLink
                                            key={link.label}
                                            href={route(link.route)}
                                            active={route().current(link.active)}
                                        >
                                            {link.label}
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="hidden shrink-0 sm:ms-4 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
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
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <a
                                            href="/"
                                            target="_blank"
                                            className="block w-full px-4 py-2 text-start text-sm leading-5 text-gray-700 transition duration-150 ease-in-out hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                        >
                                            View Website
                                        </a>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        {navLinks.map((link) => {
                            if (link.permission && !permissions.includes(link.permission)) {
                                return null;
                            }
                            return (
                                <ResponsiveNavLink
                                    key={link.label}
                                    href={route(link.route)}
                                    active={route().current(link.active)}
                                >
                                    {link.label}
                                </ResponsiveNavLink>
                            );
                        })}
                    </div>

                    <div className="border-t border-gray-200 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-gray-800">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-gray-500">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <a
                                href="/"
                                target="_blank"
                                className="flex w-full items-start border-l-4 py-2 pe-4 ps-3 border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 text-base font-medium transition duration-150 ease-in-out focus:outline-none"
                            >
                                View Website
                            </a>
                            <ResponsiveNavLink href={route('profile.edit')}>
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white shadow">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
