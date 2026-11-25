import ConfirmDialog from '@/Components/ConfirmDialog';
import DataTable from '@/Components/DataTable';
import PageHeader from '@/Components/PageHeader';
import Pagination from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import StatusBadge from '@/Components/StatusBadge';
import TextInput from '@/Components/TextInput';
import usePermission from '@/Components/usePermission';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatAgeSummary } from '@/Utils/ageHelpers';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({
    visits,
    filters = {},
    doctors = [],
    kpis = {},
    currentDoctorId = null,
    defaultDoctorName = 'Doctor',
}) {
    const can = usePermission();
    const canCreate = can('visits.create');
    const canUpdate = can('visits.update') || can('visits.amend');
    const canDelete = can('visits.delete');
    const canExport = can('visits.export') || can('visits.view');
    const canViewOpdCard = can('patients.view');
    const canBilling = can('billing.create') || can('invoices.create');

    const { data, setData, get, processing } = useForm({
        search: filters.search || '',
        doctor_id: filters.doctor_id || '',
        status: filters.status || '',
        date_filter: filters.date_filter || '',
        from_date: filters.from_date || '',
        to_date: filters.to_date || '',
    });

    const [showFilters, setShowFilters] = useState(
        Boolean(filters.doctor_id || filters.status || filters.date_filter || filters.from_date || filters.to_date)
    );
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [sharingWhatsAppId, setSharingWhatsAppId] = useState(null);

    const onSearch = (e) => {
        if (e) e.preventDefault();
        get(route('admin.visits.index'), { preserveState: true });
    };

    const applyQuickDateFilter = (preset) => {
        const nextValue = data.date_filter === preset ? '' : preset;
        setData('date_filter', nextValue);
        router.get(
            route('admin.visits.index'),
            {
                ...data,
                date_filter: nextValue,
            },
            { preserveState: true }
        );
    };

    const hasActiveFilters = Boolean(
        data.search || data.doctor_id || data.status || data.date_filter || data.from_date || data.to_date ||
        filters.search || filters.doctor_id || filters.status || filters.date_filter || filters.from_date || filters.to_date
    );

    const handleWhatsAppShare = async (visitId) => {
        setSharingWhatsAppId(visitId);
        try {
            const response = await fetch(route('admin.visits.whatsapp_url', visitId));
            const result = await response.json();
            if (result.url) {
                window.open(result.url, '_blank', 'noopener,noreferrer');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSharingWhatsAppId(null);
        }
    };

    const confirmDelete = () => {
        if (!canDelete || !deleteId) return;
        setIsDeleting(true);
        router.delete(route('admin.visits.destroy', deleteId), {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setDeleteId(null);
            },
        });
    };

    function ucFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    const columns = [
        {
            key: 'visit_date',
            label: 'Date & Time',
            render: (v) => {
                const dateObj = v.visit_date ? new Date(v.visit_date) : null;
                const dateStr = dateObj ? dateObj.toLocaleDateString() : 'N/A';
                const isToday = v.visit_date && new Date().toISOString().slice(0, 10) === v.visit_date.slice(0, 10);

                return (
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900 text-xs sm:text-sm">{dateStr}</span>
                            {isToday && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Today
                                </span>
                            )}
                        </div>
                        {v.follow_up_date && (
                            <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                <span>📅 Follow-up:</span>
                                <span className="font-medium text-gray-700">{v.follow_up_date}</span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'patient',
            label: 'Patient',
            render: (v) => {
                const p = v.patient;
                if (!p) return <span className="text-sm text-gray-400">Patient not found</span>;
                const cleanPhone = p.phone ? p.phone.replace(/[^0-9]/g, '') : '';

                return (
                    <div className="flex items-start space-x-2.5">
                        {p.photo_url ? (
                            <img
                                src={p.photo_url}
                                alt={p.name}
                                className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0 mt-0.5"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-0.5">
                                {p.name ? p.name.charAt(0) : 'P'}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                    href={route('admin.patients.show', p.id)}
                                    className="font-bold text-gray-900 text-sm hover:text-primary-600 transition"
                                >
                                    {p.name}
                                </Link>
                                <span className="font-mono text-[10px] bg-gray-100 text-gray-800 px-1.5 py-0.2 rounded border border-gray-200">
                                    {p.patient_identifier || `${p.patient_no || ''}${p.patient_series || ''}`}
                                </span>
                                {p.old_or_other_id && (
                                    <span className="font-mono text-[10px] text-gray-600 bg-gray-50 border border-gray-200 px-1 py-0.2 rounded">
                                        Old: {p.old_or_other_id}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                                {formatAgeSummary(p.age_years, p.age_months, p.age_days) || p.dob || '—'}
                                {p.gender ? ` • ${ucFirst(p.gender)}` : ''}
                            </div>
                            {p.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-0.5">
                                    <a href={`tel:${p.phone}`} className="hover:text-primary-600" title="Call phone">
                                        📞 {p.phone}
                                    </a>
                                    {cleanPhone.length >= 10 && (
                                        <a
                                            href={`https://wa.me/${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-emerald-600 hover:text-emerald-700"
                                            title="Chat on WhatsApp"
                                        >
                                            <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.127-.521-1.625-.676-2.656-2.34-2.736-2.449-.079-.11-1.002-1.334-1.002-2.544 0-1.21.636-1.805.862-2.052.226-.247.493-.309.658-.309.165 0 .329.002.473.009.153.008.358-.058.559.426.208.502.71 1.732.772 1.859.062.127.103.275.02.439-.082.164-.124.267-.246.411-.123.144-.26.321-.371.431-.124.123-.253.257-.109.505.144.247.641 1.058 1.378 1.716.949.847 1.751 1.11 2.001 1.233.249.123.395.109.541-.059.146-.168.625-.728.791-.977.166-.249.332-.207.559-.123.228.084 1.442.68 1.69 1.139.248.459.248.868.104 1.273z" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'doctor',
            label: 'Doctor',
            render: (v) => (
                <div className="space-y-0.5">
                    <div className="font-semibold text-gray-900 text-xs sm:text-sm">
                        {v.doctor?.name || defaultDoctorName}
                    </div>
                    {v.doctor?.credentials && (
                        <div className="text-[11px] text-gray-500 truncate max-w-[140px]">
                            {v.doctor.credentials}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'diagnosis_and_clinical',
            label: 'Diagnosis & Clinical Info',
            render: (v) => {
                const diagnosis = v.final_diagnosis || v.provisional_diagnosis;
                const complaint = v.chief_complaint;

                return (
                    <div className="space-y-1 max-w-xs">
                        {diagnosis ? (
                            <span className={`inline-block font-semibold text-xs px-2 py-0.5 rounded border ${
                                v.final_diagnosis
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {diagnosis}
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 italic">No formal diagnosis</span>
                        )}
                        {complaint && (
                            <div className="text-xs text-gray-600 line-clamp-1 truncate" title={complaint}>
                                {complaint}
                            </div>
                        )}
                        {v.vital && (v.vital.bp_systolic || v.vital.weight) && (
                            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                                {v.vital.bp_systolic && (
                                    <span className="bg-gray-100 px-1 py-0.2 rounded font-mono">
                                        BP: {v.vital.bp_systolic}/{v.vital.bp_diastolic}
                                    </span>
                                )}
                                {v.vital.weight && (
                                    <span className="bg-gray-100 px-1 py-0.2 rounded font-mono">
                                        Wt: {v.vital.weight} kg
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'prescription_summary',
            label: 'Rx & Status',
            render: (v) => {
                const rxCount = v.prescription_items_count ?? 0;
                const labCount = v.lab_investigations_count ?? 0;

                return (
                    <div className="space-y-1">
                        <div>
                            <StatusBadge status={v.status} />
                        </div>
                        <div className="text-[11px] text-gray-600 flex items-center gap-1.5 flex-wrap">
                            {rxCount > 0 ? (
                                <span className="font-semibold text-primary-700 bg-primary-50 border border-primary-200 px-1.5 py-0.2 rounded">
                                    💊 {rxCount} items
                                </span>
                            ) : (
                                <span className="text-gray-400">No meds</span>
                            )}
                            {labCount > 0 && (
                                <span className="text-purple-700 bg-purple-50 border border-purple-200 px-1 py-0.2 rounded text-[10px]">
                                    🧪 {labCount} labs
                                </span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'billing',
            label: 'Billing',
            render: (v) => {
                const inv = v.invoice;
                if (!inv) {
                    return canBilling ? (
                        <Link
                            href={route('admin.billing.invoices.create', { visit_id: v.id, patient_id: v.patient_id })}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition"
                            title="Generate invoice for this visit"
                        >
                            <span>+</span> Create Bill
                        </Link>
                    ) : (
                        <span className="text-xs text-gray-400">Unbilled</span>
                    );
                }

                const isPaid = inv.status === 'paid';
                const isPartial = inv.status === 'partial';

                return (
                    <div className="space-y-0.5">
                        <Link
                            href={route('admin.billing.invoices.show', inv.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border hover:underline ${
                                isPaid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : isPartial
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                            title={`Invoice #${inv.invoice_number}`}
                        >
                            <span>{isPaid ? '✓ Paid' : isPartial ? 'Due' : 'Unpaid'}</span>
                            <span className="font-mono">৳{parseFloat(inv.total_amount).toFixed(0)}</span>
                        </Link>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            label: 'Actions',
            className: 'text-right',
            render: (v) => (
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Link
                        href={route('admin.visits.show', v.id)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition"
                        title="View consultation & prescription"
                    >
                        View
                    </Link>
                    {canUpdate && (
                        <Link
                            href={route('admin.visits.edit', v.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-emerald-600 transition"
                            title="Edit or amend consultation"
                        >
                            Edit
                        </Link>
                    )}
                    <a
                        href={route('admin.visits.pdf', v.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition"
                        title="Download or print prescription PDF"
                    >
                        <span>PDF</span>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                    <button
                        type="button"
                        onClick={() => handleWhatsAppShare(v.id)}
                        disabled={sharingWhatsAppId === v.id}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition flex items-center gap-1"
                        title="Share digital prescription on WhatsApp"
                    >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.127-.521-1.625-.676-2.656-2.34-2.736-2.449-.079-.11-1.002-1.334-1.002-2.544 0-1.21.636-1.805.862-2.052.226-.247.493-.309.658-.309.165 0 .329.002.473.009.153.008.358-.058.559.426.208.502.71 1.732.772 1.859.062.127.103.275.02.439-.082.164-.124.267-.246.411-.123.144-.26.321-.371.431-.124.123-.253.257-.109.505.144.247.641 1.058 1.378 1.716.949.847 1.751 1.11 2.001 1.233.249.123.395.109.541-.059.146-.168.625-.728.791-.977.166-.249.332-.207.559-.123.228.084 1.442.68 1.69 1.139.248.459.248.868.104 1.273z" />
                        </svg>
                        <span>WA</span>
                    </button>
                    {canDelete && v.status === 'draft' && (
                        <button
                            type="button"
                            onClick={() => setDeleteId(v.id)}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                            title="Delete draft visit"
                        >
                            Delete
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout header="Visits">
            <Head title="Visits" />

            <div className="mx-auto max-w-7xl">
                {/* KPI Summary Cards */}
                {kpis && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-4 sm:mb-5">
                        <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3.5 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                                    {kpis.visits_today ?? 0}
                                </div>
                                <div className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
                                    Consultations Today
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3.5 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                                    {kpis.total_visits ?? 0}
                                </div>
                                <div className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
                                    Total Consultations
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3.5 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                                    {kpis.finalized_visits ?? 0}
                                </div>
                                <div className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
                                    Finalized Prescriptions
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-2.5 sm:p-3.5 shadow-xs flex items-center gap-2.5 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                                    {kpis.draft_visits ?? 0}
                                </div>
                                <div className="text-[11px] sm:text-xs text-gray-500 font-medium leading-tight">
                                    Pending Drafts
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <PageHeader
                    title="Visits"
                    subtitle="Track clinical encounters, prescriptions and patient consultations"
                    actions={
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {canExport && (
                                <a
                                    href={route('admin.visits.export', {
                                        search: data.search,
                                        doctor_id: data.doctor_id,
                                        status: data.status,
                                        date_filter: data.date_filter,
                                        from_date: data.from_date,
                                        to_date: data.to_date,
                                    })}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
                                    title="Export filtered consultation log to CSV"
                                >
                                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Export CSV</span>
                                </a>
                            )}
                            {canCreate && (
                                <Link href={route('admin.visits.create')} className="flex-1 sm:flex-initial">
                                    <PrimaryButton className="w-full justify-center gap-1.5 text-xs sm:text-sm py-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        <span>New Visit</span>
                                    </PrimaryButton>
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Search & Quick Filters */}
                <div className="mb-4 space-y-3">
                    <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
                        {/* Unified Smart Search Input */}
                        <div className="flex-1 min-w-[220px] sm:w-80 md:w-96">
                            <TextInput
                                type="text"
                                aria-label="Search visits by patient, phone, ID, doctor or diagnosis"
                                value={data.search}
                                onChange={(e) => setData('search', e.target.value)}
                                placeholder="Search patient, phone, ID, diagnosis or complaints..."
                                className="w-full text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
                        >
                            Search
                        </button>

                        {/* Quick Date Presets */}
                        <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                            <button
                                type="button"
                                onClick={() => applyQuickDateFilter('today')}
                                className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                                    data.date_filter === 'today'
                                        ? 'bg-white text-primary-700 font-bold shadow-2xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => applyQuickDateFilter('this_week')}
                                className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                                    data.date_filter === 'this_week'
                                        ? 'bg-white text-primary-700 font-bold shadow-2xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                This Week
                            </button>
                            <button
                                type="button"
                                onClick={() => applyQuickDateFilter('this_month')}
                                className={`px-2.5 py-1.5 rounded-md font-medium transition cursor-pointer ${
                                    data.date_filter === 'this_month'
                                        ? 'bg-white text-primary-700 font-bold shadow-2xs'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                This Month
                            </button>
                        </div>

                        {/* Filters Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                                showFilters || data.doctor_id || data.status || data.date_filter || data.from_date || data.to_date
                                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                            aria-expanded={showFilters}
                            title="Toggle filters"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            <span>Filters</span>
                            {data.doctor_id || data.status || data.date_filter || data.from_date || data.to_date ? (
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                            ) : null}
                        </button>

                        {hasActiveFilters && (
                            <Link
                                href={route('admin.visits.index')}
                                className="rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 transition"
                            >
                                Reset
                            </Link>
                        )}
                    </form>

                    {/* Collapsible Advanced Filters Tray */}
                    {showFilters && (
                        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3 max-w-4xl">
                            {/* Doctor Filter */}
                            <div className="w-48">
                                <label htmlFor="doctor-filter" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Doctor / Physician
                                </label>
                                <select
                                    id="doctor-filter"
                                    value={data.doctor_id}
                                    onChange={(e) => {
                                        setData('doctor_id', e.target.value);
                                        router.get(
                                            route('admin.visits.index'),
                                            { ...data, doctor_id: e.target.value },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="">All Doctors</option>
                                    {currentDoctorId && (
                                        <option value={currentDoctorId}>My Consultations</option>
                                    )}
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="w-36">
                                <label htmlFor="status-filter" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Visit Status
                                </label>
                                <select
                                    id="status-filter"
                                    value={data.status}
                                    onChange={(e) => {
                                        setData('status', e.target.value);
                                        router.get(
                                            route('admin.visits.index'),
                                            { ...data, status: e.target.value },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="finalized">Finalized</option>
                                    <option value="draft">Draft</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Date Filter Dropdown */}
                            <div className="w-40">
                                <label htmlFor="date-filter-select" className="block text-xs font-semibold text-gray-700 mb-1">
                                    Date Preset
                                </label>
                                <select
                                    id="date-filter-select"
                                    value={data.date_filter}
                                    onChange={(e) => {
                                        setData('date_filter', e.target.value);
                                        router.get(
                                            route('admin.visits.index'),
                                            { ...data, date_filter: e.target.value },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="w-full text-sm rounded-lg border-gray-300 shadow-xs focus:border-primary-500 focus:ring-primary-500"
                                >
                                    <option value="">All Dates</option>
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                </select>
                            </div>

                            {/* Custom Date Range */}
                            <div className="w-36">
                                <label htmlFor="from-date-input" className="block text-xs font-semibold text-gray-700 mb-1">
                                    From Date
                                </label>
                                <TextInput
                                    id="from-date-input"
                                    type="date"
                                    value={data.from_date}
                                    onChange={(e) => setData('from_date', e.target.value)}
                                    className="w-full text-sm py-1.5"
                                />
                            </div>

                            <div className="w-36">
                                <label htmlFor="to-date-input" className="block text-xs font-semibold text-gray-700 mb-1">
                                    To Date
                                </label>
                                <TextInput
                                    id="to-date-input"
                                    type="date"
                                    value={data.to_date}
                                    onChange={(e) => setData('to_date', e.target.value)}
                                    className="w-full text-sm py-1.5"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={onSearch}
                                disabled={processing}
                                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>

                {/* Desktop and Tablet Table View (>= 768px) */}
                <div className="hidden md:block">
                    <DataTable
                        columns={columns}
                        data={visits.data || []}
                        isLoading={processing}
                        tableClassName="min-w-[950px]"
                        emptyMessage="No clinical visits recorded yet matching the criteria."
                    />
                </div>

                {/* Mobile View (< 768px): Touch-Friendly High-Density Consultation Cards */}
                <div className="block md:hidden space-y-3 mb-4">
                    {processing ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                            Loading clinical consultations...
                        </div>
                    ) : visits.data && visits.data.length > 0 ? (
                        visits.data.map((v) => {
                            const p = v.patient;
                            const diagnosis = v.final_diagnosis || v.provisional_diagnosis;
                            const cleanPhone = p?.phone ? p.phone.replace(/[^0-9]/g, '') : '';
                            const rxCount = v.prescription_items_count ?? 0;
                            const isToday = v.visit_date && new Date().toISOString().slice(0, 10) === v.visit_date.slice(0, 10);
                            const inv = v.invoice;

                            return (
                                <div
                                    key={v.id}
                                    className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs hover:shadow-xs transition space-y-3"
                                >
                                    {/* Top Row: Avatar, Patient Name, Status, Date & IDs */}
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2.5 min-w-0">
                                            {p?.photo_url ? (
                                                <img
                                                    src={p.photo_url}
                                                    alt={p?.name}
                                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                    {p?.name ? p.name.charAt(0) : 'P'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Link
                                                        href={route('admin.patients.show', v.patient_id)}
                                                        className="font-bold text-gray-900 text-sm hover:text-primary-600 transition"
                                                    >
                                                        {p?.name || 'Unknown Patient'}
                                                    </Link>
                                                    <StatusBadge status={v.status} />
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {p ? formatAgeSummary(p.age_years, p.age_months, p.age_days) || p.dob || '—' : ''}
                                                    {p?.gender ? ` • ${ucFirst(p.gender)}` : ''}
                                                </div>
                                                <div className="text-xs font-semibold text-gray-700 mt-0.5">
                                                    👨‍⚕️ {v.doctor?.name || defaultDoctorName}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Date and ID */}
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold text-xs text-gray-900">
                                                    {v.visit_date ? new Date(v.visit_date).toLocaleDateString() : 'N/A'}
                                                </span>
                                                {isToday && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Today
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono font-bold text-[11px] bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                                                {p?.patient_identifier || `${p?.patient_no || ''}${p?.patient_series || ''}`}
                                            </span>
                                            {p?.old_or_other_id && (
                                                <span className="font-mono text-[10px] text-gray-600 bg-gray-50 border border-gray-200 px-1 py-0.2 rounded">
                                                    Old: {p.old_or_other_id}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Clinical Box: Diagnosis, Chief Complaint, Vitals, Rx items */}
                                    <div className="rounded-lg bg-gray-50/90 border border-gray-100 p-2.5 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Diagnosis:</span>
                                                {diagnosis ? (
                                                    <span className={`font-semibold text-xs px-2 py-0.5 rounded border ${
                                                        v.final_diagnosis
                                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {diagnosis}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">No formal diagnosis</span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-medium text-gray-600">
                                                {rxCount > 0 ? `💊 ${rxCount} items` : 'No meds'}
                                            </div>
                                        </div>

                                        {v.chief_complaint && (
                                            <div className="text-xs text-gray-600 line-clamp-2">
                                                <span className="font-medium text-gray-700">Complaint:</span> {v.chief_complaint}
                                            </div>
                                        )}

                                        {/* Contact & Billing row */}
                                        <div className="pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-xs">
                                            <div>
                                                {p?.phone ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <a href={`tel:${p.phone}`} className="font-semibold text-primary-700 hover:underline">
                                                            📞 {p.phone}
                                                        </a>
                                                        {cleanPhone.length >= 10 && (
                                                            <a
                                                                href={`https://wa.me/${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-emerald-600 hover:text-emerald-700"
                                                                title="Chat on WhatsApp"
                                                            >
                                                                <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="currentColor">
                                                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.127-.521-1.625-.676-2.656-2.34-2.736-2.449-.079-.11-1.002-1.334-1.002-2.544 0-1.21.636-1.805.862-2.052.226-.247.493-.309.658-.309.165 0 .329.002.473.009.153.008.358-.058.559.426.208.502.71 1.732.772 1.859.062.127.103.275.02.439-.082.164-.124.267-.246.411-.123.144-.26.321-.371.431-.124.123-.253.257-.109.505.144.247.641 1.058 1.378 1.716.949.847 1.751 1.11 2.001 1.233.249.123.395.109.541-.059.146-.168.625-.728.791-.977.166-.249.332-.207.559-.123.228.084 1.442.68 1.69 1.139.248.459.248.868.104 1.273z" />
                                                                </svg>
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </div>

                                            <div>
                                                {inv ? (
                                                    <Link
                                                        href={route('admin.billing.invoices.show', inv.id)}
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${
                                                            inv.status === 'paid'
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-800 border-amber-200'
                                                        }`}
                                                    >
                                                        <span>{inv.status === 'paid' ? '✓ Paid' : 'Due'}</span>
                                                        <span className="font-mono">৳{parseFloat(inv.total_amount).toFixed(0)}</span>
                                                    </Link>
                                                ) : canBilling ? (
                                                    <Link
                                                        href={route('admin.billing.invoices.create', { visit_id: v.id, patient_id: v.patient_id })}
                                                        className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded"
                                                    >
                                                        + Bill
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">Unbilled</span>
                                                )}
                                            </div>
                                        </div>

                                        {v.follow_up_date && (
                                            <div className="pt-1 border-t border-gray-200/40 text-[11px] text-gray-500">
                                                📅 Follow-up: <span className="font-semibold text-gray-700">{v.follow_up_date}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons: 2 rows of touch-friendly buttons */}
                                    <div className="space-y-1.5 pt-1">
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <Link
                                                href={route('admin.visits.show', v.id)}
                                                className="rounded-lg border border-gray-200 bg-white py-1.5 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition text-center"
                                            >
                                                View Rx
                                            </Link>
                                            <a
                                                href={route('admin.visits.pdf', v.id)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-lg border border-primary-200 bg-primary-50 py-1.5 px-2 text-xs font-bold text-primary-700 hover:bg-primary-100 transition text-center"
                                            >
                                                PDF
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleWhatsAppShare(v.id)}
                                                disabled={sharingWhatsAppId === v.id}
                                                className="rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition flex items-center justify-center gap-1"
                                            >
                                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.127-.521-1.625-.676-2.656-2.34-2.736-2.449-.079-.11-1.002-1.334-1.002-2.544 0-1.21.636-1.805.862-2.052.226-.247.493-.309.658-.309.165 0 .329.002.473.009.153.008.358-.058.559.426.208.502.71 1.732.772 1.859.062.127.103.275.02.439-.082.164-.124.267-.246.411-.123.144-.26.321-.371.431-.124.123-.253.257-.109.505.144.247.641 1.058 1.378 1.716.949.847 1.751 1.11 2.001 1.233.249.123.395.109.541-.059.146-.168.625-.728.791-.977.166-.249.332-.207.559-.123.228.084 1.442.68 1.69 1.139.248.459.248.868.104 1.273z" />
                                                </svg>
                                                <span>WhatsApp</span>
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1.5">
                                            {canUpdate ? (
                                                <Link
                                                    href={route('admin.visits.edit', v.id)}
                                                    className="rounded-lg border border-gray-200 bg-white py-1.5 px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition text-center"
                                                >
                                                    Edit
                                                </Link>
                                            ) : <div />}
                                            {canViewOpdCard && v.patient_id ? (
                                                <Link
                                                    href={route('admin.patients.opd_card', v.patient_id)}
                                                    className="rounded-lg border border-teal-200 bg-teal-50 py-1.5 px-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition text-center"
                                                >
                                                    OPD Card
                                                </Link>
                                            ) : <div />}
                                            {canDelete && v.status === 'draft' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteId(v.id)}
                                                    className="rounded-lg border border-rose-200 bg-rose-50 py-1.5 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition text-center"
                                                >
                                                    Delete
                                                </button>
                                            ) : <div />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                            No clinical visits recorded yet matching the criteria.
                        </div>
                    )}
                </div>

                <Pagination links={visits.links} />

                {/* Accessible Confirmation Dialog */}
                <ConfirmDialog
                    show={Boolean(deleteId)}
                    title="Delete Draft Visit"
                    message="Are you sure you want to delete this draft consultation? This action cannot be undone."
                    confirmLabel="Delete Draft"
                    isLoading={isDeleting}
                    onConfirm={confirmDelete}
                    onClose={() => setDeleteId(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
