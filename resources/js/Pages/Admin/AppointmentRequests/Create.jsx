import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';

const getLocalDateValue = (daysOffset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
};

export default function Create({
    doctors = [],
    recentPatients = [],
    clinicVisitingHours = null,
}) {
    const [patientMode, setPatientMode] = useState('registered'); // 'registered' | 'new'
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || '');

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        preferred_date: getLocalDateValue(0),
        preferred_time: '10:00',
        message: '',
        source: 'phone',
        patient_id: '',
        doctor_id: doctors[0]?.id || '',
        schedule_immediately: false,
        scheduled_date: '',
        scheduled_time: '',
    });

    const isFirstSearch = useRef(true);

    // Debounced async patient lookup
    useEffect(() => {
        if (isFirstSearch.current) {
            isFirstSearch.current = false;
            return;
        }

        if (!searchQuery || searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/admin/patients/search?q=${encodeURIComponent(searchQuery.trim())}`, {
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const json = await res.json();
                    setSearchResults(Array.isArray(json) ? json : json.data || []);
                }
            } catch (err) {
                console.error('Patient search error', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        setSearchQuery('');
        setSearchResults([]);
        setData({
            ...data,
            name: patient.name || '',
            phone: patient.phone || '',
            patient_id: patient.id || '',
        });
    };

    const handleClearSelectedPatient = () => {
        setSelectedPatient(null);
        setData({
            ...data,
            name: '',
            phone: '',
            patient_id: '',
        });
    };

    const handleDatePreset = (daysOffset) => {
        const val = getLocalDateValue(daysOffset);
        setData('preferred_date', val);
    };

    const submit = (e, immediately = false) => {
        e.preventDefault();
        const payload = {
            ...data,
            schedule_immediately: immediately,
            scheduled_date: immediately ? data.preferred_date : '',
            scheduled_time: immediately ? data.preferred_time : '',
        };

        // Post with the immediate flag
        setData(payload);
        // Using inertia post directly
        post(route('admin.appointment_requests.store'), {
            data: payload,
        });
    };

    const currentDoctor = doctors.find((d) => String(d.id) === String(selectedDoctorId)) || doctors[0];

    const getDayName = (dayNumber) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayNumber] || `Day ${dayNumber}`;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Book Appointment Request (নতুন অ্যাপয়েন্টমেন্ট বুকিং)" />

            <div className="py-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Book Appointment Request (নতুন অ্যাপয়েন্টমেন্ট বুকিং)"
                    subtitle="Fast-track appointment scheduling for registered patients and new walk-in / phone enquiries with live duty roster preview"
                    actions={
                        <Link
                            href={route('admin.appointment_requests.index')}
                            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-2xs inline-flex items-center gap-1.5"
                        >
                            <span>📋</span> Back to Requests
                        </Link>
                    }
                />

                <form className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: Patient Details & Logistics (7 Cols) */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* Card 1: Patient Selection & Identification */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <span>👤</span> 1. Patient Identification (রোগী নির্বাচন)
                                </h3>
                                {/* Patient Mode Toggle */}
                                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPatientMode('registered');
                                            handleClearSelectedPatient();
                                        }}
                                        className={`px-3 py-1 rounded-md transition ${
                                            patientMode === 'registered'
                                                ? 'bg-primary-600 text-white font-bold shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        Registered Patient
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPatientMode('new');
                                            handleClearSelectedPatient();
                                        }}
                                        className={`px-3 py-1 rounded-md transition ${
                                            patientMode === 'new'
                                                ? 'bg-primary-600 text-white font-bold shadow-xs'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        + New Patient
                                    </button>
                                </div>
                            </div>

                            {/* Registered Patient Lookup Flow */}
                            {patientMode === 'registered' && (
                                <div className="space-y-3">
                                    {!selectedPatient ? (
                                        <div className="space-y-3">
                                            {/* Async Patient Search Combobox */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search registered patient by name, phone, code (P-XXXX)..."
                                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition"
                                                />
                                                <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
                                                {isSearching && (
                                                    <span className="absolute right-3 top-2.5 text-xs text-primary-600 animate-spin">
                                                        ⏳
                                                    </span>
                                                )}

                                                {/* Dropdown search results */}
                                                {searchResults.length > 0 && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto divide-y divide-gray-100">
                                                        {searchResults.map((p) => {
                                                            const code = p.patient_code || `${p.patient_no || ''}${p.patient_series || ''}`;
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onClick={() => handleSelectPatient(p)}
                                                                    className="w-full text-left p-3 hover:bg-primary-50/60 transition flex items-center justify-between"
                                                                >
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 text-xs">{p.name}</div>
                                                                        <div className="text-[11px] text-gray-500 font-mono">
                                                                            <span className="text-primary-700 font-semibold">{code}</span>
                                                                            {p.phone && <span> • {p.phone}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                                                        Select →
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recent Registered Patients Chips Strip */}
                                            {recentPatients.length > 0 && (
                                                <div className="space-y-1.5 pt-1">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                        Recent Clinic Patients (সাম্প্রতিক রোগী):
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {recentPatients.slice(0, 6).map((rp) => (
                                                            <button
                                                                key={rp.id}
                                                                type="button"
                                                                onClick={() => handleSelectPatient(rp)}
                                                                className="px-2 py-1 bg-gray-100 hover:bg-primary-50 hover:border-primary-300 border border-gray-200 rounded-md text-[11px] text-gray-700 font-medium transition flex items-center gap-1"
                                                            >
                                                                <span>👤</span>
                                                                <span>{rp.name}</span>
                                                                <span className="text-gray-400 font-mono text-[10px]">
                                                                    ({rp.patient_code || rp.patient_no})
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Selected Patient Demographics Card */
                                        <div className="bg-primary-50/60 border border-primary-200 rounded-xl p-3.5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                                                    {selectedPatient.name ? selectedPatient.name.charAt(0).toUpperCase() : 'P'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-xs flex items-center gap-2">
                                                        <span>{selectedPatient.name}</span>
                                                        <span className="bg-primary-100 text-primary-800 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">
                                                            {selectedPatient.patient_code || `${selectedPatient.patient_no || ''}${selectedPatient.patient_series || ''}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-600 mt-0.5 flex items-center gap-2 font-mono">
                                                        <span>📞 {selectedPatient.phone || 'No phone'}</span>
                                                        {selectedPatient.gender && <span>• {selectedPatient.gender}</span>}
                                                        {selectedPatient.age_years && <span>• {selectedPatient.age_years} Y</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleClearSelectedPatient}
                                                className="px-2.5 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md font-semibold transition"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Patient Name & Phone Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Patient Name (রোগীর নাম) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Full name of patient"
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500"
                                    />
                                    {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Mobile Phone (মোবাইল নম্বর) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="01XXXXXXXXX"
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500 font-mono"
                                    />
                                    {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Booking Source Pills */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Enquiry Source (বুকিংয়ের মাধ্যম)
                                </label>
                                <div className="flex items-center gap-2">
                                    {[
                                        { key: 'phone', label: '📞 Phone Call', desc: 'Direct phone booking' },
                                        { key: 'walk_in', label: '🚶 Walk-in', desc: 'Reception walk-in' },
                                    ].map((src) => (
                                        <button
                                            key={src.key}
                                            type="button"
                                            onClick={() => setData('source', src.key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                                data.source === src.key
                                                    ? 'bg-primary-50 border-primary-500 text-primary-800 shadow-2xs'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {src.label}
                                        </button>
                                    ))}
                                </div>
                                {errors.source && <p className="text-xs text-rose-600 mt-1">{errors.source}</p>}
                            </div>

                            {/* Notes Textarea */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Logistics & Clinical Notes (মন্তব্য বা লক্ষণ)
                                </label>
                                <textarea
                                    rows="2"
                                    value={data.message}
                                    onChange={(e) => setData('message', e.target.value)}
                                    placeholder="Chief complaint or booking timing request (e.g. evening slot preferred)..."
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500 font-sans"
                                />
                                {errors.message && <p className="text-xs text-rose-600 mt-1">{errors.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Doctor Roster & Schedule Slot (5 Cols) */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* Card 2: Doctor Duty Roster Card */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs space-y-4">
                            <div className="border-b border-gray-100 pb-3">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <span>🩺</span> 2. Doctor & Duty Roster Preview (চিকিৎসক ও সময়সূচী)
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">Select attending physician to review weekly schedule and leaves.</p>
                            </div>

                            {/* Doctor Selector */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Attending Doctor (চিকিৎসক)
                                </label>
                                <select
                                    value={selectedDoctorId}
                                    onChange={(e) => {
                                        setSelectedDoctorId(e.target.value);
                                        setData('doctor_id', e.target.value);
                                    }}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500"
                                >
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            Dr. {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Live Doctor Duty Card */}
                            {currentDoctor && (
                                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-900">Dr. {currentDoctor.name}</span>
                                        <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.2 rounded border border-primary-200">
                                            {currentDoctor.specialty || 'General Practice'}
                                        </span>
                                    </div>

                                    {/* Weekly Shifts */}
                                    <div className="space-y-1 pt-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Consulting Hours (সাপ্তাহিক শিফট):
                                        </div>
                                        {currentDoctor.schedules && currentDoctor.schedules.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-1 text-[11px]">
                                                {currentDoctor.schedules.map((sch) => (
                                                    <div key={sch.id} className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-gray-200">
                                                        <span className="font-semibold text-gray-800">{getDayName(sch.day_of_week)}</span>
                                                        <span className="font-mono text-gray-600">
                                                            {sch.start_time?.substring(0, 5)} - {sch.end_time?.substring(0, 5)} ({sch.service_room || 'Chamber 1'})
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-gray-500 italic bg-white p-2 rounded border border-gray-200">
                                                {clinicVisitingHours || 'Daily OPD: 09:00 AM - 02:00 PM & 05:00 PM - 09:00 PM'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Upcoming Leaves */}
                                    {currentDoctor.leaves && currentDoctor.leaves.length > 0 && (
                                        <div className="space-y-1 pt-1">
                                            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                                                Upcoming Leaves & Off-Days:
                                            </div>
                                            <div className="space-y-1">
                                                {currentDoctor.leaves.slice(0, 2).map((lv) => (
                                                    <div key={lv.id} className="text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded flex items-center justify-between">
                                                        <span>🏖️ {lv.leave_date}</span>
                                                        <span className="italic">{lv.reason || 'Leave'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Slot Date & Time */}
                            <div className="space-y-2 pt-1 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-700">
                                    Requested Appointment Slot (তারিখ ও সময়)
                                </label>

                                {/* 1-Click Quick Date Presets */}
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {[
                                        { label: 'Today', offset: 0 },
                                        { label: 'Tomorrow', offset: 1 },
                                        { label: '+2 Days', offset: 2 },
                                        { label: '+1 Week', offset: 7 },
                                    ].map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleDatePreset(preset.offset)}
                                            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-medium transition"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <input
                                            type="date"
                                            required
                                            min={getLocalDateValue(0)}
                                            value={data.preferred_date}
                                            onChange={(e) => setData('preferred_date', e.target.value)}
                                            className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500 font-mono"
                                        />
                                        {errors.preferred_date && <p className="text-xs text-rose-600 mt-1">{errors.preferred_date}</p>}
                                    </div>
                                    <div>
                                        <input
                                            type="time"
                                            required
                                            value={data.preferred_time}
                                            onChange={(e) => setData('preferred_time', e.target.value)}
                                            className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:ring-1 focus:ring-primary-500 font-mono"
                                        />
                                        {errors.preferred_time && <p className="text-xs text-rose-600 mt-1">{errors.preferred_time}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Dual Submit Actions */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={(e) => submit(e, true)}
                                    disabled={processing || !data.name || !data.phone}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                                >
                                    <span>⚡</span> Confirm & Schedule Immediately
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => submit(e, false)}
                                    disabled={processing || !data.name || !data.phone}
                                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                                >
                                    <span>💾</span> Save as Pending Enquiry
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
