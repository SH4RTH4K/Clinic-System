import AccessControlNavigation from '@/Components/AccessControlNavigation';
import FormField from '@/Components/FormField';
import PageHeader from '@/Components/PageHeader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, errors, processing } = useForm({ name: '' });

    const submit = (event) => {
        event.preventDefault();
        post(route('admin.roles.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Create Role" />
            <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title="Create role"
                    subtitle="Create a staff role, then assign its permissions from the separate Permissions page."
                />
                <AccessControlNavigation active="roles" />

                <form onSubmit={submit} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="space-y-5 p-6">
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Role details</h2>
                            <p className="mt-1 text-sm text-gray-500">Use a clear name that matches the staff member’s responsibilities.</p>
                        </div>
                        <div className="max-w-xl">
                            <FormField id="name" label="Role name" error={errors.name} required>
                                <input
                                    id="name"
                                    type="text"
                                    value={data.name}
                                    onChange={(event) => setData('name', event.target.value)}
                                    maxLength={255}
                                    autoComplete="off"
                                    placeholder="e.g. Clinic Assistant"
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    required
                                />
                            </FormField>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                        <Link
                            href={route('admin.roles.index')}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Create role'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
