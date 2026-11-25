import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

const MANUFACTURER_TYPES = [
    { value: 'allopathic', label: 'Allopathy Pharma', icon: '💊', desc: 'Conventional allopathic pharmaceuticals' },
    { value: 'homeopathic', label: 'Homeopathy Lab', icon: '🌿', desc: 'Classical dilutions, mother tinctures & bio-chemics' },
    { value: 'dual', label: 'Dual Practice', icon: '🏥', desc: 'Integrated / polyclinic supply' },
    { value: 'surgical', label: 'Surgical & Diagnostic', icon: '🩺', desc: 'Surgical disposables & diagnostic reagents' },
];

const PRESETS = [
    { name: 'Square Pharmaceuticals Ltd', short_name: 'Square', type: 'allopathic', phone: '02-48811122' },
    { name: 'Beximco Pharmaceuticals Ltd', short_name: 'Beximco', type: 'allopathic', phone: '02-58611001' },
    { name: 'Incepta Pharmaceuticals Ltd', short_name: 'Incepta', type: 'allopathic', phone: '02-8891688' },
    { name: 'Renata Limited', short_name: 'Renata', type: 'allopathic', phone: '02-8730300' },
    { name: 'Dr. Willmar Schwabe Pharmaceuticals', short_name: 'Schwabe Germany', type: 'homeopathic', phone: '+49 721 4005-0' },
    { name: 'SBL Pvt. Ltd.', short_name: 'SBL India', type: 'homeopathic', phone: '+91 11 4377 6600' },
    { name: 'Dr. Reckeweg & Co. GmbH', short_name: 'Dr. Reckeweg', type: 'homeopathic', phone: '+49 6251 1097-0' },
];

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        short_name: '',
        name_bn: '',
        type: 'allopathic',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        website: '',
        notes: '',
        is_active: true,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.manufacturers.store'));
    };

    const applyPreset = (preset) => {
        setData((prev) => ({
            ...prev,
            name: preset.name,
            short_name: preset.short_name,
            type: preset.type,
            phone: preset.phone || prev.phone,
        }));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Add Manufacturer / Pharmaceutical Company" />

            <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Add Manufacturer / Company"
                    subtitle="Register a pharmaceutical laboratory, homeopathic medicine maker, or surgical vendor."
                    actions={
                        <Link
                            href={route('admin.manufacturers.index')}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            Back to List
                        </Link>
                    }
                />

                {/* Quick Presets for Bangladeshi Clinics */}
                <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-sky-800 mb-2">
                        ⚡ Quick Suggestions (দ্রুত নির্বাচন করুন):
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-sky-300 text-sky-800 hover:bg-sky-100 hover:border-sky-400 transition shadow-2xs flex items-center gap-1.5"
                            >
                                <span>{preset.type === 'homeopathic' ? '🌿' : '💊'}</span>
                                <span>{preset.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-2xs border border-gray-200 p-6">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Section 1: Manufacturer Identity */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <span>🏢</span>
                                <span>Company & Brand Identity</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Company / Laboratory Full Name (কোম্পানির নাম) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Square Pharmaceuticals Ltd, Dr. Willmar Schwabe, SBL India"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Short Name / Brand Code (সংক্ষিপ্ত নাম)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Square, Incepta, Schwabe, SBL"
                                        value={data.short_name}
                                        onChange={(e) => setData('short_name', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.short_name && <p className="mt-1 text-xs text-red-600 font-medium">{errors.short_name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Bengali Name (বাংলায় নাম)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="যেমন: স্কয়ার ফার্মাসিউটিক্যালস লিঃ"
                                        value={data.name_bn}
                                        onChange={(e) => setData('name_bn', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.name_bn && <p className="mt-1 text-xs text-red-600 font-medium">{errors.name_bn}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Clinical Discipline / Category */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Clinical Discipline & Practice Category (বিভাগ) <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {MANUFACTURER_TYPES.map((type) => {
                                    const isSelected = data.type === type.value;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setData('type', type.value)}
                                            className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                                isSelected
                                                    ? 'border-primary-600 bg-primary-50/50 ring-2 ring-primary-500/30'
                                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">{type.icon}</span>
                                                <span className="text-sm font-bold text-gray-900">{type.label}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{type.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.type && <p className="mt-1 text-xs text-red-600 font-medium">{errors.type}</p>}
                        </div>

                        {/* Section 3: Contact & Medical Representative (MR) */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <span>📞</span>
                                <span>Medical Representative (MR) & Distributor Contact</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        MR / Contact Representative (প্রতিনিধির নাম)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Mohammad Rafiq (Area Manager)"
                                        value={data.contact_person}
                                        onChange={(e) => setData('contact_person', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.contact_person && <p className="mt-1 text-xs text-red-600 font-medium">{errors.contact_person}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Phone / Mobile (মোবাইল / হটলাইন)
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="e.g. 01711-XXXXXX or +880..."
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.phone && <p className="mt-1 text-xs text-red-600 font-medium">{errors.phone}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Email Address (ইমেইল)
                                    </label>
                                    <input
                                        type="email"
                                        placeholder="e.g. orders@company.com"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.email && <p className="mt-1 text-xs text-red-600 font-medium">{errors.email}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Website (ওয়েবসাইট)
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://www.company.com"
                                        value={data.website}
                                        onChange={(e) => setData('website', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.website && <p className="mt-1 text-xs text-red-600 font-medium">{errors.website}</p>}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Distribution Depot / Office Address (ডিপো বা সরবরাহকারী ঠিকানা)
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Tejgaon Industrial Area, Dhaka or Local Pharmacy Depot"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.address && <p className="mt-1 text-xs text-red-600 font-medium">{errors.address}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Operational Notes & Active Status */}
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <span>📝</span>
                                <span>Commercial Notes & Formulary Availability</span>
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                                        Procurement & Credit Notes (অতিরিক্ত তথ্য / পেমেন্ট শর্ত)
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="e.g. Weekly delivery on Tuesdays, 30 days payment credit, 5% dispensary discount."
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        className="w-full text-sm rounded-lg border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                                    />
                                    {errors.notes && <p className="mt-1 text-xs text-red-600 font-medium">{errors.notes}</p>}
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="rounded border-gray-300 text-primary-600 shadow-2xs focus:ring-primary-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-semibold text-gray-900 cursor-pointer">
                                        Active in Formulary (সক্রিয় কোম্পানি - ওষুধ এন্ট্রির ড্রপডাউনে প্রদর্শিত হবে)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                            <Link
                                href={route('admin.manufacturers.index')}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Manufacturer</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
