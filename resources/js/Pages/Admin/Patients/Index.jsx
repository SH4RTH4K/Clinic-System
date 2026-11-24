import ConfirmDialog from '@/Components/ConfirmDialog';
import DataTable from '@/Components/DataTable';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import usePermission from '@/Components/usePermission';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { formatAgeSummary } from './ageHelpers';
import { getGuardianRelationshipLabel } from './relationshipHelpers';

export default function Index({ patients, filters = {}, relationshipOptions = [] }) {
    const can = usePermission();
    const canCreate = can('patients.create');
    const canUpdate = can('patients.update');
    const canDelete = can('patients.delete');
    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
        guardian_name: filters.guardian_name || '',
    });

    const [showFilters, setShowFilters] = useState(Boolean(filters.guardian_name));
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const onSearch = (e) => {
        e.preventDefault();
        get(route('admin.patients.index'), { preserveState: true });
    };

    const hasActiveFilters = Boolean(data.search || data.guardian_name || filters.search || filters.guardian_name);

    const confirmDelete = () => {
        if (!canDelete || !deleteId) return;
        setIsDeleting(true);
        router.delete(route('admin.patients.destroy', deleteId), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeleteId(null);
            },
        });
    };

    const columns = [
        {
            key: 'patient_no',
            label: 'Patient ID',
            render: (p) => (
                <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                    {p.patient_identifier || `${p.patient_no}${p.patient_series || ''}`}
                </span>
            ),
        },
        {
            key: 'old_or_other_id',
            label: 'Old/Other ID',
            render: (p) => (
                <span className="font-mono text-xs text-gray-700">
                    {p.old_or_other_id || '—'}
                </span>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            render: (p) => (
                <div className="flex items-center space-x-3">
                    {p.photo_url ? (
                        <img
                            src={p.photo_url}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                            {p.name ? p.name.charAt(0) : 'P'}
                        </div>
                    )}
                    <div>
                        <span className="font-semibold text-gray-900 block">{p.name}</span>
                        {p.guardian_name && (
                            <span className="block text-xs text-gray-500">
                                {getGuardianRelationshipLabel(p.guardian_relationship, p.guardian_relationship_custom, relationshipOptions) || 'C/O'} {p.guardian_name}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'phone',
            label: 'Phone',
            render: (p) => (
                <span className="text-sm text-gray-700">{p.phone || '—'}</span>
            ),
        },
        {
            key: 'age_gender',
            label: 'Age / Gender',
            render: (p) => (
                <span className="text-sm text-gray-700">
                    {formatAgeSummary(p.age_years, p.age_months, p.age_days) || p.dob || '—'}
                    {p.gender ? ` (${ucFirst(p.gender)})` : ''}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (p) => (
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={route('admin.patients.opd_card', p.id)}
                        className="rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                        title="Print OPD Card"
                    >
                        OPD Card
                    </Link>
                    <Link
                        href={route('admin.patients.show', p.id)}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition"
                    >
                        View
                    </Link>
                    {canUpdate ? (
                        <Link
                            href={route('admin.patients.edit', p.id)}
                            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition"
                        >
                            Edit
                        </Link>
                    ) : (
                        <button type="button" disabled className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 cursor-not-allowed opacity-50">
                            Edit
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setDeleteId(p.id)}
                        disabled={!canDelete}
                        className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 transition enabled:hover:bg-rose-50 enabled:hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    function ucFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return (
        <AuthenticatedLayout header="Patients">
            <Head title="Patients" />

            <div className="mx-auto max-w-7xl">
                <PageHeader
                    title="Patients"
                    subtitle="Register and manage patient health records"
                    actions={canCreate ? (
                        <Link href={route('admin.patients.create')}>
                            <PrimaryButton className="gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>New Patient</span>
                            </PrimaryButton>
                        </Link>
                    ) : (
                            <PrimaryButton disabled className="gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>New Patient</span>
                            </PrimaryButton>
                        )}
                />

                {/* Search & Filters */}
                <div className="mb-4 space-y-3">
                    <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
                        <div className="w-full sm:w-80 md:w-96">
                            <TextInput
                                type="text"
                                aria-label="Search patients by name, guardian, phone, or patient ID"
                                value={data.search}
                                onChange={(e) => setData('search', e.target.value)}
                                placeholder="Search by name, guardian, phone or ID..."
                                className="w-full text-sm"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition flex items-center gap-1.5 ${
                                showFilters || data.guardian_name
                                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            aria-expanded={showFilters}
                            title="Filter specifically by Guardian / Primary Contact Name"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Guardian Search</span>
                            {data.guardian_name ? (
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                            ) : null}
                        </button>
                        {hasActiveFilters ? (
                            <Link
                                href={route('admin.patients.index')}
                                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                            >
                                Reset
                            </Link>
                        ) : null}
                    </form>

                    {showFilters && (
                        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-w-xl">
                            <div className="flex-1 min-w-[220px]">
                                <label htmlFor="guardian-search-input" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Guardian / Primary Contact Name
                                </label>
                                <TextInput
                                    id="guardian-search-input"
                                    type="text"
                                    value={data.guardian_name}
                                    onChange={(e) => setData('guardian_name', e.target.value)}
                                    placeholder="Filter by guardian or contact name..."
                                    className="w-full text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            onSearch(e);
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={onSearch}
                                disabled={processing}
                                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            >
                                Apply
                            </button>
                            {data.guardian_name && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setData('guardian_name', '');
                                        router.get(route('admin.patients.index'), {
                                            search: data.search,
                                        }, { preserveState: true });
                                    }}
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Clear Guardian
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <DataTable
                    columns={columns}
                    data={patients.data || []}
                    isLoading={processing}
                    emptyMessage="No patients found matching the criteria."
                />

                <Pagination links={patients.links} />

                {/* Accessible Confirmation Dialog */}
                <ConfirmDialog
                    show={Boolean(deleteId)}
                    title="Delete Patient"
                    message="Are you sure you want to delete this patient record? This action will safely archive the patient record."
                    confirmLabel="Delete Patient"
                    isLoading={isDeleting}
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteId(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
