import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const ITEM_TYPES = [
    { value: 'consultation', label: 'Consultation Fee' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'investigation', label: 'Investigation' },
    { value: 'procedure', label: 'Procedure' },
    { value: 'other', label: 'Other' },
];

export default function Edit({ invoice }) {
    const { data, setData, put, processing, errors } = useForm({
        invoice_date: invoice.invoice_date || '',
        discount_amount: invoice.discount_amount || 0,
        discount_type: invoice.discount_type || 'fixed',
        notes: invoice.notes || '',
        items: invoice.items?.map((item) => ({
            item_type: item.item_type || 'other',
            item_name: item.item_name || '',
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            medicine_batch_id: item.medicine_batch_id || null,
            notes: item.notes || '',
        })) || [],
    });

    const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
    const discountVal = data.discount_type === 'percentage'
        ? (subtotal * Number(data.discount_amount || 0)) / 100
        : Number(data.discount_amount || 0);
    const totalAmount = Math.max(0, subtotal - discountVal);

    const handleAddItem = () => {
        setData('items', [
            ...data.items,
            { item_type: 'other', item_name: '', quantity: 1, unit_price: 0, medicine_batch_id: null, notes: '' },
        ]);
    };

    const handleRemoveItem = (index) => {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...data.items];
        updated[index][field] = value;
        setData('items', updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('admin.invoices.update', invoice.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span>✏️</span> Edit Invoice #{invoice.invoice_number}
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Modify billable items, quantities, rates, and discounts.
                        </p>
                    </div>
                    <Link
                        href={route('admin.invoices.show', invoice.id)}
                        className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                    >
                        ← Back to Invoice
                    </Link>
                </div>
            }
        >
            <Head title={`Edit Invoice #${invoice.invoice_number}`} />

            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Date</label>
                                <input
                                    type="date"
                                    value={data.invoice_date}
                                    onChange={(e) => setData('invoice_date', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 text-xs shadow-2xs focus:border-emerald-500 focus:ring-emerald-500"
                                />
                                {errors.invoice_date && <p className="text-xs text-rose-600 mt-1">{errors.invoice_date}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Patient</label>
                                <p className="text-sm font-bold text-gray-900 mt-1">{invoice.patient?.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Line Items</h3>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                                + Add Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center border-b pb-2">
                                    <div className="col-span-3">
                                        <select
                                            value={item.item_type}
                                            onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                                            className="w-full rounded-md border-gray-300 text-xs py-1.5 focus:border-emerald-500 focus:ring-emerald-500"
                                        >
                                            {ITEM_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-4">
                                        <input
                                            type="text"
                                            placeholder="Item Description"
                                            value={item.item_name}
                                            onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                            className="w-full rounded-md border-gray-300 text-xs py-1.5 focus:border-emerald-500 focus:ring-emerald-500"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="any"
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-full rounded-md border-gray-300 text-xs py-1.5 text-right focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Price"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                            className="w-full rounded-md border-gray-300 text-xs py-1.5 text-right focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            disabled={data.items.length <= 1}
                                            className="text-gray-400 hover:text-rose-600 disabled:opacity-20"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Box */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Subtotal:</span>
                            <span className="font-bold text-gray-900">৳{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 gap-3">
                            <span>Discount:</span>
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
                        <div className="pt-3 border-t flex items-center justify-between text-sm font-bold text-gray-900">
                            <span>Updated Total Payable:</span>
                            <span className="text-base font-extrabold text-emerald-700">৳{totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t">
                        <Link
                            href={route('admin.invoices.show', invoice.id)}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                        >
                            {processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
