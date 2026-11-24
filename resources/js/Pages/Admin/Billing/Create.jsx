import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const ITEM_TYPES = [
    { value: 'consultation', label: 'Consultation Fee (পরামর্শ ফি)' },
    { value: 'medicine', label: 'Medicine / Pharmacy (ওষুধ)' },
    { value: 'investigation', label: 'Lab Investigation (পরীক্ষা)' },
    { value: 'procedure', label: 'Clinical Procedure (চিকিৎসা সেবা)' },
    { value: 'other', label: 'Other Item / Charge (অন্যান্য)' },
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash (নগদ টাকা)', icon: '💵' },
    { value: 'bkash', label: 'bKash (বিকাশ)', icon: '📱' },
    { value: 'nagad', label: 'Nagad (নগদ)', icon: '📱' },
    { value: 'rocket', label: 'Rocket (রকেট)', icon: '📱' },
    { value: 'card', label: 'Debit / Credit Card (কার্ড)', icon: '💳' },
    { value: 'bank', label: 'Bank Transfer (ব্যাংক)', icon: '🏦' },
    { value: 'other', label: 'Other Method', icon: '🧾' },
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
    const [patientSearch, setPatientSearch] = useState(selectedPatient?.name || '');
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [activePatient, setActivePatient] = useState(selectedPatient);
    const [recentVisits, setRecentVisits] = useState(patientRecentVisits);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

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
            amount: 0,
            payment_method: 'cash',
            transaction_reference: '',
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'Counter payment upon invoice creation',
        },
    });

    // Compute dynamic calculations
    const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const discountValue = data.discount_type === 'percentage'
        ? (subtotal * Number(data.discount_amount || 0)) / 100
        : Number(data.discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - discountValue + Number(data.tax_amount || 0));

    // Update initial payment amount default when total changes
    useEffect(() => {
        if (data.collect_payment) {
            setData((prev) => ({
                ...prev,
                initial_payment: {
                    ...prev.initial_payment,
                    amount: totalAmount,
                },
            }));
        }
    }, [totalAmount, data.collect_payment]);

    // Live search for patients (both local memory + backend search)
    useEffect(() => {
        if (!patientSearch.trim()) {
            setFilteredPatients([]);
            return;
        }

        // Instant local match
        const term = patientSearch.toLowerCase();
        const localMatches = patients.filter(
            (p) =>
                p.name?.toLowerCase().includes(term) ||
                (p.phone && p.phone.includes(term)) ||
                (p.patient_code && p.patient_code.toLowerCase().includes(term)) ||
                (p.patient_no && String(p.patient_no).includes(term)) ||
                (p.patient_identifier && p.patient_identifier.toLowerCase().includes(term))
        );
        setFilteredPatients(localMatches.slice(0, 8));

        // Server search if 2+ characters typed
        if (patientSearch.length >= 2) {
            const timer = setTimeout(async () => {
                setIsSearching(true);
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
                    // Keep local matches on network error
                } finally {
                    setIsSearching(false);
                }
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [patientSearch]);

    const handleSelectPatient = async (patient) => {
        setActivePatient(patient);
        setPatientSearch(patient.name);
        setData('patient_id', patient.id);
        setFilteredPatients([]);

        // Load recent visits for this patient
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

    const handleDoctorChange = (doctorId) => {
        const doc = doctors.find((d) => String(d.id) === String(doctorId)) || null;
        setSelectedDoctor(doc);

        const docTitle = doc ? ` (${doc.name})` : '';
        const docNote = doc ? `Doctor: ${doc.name}` : '';

        // Update consultation items with doctor name
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

    const handleAddItem = (type = 'other', name = '', price = 0, batchId = null, notes = '') => {
        const newItem = {
            item_type: type,
            item_name: name,
            quantity: 1,
            unit_price: price,
            total_price: price,
            medicine_batch_id: batchId,
            notes: notes,
        };
        setData('items', [...data.items, newItem]);
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

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.invoices.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span>🧾</span> Create Patient Invoice (নতুন বিল তৈরি)
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Generate detailed billing receipt for consultation, prescribed medicines, and investigations.
                        </p>
                    </div>
                    <Link
                        href={route('admin.invoices.index')}
                        className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                    >
                        ← Back to Invoices
                    </Link>
                </div>
            }
        >
            <Head title="Create Invoice" />

            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Top Panel: Patient & Visit Linking */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
                        <h3 className="text-sm font-bold text-gray-900 border-b pb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <span>👤</span> Patient &amp; Visit Details
                            </span>
                            <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                #{data.invoice_number}
                            </span>
                        </h3>

                        {data.visit_id && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 font-medium">
                                    <span>🩺</span>
                                    <span>Linked to Clinical Visit #{data.visit_id} ({initialData.visit_date || 'Today'}). Items pre-populated from prescription.</span>
                                </div>
                                <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">Pre-filled</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Patient Search / Selection */}
                            <div className="md:col-span-2 relative">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Select Patient (রোগী নির্বাচন) <span className="text-rose-600">*</span>
                                </label>
                                {activePatient ? (
                                    <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50/40 p-2.5">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{activePatient.name}</p>
                                            <p className="text-xs text-gray-500">
                                                Phone: {activePatient.phone || 'N/A'} · ID: #{activePatient.patient_number || activePatient.patient_identifier || activePatient.patient_code || activePatient.id}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActivePatient(null);
                                                setData('patient_id', '');
                                                setPatientSearch('');
                                                setRecentVisits([]);
                                            }}
                                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                                        >
                                            Change Patient
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Type patient name, phone number, or patient ID..."
                                                value={patientSearch}
                                                onChange={(e) => setPatientSearch(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500 pr-8"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-2.5 top-2 text-gray-400">
                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        {filteredPatients.length > 0 && (
                                            <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                                                {filteredPatients.map((p) => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => handleSelectPatient(p)}
                                                        className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 border-b border-gray-50 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <span className="font-semibold text-gray-900">{p.name}</span>
                                                            <span className="text-gray-400 ml-2">({p.phone || 'No phone'})</span>
                                                        </div>
                                                        <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                                            #{p.patient_number || p.patient_identifier || p.patient_code || p.id}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {errors.patient_id && <p className="text-xs text-rose-600 mt-1">{errors.patient_id}</p>}
                            </div>

                            {/* Attending Doctor */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Attending Doctor (চিকিৎসক)
                                </label>
                                <select
                                    value={selectedDoctor?.id || ''}
                                    onChange={(e) => handleDoctorChange(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">-- General / Clinic Desk --</option>
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} {doc.specialty ? `(${doc.specialty})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-[10px] text-gray-400 mt-0.5 block">
                                    Sets consultation fee doctor attribution
                                </span>
                            </div>

                            {/* Invoice Date */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Invoice Date (বিল তারিখ) <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={data.invoice_date}
                                    onChange={(e) => setData('invoice_date', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                {errors.invoice_date && <p className="text-xs text-rose-600 mt-1">{errors.invoice_date}</p>}
                            </div>
                        </div>

                        {/* Recent Visits for this patient (1-click auto fill) */}
                        {recentVisits.length > 0 && !data.visit_id && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-2 text-xs">
                                <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                                    <span>🩺</span> Recent Clinical Visits for this Patient (প্রেসক্রিপশন থেকে দ্রুত বিল তৈরি):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {recentVisits.map((v) => (
                                        <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => router.visit(route('admin.invoices.create', { visit_id: v.id }))}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-800 font-semibold hover:bg-emerald-100 transition shadow-2xs"
                                        >
                                            <span>Visit #{v.id} ({v.visit_date}) — Dr. {v.doctor_name}</span>
                                            <span className="text-emerald-700 underline font-bold">Auto-fill Bill →</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Middle Panel: Invoice Line Items */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <span>📋</span> Billable Line Items (বিলে অন্তর্ভুক্ত সেবা ও ওষুধ)
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const docName = selectedDoctor ? ` (${selectedDoctor.name})` : '';
                                        const docNote = selectedDoctor ? `Doctor: ${selectedDoctor.name}` : '';
                                        handleAddItem('consultation', `Doctor Consultation Fee${docName}`, defaultFee, null, docNote);
                                    }}
                                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                                >
                                    + Consultation
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('other', '', 0)}
                                    className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                                >
                                    + Add Item
                                </button>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                                <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-3 py-2.5 w-32">Type</th>
                                        <th className="px-3 py-2.5">Item Description</th>
                                        <th className="px-3 py-2.5 w-24 text-right">Qty</th>
                                        <th className="px-3 py-2.5 w-32 text-right">Unit Price (৳)</th>
                                        <th className="px-3 py-2.5 w-32 text-right">Total (৳)</th>
                                        <th className="px-3 py-2.5 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {data.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50/60 transition">
                                            <td className="px-3 py-2">
                                                <select
                                                    value={item.item_type}
                                                    onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-xs py-1.5 focus:border-emerald-500 focus:ring-emerald-500"
                                                >
                                                    {ITEM_TYPES.map((t) => (
                                                        <option key={t.value} value={t.value}>{t.label.split(' ')[0]}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    type="text"
                                                    value={item.item_name}
                                                    onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                                    placeholder="Enter item or service name..."
                                                    className="w-full rounded-md border-gray-300 text-xs py-1.5 focus:border-emerald-500 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <input
                                                    type="number"
                                                    min="0.1"
                                                    step="any"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-xs py-1.5 text-right focus:border-emerald-500 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unit_price}
                                                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-xs py-1.5 text-right focus:border-emerald-500 focus:ring-emerald-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                                                ৳{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    disabled={data.items.length <= 1}
                                                    className="text-gray-400 hover:text-rose-600 disabled:opacity-20 transition"
                                                    title="Remove item"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Quick Inventory Stock Add Dropdown */}
                        {batches.length > 0 && (
                            <div className="pt-2 border-t flex items-center gap-2 text-xs text-gray-600">
                                <span>📦 Quick Add from Pharmacy Inventory:</span>
                                <select
                                    onChange={(e) => {
                                        const selected = batches.find((b) => String(b.id) === e.target.value);
                                        if (selected) {
                                            handleAddItem('medicine', selected.name, selected.selling_price, selected.id);
                                        }
                                        e.target.value = '';
                                    }}
                                    defaultValue=""
                                    className="rounded-md border-gray-300 text-xs py-1 px-2 focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="" disabled>-- Select Medicine Batch --</option>
                                    {batches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} (৳{b.selling_price})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Financial Summary & Discounts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Notes */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 uppercase">Billing Notes &amp; Remarks</h4>
                            <textarea
                                rows={3}
                                placeholder="Optional billing notes, doctor reference, or billing instructions..."
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="w-full rounded-lg border-gray-300 text-xs focus:border-emerald-500 focus:ring-emerald-500"
                            />
                        </div>

                        {/* Calculation Box */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>Subtotal (মোট বিল):</span>
                                <span className="font-bold text-gray-900">৳{subtotal.toFixed(2)}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-600 gap-3">
                                <span>Discount (ডিসকাউন্ট / ছাড়):</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={data.discount_amount}
                                        onChange={(e) => setData('discount_amount', e.target.value)}
                                        className="w-24 rounded-md border-gray-300 text-xs py-1 text-right focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                    <select
                                        value={data.discount_type}
                                        onChange={(e) => setData('discount_type', e.target.value)}
                                        className="rounded-md border-gray-300 text-xs py-1 focus:border-emerald-500 focus:ring-emerald-500"
                                    >
                                        <option value="fixed">৳ Fixed</option>
                                        <option value="percentage">% Percent</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 border-t flex items-center justify-between text-base font-bold text-gray-900">
                                <span>Net Total Payable (সর্বমোট দেয়):</span>
                                <span className="text-xl font-extrabold text-emerald-700">৳{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Initial Payment Collection Panel */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.collect_payment}
                                    onChange={(e) => setData('collect_payment', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-sm font-bold text-gray-900">
                                        Collect Payment Now (এখনই পেমেন্ট গ্রহণ করুন)
                                    </span>
                                    <p className="text-[11px] text-gray-500">Record cashier payment receipt immediately with invoice.</p>
                                </div>
                            </label>

                            {data.collect_payment && (
                                <button
                                    type="button"
                                    onClick={() => setData('initial_payment', { ...data.initial_payment, amount: totalAmount })}
                                    className="text-xs font-bold text-emerald-700 hover:underline bg-white border border-emerald-300 px-2.5 py-1 rounded-md"
                                >
                                    Pay Full (৳{totalAmount.toFixed(2)})
                                </button>
                            )}
                        </div>

                        {data.collect_payment && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Payment Method (পদ্ধতি) <span className="text-rose-600">*</span>
                                    </label>
                                    <select
                                        value={data.initial_payment.payment_method}
                                        onChange={(e) => setData('initial_payment', { ...data.initial_payment, payment_method: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                    >
                                        {PAYMENT_METHODS.map((m) => (
                                            <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Amount Collected (গ্রহণের পরিমাণ) <span className="text-rose-600">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.initial_payment.amount}
                                        onChange={(e) => setData('initial_payment', { ...data.initial_payment, amount: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 text-xs font-bold text-gray-900 shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Reference / TrxID (লেনদেন আইডি)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. bKash TrxID or Card Slip #"
                                        value={data.initial_payment.transaction_reference}
                                        onChange={(e) => setData('initial_payment', { ...data.initial_payment, transaction_reference: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t">
                        <Link
                            href={route('admin.invoices.index')}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing || !data.patient_id || data.items.length === 0}
                            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            <span>💾</span>
                            <span>{processing ? 'Processing...' : 'Create &amp; Finalize Invoice'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
