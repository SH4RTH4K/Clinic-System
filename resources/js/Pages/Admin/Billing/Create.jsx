import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const ITEM_TYPES = [
    { value: 'consultation', label: 'Consultation Fee (পরামর্শ ফি)', icon: '🩺' },
    { value: 'medicine', label: 'Medicine / Pharmacy (ওষুধ)', icon: '💊' },
    { value: 'investigation', label: 'Lab Investigation (পরীক্ষা)', icon: '🔬' },
    { value: 'procedure', label: 'Clinical Procedure (সেবা)', icon: '🩹' },
    { value: 'other', label: 'Other Item / Charge (অন্যান্য)', icon: '🏷️' },
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash (নগদ)', icon: '💵' },
    { value: 'bkash', label: 'bKash (বিকাশ)', icon: '📱' },
    { value: 'nagad', label: 'Nagad (নগদ)', icon: '📱' },
    { value: 'rocket', label: 'Rocket (রকেট)', icon: '📱' },
    { value: 'card', label: 'Card (কার্ড)', icon: '💳' },
    { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
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
    // Patient Search & Selection
    const [patientSearch, setPatientSearch] = useState(selectedPatient?.name || '');
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [activePatient, setActivePatient] = useState(selectedPatient);
    const [recentVisits, setRecentVisits] = useState(patientRecentVisits);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [isSearchingPatient, setIsSearchingPatient] = useState(false);

    // Pharmacy Batch Combobox Search
    const [batchQuery, setBatchQuery] = useState('');
    const [batchResults, setBatchResults] = useState([]);
    const [isSearchingBatch, setIsSearchingBatch] = useState(false);
    const [showBatchDropdown, setShowBatchDropdown] = useState(false);

    // Cashier Tender & Change Calculator
    const [tenderedCash, setTenderedCash] = useState('');
    const [autoPrintPos, setAutoPrintPos] = useState(true);

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
                    const data = await res.json();
                    setBatchResults(Array.isArray(data) ? data : []);
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

    const handleAddBatchItem = (batch) => {
        const label = `${batch.item_name} [${batch.sub_label || batch.item_type}] (Batch: ${batch.batch_number})`;
        handleAddItem('medicine', label, Number(batch.selling_price || 0), batch.id, `Stock: ${batch.current_quantity}`);
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
                // If autoPrintPos is enabled, trigger thermal slip in a new tab
                if (autoPrintPos && page?.props?.flash?.invoice_id) {
                    window.open(route('admin.invoices.pos_receipt', page.props.flash.invoice_id), '_blank');
                }
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Point of Sale (POS) Billing Terminal" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-24">
                {/* RemediQ Standard PageHeader */}
                <PageHeader
                    title="Point of Sale (POS) Billing Terminal (কাউন্টার ক্যাশিয়ার ও বিল)"
                    subtitle="Fast cashier checkout, prescription auto-fill, live pharmacy batch combobox, and instant cash tender calculator"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href={route('admin.billing.cash_register')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>🧾</span> Cash Register (ডেইলি ক্যাশ)
                            </Link>
                            <Link
                                href={route('admin.invoices.index')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition hover:bg-gray-50"
                            >
                                <span>📋</span> Invoices Directory
                            </Link>
                        </div>
                    }
                />

                {/* Main 2-Column POS Workspace */}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: Cart & Billable Items Studio (7 cols on lg) */}
                    <div className="lg:col-span-7 space-y-5">
                        {/* 1. Fast Line Item Presets Strip */}
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                    <span>⚡</span> Fast Billable Line Presets (দ্রুত আইটেম যোগ):
                                </span>
                                <span className="text-[11px] text-gray-400">1-click additions</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('consultation')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition shadow-2xs"
                                >
                                    <span>🩺</span> Consultation (৳{defaultFee})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('followup')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition shadow-2xs"
                                >
                                    <span>🔄</span> Follow-up (৳300)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('investigation')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition shadow-2xs"
                                >
                                    <span>🔬</span> Lab Test (৳250)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('procedure')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-2xs"
                                >
                                    <span>🩹</span> Procedure (৳150)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePresetChip('custom')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition shadow-2xs ml-auto"
                                >
                                    <span>➕</span> Custom Item
                                </button>
                            </div>
                        </div>

                        {/* 2. Async Pharmacy Batch Search Combobox */}
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs space-y-2 relative">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                                    <span>📦</span> Live Pharmacy Dispensary Search (ঔষধ ও ব্যাচ অনুসন্ধান):
                                </label>
                                {isSearchingBatch && (
                                    <span className="text-[11px] text-emerald-700 font-semibold animate-pulse">Searching inventory...</span>
                                )}
                            </div>

                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600 font-bold">🔍</span>
                                <input
                                    type="text"
                                    value={batchQuery}
                                    onChange={(e) => setBatchQuery(e.target.value)}
                                    placeholder="Type remedy, brand, generic, potency, strength, or batch #..."
                                    className="w-full rounded-lg border-emerald-300 pl-9 pr-9 text-xs sm:text-sm bg-white shadow-2xs focus:border-emerald-600 focus:ring-emerald-600"
                                />
                                {batchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => { setBatchQuery(''); setShowBatchDropdown(false); }}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-gray-400 hover:text-gray-600 font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Batch Results Dropdown */}
                            {showBatchDropdown && batchResults.length > 0 && (
                                <div className="absolute left-4 right-4 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 animate-in fade-in">
                                    {batchResults.map((b) => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => handleAddBatchItem(b)}
                                            className="w-full text-left p-3 hover:bg-emerald-50/80 transition flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                                    <span>{b.item_type === 'remedy' ? '🌿' : '💊'}</span>
                                                    <span className="truncate">{b.item_name}</span>
                                                    {b.sub_label && (
                                                        <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.2 rounded border border-primary-200">
                                                            {b.sub_label}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                                    Batch: {b.batch_number} · Exp: {b.expiry_date}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <div className="font-bold text-emerald-800 text-sm font-mono">
                                                    ৳{Number(b.selling_price).toFixed(2)}
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-semibold">
                                                    Stock: {b.current_quantity}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showBatchDropdown && batchQuery.trim().length >= 2 && batchResults.length === 0 && !isSearchingBatch && (
                                <div className="absolute left-4 right-4 top-full mt-1 z-30 p-4 text-center rounded-xl border border-gray-200 bg-white shadow-lg text-xs text-gray-500">
                                    No active in-stock batches match "{batchQuery}".
                                </div>
                            )}
                        </div>

                        {/* 3. Billable Items Table */}
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                    <span>🛒</span> Invoice Cart Items ({data.items.length}):
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => handleAddItem('other', '', 0)}
                                    className="text-xs font-bold text-primary-700 hover:underline"
                                >
                                    + Add Custom Line
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                                    <thead className="bg-gray-50 font-semibold text-gray-600 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3 py-2 w-28">Type</th>
                                            <th className="px-3 py-2">Item Description</th>
                                            <th className="px-3 py-2 w-20 text-right">Qty</th>
                                            <th className="px-3 py-2 w-28 text-right">Price (৳)</th>
                                            <th className="px-3 py-2 w-28 text-right">Total (৳)</th>
                                            <th className="px-2 py-2 w-8 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {data.items.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50/60 transition">
                                                <td className="px-3 py-2">
                                                    <select
                                                        value={item.item_type}
                                                        onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                                                        className="w-full rounded-md border-gray-300 text-xs py-1 px-2 focus:border-primary-500 focus:ring-primary-500"
                                                    >
                                                        {ITEM_TYPES.map((t) => (
                                                            <option key={t.value} value={t.value}>
                                                                {t.icon} {t.label.split(' ')[0]}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.item_name}
                                                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                                        placeholder="Service or medicine title..."
                                                        className="w-full rounded-md border-gray-300 text-xs py-1 px-2 focus:border-primary-500 focus:ring-primary-500 font-medium"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min="0.1"
                                                        step="any"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="w-full rounded-md border-gray-300 text-xs py-1 px-2 text-right font-mono focus:border-primary-500 focus:ring-primary-500"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                        className="w-full rounded-md border-gray-300 text-xs py-1 px-2 text-right font-mono focus:border-primary-500 focus:ring-primary-500"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-900 whitespace-nowrap font-mono">
                                                    ৳{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        disabled={data.items.length <= 1}
                                                        className="text-gray-400 hover:text-rose-600 disabled:opacity-20 font-bold transition"
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

                            {/* Subtotal & Discount Row */}
                            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <span className="font-semibold text-gray-600">Discount (ছাড়):</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.discount_amount}
                                        onChange={(e) => setData('discount_amount', e.target.value)}
                                        className="w-24 rounded-md border-gray-300 text-xs py-1 px-2 text-right font-mono"
                                    />
                                    <select
                                        value={data.discount_type}
                                        onChange={(e) => setData('discount_type', e.target.value)}
                                        className="rounded-md border-gray-300 text-xs py-1 px-2"
                                    >
                                        <option value="fixed">৳ Fixed</option>
                                        <option value="percentage">% Percent</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-auto font-mono">
                                    <div>
                                        <span className="text-gray-500 mr-1">Subtotal:</span>
                                        <strong className="text-gray-900">৳{subtotal.toFixed(2)}</strong>
                                    </div>
                                    {discountValue > 0 && (
                                        <div>
                                            <span className="text-emerald-600 mr-1">Discount:</span>
                                            <strong className="text-emerald-700">-৳{discountValue.toFixed(2)}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes Field */}
                            <div className="pt-2">
                                <input
                                    type="text"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    placeholder="Optional cashier notes or remarks..."
                                    className="w-full rounded-md border-gray-300 text-xs py-1.5 px-2.5 focus:border-primary-500 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Patient Verification & Financial Settlement (5 cols on lg) */}
                    <div className="lg:col-span-5 space-y-5">
                        {/* 1. Patient Selection & Demographics Verification Card */}
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                                    <span>👤</span> Patient Demographics (রোগীর তথ্য): <span className="text-rose-500">*</span>
                                </h3>
                                {activePatient && (
                                    <button
                                        type="button"
                                        onClick={handleClearPatient}
                                        className="text-xs font-semibold text-rose-600 hover:underline"
                                    >
                                        Change Patient ✕
                                    </button>
                                )}
                            </div>

                            {/* If No Patient Selected: Search Bar */}
                            {!activePatient ? (
                                <div className="space-y-2 relative">
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">🔍</span>
                                        <input
                                            type="text"
                                            value={patientSearch}
                                            onChange={(e) => setPatientSearch(e.target.value)}
                                            placeholder="Search registered patient by name, phone, or ID..."
                                            className="w-full rounded-lg border-gray-300 pl-9 pr-3 text-xs shadow-2xs focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </div>

                                    {/* Patient Results Dropdown */}
                                    {filteredPatients.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl divide-y divide-gray-100 animate-in fade-in">
                                            {filteredPatients.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => handleSelectPatient(p)}
                                                    className="w-full text-left p-2.5 hover:bg-primary-50/80 transition flex items-center justify-between text-xs"
                                                >
                                                    <div>
                                                        <div className="font-bold text-gray-900">{p.name}</div>
                                                        <div className="text-[11px] text-gray-500 font-mono">
                                                            📞 {p.phone || 'No phone'} · ID: {p.patient_code || p.patient_no || p.id}
                                                        </div>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                                        Select →
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {errors.patient_id && <p className="text-xs text-rose-600">{errors.patient_id}</p>}
                                </div>
                            ) : (
                                /* Verified Patient Card */
                                <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-3 space-y-2">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white shadow-2xs">
                                            {activePatient.name?.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm text-gray-900 truncate">{activePatient.name}</div>
                                            <div className="text-xs text-primary-700 font-mono mt-0.5 flex items-center gap-2">
                                                {activePatient.phone ? (
                                                    <a href={`tel:${activePatient.phone}`} className="hover:underline">
                                                        📞 {activePatient.phone}
                                                    </a>
                                                ) : (
                                                    <span>No phone</span>
                                                )}
                                                <span>·</span>
                                                <span>ID: {activePatient.patient_code || activePatient.patient_no || activePatient.id}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Patient Metadata Chips */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-semibold">
                                        {activePatient.gender && (
                                            <span className="px-2 py-0.5 rounded bg-white border border-primary-200 text-gray-700 uppercase">
                                                {activePatient.gender}
                                            </span>
                                        )}
                                        {activePatient.age_years && (
                                            <span className="px-2 py-0.5 rounded bg-white border border-primary-200 text-gray-700">
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
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 space-y-1.5 text-xs">
                                    <p className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                                        <span>🩺</span> Recent Visits (প্রেসক্রিপশন থেকে দ্রুত বিল পূরণ):
                                    </p>
                                    <div className="space-y-1">
                                        {recentVisits.map((v) => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => router.visit(route('admin.invoices.create', { visit_id: v.id }))}
                                                className="w-full text-left p-1.5 bg-white border border-emerald-200 rounded-md text-emerald-900 font-medium hover:bg-emerald-100 transition flex items-center justify-between text-[11px]"
                                            >
                                                <span>Visit #{v.id} ({v.visit_date}) — Dr. {v.doctor_name}</span>
                                                <span className="text-emerald-700 font-bold underline">Auto-fill →</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attending Doctor Selector */}
                            <div className="space-y-1 pt-1">
                                <label className="block text-xs font-semibold text-gray-700">
                                    Attending Doctor (দায়িত্বপ্রাপ্ত চিকিৎসক):
                                </label>
                                <select
                                    value={selectedDoctor?.id || ''}
                                    onChange={(e) => handleDoctorChange(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs py-1.5 focus:border-primary-500 focus:ring-primary-500"
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

                        {/* 2. Payment Settlement & Change Calculator */}
                        <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-2xs space-y-4">
                            {/* Net Total Display */}
                            <div className="rounded-xl bg-white p-3.5 border border-emerald-200 flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                                        Net Payable (সর্বমোট দেয়)
                                    </span>
                                    <span className="text-xs text-emerald-700 font-semibold">After all discounts</span>
                                </div>
                                <span className="text-2xl font-extrabold text-emerald-800 font-mono">
                                    ৳{totalAmount.toFixed(2)}
                                </span>
                            </div>

                            {/* Collect Payment Toggle */}
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.collect_payment}
                                    onChange={(e) => setData('collect_payment', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-gray-900">
                                        Collect Payment Now (কাউন্টারে নগদ বা ডিজিটাল গ্রহণ)
                                    </span>
                                    <p className="text-[11px] text-gray-500">Records cashier receipt immediately upon invoice creation.</p>
                                </div>
                            </label>

                            {data.collect_payment && (
                                <div className="space-y-3 pt-2 border-t border-emerald-100">
                                    {/* Payment Method Selector */}
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                            Payment Method (পেমেন্ট মাধ্যম):
                                        </label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {PAYMENT_METHODS.map((m) => (
                                                <button
                                                    key={m.value}
                                                    type="button"
                                                    onClick={() => setData('initial_payment', { ...data.initial_payment, payment_method: m.value })}
                                                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition text-center ${
                                                        data.initial_payment.payment_method === m.value
                                                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs font-bold'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {m.icon} {m.label.split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cashier Change Calculator (Active when Cash is selected) */}
                                    {data.initial_payment.payment_method === 'cash' && (
                                        <div className="rounded-xl border border-emerald-300 bg-white p-3.5 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                    <span>🧮</span> Cash Tender &amp; Change Calculator (নগদ ফেরত হিসাব):
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="block text-[11px] text-gray-600 font-semibold">
                                                    Tendered Cash from Patient (প্রদত্ত নগদ):
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 font-bold">৳</span>
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
                                                        className="w-full rounded-lg border-gray-300 pl-8 pr-3 text-sm font-bold font-mono focus:border-emerald-600 focus:ring-emerald-600"
                                                    />
                                                </div>
                                            </div>

                                            {/* Quick Tender Chips */}
                                            <div className="flex flex-wrap items-center gap-1 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTenderedCash(String(totalAmount));
                                                        setData('initial_payment', { ...data.initial_payment, amount: totalAmount });
                                                    }}
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition"
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
                                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition"
                                                    >
                                                        ৳{amt}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Change Callout */}
                                            {tenderAmountNum >= totalAmount ? (
                                                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 flex items-center justify-between font-mono">
                                                    <span className="text-xs font-bold text-emerald-900">
                                                        Change to Return (ফেরত টাকা):
                                                    </span>
                                                    <span className="text-base font-extrabold text-emerald-700">
                                                        ৳{changeToReturn.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : tenderAmountNum > 0 ? (
                                                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 flex items-center justify-between font-mono">
                                                    <span className="text-xs font-bold text-amber-900">
                                                        Remaining Due (বকেয়া থাকবে):
                                                    </span>
                                                    <span className="text-sm font-bold text-amber-800">
                                                        ৳{remainingDue.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    {/* Transaction Reference (if digital) */}
                                    {data.initial_payment.payment_method !== 'cash' && (
                                        <div className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-700">
                                                Transaction Reference / TrxID:
                                            </label>
                                            <input
                                                type="text"
                                                value={data.initial_payment.transaction_reference}
                                                onChange={(e) => setData('initial_payment', { ...data.initial_payment, transaction_reference: e.target.value })}
                                                placeholder="e.g. bKash TrxID or Card Slip #"
                                                className="w-full rounded-lg border-gray-300 text-xs font-mono focus:border-emerald-500 focus:ring-emerald-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Auto-print POS Receipt Checkbox */}
                            <div className="pt-2 border-t border-emerald-100">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 font-semibold select-none">
                                    <input
                                        type="checkbox"
                                        checked={autoPrintPos}
                                        onChange={(e) => setAutoPrintPos(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>🧾 Automatically open Thermal 80mm POS Slip on completion</span>
                                </label>
                            </div>

                            {/* Action Submit Button */}
                            <button
                                type="submit"
                                disabled={processing || !data.patient_id || data.items.length === 0}
                                className="w-full min-h-[46px] rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                            >
                                <span>💾</span>
                                <span>{processing ? 'Creating Invoice...' : 'Create & Finalize POS Invoice'}</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
