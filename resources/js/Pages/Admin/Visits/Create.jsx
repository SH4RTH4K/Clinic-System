import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import PrescriptionConfigModal from '@/Components/PrescriptionConfigModal';
import { calculateAgeFromDob, calculateDobFromAge, formatAgeSummary } from '@/Utils/ageHelpers';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const DRAFT_KEY = 'hcs_visit_draft';

export default function Create({
    patient = null,
    doctors = [],
    symptoms = [],
    medicines = [],
    defaultAdvice = [],
    defaultFood = [],
    prescriptionConfig = {},
}) {
    const defaultDoctorId = doctors.length > 0 ? doctors[0].id : '';
    const initialVisitDate = new Date().toISOString().split('T')[0];

    let initialAgeYears = patient ? (patient.age_years ?? '') : '';
    let initialAgeMonths = patient ? (patient.age_months ?? '') : '';
    let initialAgeDays = patient ? (patient.age_days ?? '') : '';
    let initialDob = patient?.dob ? patient.dob.split('T')[0] : '';

    if (patient?.dob) {
        const computed = calculateAgeFromDob(patient.dob, initialVisitDate);
        initialAgeYears = computed.years;
        initialAgeMonths = computed.months;
        initialAgeDays = computed.days;
    } else if (!initialDob && (initialAgeYears !== '' || initialAgeMonths !== '' || initialAgeDays !== '')) {
        initialDob = calculateDobFromAge(initialAgeYears, initialAgeMonths, initialAgeDays, initialVisitDate);
    }

    const { data, setData, post, processing, errors, transform } = useForm({
        patient_id: patient ? patient.id : '',
        doctor_id: defaultDoctorId,
        visit_date: initialVisitDate,
        age_at_visit: initialAgeYears,
        age_months: initialAgeMonths,
        age_days: initialAgeDays,
        patient_dob: initialDob,
        chief_complaint: '',
        bp_symptoms_notes: '',
        diagnosis_notes: '',
        follow_up_date: '',
        status: 'draft',
        symptoms: [],
        prescription_items: [],
        advice_items: defaultAdvice.map((a) => a.id),
        food_restrictions: defaultFood.map((f) => f.id),
    });

    const [hasDraftNotice, setHasDraftNotice] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(patient || null);

    // ── Patient async combobox ────────────────────────────────────────────────
    const initialPatientLabel = patient
        ? `${patient.patient_no}${patient.patient_series || ''} – ${patient.name}`
        : '';
    const [patientQuery, setPatientQuery] = useState(initialPatientLabel);
    const [patientResults, setPatientResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimeout = useRef(null);

    // Check for existing local draft on mount
    useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft && !patient) {
                setHasDraftNotice(true);
            }
        } catch (e) {
            // Ignore storage errors
        }
    }, [patient]);

    const restoreDraft = () => {
        try {
            const savedDraft = localStorage.getItem(DRAFT_KEY);
            if (savedDraft) {
                const parsed = JSON.parse(savedDraft);
                if (parsed.patientQuery) {
                    setPatientQuery(parsed.patientQuery);
                }
                if (parsed.selectedPatient) {
                    setSelectedPatient(parsed.selectedPatient);
                }
                setData((prev) => ({
                    ...prev,
                    ...parsed,
                }));
                setHasDraftNotice(false);
            }
        } catch (e) {
            console.error('Failed to restore draft', e);
        }
    };

    const discardDraft = () => {
        try {
            localStorage.removeItem(DRAFT_KEY);
            setHasDraftNotice(false);
        } catch (e) {}
    };

    // Autosave to localStorage on changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (data.chief_complaint || data.prescription_items.length > 0 || data.patient_id) {
                try {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, patientQuery, selectedPatient }));
                } catch (e) {}
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [data, patientQuery, selectedPatient]);

    const handlePatientSearch = (value) => {
        setPatientQuery(value);
        setData('patient_id', '');
        setSelectedPatient(null);
        clearTimeout(searchTimeout.current);
        if (value.length < 2) {
            setPatientResults([]);
            setShowDropdown(false);
            return;
        }
        searchTimeout.current = setTimeout(() => {
            axios
                .get(route('admin.patients.search', { q: value }))
                .then((res) => {
                    setPatientResults(res.data);
                    setShowDropdown(true);
                })
                .catch(() => {
                    setPatientResults([]);
                });
        }, 300);
    };

    const selectPatient = (p) => {
        setSelectedPatient(p);
        let y = p.age_years ?? '';
        let m = p.age_months ?? '';
        let d = p.age_days ?? '';
        let dob = p.dob ? p.dob.split('T')[0] : '';

        if (dob) {
            const computed = calculateAgeFromDob(dob, data.visit_date);
            y = computed.years;
            m = computed.months;
            d = computed.days;
        } else if (!dob && (y !== '' || m !== '' || d !== '')) {
            dob = calculateDobFromAge(y, m, d, data.visit_date);
        }

        setData((prev) => ({
            ...prev,
            patient_id: p.id,
            age_at_visit: y,
            age_months: m,
            age_days: d,
            patient_dob: dob,
        }));
        setPatientQuery(`${p.patient_no}${p.patient_series || ''} – ${p.name}`);
        setPatientResults([]);
        setShowDropdown(false);
    };

    const clearPatient = () => {
        setSelectedPatient(null);
        setData((prev) => ({
            ...prev,
            patient_id: '',
            age_at_visit: '',
            age_months: '',
            age_days: '',
            patient_dob: '',
        }));
        setPatientQuery('');
        setPatientResults([]);
    };

    const handleAgePartChange = (field, val) => {
        setData((prev) => {
            const next = { ...prev, [field]: val };
            const yEmpty = next.age_at_visit === '' || next.age_at_visit === null;
            const mEmpty = next.age_months === '' || next.age_months === null;
            const dEmpty = next.age_days === '' || next.age_days === null;
            if (yEmpty && mEmpty && dEmpty) {
                next.patient_dob = '';
                return next;
            }
            const computedDob = calculateDobFromAge(next.age_at_visit, next.age_months, next.age_days, next.visit_date);
            if (computedDob) {
                next.patient_dob = computedDob;
            }
            return next;
        });
    };

    const handleDobChange = (e) => {
        const val = e.target.value;
        if (!val) {
            setData((prev) => ({
                ...prev,
                patient_dob: '',
                age_at_visit: '',
                age_months: '',
                age_days: '',
            }));
            return;
        }
        const { years, months, days } = calculateAgeFromDob(val, data.visit_date);
        setData((prev) => ({
            ...prev,
            patient_dob: val,
            age_at_visit: years,
            age_months: months,
            age_days: days,
        }));
    };

    const handleVisitDateChange = (e) => {
        const newVisitDate = e.target.value;
        setData((prev) => {
            const next = { ...prev, visit_date: newVisitDate };
            if (next.patient_dob) {
                const { years, months, days } = calculateAgeFromDob(next.patient_dob, newVisitDate);
                next.age_at_visit = years;
                next.age_months = months;
                next.age_days = days;
            }
            return next;
        });
    };
    // ─────────────────────────────────────────────────────────────────────────

    // Repertory suggestions
    const [suggestions, setSuggestions] = useState([]);
    const [symptomFilter, setSymptomFilter] = useState('');
    const [showSymptomsSection, setShowSymptomsSection] = useState(true);

    useEffect(() => {
        if (data.symptoms.length > 0) {
            axios
                .get(route('admin.visits.suggestions', { symptoms: data.symptoms }))
                .then((res) => {
                    setSuggestions(res.data);
                })
                .catch(() => {
                    setSuggestions([]);
                });
        } else {
            setSuggestions([]);
        }
    }, [data.symptoms]);

    const [config, setConfig] = useState(prescriptionConfig || {});
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    useEffect(() => {
        if (prescriptionConfig && Object.keys(prescriptionConfig).length > 0) {
            setConfig(prescriptionConfig);
        }
    }, [prescriptionConfig]);

    const addPrescriptionRow = (medicine_id = '') => {
        const defaultDoseQty = config?.default_dose_qty ?? 5;
        const defaultDoseUnit = config?.default_dose_unit || (config?.dose_units?.[0]?.key ?? 'drops');
        const defaultDuration = config?.default_duration_days ?? 7;
        const defaultTiming = (config?.timing_options && config.timing_options.length > 0)
            ? [config.timing_options[0].key, config.timing_options[config.timing_options.length - 1].key]
            : ['morning', 'night'];

        setData('prescription_items', [
            ...data.prescription_items,
            {
                medicine_id,
                timing: defaultTiming,
                before_after: 'after',
                dose_qty: defaultDoseQty,
                dose_unit: defaultDoseUnit,
                dilution_note: config?.dilution_instructions?.[0] || 'with half a cup of water',
                duration_days: defaultDuration,
            },
        ]);
    };

    const updatePrescriptionRow = (idx, field, value) => {
        const items = [...data.prescription_items];
        items[idx][field] = value;
        setData('prescription_items', items);
    };

    const toggleTiming = (idx, timeVal) => {
        const items = [...data.prescription_items];
        const currentTimings = items[idx].timing || [];
        if (currentTimings.includes(timeVal)) {
            items[idx].timing = currentTimings.filter((t) => t !== timeVal);
        } else {
            items[idx].timing = [...currentTimings, timeVal];
        }
        setData('prescription_items', items);
    };

    const removePrescriptionRow = (idx) => {
        setData(
            'prescription_items',
            data.prescription_items.filter((_, i) => i !== idx)
        );
    };

    // Quick follow-up date calculation
    const setQuickFollowUp = (days) => {
        const base = data.visit_date ? new Date(data.visit_date) : new Date();
        base.setDate(base.getDate() + days);
        const yyyy = base.getFullYear();
        const mm = String(base.getMonth() + 1).padStart(2, '0');
        const dd = String(base.getDate()).padStart(2, '0');
        setData('follow_up_date', `${yyyy}-${mm}-${dd}`);
    };

    // Advice / Food toggle helpers
    const toggleAllAdvice = () => {
        if (data.advice_items.length === defaultAdvice.length) {
            setData('advice_items', []);
        } else {
            setData('advice_items', defaultAdvice.map((a) => a.id));
        }
    };

    const toggleAllFood = () => {
        if (data.food_restrictions.length === defaultFood.length) {
            setData('food_restrictions', []);
        } else {
            setData('food_restrictions', defaultFood.map((f) => f.id));
        }
    };

    const submit = (e, statusToSet) => {
        if (e) e.preventDefault();
        const finalStatus = statusToSet || data.status || 'draft';
        transform((formValues) => ({
            ...formValues,
            status: finalStatus,
        }));
        post(route('admin.visits.store'), {
            onSuccess: () => {
                try {
                    localStorage.removeItem(DRAFT_KEY);
                } catch (e) {}
            },
        });
    };

    const timingOptions = (config?.timing_options && config.timing_options.length > 0)
        ? config.timing_options.map((t) => ({
            key: t.key,
            label_en: t.label_en,
            label_bn: t.label_bn,
            label: `${t.label_en}${t.label_bn ? ' / ' + t.label_bn : ''}`,
        }))
        : [
            { key: 'morning', label_en: 'Morning', label_bn: 'সকাল', label: 'Morning / সকাল' },
            { key: 'noon', label_en: 'Noon', label_bn: 'দুপুর', label: 'Noon / দুপুর' },
            { key: 'afternoon', label_en: 'Afternoon', label_bn: 'বিকাল', label: 'Afternoon / বিকাল' },
            { key: 'night', label_en: 'Night', label_bn: 'রাত', label: 'Night / রাত' },
            { key: 'bedtime', label_en: 'Bedtime', label_bn: 'ঘুমানোর পূর্বে', label: 'Bedtime / ঘুমানোর পূর্বে' },
        ];

    const mealRelations = (config?.meal_relations && config.meal_relations.length > 0)
        ? config.meal_relations
        : [
            { key: 'before', label_en: 'Before meal', label_bn: 'আগে (Before)' },
            { key: 'after', label_en: 'After meal', label_bn: 'পরে (After)' },
            { key: 'with', label_en: 'With meal', label_bn: 'খাবারের সাথে' },
            { key: 'empty_stomach', label_en: 'Empty stomach', label_bn: 'খালি পেটে' },
        ];

    const doseUnits = (config?.dose_units && config.dose_units.length > 0)
        ? config.dose_units
        : [
            { key: 'drops', label_en: 'Drops', label_bn: 'ফোটা' },
            { key: 'pills', label_en: 'Pills', label_bn: 'বটিকা' },
            { key: 'tablets', label_en: 'Tablets', label_bn: 'ট্যাবলেট' },
            { key: 'powder', label_en: 'Powder', label_bn: 'পুরিয়া' },
        ];

    const filteredSymptoms = symptomFilter.trim()
        ? symptoms.filter((s) =>
            (s.name_en || '').toLowerCase().includes(symptomFilter.toLowerCase()) ||
            (s.name_bn || '').toLowerCase().includes(symptomFilter.toLowerCase())
        )
        : symptoms;

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <AuthenticatedLayout>
            <Head title="New Visit / Consultation" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="New Visit / Consultation (নতুন চিকিৎসা পরামর্শ)"
                    subtitle="Record patient clinical history, examination, repertory symptoms, and prescribe homeopathic remedies"
                    action={
                        <Link
                            href={route('admin.visits.index')}
                            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md shadow-xs transition inline-flex items-center gap-1.5"
                        >
                            &larr; Back to Visits
                        </Link>
                    }
                />

                {/* Unsaved Local Draft Notification */}
                {hasDraftNotice && (
                    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5 text-sm text-amber-900">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <strong>Unsaved Draft Found:</strong> You have an unsaved consultation draft from a previous session.
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={restoreDraft}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                                Restore Draft
                            </button>
                            <button
                                type="button"
                                onClick={discardDraft}
                                className="px-3.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Validation Errors Summary Banner */}
                {hasErrors && (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-xs text-red-800 space-y-1.5 shadow-xs">
                        <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                            <span>✕</span> Please correct the following highlighted issues:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 pl-2 text-red-700">
                            {Object.entries(errors).map(([field, msg]) => (
                                <li key={field}>{msg}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={(e) => submit(e, 'draft')} className="space-y-6">
                    {/* ════════════════════════════════════════════════════════════════
                        STEP 1: Patient & Consultation Context
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                    1
                                </span>
                                <h3 className="text-sm font-bold text-gray-900">Patient &amp; Consultation Information</h3>
                            </div>
                            <span className="text-xs text-gray-500">রোগী ও পরামর্শ তথ্য</span>
                        </div>

                        <div className="p-5">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                {/* Patient Selection (7 cols) */}
                                <div className="lg:col-span-7">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                        Patient (রোগী) <span className="text-red-500">*</span>
                                    </label>

                                    {selectedPatient ? (
                                        <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-11 h-11 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-xs">
                                                    {(selectedPatient.name || 'P').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="font-bold text-gray-900 text-sm">
                                                            {selectedPatient.name}
                                                        </h4>
                                                        <span className="bg-emerald-200/80 text-emerald-900 text-xs px-2 py-0.5 rounded-md font-mono font-bold">
                                                            ID: {selectedPatient.patient_no}{selectedPatient.patient_series || ''}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-600 flex items-center gap-3 mt-1 flex-wrap">
                                                        <span>Gender: <strong className="text-gray-800 capitalize">{selectedPatient.gender || 'N/A'}</strong></span>
                                                        <span>•</span>
                                                        <span>Age: <strong className="text-gray-800">{formatAgeSummary(data.age_at_visit, data.age_months, data.age_days)}</strong></span>
                                                        {selectedPatient.phone && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Phone: <strong className="text-gray-800">{selectedPatient.phone}</strong></span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={clearPatient}
                                                className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 transition cursor-pointer shadow-2xs"
                                            >
                                                ✕ Change
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={patientQuery}
                                                    onChange={(e) => handlePatientSearch(e.target.value)}
                                                    onFocus={() => {
                                                        if (patientResults.length > 0) setShowDropdown(true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                    className="w-full rounded-lg border-gray-300 shadow-xs text-sm pl-10 pr-4 py-2.5 focus:border-primary-500 focus:ring-primary-500"
                                                    placeholder="Search patient by Name, Phone, or ID (e.g. Fazlul, 017..., 101A)..."
                                                    required
                                                />
                                                <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                                                    🔍
                                                </div>
                                            </div>

                                            {showDropdown && patientResults.length > 0 && (
                                                <ul className="absolute z-30 bg-white border border-gray-200 rounded-xl shadow-xl w-full mt-1.5 max-h-56 overflow-y-auto divide-y divide-gray-100">
                                                    {patientResults.map((p) => (
                                                        <li
                                                            key={p.id}
                                                            onMouseDown={() => selectPatient(p)}
                                                            className="px-4 py-2.5 cursor-pointer hover:bg-primary-50 transition flex items-center justify-between"
                                                        >
                                                            <div>
                                                                <span className="font-bold text-primary-900 text-sm">
                                                                    {p.name}
                                                                </span>
                                                                <span className="text-gray-500 text-xs ml-2">
                                                                    ({p.gender}, {p.age_years ?? '?'} yrs)
                                                                </span>
                                                            </div>
                                                            <span className="font-mono text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                                                {p.patient_no}{p.patient_series || ''}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            {!data.patient_id && patientQuery.length >= 2 && !showDropdown && (
                                                <div className="flex items-center justify-between text-xs mt-1.5">
                                                    <span className="text-amber-600 font-medium">Click a patient from the list above to select.</span>
                                                    <Link
                                                        href={route('admin.patients.create')}
                                                        target="_blank"
                                                        className="text-primary-600 hover:text-primary-800 font-bold underline"
                                                    >
                                                        + Register New Patient
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {errors.patient_id && (
                                        <p className="text-xs text-red-600 font-semibold mt-1">{errors.patient_id}</p>
                                    )}
                                </div>

                                {/* Doctor, Date, Age (5 cols) */}
                                <div className="lg:col-span-5 space-y-3">
                                    {/* Doctor */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                            Treating Doctor (চিকিৎসক)
                                        </label>
                                        <select
                                            value={data.doctor_id}
                                            onChange={(e) => setData('doctor_id', e.target.value)}
                                            className="w-full rounded-lg border-gray-300 shadow-xs text-xs font-semibold text-gray-800 py-2 focus:border-primary-500 focus:ring-primary-500"
                                        >
                                            <option value="">-- No specific doctor --</option>
                                            {doctors.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name} {d.credentials ? `(${d.credentials})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.doctor_id && (
                                            <p className="text-xs text-red-600 mt-1">{errors.doctor_id}</p>
                                        )}
                                    </div>

                                    {/* Date & Date of Birth */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Visit Date (তারিখ) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={data.visit_date}
                                                onChange={handleVisitDateChange}
                                                className="w-full rounded-lg border-gray-300 shadow-xs text-xs font-medium py-2 focus:border-primary-500 focus:ring-primary-500"
                                                required
                                            />
                                            {errors.visit_date && (
                                                <p className="text-xs text-red-600 mt-1">{errors.visit_date}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                                Date of Birth (জন্মতারিখ)
                                            </label>
                                            <input
                                                type="date"
                                                max={new Date().toISOString().split('T')[0]}
                                                value={data.patient_dob}
                                                onChange={handleDobChange}
                                                className="w-full rounded-lg border-gray-300 shadow-xs text-xs font-medium py-2 focus:border-primary-500 focus:ring-primary-500"
                                            />
                                            {errors.patient_dob && (
                                                <p className="text-xs text-red-600 mt-1">{errors.patient_dob}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Age (Years, Months, Days) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                Age at Visit (বয়স)
                                            </label>
                                            <span className="text-[11px] text-gray-400 font-normal">
                                                (auto-syncs with Date of Birth)
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <div className="relative rounded-lg shadow-xs">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="150"
                                                        value={data.age_at_visit}
                                                        onChange={(e) => handleAgePartChange('age_at_visit', e.target.value)}
                                                        className="w-full pr-11 rounded-lg border-gray-300 shadow-xs text-xs font-bold text-center py-2 focus:border-primary-500 focus:ring-primary-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[11px] text-gray-400">
                                                        Yrs
                                                    </span>
                                                </div>
                                                {errors.age_at_visit && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_at_visit}</p>
                                                )}
                                            </div>

                                            <div>
                                                <div className="relative rounded-lg shadow-xs">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="11"
                                                        value={data.age_months}
                                                        onChange={(e) => handleAgePartChange('age_months', e.target.value)}
                                                        className="w-full pr-11 rounded-lg border-gray-300 shadow-xs text-xs font-bold text-center py-2 focus:border-primary-500 focus:ring-primary-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[11px] text-gray-400">
                                                        Mo
                                                    </span>
                                                </div>
                                                {errors.age_months && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_months}</p>
                                                )}
                                            </div>

                                            <div>
                                                <div className="relative rounded-lg shadow-xs">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="31"
                                                        value={data.age_days}
                                                        onChange={(e) => handleAgePartChange('age_days', e.target.value)}
                                                        className="w-full pr-11 rounded-lg border-gray-300 shadow-xs text-xs font-bold text-center py-2 focus:border-primary-500 focus:ring-primary-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-[11px] text-gray-400">
                                                        Days
                                                    </span>
                                                </div>
                                                {errors.age_days && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_days}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                        STEP 2: Clinical Assessment & History (3 Clean Cards)
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                    2
                                </span>
                                <h3 className="text-sm font-bold text-gray-900">Clinical History &amp; Examination Notes</h3>
                            </div>
                            <span className="text-xs text-gray-500">রোগীর লক্ষণ, শারীরিক পরীক্ষা ও ডায়াগনোসিস</span>
                        </div>

                        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {/* Card A: Chief Complaints */}
                            <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                                        <span>🩺</span> Chief Complaints <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-[11px] text-gray-500">প্রধান লক্ষণ</span>
                                </div>
                                <textarea
                                    value={data.chief_complaint}
                                    onChange={(e) => setData('chief_complaint', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-xs text-xs focus:border-primary-500 focus:ring-primary-500 bg-white"
                                    rows={4}
                                    placeholder="Enter primary symptoms, duration, sensations, modalities (worse/better with cold, heat, motion, night)..."
                                    required
                                />
                                {errors.chief_complaint && (
                                    <p className="text-xs text-red-600 font-semibold">{errors.chief_complaint}</p>
                                )}
                            </div>

                            {/* Card B: Examination / Vitals */}
                            <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                                        <span>📊</span> Examination &amp; Vitals
                                    </label>
                                    <span className="text-[11px] text-gray-500">শারীরিক পরীক্ষা</span>
                                </div>
                                <textarea
                                    value={data.bp_symptoms_notes}
                                    onChange={(e) => setData('bp_symptoms_notes', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-xs text-xs focus:border-primary-500 focus:ring-primary-500 bg-white"
                                    rows={4}
                                    placeholder="Blood Pressure (BP), Pulse, Weight, Temperature, Tongue coating, General physical findings..."
                                />
                                {errors.bp_symptoms_notes && (
                                    <p className="text-xs text-red-600 font-semibold">{errors.bp_symptoms_notes}</p>
                                )}
                            </div>

                            {/* Card C: Diagnosis / Assessment */}
                            <div className="bg-gray-50/50 rounded-xl border border-gray-200 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
                                        <span>📋</span> Diagnosis &amp; Miasm
                                    </label>
                                    <span className="text-[11px] text-gray-500">রোগ নির্ণয় ও মায়াজম</span>
                                </div>
                                <textarea
                                    value={data.diagnosis_notes}
                                    onChange={(e) => setData('diagnosis_notes', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-xs text-xs focus:border-primary-500 focus:ring-primary-500 bg-white"
                                    rows={4}
                                    placeholder="Clinical assessment, homeopathic miasm (Psora, Sycosis, Syphilis, Tubercular), constitutional notes..."
                                />
                                {errors.diagnosis_notes && (
                                    <p className="text-xs text-red-600 font-semibold">{errors.diagnosis_notes}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                        STEP 3: Repertory Symptoms & Intelligent Suggestions
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                        <div
                            onClick={() => setShowSymptomsSection(!showSymptomsSection)}
                            className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100/80 transition select-none"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                    3
                                </span>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Homeopathic Repertory Symptoms &amp; Remedy Suggestions
                                </h3>
                                <span className="bg-primary-50 text-primary-700 font-bold text-xs px-2 py-0.5 rounded-full border border-primary-200">
                                    {data.symptoms.length} selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                                <span>{showSymptomsSection ? 'Hide' : 'Show'} Symptoms</span>
                                <span>{showSymptomsSection ? '▲' : '▼'}</span>
                            </div>
                        </div>

                        {showSymptomsSection && (
                            <div className="p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <p className="text-xs text-gray-600">
                                        Select symptoms to view repertory medicine suggestions that match the patient's totality of symptoms.
                                    </p>
                                    <div className="w-full sm:w-64">
                                        <input
                                            type="text"
                                            value={symptomFilter}
                                            onChange={(e) => setSymptomFilter(e.target.value)}
                                            placeholder="🔍 Filter symptoms (লক্ষণ খুঁজুন)..."
                                            className="w-full text-xs rounded-lg border-gray-300 py-1.5 px-2.5 focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                {/* Symptoms grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-52 overflow-y-auto p-3 border border-gray-200 rounded-xl bg-gray-50/40">
                                    {filteredSymptoms.length === 0 ? (
                                        <div className="col-span-full text-center py-4 text-xs text-gray-400">
                                            No symptoms matching &quot;{symptomFilter}&quot;.
                                        </div>
                                    ) : (
                                        filteredSymptoms.map((s) => {
                                            const isSelected = data.symptoms.includes(s.id);
                                            return (
                                                <label
                                                    key={s.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition ${
                                                        isSelected
                                                            ? 'bg-primary-50/80 border-primary-400 text-primary-950 font-semibold shadow-2xs'
                                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={s.id}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setData('symptoms', [...data.symptoms, s.id]);
                                                            } else {
                                                                setData('symptoms', data.symptoms.filter((id) => id !== s.id));
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                                                    />
                                                    <span className="truncate">
                                                        {s.name_en} {s.name_bn && `(${s.name_bn})`}
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Repertory Suggestions Banner */}
                                {suggestions.length > 0 && (
                                    <div className="bg-emerald-50/80 border border-emerald-300 p-4 rounded-xl space-y-2.5 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                                <span>⚡</span> Repertory Remedy Suggestions (Click to Add to Rx)
                                            </h4>
                                            <span className="text-[11px] text-emerald-700 font-semibold">
                                                Matched by symptoms totality
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestions.map((sugg) => (
                                                <button
                                                    type="button"
                                                    key={sugg.medicine_id}
                                                    onClick={() => addPrescriptionRow(sugg.medicine_id)}
                                                    className="inline-flex items-center gap-2 bg-white border border-emerald-300 text-emerald-950 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 hover:border-emerald-400 transition shadow-2xs cursor-pointer"
                                                >
                                                    <span>+ {sugg.medicine_name}</span>
                                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold border border-emerald-200">
                                                        {sugg.match_score} match
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                        STEP 4: Rx / Prescription Pad (The Main Consultation Center)
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                        <div className="bg-primary-900 text-white px-5 py-3.5 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-sm">
                                    Rx
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold tracking-wide">
                                        Prescription Pad (প্রেসক্রিপশন প্যাড)
                                    </h3>
                                    <p className="text-xs text-primary-200">
                                        Homeopathic medicine selection, timing, dose quantity, and dilution instructions
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsConfigModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-1.5 rounded-lg border border-white/20 transition cursor-pointer"
                                    title="Configure timing options, dose units, meal relations, and duration presets"
                                >
                                    <span>⚙️</span> Presets &amp; Options
                                </button>
                                <button
                                    type="button"
                                    onClick={() => addPrescriptionRow()}
                                    className="inline-flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3.5 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                                >
                                    <span className="text-sm">+</span> Add Medicine
                                </button>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {data.prescription_items.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto text-xl font-bold">
                                        Rx
                                    </div>
                                    <div className="text-sm font-bold text-gray-700">No medicines added yet</div>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        Click below to add a homeopathic remedy or pick from the repertory suggestions above.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => addPrescriptionRow()}
                                        className="inline-flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-lg shadow-xs transition cursor-pointer"
                                    >
                                        + Add First Medicine
                                    </button>
                                </div>
                            ) : (
                                data.prescription_items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden hover:border-primary-300 transition"
                                    >
                                        {/* Medicine Row Header */}
                                        <div className="bg-gray-50/90 px-4 py-2.5 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                                                <span className="bg-primary-800 text-white text-xs font-mono font-bold px-2.5 py-1 rounded-md shadow-2xs">
                                                    Rx #{idx + 1}
                                                </span>
                                                <div className="flex-1 max-w-md">
                                                    <select
                                                        value={item.medicine_id}
                                                        onChange={(e) =>
                                                            updatePrescriptionRow(idx, 'medicine_id', e.target.value)
                                                        }
                                                        className="w-full rounded-lg border-gray-300 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-primary-500 py-1.5"
                                                        required
                                                    >
                                                        <option value="">-- Select Homeopathic Remedy --</option>
                                                        {medicines.map((m) => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.name} {m.potency ? `— Potency: ${m.potency}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors[`prescription_items.${idx}.medicine_id`] && (
                                                        <p className="text-xs text-red-600 font-semibold mt-1">
                                                            {errors[`prescription_items.${idx}.medicine_id`]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removePrescriptionRow(idx)}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                                                title="Remove medicine"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span className="hidden sm:inline">Delete</span>
                                            </button>
                                        </div>

                                        {/* Medicine Row Clinical Parameters */}
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-start">
                                            {/* Column 1: Timing (Interactive Pill Buttons) */}
                                            <div className="space-y-1.5">
                                                <span className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                                                    Timing (খাওয়ার সময়) <span className="text-red-500">*</span>
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {timingOptions.map((t) => {
                                                        const isSelected = (item.timing || []).includes(t.key);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={t.key}
                                                                onClick={() => toggleTiming(idx, t.key)}
                                                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                                                                    isSelected
                                                                        ? 'bg-primary-700 text-white shadow-xs font-bold'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                                                                }`}
                                                            >
                                                                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                                                                    isSelected ? 'bg-white text-primary-800 font-extrabold' : 'bg-gray-300 text-transparent'
                                                                }`}>
                                                                    ✓
                                                                </span>
                                                                <span>{t.label_bn || t.label_en}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {errors[`prescription_items.${idx}.timing`] && (
                                                    <p className="text-xs text-red-600 font-semibold mt-1">
                                                        {errors[`prescription_items.${idx}.timing`]}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Column 2: Meal Relation & Dose */}
                                            <div className="space-y-1.5">
                                                <span className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                                                    Meal Relation &amp; Dose
                                                </span>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {mealRelations.map((rel) => {
                                                        const isSelected = item.before_after === rel.key;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={rel.key}
                                                                onClick={() => updatePrescriptionRow(idx, 'before_after', rel.key)}
                                                                className={`py-1.5 px-2 rounded-lg text-xs text-center transition cursor-pointer font-medium ${
                                                                    isSelected
                                                                        ? 'bg-primary-700 text-white font-bold shadow-xs ring-1 ring-primary-700'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                                }`}
                                                            >
                                                                {rel.label_bn || rel.label_en}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <div className="flex items-center gap-1.5 pt-1">
                                                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 flex-1">
                                                        <span className="text-[11px] font-semibold text-gray-500 pl-1">Dose:</span>
                                                        <input
                                                            type="number"
                                                            step="0.5"
                                                            min="0.1"
                                                            value={item.dose_qty}
                                                            onChange={(e) =>
                                                                updatePrescriptionRow(idx, 'dose_qty', e.target.value)
                                                            }
                                                            className="w-14 rounded-md border-gray-300 text-xs font-bold text-center py-1 bg-white"
                                                            placeholder="5"
                                                        />
                                                        <select
                                                            value={item.dose_unit}
                                                            onChange={(e) =>
                                                                updatePrescriptionRow(idx, 'dose_unit', e.target.value)
                                                            }
                                                            className="flex-1 rounded-md border-gray-300 text-xs py-1 bg-white font-medium"
                                                        >
                                                            {doseUnits.map((u) => (
                                                                <option key={u.key} value={u.key}>
                                                                    {u.label_en} {u.label_bn && `(${u.label_bn})`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                {errors[`prescription_items.${idx}.dose_qty`] && (
                                                    <p className="text-xs text-red-600 font-semibold mt-1">
                                                        {errors[`prescription_items.${idx}.dose_qty`]}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Column 3: Instructions / Dilution */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                                                        Instructions / Dilution
                                                    </span>
                                                    {config?.dilution_instructions?.length > 0 && (
                                                        <select
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    updatePrescriptionRow(idx, 'dilution_note', e.target.value);
                                                                }
                                                            }}
                                                            value=""
                                                            className="text-[10px] py-0.5 px-1.5 rounded-md border-gray-300 text-primary-700 bg-primary-50/50 hover:bg-primary-50 cursor-pointer font-semibold max-w-[130px] truncate"
                                                        >
                                                            <option value="">⚡ Quick Presets...</option>
                                                            {config.dilution_instructions.map((inst, i) => (
                                                                <option key={i} value={inst}>
                                                                    {inst}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={item.dilution_note}
                                                    onChange={(e) =>
                                                        updatePrescriptionRow(idx, 'dilution_note', e.target.value)
                                                    }
                                                    className="w-full rounded-lg border-gray-300 text-xs py-1.5 bg-white"
                                                    placeholder="e.g. with half a cup of water"
                                                />
                                                {/* Clickable Preset chips (All configured instructions) */}
                                                <div className="flex flex-wrap gap-1 pt-0.5">
                                                    {(config?.dilution_instructions || []).map((inst, i) => {
                                                        const isSelected = item.dilution_note === inst;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={i}
                                                                onClick={() => updatePrescriptionRow(idx, 'dilution_note', inst)}
                                                                className={`text-[10px] px-2 py-0.5 rounded-md transition cursor-pointer text-left leading-normal ${
                                                                    isSelected
                                                                        ? 'bg-primary-700 text-white font-bold shadow-xs'
                                                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                                                                }`}
                                                                title={inst}
                                                            >
                                                                {isSelected ? '✓ ' : '+ '}
                                                                {inst}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {errors[`prescription_items.${idx}.dilution_note`] && (
                                                    <p className="text-xs text-red-600 font-semibold mt-1">
                                                        {errors[`prescription_items.${idx}.dilution_note`]}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Column 4: Duration */}
                                            <div className="space-y-1.5">
                                                <span className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                                                    Duration (মেয়াদ)
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="365"
                                                        value={item.duration_days}
                                                        onChange={(e) =>
                                                            updatePrescriptionRow(idx, 'duration_days', e.target.value)
                                                        }
                                                        className="w-20 rounded-lg border-gray-300 text-xs font-bold text-center py-1.5 bg-white"
                                                        placeholder="7"
                                                    />
                                                    <span className="text-gray-600 font-semibold text-xs">days (দিন)</span>
                                                </div>

                                                {/* Quick duration presets chips */}
                                                {config?.duration_presets && config.duration_presets.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {config.duration_presets.map((d) => {
                                                            const isSelected = parseInt(item.duration_days, 10) === d;
                                                            return (
                                                                <button
                                                                    key={d}
                                                                    type="button"
                                                                    onClick={() => updatePrescriptionRow(idx, 'duration_days', d)}
                                                                    className={`px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                                                                        isSelected
                                                                            ? 'bg-primary-700 text-white shadow-xs'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                                    }`}
                                                                >
                                                                    {d}d
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {errors[`prescription_items.${idx}.duration_days`] && (
                                                    <p className="text-xs text-red-600 font-semibold mt-1">
                                                        {errors[`prescription_items.${idx}.duration_days`]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            {data.prescription_items.length > 0 && (
                                <div className="pt-2 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => addPrescriptionRow()}
                                        className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-primary-50/50 rounded-xl text-xs font-bold text-gray-700 hover:text-primary-700 transition cursor-pointer shadow-2xs"
                                    >
                                        <span className="text-base text-primary-600">+</span>
                                        Add Another Medicine (আরেকটি ঔষধ যোগ করুন)
                                    </button>
                                </div>
                            )}
                        </div>

                        {errors.prescription_items && (
                            <p className="text-xs text-red-600 font-semibold px-5 pb-4">{errors.prescription_items}</p>
                        )}
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                        STEP 5: Advice & Food Restrictions
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Advice Card */}
                        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>💡</span> Advice (উপদেশ)
                                </h4>
                                <button
                                    type="button"
                                    onClick={toggleAllAdvice}
                                    className="text-[11px] text-primary-700 hover:text-primary-900 font-bold transition cursor-pointer"
                                >
                                    {data.advice_items.length === defaultAdvice.length ? 'Clear All' : 'Select All'}
                                </button>
                            </div>
                            <div className="p-4 space-y-2 max-h-52 overflow-y-auto">
                                {defaultAdvice.map((a) => (
                                    <label
                                        key={a.id}
                                        className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition ${
                                            data.advice_items.includes(a.id)
                                                ? 'bg-primary-50/50 border-primary-200 text-gray-900 font-medium'
                                                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={data.advice_items.includes(a.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setData('advice_items', [...data.advice_items, a.id]);
                                                } else {
                                                    setData(
                                                        'advice_items',
                                                        data.advice_items.filter((id) => id !== a.id)
                                                    );
                                                }
                                            }}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 mt-0.5"
                                        />
                                        <span className="leading-relaxed">{a.text_bn || a.text_en}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.advice_items && (
                                <p className="text-xs text-red-600 font-semibold px-4 pb-3">{errors.advice_items}</p>
                            )}
                        </div>

                        {/* Food Restrictions Card */}
                        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🚫</span> Food Restrictions (খাদ্য নিষেধ)
                                </h4>
                                <button
                                    type="button"
                                    onClick={toggleAllFood}
                                    className="text-[11px] text-primary-700 hover:text-primary-900 font-bold transition cursor-pointer"
                                >
                                    {data.food_restrictions.length === defaultFood.length ? 'Clear All' : 'Select All'}
                                </button>
                            </div>
                            <div className="p-4 space-y-2 max-h-52 overflow-y-auto">
                                {defaultFood.map((f) => (
                                    <label
                                        key={f.id}
                                        className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition ${
                                            data.food_restrictions.includes(f.id)
                                                ? 'bg-amber-50/50 border-amber-200 text-gray-900 font-medium'
                                                : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={data.food_restrictions.includes(f.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setData('food_restrictions', [...data.food_restrictions, f.id]);
                                                } else {
                                                    setData(
                                                        'food_restrictions',
                                                        data.food_restrictions.filter((id) => id !== f.id)
                                                    );
                                                }
                                            }}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 mt-0.5"
                                        />
                                        <span className="leading-relaxed">{f.text_bn || f.text_en}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.food_restrictions && (
                                <p className="text-xs text-red-600 font-semibold px-4 pb-3">{errors.food_restrictions}</p>
                            )}
                        </div>
                    </div>

                    {/* ════════════════════════════════════════════════════════════════
                        STEP 6: Follow-up & Consultation Action Bar
                    ════════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Follow up shortcuts */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Next Follow-up Date (পরবর্তী সাক্ষাতের তারিখ):
                                </label>
                                <input
                                    type="date"
                                    value={data.follow_up_date}
                                    onChange={(e) => setData('follow_up_date', e.target.value)}
                                    className="rounded-lg border-gray-300 shadow-xs text-xs font-bold py-1.5 focus:border-primary-500 focus:ring-primary-500"
                                />
                            </div>

                            {/* Quick Shortcuts */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-gray-500 font-medium">Quick Presets:</span>
                                <button
                                    type="button"
                                    onClick={() => setQuickFollowUp(7)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                >
                                    +7 Days (১ সপ্তাহ)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickFollowUp(15)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                >
                                    +15 Days (১৫ দিন)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickFollowUp(21)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                >
                                    +21 Days (৩ সপ্তাহ)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuickFollowUp(30)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-[11px] font-semibold transition cursor-pointer"
                                >
                                    +30 Days (১ মাস)
                                </button>
                            </div>
                            {errors.follow_up_date && (
                                <p className="text-xs text-red-600 font-semibold">{errors.follow_up_date}</p>
                            )}
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center gap-3 self-end lg:self-center">
                            <button
                                type="button"
                                onClick={(e) => submit(e, 'draft')}
                                disabled={processing}
                                className="px-5 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <span>💾</span>
                                {processing ? 'Saving...' : 'Save Draft (খসড়া)'}
                            </button>
                            <button
                                type="button"
                                onClick={(e) => submit(e, 'finalized')}
                                disabled={processing}
                                className="px-6 py-2.5 bg-primary-700 hover:bg-primary-800 text-white font-extrabold rounded-xl text-xs shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer disabled:opacity-50 flex items-center gap-2 tracking-wide"
                            >
                                <span>✓</span>
                                {processing ? 'Saving...' : 'Finalize & Save Visit (সম্পূর্ণ করুন)'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <PrescriptionConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                initialConfig={config}
                onConfigSaved={(newCfg) => setConfig(newCfg)}
            />
        </AuthenticatedLayout>
    );
}