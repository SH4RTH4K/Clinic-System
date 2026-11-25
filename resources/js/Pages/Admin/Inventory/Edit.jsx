import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import SearchableCombobox from '@/Components/SearchableCombobox';

export default function Edit({ batch, medicines = [], pharmaceuticals = [], manufacturers = [] }) {
    const { data, setData, put, processing, errors } = useForm({
        item_type: batch.item_type || 'remedy',
        medicine_id: batch.medicine_id || '',
        pharmaceutical_id: batch.pharmaceutical_id || '',
        batch_number: batch.batch_number || '',
        potency: batch.potency || '',
        form: batch.form || '',
        expiry_date: batch.expiry_date ? batch.expiry_date.split('T')[0] : '',
        purchase_date: batch.purchase_date ? batch.purchase_date.split('T')[0] : '',
        purchase_price: batch.purchase_price || '',
        selling_price: batch.selling_price || '',
        unit: batch.unit || 'unit',
        reorder_level: batch.reorder_level || '5',
        supplier_name: batch.supplier_name || '',
        notes: batch.notes || '',
        is_active: Boolean(batch.is_active),
    });

    const relevantManufacturers = manufacturers.length > 0
        ? (data.item_type === 'remedy'
            ? manufacturers.filter((m) => m.type === 'homeopathic' || m.type === 'dual')
            : manufacturers.filter((m) => m.type === 'allopathic' || m.type === 'dual'))
        : [];

    const fallbackChips = data.item_type === 'remedy'
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

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.inventory.update', batch.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Batch - ${batch.batch_number}`} />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Edit Batch: ${batch.item_name}`}
                    subtitle={`Batch Number: ${batch.batch_number} • Current Quantity: ${batch.current_quantity} ${batch.unit}`}
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
                        {/* Static Info Banner */}
                        <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                            <div>
                                <span className="text-xs text-gray-500 block">Catalog Item</span>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                                    {batch.item_name}
                                </h3>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 block">Current Stock</span>
                                <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                                    {batch.current_quantity} {batch.unit}
                                </span>
                            </div>
                        </div>

                        {/* Batch Number & Supplier */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Batch Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.batch_number}
                                    onChange={(e) => setData('batch_number', e.target.value)}
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
                                    Potency / Scale
                                </label>
                                <input
                                    type="text"
                                    value={data.potency}
                                    onChange={(e) => setData('potency', e.target.value)}
                                    placeholder="30C, 200C, 1M, Q"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
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

                        {/* Pricing, Unit & Reorder Level */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Purchase Cost (৳) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={data.purchase_price}
                                    onChange={(e) => setData('purchase_price', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.purchase_price && <p className="mt-1 text-xs text-red-600">{errors.purchase_price}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Selling Price (৳) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    value={data.selling_price}
                                    onChange={(e) => setData('selling_price', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                                {errors.selling_price && <p className="mt-1 text-xs text-red-600">{errors.selling_price}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Unit <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={data.unit}
                                    onChange={(e) => setData('unit', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
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
                            </div>
                        </div>

                        {/* Status Toggle & Notes */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <label htmlFor="is_active" className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Active (Available in dispensary)
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Storage / Inventory Notes
                                </label>
                                <textarea
                                    rows="2"
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Submit */}
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
                                {processing ? 'Updating...' : 'Update Batch Details'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
