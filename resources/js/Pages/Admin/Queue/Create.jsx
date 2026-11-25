import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Create({
    doctors = [],
    patients = [],
    selectedPatient = null,
    defaultDoctorId = null,
    appointmentRequestId = null,
    todayActiveTokens = {},
    doctorQueueCounts = {},
    searchTerm = '',
}) {
    const { data, setData, post, processing, errors } = useForm({
        patient_id: selectedPatient?.id || '',
        patient_name: selectedPatient?.name || '',
        patient_phone: selectedPatient?.phone || '',
        doctor_id: defaultDoctorId || (doctors[0]?.id || ''),
        service_room: 'Chamber 1',
        priority: 'normal',
        appointment_request_id: appointmentRequestId || '',
        notes: '',
        auto_print: true,
        start_consultation: false,
        confirm_duplicate: false,
    });

    const [isWalkIn, setIsWalkIn] = useState(!selectedPatient);
    const [searchQuery, setSearchQuery] = useState(searchTerm);
    const [liveResults, setLiveResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatientObj, setSelectedPatientObj] = useState(selectedPatient);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // Active duplicate token today for the currently selected patient
    const activeTokenToday = data.patient_id ? todayActiveTokens[data.patient_id] : null;

    // Synchronize initial doctor and chamber
    useEffect(() => {
        const initialDoc = doctors.find((d) => String(d.id) === String(data.doctor_id)) || doctors[0];
        if (initialDoc) {
            const todayDay = new Date().getDay();
            const todaySchedule = initialDoc.schedules?.find((s) => s.day_of_week === todayDay && s.is_active);
            const chamber = todaySchedule?.chamber_no || initialDoc.schedules?.[0]?.chamber_no || 'Chamber 1';
            setData((prev) => ({
                ...prev,
                doctor_id: initialDoc.id,
                service_room: chamber,
            }));
        }
    }, []);

    // Live debounced async patient search
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setLiveResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(route('admin.patients.search', { q: searchQuery.trim() }));
                if (res.ok) {
                    const json = await res.json();
                    setLiveResults(json);
                    setShowDropdown(true);
                }
            } catch (err) {
                // Ignore network interruption
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDoctorChange = (e) => {
        const docId = e.target.value;
        const doctor = doctors.find((d) => String(d.id) === String(docId));
        const todayDay = new Date().getDay();
        const todaySchedule = doctor?.schedules?.find((s) => s.day_of_week === todayDay && s.is_active);
        const chamber = todaySchedule?.chamber_no || doctor?.schedules?.[0]?.chamber_no || 'Chamber 1';

        setData((prev) => ({
            ...prev,
            doctor_id: docId,
            service_room: chamber,
        }));
    };

    const handleSelectPatient = (patient) => {
        setSelectedPatientObj(patient);
        setData((prev) => ({
            ...prev,
            patient_id: patient.id,
            patient_name: patient.name,
            patient_phone: patient.phone || '',
            confirm_duplicate: false,
        }));
        setShowDropdown(false);
        setSearchQuery('');
    };

    const handleClearSelectedPatient = () => {
        setSelectedPatientObj(null);
        setData((prev) => ({
            ...prev,
            patient_id: '',
            patient_name: '',
            patient_phone: '',
            confirm_duplicate: false,
        }));
        setSearchQuery('');
    };

    const handleSubmit = (e, shouldStartConsultation = false) => {
        e.preventDefault();

        // If duplicate token exists and receptionist has not confirmed override
        if (activeTokenToday && !data.confirm_duplicate) {
            alert('This patient already has an active token today. Please check "Confirm and issue additional token" if you wish to proceed.');
            return;
        }

        if (shouldStartConsultation) {
            data.start_consultation = true;
        }

        post(route('admin.queue.tokens.store'));
    };

    const patientIdDisplay = selectedPatientObj
        ? selectedPatientObj.patient_identifier ||
          selectedPatientObj.patient_code ||
          (selectedPatientObj.patient_no && selectedPatientObj.patient_series
              ? `${selectedPatientObj.patient_no}${selectedPatientObj.patient_series}`
              : `#${selectedPatientObj.id}`)
        : '';

    return (
        <AuthenticatedLayout header="Issue Waiting Room Queue Token">
            <Head title="Issue Queue Token" />

            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header Bar */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-lg font-bold">
                                🎟️
                            </span>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                                    Issue Waiting Room Token / টোকেন ইস্যু
                                </h1>
                                <p className="text-xs sm:text-sm text-neutral-500">
                                    Check-in patient, assign chamber, set priority & print thermal slip.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Link
                        href={route('admin.queue.index')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-600 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-xl shadow-sm transition self-start sm:self-auto"
                    >
                        <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Queue
                    </Link>
                </div>

                <form onSubmit={(e) => handleSubmit(e, false)} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Patient Selection & Demographics Card (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6">
                            {/* Patient Type Selector Pills */}
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                                    Patient Type / রোগীর ধরন
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsWalkIn(false)}
                                        className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                                            !isWalkIn
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                                                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                        }`}
                                    >
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Registered Patient
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsWalkIn(true);
                                            handleClearSelectedPatient();
                                        }}
                                        className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition ${
                                            isWalkIn
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                                                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                        }`}
                                    >
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                        </svg>
                                        Walk-in Guest / New
                                    </button>
                                </div>
                            </div>

                            {!isWalkIn ? (
                                <div className="space-y-4">
                                    {/* Patient Lookup Combobox */}
                                    <div ref={searchRef} className="relative">
                                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                                            Search or Select Patient <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    setShowDropdown(true);
                                                }}
                                                onFocus={() => setShowDropdown(true)}
                                                placeholder="Type name, phone, Patient ID (A-2026-000004) or Old ID..."
                                                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                {isSearching ? (
                                                    <svg className="animate-spin h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                            {searchQuery && (
                                                <button
                                                    type="button"
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 text-xs"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>

                                        {/* Dropdown Results */}
                                        {showDropdown && (
                                            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-xl border border-neutral-200 max-h-64 overflow-y-auto">
                                                {liveResults.length > 0 ? (
                                                    <div className="p-1">
                                                        <div className="px-3 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                                            Search Results ({liveResults.length})
                                                        </div>
                                                        {liveResults.map((p) => (
                                                            <button
                                                                type="button"
                                                                key={p.id}
                                                                onClick={() => handleSelectPatient(p)}
                                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 transition flex items-center justify-between group"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                                                                        {p.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-neutral-900 group-hover:text-emerald-900">
                                                                            {p.name}
                                                                        </div>
                                                                        <div className="text-xs text-neutral-500 font-mono">
                                                                            {p.patient_identifier || p.patient_code || `#${p.id}`}
                                                                            {p.old_or_other_id ? ` • Old: ${p.old_or_other_id}` : ''}
                                                                            {p.phone ? ` • ${p.phone}` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-semibold text-emerald-600 group-hover:underline">
                                                                    Select
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : searchQuery.trim().length >= 2 && !isSearching ? (
                                                    <div className="p-4 text-center text-xs text-neutral-500">
                                                        No patients found matching "{searchQuery}".
                                                    </div>
                                                ) : (
                                                    <div className="p-1">
                                                        <div className="px-3 py-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                                            Recent Patients ({patients.length})
                                                        </div>
                                                        {patients.slice(0, 15).map((p) => (
                                                            <button
                                                                type="button"
                                                                key={p.id}
                                                                onClick={() => handleSelectPatient(p)}
                                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-50 transition flex items-center justify-between"
                                                            >
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 font-bold flex items-center justify-center text-xs">
                                                                        {p.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-neutral-800">
                                                                            {p.name}
                                                                        </div>
                                                                        <div className="text-xs text-neutral-400 font-mono">
                                                                            {p.patient_identifier || p.patient_code || `#${p.id}`}
                                                                            {p.phone ? ` • ${p.phone}` : ''}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs text-neutral-400">
                                                                    Select
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {errors.patient_id && (
                                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.patient_id}</p>
                                        )}
                                    </div>

                                    {/* Patient Demographics Verification Card */}
                                    {selectedPatientObj ? (
                                        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-4 sm:p-5 relative">
                                            <button
                                                type="button"
                                                onClick={handleClearSelectedPatient}
                                                className="absolute top-3 right-3 text-xs font-semibold text-neutral-500 hover:text-red-600 px-2.5 py-1 bg-white rounded-lg border border-neutral-200 shadow-sm transition"
                                            >
                                                Change Patient
                                            </button>

                                            <div className="flex items-start gap-3.5">
                                                {selectedPatientObj.photo_path ? (
                                                    <img
                                                        src={`/admin/patients/${selectedPatientObj.id}/photo`}
                                                        alt={selectedPatientObj.name}
                                                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                                                        {selectedPatientObj.name?.charAt(0)?.toUpperCase() || 'P'}
                                                    </div>
                                                )}
                                                <div className="flex-1 pr-16 sm:pr-24">
                                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-md border border-emerald-300">
                                                            {patientIdDisplay}
                                                        </span>
                                                        {selectedPatientObj.old_or_other_id && (
                                                            <span className="font-mono text-xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200">
                                                                Old: {selectedPatientObj.old_or_other_id}
                                                            </span>
                                                        )}
                                                        {selectedPatientObj.blood_group && (
                                                            <span className="text-xs font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                                                                {selectedPatientObj.blood_group}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                                                        {selectedPatientObj.name}
                                                    </h3>

                                                    {selectedPatientObj.guardian_name && (
                                                        <p className="text-xs text-neutral-600 mt-0.5">
                                                            <span className="font-medium text-neutral-500">C/O {selectedPatientObj.guardian_relationship || 'Guardian'}:</span>{' '}
                                                            {selectedPatientObj.guardian_name}
                                                        </p>
                                                    )}

                                                    <div className="mt-2.5 flex flex-wrap gap-y-1 gap-x-3 text-xs text-neutral-600 border-t border-emerald-100 pt-2">
                                                        <div>
                                                            <span className="text-neutral-400">Age:</span>{' '}
                                                            <strong className="text-neutral-800">
                                                                {selectedPatientObj.age_years ? `${selectedPatientObj.age_years} yrs` : 'N/A'}{' '}
                                                                {selectedPatientObj.gender ? `(${selectedPatientObj.gender})` : ''}
                                                            </strong>
                                                        </div>
                                                        {selectedPatientObj.phone && (
                                                            <div>
                                                                <span className="text-neutral-400">Phone:</span>{' '}
                                                                <a
                                                                    href={`tel:${selectedPatientObj.phone}`}
                                                                    className="font-mono font-bold text-emerald-700 hover:underline"
                                                                >
                                                                    {selectedPatientObj.phone}
                                                                </a>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <span className="text-neutral-400">Visits:</span>{' '}
                                                            <strong className="text-neutral-800">
                                                                {selectedPatientObj.effective_visits_count ?? 0} consultation(s)
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Duplicate Token Warning Inside Selected Patient Card */}
                                            {activeTokenToday && (
                                                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-base leading-none">⚠️</span>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between flex-wrap gap-1">
                                                                <p className="font-bold text-amber-950">
                                                                    Active Token Already Issued Today / আজকের টোকেন সক্রিয়
                                                                </p>
                                                                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-bold uppercase rounded text-[10px]">
                                                                    {activeTokenToday.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-amber-800 mt-1">
                                                                Patient holds Token <span className="font-mono font-bold text-amber-950">#{activeTokenToday.token_number}</span> ({activeTokenToday.token_code}) in {activeTokenToday.service_room || 'Consultation Room'}.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-amber-200/80">
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={route('admin.queue.tokens.print', activeTokenToday.id)}
                                                                className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-amber-900 border border-amber-300 rounded-lg font-semibold shadow-sm text-xs inline-flex items-center gap-1 transition"
                                                            >
                                                                🖨️ Reprint Slip
                                                            </Link>
                                                            <Link
                                                                href={route('admin.queue.index')}
                                                                className="px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg font-medium text-xs transition"
                                                            >
                                                                View in Queue
                                                            </Link>
                                                        </div>

                                                        <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-amber-950">
                                                            <input
                                                                type="checkbox"
                                                                checked={data.confirm_duplicate}
                                                                onChange={(e) => setData('confirm_duplicate', e.target.checked)}
                                                                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                                                            />
                                                            <span>Confirm & Issue Additional Token</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-neutral-500 text-xs">
                                            Please search or select a registered patient above to review demographics before issuing token.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Walk-in Unregistered Patient Form */
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                                                Patient Full Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={data.patient_name}
                                                onChange={(e) => setData('patient_name', e.target.value)}
                                                placeholder="e.g. Md. Rafiqul Islam"
                                                className="w-full rounded-xl border border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                                            />
                                            {errors.patient_name && (
                                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.patient_name}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                                                Mobile Phone (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={data.patient_phone}
                                                onChange={(e) => setData('patient_phone', e.target.value)}
                                                placeholder="0171XXXXXXX"
                                                className="w-full rounded-xl border border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 font-mono shadow-sm"
                                            />
                                            {errors.patient_phone && (
                                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.patient_phone}</p>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-neutral-400 italic">
                                        💡 Walk-in guests can be formally registered as full patient records later from the doctor workbench.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Doctor, Chamber, Priority & Submit Controls (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 sm:p-6 space-y-5">
                            {/* Doctor Assignment with Live Waiting Count */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                                    Assigned Doctor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={data.doctor_id}
                                    onChange={handleDoctorChange}
                                    className="w-full rounded-xl border border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                                >
                                    {doctors.map((doc) => {
                                        const count = doctorQueueCounts[doc.id] || 0;
                                        return (
                                            <option key={doc.id} value={doc.id}>
                                                {doc.name} ({count} waiting today)
                                            </option>
                                        );
                                    })}
                                </select>
                                {errors.doctor_id && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.doctor_id}</p>
                                )}
                            </div>

                            {/* Chamber / Room No. */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                                    Chamber / Room No. <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.service_room}
                                    onChange={(e) => setData('service_room', e.target.value)}
                                    placeholder="e.g. Chamber 1"
                                    className="w-full rounded-xl border border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                                />
                                {errors.service_room && (
                                    <p className="mt-1 text-xs text-red-600 font-medium">{errors.service_room}</p>
                                )}
                            </div>

                            {/* Priority Level Tactile Pill Toggle */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                                    Priority Level / অগ্রাধিকার
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setData('priority', 'normal')}
                                        className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition ${
                                            data.priority === 'normal'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500 shadow-sm'
                                                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                            <span>Normal</span>
                                        </div>
                                        <span className="text-[10px] font-normal text-neutral-500">সাধারণ ক্রম</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setData('priority', 'urgent')}
                                        className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center justify-center gap-1 transition ${
                                            data.priority === 'urgent'
                                                ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500 shadow-sm'
                                                : 'bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                                            <span className="text-rose-700">Urgent</span>
                                        </div>
                                        <span className="text-[10px] font-normal text-rose-600">জরুরি অগ্রাধিকার</span>
                                    </button>
                                </div>
                            </div>

                            {/* Internal Notes */}
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                                    Internal Notes (Optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="e.g. Follow-up consultation, severe cough..."
                                    className="w-full rounded-xl border border-neutral-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 shadow-sm"
                                />
                            </div>

                            {/* POS Thermal Slip Print Toggle */}
                            <div className="pt-2 border-t border-neutral-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.auto_print}
                                        onChange={(e) => setData('auto_print', e.target.checked)}
                                        className="rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs font-semibold text-neutral-700">
                                        Automatically open 80mm POS slip print dialog
                                    </span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 border-t border-neutral-200 space-y-3">
                                <button
                                    type="submit"
                                    disabled={processing || (activeTokenToday && !data.confirm_duplicate)}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                                >
                                    <span>🎟️</span>
                                    <span>{processing ? 'Issuing Token...' : 'Issue Token & Print Slip'}</span>
                                </button>

                                {/* Doctor / Fast-Track Direct Consultation Launcher */}
                                <button
                                    type="button"
                                    disabled={processing || (activeTokenToday && !data.confirm_duplicate)}
                                    onClick={(e) => handleSubmit(e, true)}
                                    className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 disabled:opacity-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                                >
                                    <span>⚡</span>
                                    <span>Issue & Start Consultation Directly</span>
                                </button>

                                <div className="text-center">
                                    <Link
                                        href={route('admin.queue.index')}
                                        className="text-xs font-medium text-neutral-500 hover:text-neutral-800"
                                    >
                                        Cancel and return to Queue
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
