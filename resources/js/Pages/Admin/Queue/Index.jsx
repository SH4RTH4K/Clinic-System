import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Pagination from '@/Components/Pagination';

export default function Index({ tokens, filters = {}, doctors = [], counters = {} }) {
    const [searchInput, setSearchInput] = useState(filters?.search || '');
    const [autoRefresh, setAutoRefresh] = useState('30'); // 'off', '15', '30'
    const [countdown, setCountdown] = useState(30);

    // Keep local search input synchronized if filter prop updates externally
    useEffect(() => {
        setSearchInput(filters?.search || '');
    }, [filters?.search]);

    // Live auto-refresh polling mechanism
    useEffect(() => {
        if (autoRefresh === 'off') return;

        const intervalSec = parseInt(autoRefresh, 10) || 30;
        setCountdown(intervalSec);

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    router.reload({ preserveScroll: true, only: ['tokens', 'counters'] });
                    return intervalSec;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [autoRefresh]);

    // Debounced search trigger (350ms delay)
    useEffect(() => {
        if (searchInput === (filters?.search || '')) return;

        const timer = setTimeout(() => {
            router.get(
                route('admin.queue.index'),
                { ...filters, search: searchInput },
                { preserveState: true, replace: true, preserveScroll: true }
            );
        }, 350);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleFilterChange = (key, value) => {
        router.get(
            route('admin.queue.index'),
            { ...filters, [key]: value },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        router.get(
            route('admin.queue.index'),
            { ...filters, search: searchInput },
            { preserveState: true, replace: true, preserveScroll: true }
        );
    };

    const handleResetFilters = () => {
        setSearchInput('');
        router.get(
            route('admin.queue.index'),
            { date: filters?.date || new Date().toISOString().split('T')[0] },
            { preserveState: true, replace: true }
        );
    };

    const handleManualRefresh = () => {
        router.reload({ preserveScroll: true, only: ['tokens', 'counters'] });
        if (autoRefresh !== 'off') {
            setCountdown(parseInt(autoRefresh, 10) || 30);
        }
    };

    const handleCall = (token) => {
        router.post(route('admin.queue.tokens.call', token.id), {}, { preserveScroll: true });
    };

    const handleRecall = (token) => {
        router.post(route('admin.queue.tokens.recall', token.id), {}, { preserveScroll: true });
    };

    const handleStartConsultation = (token) => {
        router.post(route('admin.queue.tokens.start_consultation', token.id), {}, { preserveScroll: true });
    };

    const handleComplete = (token) => {
        router.post(route('admin.queue.tokens.complete', token.id), {}, { preserveScroll: true });
    };

    const handleSkip = (token) => {
        router.post(route('admin.queue.tokens.skip', token.id), {}, { preserveScroll: true });
    };

    const handleDestroy = (token) => {
        if (confirm(`Cancel token ${token.token_code}?`)) {
            router.delete(route('admin.queue.tokens.destroy', token.id), { preserveScroll: true });
        }
    };

    const getPatientIdDisplay = (token) => {
        if (!token.patient) return null;
        return (
            token.patient.patient_identifier ||
            token.patient.patient_code ||
            (token.patient.patient_no && token.patient.patient_series
                ? `${token.patient.patient_no}${token.patient.patient_series}`
                : `#${token.patient.id}`)
        );
    };

    const getWhatsAppUrl = (token) => {
        if (!token.patient_phone) return null;
        const digits = token.patient_phone.replace(/\D/g, '');
        const phone = digits.startsWith('88') ? digits : `88${digits.startsWith('0') ? digits : '0' + digits}`;
        const text = encodeURIComponent(
            `Assalamu Alaikum ${token.patient_name}. Your token [${token.token_code}] has been called for ${token.doctor?.name || 'Doctor'} at ${token.service_room || 'Chamber 1'}. Please proceed to the room.`
        );
        return `https://wa.me/${phone}?text=${text}`;
    };

    const renderPatientAvatar = (token, sizeClass = 'w-9 h-9') => {
        if (token.patient?.photo_path) {
            return (
                <img
                    src={`/admin/patients/${token.patient.id}/photo`}
                    alt={token.patient_name}
                    className={`${sizeClass} rounded-full object-cover border border-emerald-400 shadow-sm flex-shrink-0`}
                />
            );
        }
        const initial = token.patient_name ? token.patient_name.charAt(0).toUpperCase() : 'P';
        return (
            <div
                className={`${sizeClass} rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm border border-emerald-200`}
            >
                {initial}
            </div>
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'calling':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Calling (ডাকছে)
                    </span>
                );
            case 'in_consultation':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        In Consultation
                    </span>
                );
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Completed
                    </span>
                );
            case 'skipped':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
                        Skipped
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        Cancelled
                    </span>
                );
            case 'waiting':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        Waiting (অপেক্ষমাণ)
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout header="Waiting Room Queue Management">
            <Head title="Waiting Room Queue" />

            <div className="py-6 space-y-6 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                {/* Metric Summary Banner (Compact 3x2 on mobile, 6-col on desktop) */}
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-neutral-200 shadow-sm text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                            Total
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-neutral-900 mt-0.5 block">
                            {counters?.total || 0}
                        </span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-sm text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider block">
                            Waiting
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-blue-900 mt-0.5 block">
                            {counters?.waiting || 0}
                        </span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-sm text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider block">
                            Calling
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-amber-900 mt-0.5 block">
                            {counters?.calling || 0}
                        </span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-teal-200 bg-teal-50/40 shadow-sm text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-teal-700 uppercase tracking-wider block">
                            In Consult
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-teal-900 mt-0.5 block">
                            {counters?.in_consultation || 0}
                        </span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                            Completed
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-emerald-900 mt-0.5 block">
                            {counters?.completed || 0}
                        </span>
                    </div>
                    <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-neutral-200 shadow-sm text-center sm:text-left">
                        <span className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                            Skipped
                        </span>
                        <span className="text-lg sm:text-2xl font-black text-neutral-700 mt-0.5 block">
                            {counters?.skipped || 0}
                        </span>
                    </div>
                </div>

                {/* Top Action Bar & Real-Time Sync Controls */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('admin.queue.tokens.create')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Issue Token / টোকেন দিন</span>
                        </Link>
                        <Link
                            href={route('admin.queue.workbench')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs sm:text-sm font-semibold border border-neutral-300 transition"
                        >
                            <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Doctor Workbench
                        </Link>
                        <Link
                            href={route('queue.display')}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition"
                        >
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Live TV Display
                        </Link>
                    </div>

                    {/* Date Picker & Live Auto-Refresh Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-100">
                        {/* Auto-Refresh Sync Toggle */}
                        <div className="flex items-center gap-1.5 bg-neutral-50 px-2 py-1 rounded-xl border border-neutral-200 text-xs">
                            <span className="text-neutral-500 font-medium">Auto-Sync:</span>
                            <div className="flex items-center bg-white rounded-lg p-0.5 border border-neutral-300 text-[11px] font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setAutoRefresh('off')}
                                    className={`px-1.5 py-0.5 rounded ${autoRefresh === 'off' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                                >
                                    Off
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAutoRefresh('15')}
                                    className={`px-1.5 py-0.5 rounded ${autoRefresh === '15' ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                                >
                                    15s
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAutoRefresh('30')}
                                    className={`px-1.5 py-0.5 rounded ${autoRefresh === '30' ? 'bg-emerald-600 text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
                                >
                                    30s
                                </button>
                            </div>
                            {autoRefresh !== 'off' && (
                                <span className="font-mono text-[11px] text-emerald-700 font-bold ml-0.5">
                                    {countdown}s
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={handleManualRefresh}
                                title="Refresh now"
                                className="p-1 hover:bg-neutral-200 rounded text-neutral-600 transition"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>

                        {/* Date Picker */}
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={filters?.date || ''}
                                onChange={(e) => handleFilterChange('date', e.target.value)}
                                className="text-xs rounded-xl border border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5 px-2"
                            />
                            <button
                                type="button"
                                onClick={() => handleFilterChange('date', new Date().toISOString().split('T')[0])}
                                className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold rounded-xl text-neutral-700 border border-neutral-200 transition"
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters & Upgraded Multi-Factor Search Row */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <select
                            value={filters?.doctor_id || ''}
                            onChange={(e) => handleFilterChange('doctor_id', e.target.value)}
                            className="text-xs sm:text-sm rounded-xl border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Doctors (সকল ডাক্তার)</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters?.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="text-xs sm:text-sm rounded-xl border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 py-1.5"
                        >
                            <option value="">All Statuses (সকল স্ট্যাটাস)</option>
                            <option value="waiting">Waiting (অপেক্ষমাণ)</option>
                            <option value="calling">Calling (চলতি ডাক)</option>
                            <option value="in_consultation">In Consultation (চিকিৎসাধীন)</option>
                            <option value="completed">Completed (সম্পন্ন)</option>
                            <option value="skipped">Skipped (বাদ)</option>
                            <option value="cancelled">Cancelled (বাতিল)</option>
                        </select>

                        {(filters?.doctor_id || filters?.status || filters?.search) && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-red-600 font-semibold transition"
                            >
                                Reset Filters ✕
                            </button>
                        )}
                    </div>

                    {/* Debounced Multi-Field Smart Search Input */}
                    <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <input
                                type="text"
                                placeholder="Search token (#4), patient, ID, phone, doctor..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                            />
                            <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {/* Queue Content Container */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    {tokens?.data?.length > 0 ? (
                        <>
                            {/* 1. DESKTOP & TABLET STRUCTURED DATA TABLE (hidden on mobile < 768px) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-[850px] w-full divide-y divide-neutral-200 text-sm">
                                    <thead className="bg-neutral-50 text-neutral-600 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="px-5 py-3.5 text-left">Token</th>
                                            <th className="px-5 py-3.5 text-left">Patient Details</th>
                                            <th className="px-5 py-3.5 text-left">Doctor & Chamber</th>
                                            <th className="px-5 py-3.5 text-left">Priority</th>
                                            <th className="px-5 py-3.5 text-left">Status</th>
                                            <th className="px-5 py-3.5 text-left">Timing</th>
                                            <th className="px-5 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200">
                                        {tokens.data.map((token) => {
                                            const patientId = getPatientIdDisplay(token);
                                            const waUrl = getWhatsAppUrl(token);

                                            return (
                                                <tr key={token.id} className="hover:bg-neutral-50/80 transition">
                                                    {/* Token Badge */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className="font-mono font-black text-base text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-300 shadow-xs">
                                                            {token.token_code}
                                                        </span>
                                                    </td>

                                                    {/* Patient Avatar + Demographics */}
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {renderPatientAvatar(token)}
                                                            <div>
                                                                <div className="font-bold text-neutral-900 leading-tight">
                                                                    {token.patient_name}
                                                                </div>
                                                                <div className="text-xs text-neutral-500 font-mono flex items-center gap-2 mt-0.5">
                                                                    {patientId && (
                                                                        <span className="text-emerald-700 font-semibold">
                                                                            {patientId}
                                                                        </span>
                                                                    )}
                                                                    {token.patient?.old_or_other_id && (
                                                                        <span className="text-neutral-400">
                                                                            Old: {token.patient.old_or_other_id}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {token.patient_phone && (
                                                                    <div className="text-xs text-neutral-500 flex items-center gap-2 mt-1">
                                                                        <a
                                                                            href={`tel:${token.patient_phone}`}
                                                                            className="hover:underline text-neutral-700 font-mono"
                                                                        >
                                                                            📞 {token.patient_phone}
                                                                        </a>
                                                                        {waUrl && (
                                                                            <a
                                                                                href={waUrl}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                title="Alert patient via WhatsApp"
                                                                                className="text-emerald-600 hover:text-emerald-700 font-semibold"
                                                                            >
                                                                                WA 💬
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Doctor & Chamber */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <div className="font-semibold text-neutral-900">
                                                            {token.doctor ? token.doctor.name : 'Any Doctor'}
                                                        </div>
                                                        <div className="text-xs font-semibold text-neutral-500 flex items-center gap-1 mt-0.5">
                                                            <span>📍</span>
                                                            <span>{token.service_room || 'Chamber 1'}</span>
                                                        </div>
                                                    </td>

                                                    {/* Priority */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        {token.priority === 'urgent' ? (
                                                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wide">
                                                                Urgent (জরুরি)
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700">
                                                                Normal
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        {getStatusBadge(token.status)}
                                                    </td>

                                                    {/* Timing */}
                                                    <td className="px-5 py-4 whitespace-nowrap text-xs text-neutral-500">
                                                        <div>
                                                            Iss:{' '}
                                                            {new Date(token.created_at).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </div>
                                                        {token.called_at && (
                                                            <div className="text-amber-700 font-semibold">
                                                                Cal:{' '}
                                                                {new Date(token.called_at).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-5 py-4 whitespace-nowrap text-right space-x-1.5">
                                                        {token.status === 'waiting' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCall(token)}
                                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                                                            >
                                                                Call
                                                            </button>
                                                        )}

                                                        {token.status === 'calling' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRecall(token)}
                                                                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition shadow-xs"
                                                                    title="Re-announce token"
                                                                >
                                                                    Recall
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartConsultation(token)}
                                                                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                                                >
                                                                    Enter
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSkip(token)}
                                                                    className="px-2 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-lg text-xs font-medium transition"
                                                                >
                                                                    Skip
                                                                </button>
                                                            </>
                                                        )}

                                                        {/* Direct 1-Click Consultation Visit Launcher */}
                                                        {token.patient_id &&
                                                            (token.status === 'calling' || token.status === 'in_consultation') && (
                                                                <Link
                                                                    href={route('admin.visits.create', {
                                                                        patient_id: token.patient_id,
                                                                        token_id: token.id,
                                                                    })}
                                                                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition shadow-xs inline-flex items-center gap-1"
                                                                    title="Start EHR Prescription"
                                                                >
                                                                    <span>🩺</span>
                                                                    <span>Start Visit</span>
                                                                </Link>
                                                            )}

                                                        {token.status === 'in_consultation' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleComplete(token)}
                                                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                                                            >
                                                                Complete
                                                            </button>
                                                        )}

                                                        <Link
                                                            href={route('admin.queue.tokens.print', token.id)}
                                                            target="_blank"
                                                            className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-medium transition inline-block border border-neutral-300"
                                                            title="Print 80mm Slip"
                                                        >
                                                            Slip
                                                        </Link>

                                                        {token.status !== 'completed' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDestroy(token)}
                                                                className="px-2 py-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition"
                                                                title="Cancel token"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* 2. HIGH-DENSITY MOBILE TOUCH CARDS (visible on mobile < 768px) */}
                            <div className="block md:hidden divide-y divide-neutral-200">
                                {tokens.data.map((token) => {
                                    const patientId = getPatientIdDisplay(token);
                                    const waUrl = getWhatsAppUrl(token);

                                    return (
                                        <div key={token.id} className="p-4 space-y-3 bg-white hover:bg-neutral-50/60 transition">
                                            {/* Mobile Card Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-black text-sm text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-300">
                                                        {token.token_code}
                                                    </span>
                                                    {token.priority === 'urgent' && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                                                            Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <div>{getStatusBadge(token.status)}</div>
                                            </div>

                                            {/* Patient & Doctor Details */}
                                            <div className="flex items-start gap-3">
                                                {renderPatientAvatar(token, 'w-10 h-10')}
                                                <div className="flex-1">
                                                    <div className="font-bold text-neutral-900 text-base leading-tight">
                                                        {token.patient_name}
                                                    </div>
                                                    <div className="text-xs text-neutral-500 font-mono mt-0.5">
                                                        {patientId && (
                                                            <span className="text-emerald-700 font-semibold">{patientId}</span>
                                                        )}
                                                        {token.patient?.old_or_other_id && (
                                                            <span className="text-neutral-400 ml-1.5">
                                                                Old: {token.patient.old_or_other_id}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-neutral-600 mt-1">
                                                        <span className="font-medium text-neutral-800">
                                                            {token.doctor?.name || 'Any Doctor'}
                                                        </span>
                                                        <span className="text-neutral-400"> • </span>
                                                        <span className="font-semibold text-neutral-700">
                                                            {token.service_room || 'Chamber 1'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Patient Reach Row (Call & WhatsApp) */}
                                            {token.patient_phone && (
                                                <div className="flex items-center justify-between text-xs bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                                                    <a
                                                        href={`tel:${token.patient_phone}`}
                                                        className="font-mono font-bold text-neutral-800 hover:text-emerald-700"
                                                    >
                                                        📞 {token.patient_phone}
                                                    </a>
                                                    {waUrl && (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-emerald-700 font-bold hover:underline"
                                                        >
                                                            WhatsApp Alert 💬
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Mobile Action Buttons Bar */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                {token.status === 'waiting' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCall(token)}
                                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm text-center"
                                                    >
                                                        Call Patient
                                                    </button>
                                                )}

                                                {token.status === 'calling' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRecall(token)}
                                                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition text-center"
                                                        >
                                                            Recall
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartConsultation(token)}
                                                            className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition text-center"
                                                        >
                                                            Enter
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSkip(token)}
                                                            className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl text-xs font-medium transition"
                                                        >
                                                            Skip
                                                        </button>
                                                    </>
                                                )}

                                                {/* 1-Click Consultation Launcher on Mobile */}
                                                {token.patient_id &&
                                                    (token.status === 'calling' || token.status === 'in_consultation') && (
                                                        <Link
                                                            href={route('admin.visits.create', {
                                                                patient_id: token.patient_id,
                                                                token_id: token.id,
                                                            })}
                                                            className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs text-center flex items-center justify-center gap-1.5"
                                                        >
                                                            <span>🩺</span>
                                                            <span>Start Clinical Visit</span>
                                                        </Link>
                                                    )}

                                                {token.status === 'in_consultation' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleComplete(token)}
                                                        className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition text-center"
                                                    >
                                                        Complete
                                                    </button>
                                                )}

                                                <Link
                                                    href={route('admin.queue.tokens.print', token.id)}
                                                    target="_blank"
                                                    className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-medium transition border border-neutral-300 text-center"
                                                >
                                                    Slip
                                                </Link>

                                                {token.status !== 'completed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDestroy(token)}
                                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium transition ml-auto"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {tokens.links && (
                                <div className="p-4 border-t border-neutral-200">
                                    <Pagination links={tokens.links} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-16 text-center text-neutral-400 space-y-2">
                            <svg className="w-12 h-12 mx-auto text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="font-semibold text-neutral-600 text-base">No queue tokens for this date or filter</p>
                            <p className="text-xs text-neutral-400">Click "Issue Token" to generate a token for an incoming patient.</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
