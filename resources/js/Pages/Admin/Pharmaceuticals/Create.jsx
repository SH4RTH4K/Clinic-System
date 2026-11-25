import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export const DOSAGE_FORMS = [
    'Tablet',
    'Capsule',
    'Syrup',
    'Suspension',
    'Injection',
    'Drops',
    'Inhaler',
    'Ointment',
    'Cream',
    'Suppository',
    'Gel',
    'Lotion',
    'Eye Drops',
    'Ear Drops',
    'Nasal Spray',
    'Powder / Sachet',
    'IV Infusion',
];

const QUICK_STRENGTHS = ['500mg', '650mg', '20mg', '40mg', '100ml', '1g', '10mg', '5mg'];
const QUICK_MANUFACTURERS = [
    'Square Pharmaceuticals Ltd',
    'Beximco Pharmaceuticals Ltd',
    'Incepta Pharmaceuticals Ltd',
    'Renata Limited',
    'ACI Limited',
    'Opsonin Pharma Ltd',
];

export default function Create({ manufacturers = [] }) {
    const [showBatchSection, setShowBatchSection] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        generic_name: '',
        brand_name: '',
        dosage_form: 'Tablet',
        strength: '',
        manufacturer: '',
        description: '',
        is_active: true,

        // Optional opening batch fields
        receive_initial_batch: false,
        batch_number: '',
        expiry_date: '',
        purchase_price: '',
        selling_price: '',
        initial_quantity: '',
        unit: 'Strip',
        reorder_level: '10',
        supplier_name: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.pharmaceuticals.store'));
    };

    const toggleBatchSection = (e) => {
        const checked = e.target.checked;
        setShowBatchSection(checked);
        setData('receive_initial_batch', checked);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Add Pharmaceutical Drug" />
            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Add Pharmaceutical Drug"
                    subtitle="Register a new conventional medication in the clinical formulary with optional opening stock receipt."
                    actions={
                        <Link
                            href={route('admin.pharmaceuticals.index')}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            Back to Catalog
                        </Link>
                    }
                />

                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-6">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Section 1: Core Clinical Drug Information */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <span>💊</span>
                                <span>Clinical Medication Details</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Brand / Commercial Name (ব্র্যান্ড নাম) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Napa, Seclo, Moxacil, Alatrol"
                                        value={data.brand_name}
                                        onChange={(e) => setData('brand_name', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.brand_name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.brand_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Generic Name (জেনেরিক নাম) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Paracetamol, Omeprazole, Amoxicillin, Cetirizine"
                                        value={data.generic_name}
                                        onChange={(e) => setData('generic_name', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.generic_name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.generic_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Dosage Form (ফর্ম) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.dosage_form}
                                        onChange={(e) => setData('dosage_form', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    >
                                        {DOSAGE_FORMS.map((form) => (
                                            <option key={form} value={form}>{form}</option>
                                        ))}
                                    </select>
                                    {errors.dosage_form && <p className="mt-1 text-xs text-red-600 font-medium">{errors.dosage_form}</p>}
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-semibold text-gray-800">
                                            Strength / Potency (মাত্রা) <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-[11px] text-gray-500">Tap chip to fill:</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 500mg, 20mg, 125mg/5ml, 1g"
                                        value={data.strength}
                                        onChange={(e) => setData('strength', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {/* Quick Strength Chips */}
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {QUICK_STRENGTHS.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setData('strength', s)}
                                                className={`text-[11px] px-2 py-0.5 rounded font-medium border transition ${
                                                    data.strength === s
                                                        ? 'bg-primary-600 text-white border-primary-600'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                                                }`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.strength && <p className="mt-1 text-xs text-red-600 font-medium">{errors.strength}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-semibold text-gray-800">
                                            Pharmaceutical Manufacturer (কোম্পানি / প্রস্তুতকারক)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-gray-500">Tap chip or select:</span>
                                            <Link
                                                href={route('admin.manufacturers.create')}
                                                className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                + Add New Company
                                            </Link>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        list="registered-manufacturers-list"
                                        placeholder="Type or select company name..."
                                        value={data.manufacturer}
                                        onChange={(e) => setData('manufacturer', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    <datalist id="registered-manufacturers-list">
                                        {manufacturers.map((m) => (
                                            <option key={m.id} value={m.name}>
                                                {m.short_name ? `${m.short_name} (${m.type})` : m.type}
                                            </option>
                                        ))}
                                    </datalist>
                                    {/* Quick Manufacturer Chips */}
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {(manufacturers.length > 0
                                            ? manufacturers.slice(0, 8).map((m) => ({ name: m.name, label: m.short_name || m.name }))
                                            : QUICK_MANUFACTURERS.map((m) => ({ name: m, label: m.replace(' Pharmaceuticals Ltd', '').replace(' Limited', '') }))
                                        ).map((chip) => (
                                            <button
                                                key={chip.name}
                                                type="button"
                                                onClick={() => setData('manufacturer', chip.name)}
                                                className={`text-[11px] px-2 py-0.5 rounded font-medium border transition ${
                                                    data.manufacturer === chip.name
                                                        ? 'bg-primary-600 text-white border-primary-600'
                                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                                                }`}
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>
                                    {errors.manufacturer && <p className="mt-1 text-xs text-red-600 font-medium">{errors.manufacturer}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Clinical Description / Notes
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Indications, contraindications, or storage instructions..."
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.description && <p className="mt-1 text-xs text-red-600 font-medium">{errors.description}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.is_active}
                                            onChange={(e) => setData('is_active', e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Active in prescription suggestions and autocomplete</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Optional Opening Inventory Batch Intake */}
                        <div className="border border-emerald-200 rounded-xl bg-emerald-50/40 p-4 space-y-4">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showBatchSection}
                                    onChange={toggleBatchSection}
                                    className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                                        <span>📦</span>
                                        <span>Receive Opening Inventory Batch Now (ঐচ্ছিক প্রাথমিক স্টক গ্রহণ)</span>
                                    </span>
                                    <p className="text-xs text-emerald-800/80 mt-0.5">
                                        Enable if physical medication boxes are already on hand to atomically create an initial batch in pharmacy inventory.
                                    </p>
                                </div>
                            </label>

                            {showBatchSection && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-emerald-200/60">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Batch Number (ব্যাচ নং)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Leave empty to auto-generate"
                                            value={data.batch_number}
                                            onChange={(e) => setData('batch_number', e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                        {errors.batch_number && <p className="mt-1 text-[11px] text-red-600">{errors.batch_number}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Expiry Date (মেয়াদ উত্তীর্ণের তারিখ) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            required={showBatchSection}
                                            value={data.expiry_date}
                                            onChange={(e) => setData('expiry_date', e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                        {errors.expiry_date && <p className="mt-1 text-[11px] text-red-600">{errors.expiry_date}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Initial Quantity (পরিমাণ) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="1"
                                            min="1"
                                            required={showBatchSection}
                                            placeholder="e.g. 100"
                                            value={data.initial_quantity}
                                            onChange={(e) => setData('initial_quantity', e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                        {errors.initial_quantity && <p className="mt-1 text-[11px] text-red-600">{errors.initial_quantity}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Packaging Unit (প্যাকিং ইউনিট)
                                        </label>
                                        <select
                                            value={data.unit}
                                            onChange={(e) => setData('unit', e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                        >
                                            <option value="Strip">Strip (পাতা)</option>
                                            <option value="Box">Box (বাক্স)</option>
                                            <option value="Bottle">Bottle (বোতল)</option>
                                            <option value="Vial">Vial (ভায়াল)</option>
                                            <option value="Tube">Tube (টিউব)</option>
                                            <option value="Pcs">Pcs (পিস)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Purchase Price / Unit (ক্রয়মূল্য)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="e.g. 25.00"
                                            value={data.purchase_price}
                                            onChange={(e) => setData('purchase_price', e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-800 mb-1">
                                            Selling Price / Unit (বিক্রয়মূল্য)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="e.g. 35.00"
                                            value={data.selling_price}
                                            onChange={(e) => setData('selling_price', e.target.value)}
                                            className="w-full text-xs rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link
                                href={route('admin.pharmaceuticals.index')}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition shadow-xs disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : showBatchSection ? 'Save Drug & Receive Batch' : 'Save Drug'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
