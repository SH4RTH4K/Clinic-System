import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const ITEM_TYPES = [
    { value: 'consultation', label: 'Consultation Fee (পরামর্শ)', icon: 'stethoscope' },
    { value: 'medicine', label: 'Pharmacy Medicine (ওষুধ)', icon: 'pill' },
    { value: 'investigation', label: 'Lab Test (ল্যাব পরীক্ষা)', icon: 'flask' },
    { value: 'procedure', label: 'Clinical Procedure (সেবা)', icon: 'clipboard' },
    { value: 'other', label: 'Other Item (অন্যান্য)', icon: 'tag' },
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash', bn: 'নগদ ক্যাশ', color: 'teal' },
    { value: 'bkash', label: 'bKash', bn: 'বিকাশ', color: 'pink' },
    { value: 'nagad', label: 'Nagad', bn: 'নগদ', color: 'orange' },
    { value: 'rocket', label: 'Rocket', bn: 'রকেট', color: 'purple' },
    { value: 'card', label: 'Card / POS', bn: 'কার্ড', color: 'blue' },
    { value: 'bank', label: 'Bank', bn: 'ব্যাংক', color: 'slate' },
];

export default function Create({
    initialData = {},
    selectedPatient = null,
    patientRecentVisits = [],
    patients = [],
    doctors = [],
    batches = [],
    defaultFee = 500.00,
    generatedInvoiceNumber = '',
}) {
    // Form & DOM references
    const formRef = useRef(null);
    const batchInputRef = useRef(null);
    const patientInputRef = useRef(null);

    // Patient Search & Selection
    const [patientSearch, setPatientSearch] = useState(selectedPatient?.name || '');
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [activePatient, setActivePatient] = useState(selectedPatient);
    const [recentVisits, setRecentVisits] = useState(patientRecentVisits);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);

    // Quick Patient Modal State
    const [quickPatientOpen, setQuickPatientOpen] = useState(false);
    const [quickPatientLoading, setQuickPatientLoading] = useState(false);
    const [quickPatientErrors, setQuickPatientErrors] = useState({});
    const [quickPatientData, setQuickPatientData] = useState({
        name: '',
        phone: '',
        gender: 'male',
        age_years: '',
    });

    // Pharmacy Batch Combobox Search
    const [batchQuery, setBatchQuery] = useState('');
    const [batchResults, setBatchResults] = useState([]);
    const [isSearchingBatch, setIsSearchingBatch] = useState(false);
    const [showBatchDropdown, setShowBatchDropdown] = useState(false);

    // Cashier Tender & Change Calculator
    const [tenderedCash, setTenderedCash] = useState('');
    const [autoPrintPos, setAutoPrintPos] = useState(true);
    const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' (80mm) or 'formal' (A5)

    const defaultItems = initialData.items?.length > 0
        ? initialData.items
        : [
            {
                item_type: 'consultation',
                item_name: 'Doctor Consultation Fee',
                quantity: 1,
                unit_price: defaultFee,
                total_price: defaultFee,
                medicine_batch_id: null,
                stock_available: null,
                notes: '',
            },
        ];

    const { data, setData, post, processing, errors } = useForm({
        invoice_number: generatedInvoiceNumber,
        patient_id: initialData.patient_id || selectedPatient?.id || '',
        visit_id: initialData.visit_id || '',
        invoice_date: new Date().toISOString().split('T')[0],
        discount_amount: 0,
        discount_type: 'fixed',
        tax_amount: 0,
        notes: '',
        items: defaultItems,
        collect_payment: true,
        initial_payment: {
            amount: defaultFee,
            payment_method: 'cash',
            transaction_reference: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'Counter payment upon invoice creation',
        },
    });

    // Dynamic Financial Calculations
    const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const discountValue = data.discount_type === 'percentage'
        ? (subtotal * Number(data.discount_amount || 0)) / 100
        : Number(data.discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - discountValue + Number(data.tax_amount || 0));

    // Cash Change Calculator
    const tenderAmountNum = Number(tenderedCash || 0);
    const changeToReturn = tenderAmountNum >= totalAmount ? tenderAmountNum - totalAmount : 0;
    const remainingDue = tenderAmountNum < totalAmount ? totalAmount - tenderAmountNum : 0;

    // Keyboard Shortcuts for Cashier Speed
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl + / or F2: Focus Dispensary Search
            if ((e.ctrlKey && e.key === '/') || e.key === 'F2') {
                e.preventDefault();
                batchInputRef.current?.focus();
            }
            // Ctrl + Shift + P: Focus Patient Search
            if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
                e.preventDefault();
                patientInputRef.current?.focus();
            }
            // Ctrl + Enter: Submit & Print
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                if (!processing && data.patient_id && data.items.length > 0) {
                    formRef.current?.requestSubmit();
                }
            }
            // Escape: Close dropdowns & modals
            if (e.key === 'Escape') {
                setShowBatchDropdown(false);
                setQuickPatientOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [processing, data.patient_id, data.items.length]);

    // Update payment amount when total changes
    useEffect(() => {
        if (data.collect_payment) {
            setData((prev) => ({
                ...prev,
                initial_payment: {
                    ...prev.initial_payment,
                    amount: totalAmount,
                },
            }));
            if (!tenderedCash || Number(tenderedCash) === 0) {
                setTenderedCash(totalAmount > 0 ? String(totalAmount) : '');
            }
        }
    }, [totalAmount, data.collect_payment]);

    // Async Debounced Patient Search
    useEffect(() => {
        if (!patientSearch.trim() || activePatient) {
            setFilteredPatients([]);
            return;
        }

        const term = patientSearch.toLowerCase();
        const localMatches = patients.filter(
            (p) =>
                p.name?.toLowerCase().includes(term) ||
                (p.phone && p.phone.includes(term)) ||
                (p.patient_code && p.patient_code.toLowerCase().includes(term))
        );
        setFilteredPatients(localMatches.slice(0, 8));

        if (patientSearch.length >= 2) {
            const timer = setTimeout(async () => {
                setIsSearchingPatient(true);
                try {
                    const res = await fetch(`/admin/patients/search?q=${encodeURIComponent(patientSearch)}`, {
                        headers: { Accept: 'application/json' },
                    });
                    if (res.ok) {
                        const results = await res.json();
                        if (Array.isArray(results) && results.length > 0) {
                            setFilteredPatients(results.slice(0, 8));
                        }
                    }
                } catch {
                    // Keep local matches on error
                } finally {
                    setIsSearchingPatient(false);
                }
            }, 250);

            return () => clearTimeout(timer);
        }
    }, [patientSearch, activePatient]);

    // Async Debounced Pharmacy Batch Search
    useEffect(() => {
        if (!batchQuery.trim()) {
            setBatchResults([]);
            setShowBatchDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingBatch(true);
            try {
                const res = await fetch(`/admin/invoices/search-batches?q=${encodeURIComponent(batchQuery)}`, {
                    headers: { Accept: 'application/json' },
                });
                if (res.ok) {
                    const resData = await res.json();
                    setBatchResults(Array.isArray(resData) ? resData : []);
                    setShowBatchDropdown(true);
                }
            } catch {
                setBatchResults([]);
            } finally {
                setIsSearchingBatch(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [batchQuery]);

    const handleSelectPatient = async (patient) => {
        setActivePatient(patient);
        setPatientSearch(patient.name);
        setData('patient_id', patient.id);
        setFilteredPatients([]);

        try {
            const res = await fetch(`/admin/invoices/patient-visits/${patient.id}`, {
                headers: { Accept: 'application/json' },
            });
            if (res.ok) {
                const visits = await res.json();
                setRecentVisits(visits);
            }
        } catch {
            setRecentVisits([]);
        }
    };

    const handleClearPatient = () => {
        setActivePatient(null);
        setPatientSearch('');
        setData('patient_id', '');
        setRecentVisits([]);
    };

    const handleQuickPatientSubmit = async (e) => {
        e.preventDefault();
        setQuickPatientLoading(true);
        setQuickPatientErrors({});

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/admin/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(quickPatientData),
            });

            const result = await res.json();
            if (res.ok && result.success && result.patient) {
                handleSelectPatient(result.patient);
                setQuickPatientOpen(false);
                setQuickPatientData({ name: '', phone: '', gender: 'male', age_years: '' });
            } else if (result.errors) {
                setQuickPatientErrors(result.errors);
            } else {
                setQuickPatientErrors({ name: result.message || 'Could not create patient record.' });
            }
        } catch {
            setQuickPatientErrors({ name: 'Connection error while saving patient.' });
        } finally {
            setQuickPatientLoading(false);
        }
    };

    const handleDoctorChange = (doctorId) => {
        const doc = doctors.find((d) => String(d.id) === String(doctorId)) || null;
        setSelectedDoctor(doc);

        const docTitle = doc ? ` (${doc.name})` : '';
        const docNote = doc ? `Attending: ${doc.name}` : '';

        setData((prev) => ({
            ...prev,
            items: prev.items.map((item) => {
                if (item.item_type === 'consultation') {
                    return {
                        ...item,
                        item_name: `Doctor Consultation Fee${docTitle}`,
                        notes: docNote,
                    };
                }
                return item;
            }),
        }));
    };

    const handleAddItem = (type = 'other', name = '', price = 0, batchId = null, stock = null, notes = '') => {
        const newItem = {
            item_type: type,
            item_name: name,
            quantity: 1,
            unit_price: price,
            total_price: price,
            medicine_batch_id: batchId,
            stock_available: stock,
            notes: notes,
        };
        setData('items', [...data.items, newItem]);
    };

    const handleAddBatchItem = (batch) => {
        const label = `${batch.item_name} [${batch.sub_label || batch.item_type}] (Batch: ${batch.batch_number})`;
        handleAddItem(
            'medicine',
            label,
            Number(batch.selling_price || 0),
            batch.id,
            Number(batch.current_quantity || 0),
            `Stock: ${batch.current_quantity}`
        );
        setBatchQuery('');
        setBatchResults([]);
        setShowBatchDropdown(false);
    };

    const handleRemoveItem = (index) => {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...data.items];
        updated[index][field] = value;
        if (field === 'quantity' || field === 'unit_price') {
            const qty = Number(field === 'quantity' ? value : updated[index].quantity) || 0;
            const price = Number(field === 'unit_price' ? value : updated[index].unit_price) || 0;
            updated[index].total_price = qty * price;
        }
        setData('items', updated);
    };

    const handleAdjustQty = (index, delta) => {
        const currentQty = Number(data.items[index]?.quantity || 1);
        const newQty = Math.max(1, currentQty + delta);
        handleItemChange(index, 'quantity', newQty);
    };

    const handlePresetChip = (chipType) => {
        if (chipType === 'consultation') {
            const docName = selectedDoctor ? ` (${selectedDoctor.name})` : '';
            handleAddItem('consultation', `Doctor Consultation Fee${docName}`, defaultFee);
        } else if (chipType === 'followup') {
            handleAddItem('consultation', 'Follow-up Consultation Fee (ফলো-আপ ভিজিট)', 300.00);
        } else if (chipType === 'investigation') {
            handleAddItem('investigation', 'Routine Lab Investigation (ল্যাব টেস্ট)', 250.00);
        } else if (chipType === 'procedure') {
            handleAddItem('procedure', 'Clinical Dressing & First Aid (ড্রেসিং ও সেবা)', 150.00);
        } else if (chipType === 'custom') {
            handleAddItem('other', '', 0);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.invoices.store'), {
            onSuccess: (page) => {
                const invoiceId = page?.props?.flash?.invoice_id;
                if (autoPrintPos && invoiceId) {
                    if (printFormat === 'thermal') {
                        window.open(route('admin.invoices.pos_receipt', invoiceId), '_blank');
                    } else {
                        window.open(route('admin.invoices.print', invoiceId), '_blank');
                    }
                }
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Point of Sale (POS) Billing Terminal" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-24">
                {/* RemediQ Modern PageHeader with Single-line Layout */}
                <PageHeader
                    title={
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-bold text-slate-900 tracking-tight">Point of Sale (POS) Terminal</span>
                            <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
                                কাউন্টার ক্যাশিয়ার ও বিলিং
                            </span>
                        </div>
                    }
                    subtitle="Fast cashier checkout, prescription auto-fill, live pharmacy batch combobox, and instant cash tender calculator"
                    actions={
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={typeof route === 'function' ? route('admin.billing.cash_register') : '/admin/billing/cash-register'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span>Daily Register</span>
                            </Link>
                            <Link
                                href={typeof route === 'function' ? route('admin.invoices.index') : '/admin/invoices'}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                <span>Invoices Directory</span>
                            </Link>
                        </div>
                    }
                />

                {/* Main 2-Column POS Workspace */}
                <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: Cart & Billable Items Studio (7 cols on lg) */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* 1. Fast Line Item Presets Strip */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </span>
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Fast Billable Presets</h3>
                                        <p className="text-[11px] text-slate-400">1-click service additions to invoice</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('custom')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Custom Line</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('consultation')}
                                    className="flex flex-col items-start p-2.5 rounded-lg text-left bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition group shadow-2xs"
                                >
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-teal-700">Consultation</span>
                                    <span className="text-xs font-bold text-slate-900 mt-0.5">৳{defaultFee.toFixed(0)}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('followup')}
                                    className="flex flex-col items-start p-2.5 rounded-lg text-left bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition group shadow-2xs"
                                >
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-teal-700">Follow-up</span>
                                    <span className="text-xs font-bold text-slate-900 mt-0.5">৳300</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('investigation')}
                                    className="flex flex-col items-start p-2.5 rounded-lg text-left bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition group shadow-2xs"
                                >
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-teal-700">Lab Test</span>
                                    <span className="text-xs font-bold text-slate-900 mt-0.5">৳250</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('procedure')}
                                    className="flex flex-col items-start p-2.5 rounded-lg text-left bg-slate-50/80 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 transition group shadow-2xs"
                                >
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider group-hover:text-teal-700">Procedure</span>
                                    <span className="text-xs font-bold text-slate-900 mt-0.5">৳150</span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Pharmacy Batch Search Combobox */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs relative">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span>Live Pharmacy Inventory Search</span>
                                    <span className="text-[11px] text-slate-400 font-normal">(ঔষধ ও ব্যাচ অনুসন্ধান)</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    {isSearchingBatch ? (
                                        <span className="text-[11px] text-teal-700 font-medium animate-pulse">Searching dispensary...</span>
                                    ) : (
                                        <kbd className="hidden sm:inline text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                            Ctrl + / or F2
                                        </kbd>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    ref={batchInputRef}
                                    type="text"
                                    value={batchQuery}
                                    onChange={(e) => setBatchQuery(e.target.value)}
                                    placeholder="Type remedy, brand name, potency, strength, or batch #..."
                                    className="w-full rounded-lg border-slate-300 pl-9 pr-9 text-xs sm:text-sm bg-slate-50/50 shadow-2xs focus:bg-white focus:border-teal-500 focus:ring-teal-500 transition"
                                />
                                {batchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setBatchQuery(''); setShowBatchDropdown(false); }}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Batch Results Dropdown */}
                            {showBatchDropdown && batchResults.length > 0 && (
                                <div className="absolute left-4 right-4 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 animate-in fade-in">
                                    {batchResults.map((b) => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => handleAddBatchItem(b)}
                                            className="w-full text-left p-3 hover:bg-teal-50/70 transition flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                                                        {b.item_type || 'Medicine'}
                                                    </span>
                                                    <span className="truncate">{b.item_name}</span>
                                                    {b.sub_label && (
                                                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                                            {b.sub_label}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                    Batch: {b.batch_number} · Exp: {b.expiry_date}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-slate-900 text-sm font-sans">
                                                    ৳{Number(b.selling_price).toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-teal-700 font-semibold">
                                                    In Stock: {b.current_quantity}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showBatchDropdown && batchQuery.trim().length >= 2 && batchResults.length === 0 && !isSearchingBatch && (
                                <div className="absolute left-4 right-4 top-full mt-1 z-30 p-4 text-center rounded-xl border border-slate-200 bg-white shadow-lg text-xs text-slate-500">
                                    No active in-stock batches match "{batchQuery}".
                                </div>
                            )}
                        </div>

                        {/* 3. Billable Items Cart Table */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                        Cart Items
                                    </span>
                                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                        {data.items.length}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('other', '', 0)}
                                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Add Item</span>
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-xs text-left">
                                    <thead className="bg-slate-50/50 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="px-3.5 py-2.5 w-36">Type</th>
                                            <th className="px-3.5 py-2.5">Item Description</th>
                                            <th className="px-3.5 py-2.5 w-28 text-center">Qty</th>
                                            <th className="px-3.5 py-2.5 w-24 text-right">Price (৳)</th>
                                            <th className="px-3.5 py-2.5 w-24 text-right">Total (৳)</th>
                                            <th className="px-2 py-2.5 w-8 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {data.items.map((item, index) => {
                                            const hasStockWarning = item.medicine_batch_id && item.stock_available !== null && Number(item.quantity || 0) > Number(item.stock_available || 0);
                                            return (
                                                <tr key={index} className="hover:bg-slate-50/70 transition">
                                                    <td className="px-3 py-2 align-middle">
                                                        <select
                                                            value={item.item_type}
                                                            onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                                                            className="w-full rounded-md border-slate-300 text-xs py-1.5 px-2 bg-slate-50/40 focus:bg-white focus:border-teal-500 focus:ring-teal-500 font-medium text-slate-700"
                                                        >
                                                            {ITEM_TYPES.map((t) => (
                                                                <option key={t.value} value={t.value}>
                                                                    {t.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2 align-middle">
                                                        <input
                                                            type="text"
                                                            value={item.item_name}
                                                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                                            placeholder="Service or medicine title..."
                                                            className="w-full rounded-md border-slate-300 text-xs py-1.5 px-2.5 focus:border-teal-500 focus:ring-teal-500 font-medium text-slate-900"
                                                            required
                                                        />
                                                        {hasStockWarning && (
                                                            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 flex items-center gap-1">
                                                                <span>⚠️</span>
                                                                <span>Exceeds dispensary stock ({item.stock_available} available)</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-2 py-2 align-middle">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAdjustQty(index, -1)}
                                                                className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="0.1"
                                                                step="any"
                                                                value={item.quantity}
                                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                                className={`w-12 rounded-md border text-xs py-1 px-1 text-center font-mono font-bold focus:border-teal-500 focus:ring-teal-500 ${
                                                                    hasStockWarning ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-slate-300 text-slate-900'
                                                                }`}
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAdjustQty(index, 1)}
                                                                className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right align-middle">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_price}
                                                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                            className="w-full rounded-md border-slate-300 text-xs py-1.5 px-2 text-right font-mono font-medium focus:border-teal-500 focus:ring-teal-500"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap font-mono align-middle">
                                                        ৳{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                                                    </td>
                                                    <td className="px-2 py-2 text-center align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            disabled={data.items.length <= 1}
                                                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 transition"
                                                            title="Remove item"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Subtotal, Discount & Tax Row */}
                            <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    {/* Discount Input */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-700">Discount (ছাড়):</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={data.discount_amount}
                                            onChange={(e) => setData('discount_amount', e.target.value)}
                                            className="w-16 rounded-md border-slate-300 text-xs py-1 px-1.5 text-right font-mono"
                                        />
                                        <select
                                            value={data.discount_type}
                                            onChange={(e) => setData('discount_type', e.target.value)}
                                            className="rounded-md border-slate-300 text-xs py-1 px-1.5 font-medium"
                                        >
                                            <option value="fixed">৳ Fixed</option>
                                            <option value="percentage">%</option>
                                        </select>
                                    </div>

                                    {/* Tax / Service Fee Input */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-700">Tax / Fee (ফি):</span>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 font-mono text-xs">৳</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={data.tax_amount}
                                                onChange={(e) => setData('tax_amount', e.target.value)}
                                                className="w-20 rounded-md border-slate-300 text-xs py-1 pl-5 pr-2 text-right font-mono"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end md:self-auto font-sans">
                                    <div className="text-right">
                                        <span className="text-slate-500 mr-1.5 text-xs">Subtotal:</span>
                                        <strong className="text-slate-900 font-mono text-sm">৳{subtotal.toFixed(2)}</strong>
                                    </div>
                                    {discountValue > 0 && (
                                        <div className="text-right">
                                            <span className="text-rose-600 mr-1 text-xs">Discount:</span>
                                            <strong className="text-rose-700 font-mono text-sm">-৳{discountValue.toFixed(2)}</strong>
                                        </div>
                                    )}
                                    {Number(data.tax_amount || 0) > 0 && (
                                        <div className="text-right">
                                            <span className="text-slate-600 mr-1 text-xs">Tax/Fee:</span>
                                            <strong className="text-slate-800 font-mono text-sm">+৳{Number(data.tax_amount).toFixed(2)}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes Field */}
                            <div className="p-3 bg-white border-t border-slate-100">
                                <input
                                    type="text"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Optional cashier notes or remarks for this invoice..."
                                    className="w-full rounded-md border-slate-200 text-xs py-1.5 px-2.5 text-slate-700 placeholder-slate-400 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Patient Verification & Financial Settlement (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* 1. Patient Demographics Card */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>Patient Demographics</span>
                                    <span className="text-rose-500">*</span>
                                </h3>
                                {activePatient ? (
                                    <button
                                        type="button"
                                        onClick={handleClearPatient}
                                        className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1"
                                    >
                                        Change Patient ✕
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setQuickPatientOpen(true)}
                                        className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>+ Quick Patient (দ্রুত রোগী)</span>
                                    </button>
                                )}
                            </div>

                            {/* If No Patient Selected: Search Bar & Fast Actions */}
                            {!activePatient ? (
                                <div className="space-y-2 relative">
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </span>
                                        <input
                                            ref={patientInputRef}
                                            type="text"
                                            value={patientSearch}
                                            onChange={(e) => setPatientSearch(e.target.value)}
                                            placeholder="Search patient by name, phone, or ID... (Ctrl+Shift+P)"
                                            className="w-full rounded-lg border-slate-300 pl-9 pr-3 text-xs shadow-2xs focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </div>

                                    {/* Patient Results Dropdown */}
                                    {filteredPatients.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl divide-y divide-slate-100 animate-in fade-in">
                                            {filteredPatients.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleSelectPatient(p)}
                                                    className="w-full text-left p-2.5 hover:bg-teal-50/80 transition flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-900">{p.name}</div>
                                                        <div className="text-[11px] text-slate-500 font-mono">
                                                            📞 {p.phone || 'No phone'} · ID: {p.patient_code || p.patient_no || p.id}
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                                        Select →
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Empty Search Suggestion with Quick Register CTA */}
                                    {patientSearch.trim().length >= 2 && filteredPatients.length === 0 && !isSearchingPatient && (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-center space-y-2">
                                            <p className="text-xs text-slate-600">No patient record matches "{patientSearch}".</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setQuickPatientData((prev) => ({ ...prev, name: patientSearch }));
                                                    setQuickPatientOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition"
                                            >
                                                <span>+ Register "{patientSearch}" as New Patient</span>
                                            </button>
                                        </div>
                                    )}

                                    {errors.patient_id && <p className="text-xs text-rose-600 font-semibold">{errors.patient_id}</p>}
                                </div>
                            ) : (
                                /* Verified Patient Card */
                                <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-3.5 space-y-2">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-2xs">
                                            {activePatient.name?.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm text-slate-900 truncate">{activePatient.name}</div>
                                            <div className="text-xs text-slate-600 font-mono mt-0.5 flex flex-wrap items-center gap-2">
                                                {activePatient.phone ? (
                                                    <a href={`tel:${activePatient.phone}`} className="hover:underline text-teal-700 font-semibold">
                                                        📞 {activePatient.phone}
                                                    </a>
                                                ) : (
                                                    <span>No phone</span>
                                                )}
                                                <span>·</span>
                                                <span className="bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                                    ID: {activePatient.patient_code || activePatient.patient_no || activePatient.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Patient Metadata Chips */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-semibold">
                                        {activePatient.gender && (
                                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 uppercase">
                                                {activePatient.gender}
                                            </span>
                                        )}
                                        {activePatient.age_years && (
                                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                                                Age: {activePatient.age_years}y
                                            </span>
                                        )}
                                        {activePatient.blood_group && (
                                            <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                                                🩸 {activePatient.blood_group}
                                            </span>
                                        )}
                                        {activePatient.old_or_other_id && (
                                            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono">
                                                Old ID: {activePatient.old_or_other_id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Recent Visits for this patient */}
                            {recentVisits.length > 0 && !data.visit_id && (
                                <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-2.5 space-y-1.5 text-xs">
                                    <p className="font-bold text-teal-950 text-[11px] flex items-center gap-1">
                                        <span>🩺</span> Recent Visits (প্রেসক্রিপশন থেকে দ্রুত বিল পূরণ):
                                    </p>
                                    <div className="space-y-1">
                                        {recentVisits.map((v) => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => router.visit(route('admin.invoices.create', { visit_id: v.id }))}
                                                className="w-full text-left p-1.5 bg-white border border-teal-200 rounded-md text-teal-900 font-medium hover:bg-teal-100 transition flex items-center justify-between text-[11px]"
                                            >
                                                <span>Visit #{v.id} ({v.visit_date}) — Dr. {v.doctor_name}</span>
                                                <span className="text-teal-700 font-bold underline">Auto-fill →</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attending Doctor Selector */}
                            <div className="space-y-1 pt-1">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Attending Doctor (দায়িত্বপ্রাপ্ত চিকিৎসক):
                                </label>
                                <select
                                    value={selectedDoctor?.id || ''}
                                    onChange={(e) => handleDoctorChange(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 text-xs py-1.5 focus:border-teal-500 focus:ring-teal-500 font-medium text-slate-800"
                                >
                                    <option value="">Select attending doctor (optional)...</option>
                                    {doctors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            Dr. {d.name} ({d.specialty || 'General'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 2. Payment Settlement & Cash Calculator Card */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                            {/* Net Total Display */}
                            <div className="rounded-xl bg-slate-900 text-white p-4 flex items-center justify-between shadow-xs">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                                        Net Payable (সর্বমোট দেয়)
                                    </span>
                                    <span className="text-xs text-teal-400 font-medium">After all discounts</span>
                                </div>
                                <span className="text-3xl font-extrabold text-teal-300 font-sans tracking-tight">
                                    ৳{totalAmount.toFixed(2)}
                                </span>
                            </div>

                            {/* Collect Payment Toggle */}
                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.collect_payment}
                                    onChange={(e) => setData('collect_payment', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900">
                                        Collect Payment Now (কাউন্টারে নগদ বা ডিজিটাল গ্রহণ)
                                    </span>
                                    <p className="text-[11px] text-slate-500">Records cashier receipt immediately upon invoice creation.</p>
                                </div>
                            </label>

                            {data.collect_payment && (
                                <div className="space-y-3 pt-3 border-t border-slate-100">
                                    {/* Payment Method Selector */}
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                            Payment Method (পেমেন্ট মাধ্যম):
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {PAYMENT_METHODS.map((m) => {
                                                const isSelected = data.initial_payment.payment_method === m.value;
                                                return (
                                                    <button
                                                        key={m.value}
                                                        type="button"
                                                        onClick={() => setData('initial_payment', { ...data.initial_payment, payment_method: m.value })}
                                                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center justify-center ${
                                                            isSelected
                                                                ? 'bg-teal-600 text-white border-teal-700 shadow-xs font-bold'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <span>{m.label}</span>
                                                        <span className={`text-[10px] font-normal ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                                                            {m.bn}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Cashier Change Calculator (Active when Cash is selected) */}
                                    {data.initial_payment.payment_method === 'cash' && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>Cash Tender &amp; Change Calculator</span>
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-[11px] text-slate-600 font-semibold">
                                                    Tendered Cash from Patient (প্রদত্ত নগদ):
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 font-bold">৳</span>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={tenderedCash}
                                                        onChange={(e) => {
                                                            setTenderedCash(e.target.value);
                                                            const val = Number(e.target.value || 0);
                                                            setData('initial_payment', {
                                                                ...data.initial_payment,
                                                                amount: Math.min(totalAmount, val),
                                                            });
                                                        }}
                                                        placeholder="Enter amount handed by patient..."
                                                        className="w-full rounded-lg border-slate-300 pl-8 pr-3 text-sm font-bold font-mono focus:border-teal-500 focus:ring-teal-500 bg-white"
                                                    />
                                                </div>
                                            </div>

                                            {/* Quick Tender Chips */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTenderedCash(String(totalAmount));
                                                        setData('initial_payment', { ...data.initial_payment, amount: totalAmount });
                                                    }}
                                                    className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300 hover:bg-teal-200 transition"
                                                >
                                                    Exact ৳{totalAmount.toFixed(0)}
                                                </button>
                                                {[500, 1000, 2000].map((amt) => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        onClick={() => {
                                                            setTenderedCash(String(amt));
                                                            setData('initial_payment', {
                                                                ...data.initial_payment,
                                                                amount: Math.min(totalAmount, amt),
                                                            });
                                                        }}
                                                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
                                                    >
                                                        ৳{amt}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Change Callout */}
                                            {tenderAmountNum >= totalAmount ? (
                                                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 flex items-center justify-between font-sans">
                                                    <span className="text-xs font-bold text-emerald-900">
                                                        Change to Return (ফেরত টাকা):
                                                    </span>
                                                    <span className="text-base font-extrabold text-emerald-700 font-mono">
                                                        ৳{changeToReturn.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : tenderAmountNum > 0 ? (
                                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex items-center justify-between font-sans">
                                                    <span className="text-xs font-bold text-amber-900">
                                                        Remaining Due (বকেয়া থাকবে):
                                                    </span>
                                                    <span className="text-sm font-bold text-amber-800 font-mono">
                                                        ৳{remainingDue.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Transaction Reference (if digital) */}
                                    {data.initial_payment.payment_method !== 'cash' && (
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-slate-700">
                                                Transaction Reference / TrxID (লেনদেন আইডি):
                                            </label>
                                            <input
                                                type="text"
                                                value={data.initial_payment.transaction_reference}
                                                onChange={(e) => setData('initial_payment', { ...data.initial_payment, transaction_reference: e.target.value })}
                                                placeholder="e.g. 9J4K8L9M0 or Card Slip #"
                                                className="w-full rounded-lg border-slate-300 text-xs font-mono focus:border-teal-500 focus:ring-teal-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Dual Print Format Selection */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium select-none">
                                    <input
                                        type="checkbox"
                                        checked={autoPrintPos}
                                        onChange={(e) => setAutoPrintPos(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>Automatically open print slip on completion</span>
                                </label>

                                {autoPrintPos && (
                                    <div className="grid grid-cols-2 gap-2 pl-6">
                                        <button
                                            type="button"
                                            onClick={() => setPrintFormat('thermal')}
                                            className={`p-2 rounded-lg border text-left text-xs transition ${
                                                printFormat === 'thermal'
                                                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="font-bold">🧾 80mm Thermal Slip</div>
                                            <div className="text-[10px] text-slate-400 font-normal">রসিদ প্রিন্টার</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPrintFormat('formal')}
                                            className={`p-2 rounded-lg border text-left text-xs transition ${
                                                printFormat === 'formal'
                                                    ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="font-bold">📄 A5 Formal Invoice</div>
                                            <div className="text-[10px] text-slate-400 font-normal">A5 মেডিকেল প্যাড</div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action Submit Button with Keyboard Shortcut Badge */}
                            <button
                                type="submit"
                                disabled={processing || !data.patient_id || data.items.length === 0}
                                className="w-full min-h-[46px] rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-between gap-2"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    <span>{processing ? 'Creating Invoice...' : 'Create & Print POS Invoice'}</span>
                                </div>
                                <kbd className="hidden sm:inline text-[10px] font-mono bg-teal-700/80 text-teal-100 px-2 py-0.5 rounded border border-teal-500/50">
                                    Ctrl + ↵
                                </kbd>
                            </button>
                        </div>
                    </div>
                </form>

                {/* Quick Patient Registration Modal */}
                {quickPatientOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
                        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">Quick Patient Registration (দ্রুত রোগী নিবন্ধন)</h3>
                                    <p className="text-xs text-slate-500">Creates record and auto-selects for this invoice</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setQuickPatientOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleQuickPatientSubmit} className="p-5 space-y-3.5">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Patient Full Name (রোগীর নাম) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={quickPatientData.name}
                                        onChange={(e) => setQuickPatientData({ ...quickPatientData, name: e.target.value })}
                                        placeholder="e.g. Md. Karim Hossain"
                                        className="w-full rounded-lg border-slate-300 text-xs py-2 px-3 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {quickPatientErrors.name && (
                                        <p className="text-xs text-rose-600">{quickPatientErrors.name}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Phone Number (মোবাইল নম্বর)
                                    </label>
                                    <input
                                        type="text"
                                        value={quickPatientData.phone}
                                        onChange={(e) => setQuickPatientData({ ...quickPatientData, phone: e.target.value })}
                                        placeholder="017XXXXXXXX"
                                        className="w-full rounded-lg border-slate-300 text-xs py-2 px-3 font-mono focus:border-teal-500 focus:ring-teal-500"
                                    />
                                    {quickPatientErrors.phone && (
                                        <p className="text-xs text-rose-600">{quickPatientErrors.phone}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-700">
                                            Gender (লিঙ্গ)
                                        </label>
                                        <select
                                            value={quickPatientData.gender}
                                            onChange={(e) => setQuickPatientData({ ...quickPatientData, gender: e.target.value })}
                                            className="w-full rounded-lg border-slate-300 text-xs py-2 px-3 focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="male">Male (পুরুষ)</option>
                                            <option value="female">Female (মহিলা)</option>
                                            <option value="other">Other (অন্যান্য)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-700">
                                            Age in Years (বয়স)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="120"
                                            value={quickPatientData.age_years}
                                            onChange={(e) => setQuickPatientData({ ...quickPatientData, age_years: e.target.value })}
                                            placeholder="e.g. 32"
                                            className="w-full rounded-lg border-slate-300 text-xs py-2 px-3 font-mono focus:border-teal-500 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuickPatientOpen(false)}
                                        className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={quickPatientLoading || !quickPatientData.name.trim()}
                                        className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {quickPatientLoading ? (
                                            <span>Saving...</span>
                                        ) : (
                                            <>
                                                <span>✓</span>
                                                <span>Save &amp; Select Patient</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
