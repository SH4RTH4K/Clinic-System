import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import StatusBadge from '@/Components/StatusBadge';
import Pagination from '@/Components/Pagination';
import usePermission from '@/Components/usePermission';

export default function Index({
    visits,
    topDiagnoses = [],
    doctorBreakdown = [],
    topRemedies = [],
    doctorsList = [],
    metrics = {},
    filters = {},
}) {
    const hasPermission = usePermission();
    const canExport = hasPermission('reports.export');

    const [activeTab, setActiveTab] = useState(filters.tab || 'clinical');
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedDoctor, setSelectedDoctor] = useState(filters.doctor_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || 'all');
    const [selectedPreset, setSelectedPreset] = useState(filters.date_preset || 'this_month');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [perPage, setPerPage] = useState(filters.per_page || 25);

    const isFirstRender = useRef(true);

    const applyFilters = (overrides = {}) => {
        const query = {
            search: overrides.search !== undefined ? overrides.search : searchTerm,
            doctor_id: overrides.doctor_id !== undefined ? overrides.doctor_id : selectedDoctor,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
            date_preset: overrides.date_preset !== undefined ? overrides.date_preset : selectedPreset,
            start_date: overrides.start_date !== undefined ? overrides.start_date : startDate,
            end_date: overrides.end_date !== undefined ? overrides.end_date : endDate,
            tab: overrides.tab !== undefined ? overrides.tab : activeTab,
            per_page: overrides.per_page !== undefined ? overrides.per_page : perPage,
        };

        if (!query.search) delete query.search;
        if (query.doctor_id === 'all') delete query.doctor_id;
        if (query.status === 'all') delete query.status;
        if (query.tab === 'clinical') delete query.tab;
        if (query.per_page === 25) delete query.per_page;
        if (query.date_preset !== 'custom') {
            delete query.start_date;
            delete query.end_date;
        }

        router.get(route('admin.reports.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounced search (300ms)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const timer = setTimeout(() => {
            applyFilters({ search: searchTerm });
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        applyFilters({ tab: newTab });
    };

    const handlePresetChange = (preset) => {
        setSelectedPreset(preset);
        if (preset !== 'custom') {
            applyFilters({ date_preset: preset });
        }
    };

    const handleCustomDateSubmit = (e) => {
        e.preventDefault();
        setSelectedPreset('custom');
        applyFilters({
            date_preset: 'custom',
            start_date: startDate,
            end_date: endDate,
        });
    };

    const handleReset = () => {
        setSearchTerm('');
        setSelectedDoctor('all');
        setSelectedStatus('all');
        setSelectedPreset('this_month');
        setStartDate('');
        setEndDate('');
        setPerPage(25);

        router.get(route('admin.reports.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (selectedDoctor !== 'all') params.append('doctor_id', selectedDoctor);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (selectedPreset) params.append('date_preset', selectedPreset);
        if (selectedPreset === 'custom') {
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
        }
        return route('admin.reports.export') + (params.toString() ? `?${params.toString()}` : '');
    };

    const visitList = visits?.data || (Array.isArray(visits) ? visits : []);
    const completionPercent = metrics.total_consultations > 0
        ? Math.round((metrics.finalized_prescriptions / metrics.total_consultations) * 100)
        : 0;

    return (
        <AuthenticatedLayout>
            <Head title="Clinical & Operational Reports Suite (ক্লিনিক্যাল রিপোর্ট)" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Clinical & Operational Reports (ক্লিনিক্যাল ও অপারেশনাল রিপোর্ট)"
                    subtitle="Multi-dimensional analytics for patient morbidity, doctor workload, and dispensary formulary trends"
                    actions={
                        <div className="flex flex-wrap items-center gap-2 print:hidden">
                            <Link
                                href={route('admin.visits.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <span>🩺</span> Visits
                            </Link>
                            <Link
                                href={route('admin.patients.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <span>👥</span> Patients
                            </Link>
                            <Link
                                href={route('admin.invoices.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <span>📋</span> Invoices
                            </Link>
                            {canExport && (
                                <a
                                    href={getExportUrl()}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                                    download
                                >
                                    <span>📥</span> Export CSV
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>🖨️</span> Print
                            </button>
                        </div>
                    }
                />

                {/* Executive 5-Card Clinical KPI Summary Ribbon */}
                <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" aria-label="Clinical Metrics Overview">
                    {/* Card 1: Total Consultations */}
                    <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider">Consultations 🩺</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">
                            {Number(metrics.total_consultations || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">মোট ভিজিট ও পরামর্শ</div>
                    </div>

                    {/* Card 2: Unique Patients */}
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Unique Patients 👤</div>
                        <div className="text-2xl font-bold text-emerald-800 mt-1">
                            {Number(metrics.unique_patients || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">স্বতন্ত্র নিবন্ধিত রোগী</div>
                    </div>

                    {/* Card 3: Finalized Prescriptions */}
                    <div className="bg-white p-3.5 rounded-xl border border-violet-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Finalized Rx ✅</span>
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.2 rounded border border-violet-200">
                                {completionPercent}%
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-violet-800 mt-1">
                            {Number(metrics.finalized_prescriptions || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-violet-600 mt-0.5">সম্পূর্ণ অনুমোদিত ব্যবস্থাপত্র</div>
                    </div>

                    {/* Card 4: Daily Consultation Average */}
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Daily Average 📈</div>
                        <div className="text-2xl font-bold text-amber-900 mt-1">
                            {metrics.daily_average || 0} <span className="text-xs font-normal text-amber-700">/ day</span>
                        </div>
                        <div className="text-[11px] text-amber-600 mt-0.5">দৈনিক গড় ভিজিট হার</div>
                    </div>

                    {/* Card 5: Total Remedies Prescribed */}
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Rx Items Dispensed 💊</div>
                        <div className="text-2xl font-bold text-rose-800 mt-1">
                            {Number(metrics.total_remedies_prescribed || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-rose-600 mt-0.5">মোট প্রেসক্রাইবকৃত ওষুধ</div>
                    </div>
                </section>

                {/* Universal Search & Multi-Parameter Filter Studio */}
                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-4 space-y-4 print:hidden">
                    {/* Row 1: Search & Dropdowns */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:w-80">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search patient, phone, code, doctor, diagnosis..."
                                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition"
                            />
                            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            {/* Attending Doctor Selector */}
                            <select
                                value={selectedDoctor}
                                onChange={(e) => {
                                    setSelectedDoctor(e.target.value);
                                    applyFilters({ doctor_id: e.target.value });
                                }}
                                className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs py-2 px-3 focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">👨‍⚕️ All Doctors</option>
                                {doctorsList.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        Dr. {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Status Selector */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    applyFilters({ status: e.target.value });
                                }}
                                className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs py-2 px-3 focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="all">⚡ All Statuses</option>
                                <option value="finalized">✅ Finalized</option>
                                <option value="draft">📝 In Consultation / Draft</option>
                                <option value="cancelled">🛑 Cancelled</option>
                            </select>

                            {/* Per Page */}
                            <select
                                value={perPage}
                                onChange={(e) => {
                                    setPerPage(Number(e.target.value));
                                    applyFilters({ per_page: Number(e.target.value) });
                                }}
                                className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg text-xs py-2 px-2.5 focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value={15}>15 / page</option>
                                <option value={25}>25 / page</option>
                                <option value={50}>50 / page</option>
                            </select>

                            {/* Reset Button */}
                            <button
                                onClick={handleReset}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition"
                                title="Reset all search filters"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Date Presets & Custom Pickers */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                        {/* 1-Click Date Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
                            <span className="text-gray-500 text-[11px] font-semibold uppercase mr-1">Period:</span>
                            {[
                                { key: 'today', label: 'Today (আজ)' },
                                { key: 'yesterday', label: 'Yesterday (গতকাল)' },
                                { key: 'this_week', label: 'This Week (চলতি সপ্তাহ)' },
                                { key: 'this_month', label: 'This Month (চলতি মাস)' },
                                { key: 'this_year', label: 'This Year (চলতি বছর)' },
                                { key: 'custom', label: 'Custom Range ⚙️' },
                            ].map((p) => {
                                const isActive = selectedPreset === p.key;
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => handlePresetChange(p.key)}
                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                                            isActive
                                                ? 'bg-primary-600 text-white shadow-xs font-semibold'
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Date Form (shown if custom or for reference) */}
                        {selectedPreset === 'custom' && (
                            <form onSubmit={handleCustomDateSubmit} className="flex flex-wrap items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="rounded-md border-gray-300 text-xs py-1 px-2 focus:ring-1 focus:ring-primary-500"
                                    required
                                />
                                <span className="text-xs text-gray-400">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="rounded-md border-gray-300 text-xs py-1 px-2 focus:ring-1 focus:ring-primary-500"
                                    required
                                />
                                <button
                                    type="submit"
                                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-xs font-semibold transition"
                                >
                                    Apply Range
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Segmented Analytical Tabs Navigation */}
                <div className="flex border-b border-gray-200 print:hidden">
                    <button
                        onClick={() => handleTabChange('clinical')}
                        className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                            activeTab === 'clinical'
                                ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>🩺</span> Consultations & Morbidity
                        <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
                            {metrics.total_consultations || 0}
                        </span>
                    </button>

                    <button
                        onClick={() => handleTabChange('doctors')}
                        className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                            activeTab === 'doctors'
                                ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>👨‍⚕️</span> Doctor Productivity & Workload
                        <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
                            {doctorsList.length}
                        </span>
                    </button>

                    <button
                        onClick={() => handleTabChange('remedies')}
                        className={`py-2.5 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
                            activeTab === 'remedies'
                                ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <span>💊</span> Prescribed Remedies & Formulary
                        <span className="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
                            {metrics.total_remedies_prescribed || 0}
                        </span>
                    </button>
                </div>

                {/* TAB 1: Clinical Consultations & Morbidity */}
                {activeTab === 'clinical' && (
                    <div className="space-y-4">
                        {/* Morbidity: Top Diagnoses Ribbon */}
                        {topDiagnoses.length > 0 && (
                            <div className="bg-linear-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-xl p-3.5">
                                <div className="text-xs font-bold text-sky-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <span>🔬</span> Top Morbidity Diagnoses in Selected Period (সর্বাধিক নির্ণীত রোগসমূহ):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {topDiagnoses.map((diag, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSearchTerm(diag.diagnosis)}
                                            className="inline-flex items-center gap-1.5 bg-white border border-sky-300 hover:border-primary-500 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-800 shadow-2xs transition"
                                            title="Click to filter visits by this diagnosis"
                                        >
                                            <span className="font-bold text-primary-600">#{idx + 1}</span>
                                            <span>{diag.diagnosis}</span>
                                            <span className="bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                                                {diag.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Desktop Data Table */}
                        <div className="hidden md:block bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Visit Date</th>
                                        <th className="px-4 py-3 text-left">Patient Details</th>
                                        <th className="px-4 py-3 text-left">Attending Doctor</th>
                                        <th className="px-4 py-3 text-left">Chief Complaint & Diagnosis</th>
                                        <th className="px-4 py-3 text-center">Rx & Vitals</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {visitList.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                                                No clinical visits found matching the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        visitList.map((v) => {
                                            const patient = v.patient;
                                            const code = patient?.patient_code || `${patient?.patient_no || ''}${patient?.patient_series || ''}`;
                                            const diagnosis = v.final_diagnosis || v.provisional_diagnosis;

                                            return (
                                                <tr key={v.id} className="hover:bg-gray-50/75 transition">
                                                    <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                                                        <div className="font-semibold">{v.visit_date}</div>
                                                        <div className="text-[10px] font-mono text-gray-400">#{v.id}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-900">{patient?.name || 'Unknown Patient'}</div>
                                                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 font-mono">
                                                            <span className="text-primary-700 font-semibold">{code}</span>
                                                            {patient?.phone && <span>• {patient.phone}</span>}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">
                                                            {patient?.gender ? `${patient.gender}, ` : ''}{v.age_summary || (patient?.age_years ? `${patient.age_years} Y` : '')}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        <div className="font-medium text-gray-900">Dr. {v.doctor?.name || 'Unassigned'}</div>
                                                        <div className="text-[10px] text-gray-500">{v.doctor?.specialty || 'General Practice'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 max-w-xs">
                                                        {v.chief_complaint && (
                                                            <div className="text-gray-800 font-medium line-clamp-2 text-xs">
                                                                {v.chief_complaint}
                                                            </div>
                                                        )}
                                                        {diagnosis && (
                                                            <div className="mt-1">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                                    Dx: {diagnosis}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                                            💊 {v.prescribed_items_count || 0} items
                                                        </span>
                                                        {v.vital?.blood_pressure_systolic && (
                                                            <div className="text-[10px] text-gray-500 mt-1 font-mono">
                                                                BP: {v.vital.blood_pressure_systolic}/{v.vital.blood_pressure_diastolic}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                        <StatusBadge status={v.status} />
                                                    </td>
                                                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                                                        <Link
                                                            href={route('admin.visits.show', v.id)}
                                                            className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                                                        >
                                                            View
                                                        </Link>
                                                        <a
                                                            href={route('admin.visits.pdf', v.id)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-semibold border border-sky-200 transition"
                                                        >
                                                            PDF
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Touch Cards */}
                        <div className="md:hidden space-y-3">
                            {visitList.length === 0 ? (
                                <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-xs">
                                    No clinical visits found.
                                </div>
                            ) : (
                                visitList.map((v) => {
                                    const patient = v.patient;
                                    const code = patient?.patient_code || `${patient?.patient_no || ''}${patient?.patient_series || ''}`;
                                    const diagnosis = v.final_diagnosis || v.provisional_diagnosis;

                                    return (
                                        <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-2xs space-y-2.5">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{patient?.name || 'Unknown'}</div>
                                                    <div className="text-[11px] font-mono text-primary-700">{code}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-semibold text-gray-800">{v.visit_date}</div>
                                                    <StatusBadge status={v.status} />
                                                </div>
                                            </div>

                                            <div className="text-xs text-gray-600 space-y-1">
                                                <div><span className="font-semibold text-gray-700">Doctor:</span> Dr. {v.doctor?.name || 'Unassigned'}</div>
                                                {v.chief_complaint && (
                                                    <div><span className="font-semibold text-gray-700">Complaint:</span> {v.chief_complaint}</div>
                                                )}
                                                {diagnosis && (
                                                    <div className="pt-0.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                            Dx: {diagnosis}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                                    💊 {v.prescribed_items_count || 0} items
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={route('admin.visits.show', v.id)}
                                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold"
                                                    >
                                                        View Visit
                                                    </Link>
                                                    <a
                                                        href={route('admin.visits.pdf', v.id)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold"
                                                    >
                                                        Rx PDF
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Pagination */}
                        {visits?.links && <Pagination links={visits.links} />}
                    </div>
                )}

                {/* TAB 2: Doctor Productivity & Workload */}
                {activeTab === 'doctors' && (
                    <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <span>👨‍⚕️</span> Attending Physician Performance Breakdown (চিকিৎসকদের কর্মদক্ষতা বিশ্লেষণ)
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">
                                Showing {doctorBreakdown.length} physicians
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Doctor Name & Specialty</th>
                                        <th className="px-4 py-3 text-center">Total Consultations</th>
                                        <th className="px-4 py-3 text-center">Finalized Rx</th>
                                        <th className="px-4 py-3 text-center">Unique Patients</th>
                                        <th className="px-4 py-3 text-center">Completion Rate</th>
                                        <th className="px-4 py-3 text-right">Filter Scope</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {doctorBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                                No doctor consultations recorded in this date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        doctorBreakdown.map((doc, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/75 transition">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">Dr. {doc.doctor_name}</div>
                                                    {doc.doctor_name_bn && (
                                                        <div className="text-[11px] text-gray-500">{doc.doctor_name_bn}</div>
                                                    )}
                                                    <div className="text-[10px] text-primary-700 font-medium">{doc.specialty}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-gray-900 text-sm">
                                                    {doc.total_visits}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {doc.finalized_visits}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-gray-700">
                                                    {doc.unique_patients}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span className="font-bold text-gray-800">{doc.completion_rate}%</span>
                                                        <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-primary-600 h-1.5 rounded-full"
                                                                style={{ width: `${Math.min(100, doc.completion_rate)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedDoctor(doc.doctor_id || 'all');
                                                            setActiveTab('clinical');
                                                            applyFilters({
                                                                doctor_id: doc.doctor_id || 'all',
                                                                tab: 'clinical',
                                                            });
                                                        }}
                                                        className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-semibold border border-sky-200 transition"
                                                    >
                                                        View Visits →
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: Prescribed Remedies & Formulary Breakdown */}
                {activeTab === 'remedies' && (
                    <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <span>💊</span> Most Prescribed Remedies & Pharmaceuticals (সর্বাধিক নির্দেশিত ওষুধসমূহ)
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">
                                Showing top {topRemedies.length} items
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Rank</th>
                                        <th className="px-4 py-3 text-left">Item Name</th>
                                        <th className="px-4 py-3 text-left">Potency / Strength / Generic</th>
                                        <th className="px-4 py-3 text-center">Type</th>
                                        <th className="px-4 py-3 text-center">Times Prescribed</th>
                                        <th className="px-4 py-3 text-center">Unique Consultations</th>
                                        <th className="px-4 py-3 text-right">Dispensary Stock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {topRemedies.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                No prescription items recorded in this date range.
                                            </td>
                                        </tr>
                                    ) : (
                                        topRemedies.map((item, idx) => {
                                            const isPharma = item.item_type === 'pharmaceutical';
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/75 transition">
                                                    <td className="px-4 py-3 font-bold text-gray-400">
                                                        #{idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        <span className="font-semibold">{item.sub_text}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                                        {isPharma ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                💊 Pharma
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                🌿 Remedy
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-gray-900 text-sm">
                                                        {item.times_prescribed}
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-medium text-gray-600">
                                                        {item.unique_visits}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Link
                                                            href={route('admin.inventory.index', { search: item.name })}
                                                            className="inline-flex items-center px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                                                        >
                                                            Check Stock 📦
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
