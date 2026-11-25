import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import SearchableCombobox from '@/Components/SearchableCombobox';

export default function Create({ medicines = [], pharmaceuticals = [], manufacturers = [] }) {
    const [itemType, setItemType] = useState('remedy');

    const relevantManufacturers = manufacturers.length > 0
        ? (itemType === 'remedy'
            ? manufacturers.filter((m) => m.type === 'homeopathic' || m.type === 'dual')
            : manufacturers.filter((m) => m.type === 'allopathic' || m.type === 'dual'))
        : [];

    const fallbackChips = itemType === 'remedy'
        ? [
            { name: 'Dr. Willmar Schwabe Pharmaceuticals', label: 'Schwabe Germany' },
            { name: 'SBL Pvt. Ltd.', label: 'SBL India' },
            { name: 'Dr. Reckeweg & Co. GmbH', label: 'Dr. Reckeweg' },
            { name: 'Hahnemann Laboratories', label: 'Hahnemann' },
        ]
        : [
            { name: 'Square Pharmaceuticals Ltd', label: 'Square' },
            { name: 'Beximco Pharmaceuticals Ltd', label: 'Beximco' },
            { name: 'Incepta Pharmaceuticals Ltd', label: 'Incepta' },
            { name: 'Renata Limited', label: 'Renata' },
        ];

    const matchingChips = relevantManufacturers.length > 0
        ? relevantManufacturers.slice(0, 6).map((m) => ({ name: m.name, label: m.short_name || m.name }))
        : fallbackChips;

    const { data, setData, post, processing, errors } = useForm({
        item_type: 'remedy',
        medicine_id: '',
        pharmaceutical_id: '',
        batch_number: '',
        potency: '30C',
        form: 'dilution_30ml',
        expiry_date: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: '',
        selling_price: '',
        initial_quantity: '',
        unit: 'bottle',
        reorder_level: '5',
        supplier_name: '',
        notes: '',
        purchase_invoice: '',
    });

    const handleTypeSwitch = (type) => {
        setItemType(type);
        setData((prev) => ({
            ...prev,
            item_type: type,
            medicine_id: '',
            pharmaceutical_id: '',
            unit: type === 'remedy' ? 'bottle' : 'box',
            potency: type === 'remedy' ? '30C' : '',
            form: type === 'remedy' ? 'dilution_30ml' : 'tablet',
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.inventory.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Receive New Stock Batch" />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Receive New Pharmacy Stock"
                    subtitle="Register an incoming batch of Homeopathic remedies or Allopathic pharmaceuticals into dispensary inventory."
                    actions={
                        <Link
                            href={route('admin.inventory.index')}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg shadow-xs transition"
                        >
                            Back to Inventory
                        </Link>
                    }
                />

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs p-6">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Practice Item Type Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                                Item Category <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleTypeSwitch('remedy')}
                                    className={`p-4 rounded-xl border text-left transition flex items-center space-x-3 ${
                                        itemType === 'remedy'
                                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-teal-400/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="p-2 rounded-lg bg-teal-600 text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Homeopathy Remedy</h4>
                                        <p className="text-xs text-gray-500">Dilutions, Mother Tinctures, Potencies, Globules</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleTypeSwitch('pharmaceutical')}
                                    className={`p-4 rounded-xl border text-left transition flex items-center space-x-3 ${
                                        itemType === 'pharmaceutical'
                                            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-400/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="p-2 rounded-lg bg-sky-600 text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Conventional Allopathy</h4>
                                        <p className="text-xs text-gray-500">Tablets, Capsules, Syrups, Injections</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Medicine Selector & Specifications */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {itemType === 'remedy' ? (
                                <>
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Select Homeopathic Remedy <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            value={data.medicine_id}
                                            onChange={(e) => setData('medicine_id', e.target.value)}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="">-- Choose Remedy --</option>
                                            {medicines.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.medicine_id && <p className="mt-1 text-xs text-red-600">{errors.medicine_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Potency / Scale
                                        </label>
                                        <input
                                            type="text"
                                            value={data.potency}
                                            onChange={(e) => setData('potency', e.target.value)}
                                            placeholder="e.g. 30C, 200C, 1M, Q/MT, 0/3 LM"
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                        />
                                        {errors.potency && <p className="mt-1 text-xs text-red-600">{errors.potency}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Preparation Form
                                        </label>
                                        <select
                                            value={data.form}
                                            onChange={(e) => setData('form', e.target.value)}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                        >
                                            <option value="dilution_30ml">Dilution (30ml Bottle)</option>
                                            <option value="dilution_100ml">Dilution (100ml Bottle)</option>
                                            <option value="dilution_450ml">Dilution (450ml Bottle)</option>
                                            <option value="mother_tincture_30ml">Mother Tincture Q (30ml)</option>
                                            <option value="mother_tincture_100ml">Mother Tincture Q (100ml)</option>
                                            <option value="mother_tincture_450ml">Mother Tincture Q (450ml)</option>
                                            <option value="globules">Medicated Globules / Pellets</option>
                                            <option value="biochemic_tablets">Biochemic Tablets (Tissue Salts)</option>
                                            <option value="ointment">External Ointment / Gel</option>
                                            <option value="drops">Specialized Drops</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="md:col-span-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                Select Pharmaceutical <span className="text-red-500">*</span>
                                            </label>
                                            <span className="text-[10px] text-gray-400">({pharmaceuticals.length} available)</span>
                                        </div>
                                        <select
                                            required
                                            value={data.pharmaceutical_id}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                const selected = pharmaceuticals.find((p) => String(p.id) === String(selectedId));
                                                setData((prev) => ({
                                                    ...prev,
                                                    pharmaceutical_id: selectedId,
                                                    form: selected?.dosage_form ? selected.dosage_form.toLowerCase() : prev.form,
                                                    potency: selected?.strength || prev.potency,
                                                    supplier_name: selected?.manufacturer || prev.supplier_name,
                                                }));
                                            }}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-sky-500 focus:ring-sky-500"
                                        >
                                            <option value="">-- Choose Brand / Generic --</option>
                                            {pharmaceuticals.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.brand_name} ({p.generic_name}) - {p.strength} [{p.dosage_form}]
                                                </option>
                                            ))}
                                        </select>
                                        {errors.pharmaceutical_id && <p className="mt-1 text-xs text-red-600">{errors.pharmaceutical_id}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Dosage Form
                                        </label>
                                        <input
                                            type="text"
                                            value={data.form}
                                            onChange={(e) => setData('form', e.target.value)}
                                            placeholder="tablet, syrup, capsule, etc."
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-sky-500 focus:ring-sky-500"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Batch Number & Supplier */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Batch Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.batch_number}
                                    onChange={(e) => setData('batch_number', e.target.value)}
                                    placeholder="e.g. BN-2026-0041"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500 font-mono"
                                />
                                {errors.batch_number && <p className="mt-1 text-xs text-red-600">{errors.batch_number}</p>}
                            </div>

                            <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                                        Supplier / Manufacturer
                                    </label>
                                    <Link
                                        href={route('admin.manufacturers.create')}
                                        className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        + Add Company
                                    </Link>
                                </div>
                                <SearchableCombobox
                                    value={data.supplier_name}
                                    onChange={(name) => setData('supplier_name', name)}
                                    options={manufacturers}
                                    placeholder="Search or type supplier..."
                                />
                                {/* Quick Chips */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {matchingChips.map((chip) => (
                                        <button
                                            key={chip.name}
                                            type="button"
                                            onClick={() => setData('supplier_name', chip.name)}
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium border transition ${
                                                data.supplier_name === chip.name
                                                    ? 'bg-teal-600 text-white border-teal-600'
                                                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                            }`}
                                        >
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                                {errors.supplier_name && <p className="mt-1 text-xs text-red-600">{errors.supplier_name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Purchase Invoice #
                                </label>
                                <input
                                    type="text"
                                    value={data.purchase_invoice}
                                    onChange={(e) => setData('purchase_invoice', e.target.value)}
                                    placeholder="e.g. INV-9871"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500 font-mono"
                                />
                            </div>
                        </div>

                        {/* Dates: Purchase & Expiry */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Purchase Date
                                </label>
                                <input
                                    type="date"
                                    value={data.purchase_date}
                                    onChange={(e) => setData('purchase_date', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    value={data.expiry_date}
                                    onChange={(e) => setData('expiry_date', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.expiry_date && <p className="mt-1 text-xs text-red-600">{errors.expiry_date}</p>}
                            </div>
                        </div>

                        {/* Quantity, Unit & Reorder Level */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Initial Received Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={data.initial_quantity}
                                    onChange={(e) => setData('initial_quantity', e.target.value)}
                                    placeholder="e.g. 50"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500 font-bold"
                                />
                                {errors.initial_quantity && <p className="mt-1 text-xs text-red-600">{errors.initial_quantity}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Packaging Unit <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                >
                                    <option value="bottle">Bottle</option>
                                    <option value="box">Box</option>
                                    <option value="strip">Strip</option>
                                    <option value="tablet">Tablet</option>
                                    <option value="vial">Vial</option>
                                    <option value="ampoule">Ampoule</option>
                                    <option value="tube">Tube</option>
                                    <option value="gm">Gram (gm)</option>
                                    <option value="ml">Milliliter (ml)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Low Stock Alert Level <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={data.reorder_level}
                                    onChange={(e) => setData('reorder_level', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Alert when stock falls below this quantity</p>
                            </div>
                        </div>

                        {/* Pricing: Purchase & Selling */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Purchase Cost per Unit (৳) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={data.purchase_price}
                                    onChange={(e) => setData('purchase_price', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.purchase_price && <p className="mt-1 text-xs text-red-600">{errors.purchase_price}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Selling / Retail Price (৳) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={data.selling_price}
                                    onChange={(e) => setData('selling_price', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.selling_price && <p className="mt-1 text-xs text-red-600">{errors.selling_price}</p>}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Storage / Inventory Notes
                            </label>
                            <textarea
                                rows="2"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="e.g. Keep in cool dark shelf, Imported batch from Germany"
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                            />
                        </div>

                        {/* Form Submit */}
                        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Link
                                href={route('admin.inventory.index')}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
                            >
                                {processing ? 'Receiving...' : 'Save & Receive Stock'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
