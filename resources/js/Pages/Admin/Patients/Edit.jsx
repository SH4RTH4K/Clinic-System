import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import FormField from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';
import { calculateAgeFromDob, calculateDobFromAge } from './ageHelpers';

export default function Edit({ patient }) {
    const rawDob = patient.dob ? patient.dob.split('T')[0] : '';
    const dobAge = rawDob ? calculateAgeFromDob(rawDob) : null;

    const initialYears = dobAge ? dobAge.years : (patient.age_years !== null && patient.age_years !== undefined ? String(patient.age_years) : '');
    const initialMonths = dobAge ? dobAge.months : (patient.age_months !== null && patient.age_months !== undefined ? String(patient.age_months) : '');
    const initialDays = dobAge ? dobAge.days : (patient.age_days !== null && patient.age_days !== undefined ? String(patient.age_days) : '');
    const initialDob = rawDob || calculateDobFromAge(initialYears, initialMonths, initialDays);

    const { data, setData, put, errors, processing } = useForm({
        name: patient.name || '',
        guardian_name: patient.guardian_name || '',
        gender: patient.gender || 'male',
        age_years: initialYears,
        age_months: initialMonths,
        age_days: initialDays,
        dob: initialDob,
        phone: patient.phone || '',
        address: patient.address || '',
        blood_group: patient.blood_group || '',
        known_allergies: patient.known_allergies || '',
        referred_by: patient.referred_by || '',
    });

    const handleAgePartChange = (field, val) => {
        setData((prev) => {
            const next = { ...prev, [field]: val };
            const yEmpty = next.age_years === '' || next.age_years === null;
            const mEmpty = next.age_months === '' || next.age_months === null;
            const dEmpty = next.age_days === '' || next.age_days === null;
            if (yEmpty && mEmpty && dEmpty) {
                next.dob = '';
                return next;
            }
            const computedDob = calculateDobFromAge(next.age_years, next.age_months, next.age_days);
            if (computedDob) {
                next.dob = computedDob;
            }
            return next;
        });
    };

    const handleDobChange = (e) => {
        const val = e.target.value;
        if (!val) {
            setData((prev) => ({
                ...prev,
                dob: '',
                age_years: '',
                age_months: '',
                age_days: '',
            }));
            return;
        }
        const { years, months, days } = calculateAgeFromDob(val);
        setData((prev) => ({
            ...prev,
            dob: val,
            age_years: years,
            age_months: months,
            age_days: days,
        }));
    };

    const submit = (e) => {
        e.preventDefault();
        put(route('admin.patients.update', patient.id));
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Patient - ${patient.name}`} />
            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Edit Patient: ${patient.name}`}
                    subtitle={`Patient ID: ${patient.patient_no}${patient.patient_series || ''} • Created: ${new Date(patient.created_at).toLocaleDateString()}`}
                    action={
                        <div className="flex gap-2">
                            <Link
                                href={route('admin.patients.show', patient.id)}
                                className="px-3.5 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                View Record
                            </Link>
                            <Link
                                href={route('admin.patients.index')}
                                className="px-3.5 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md shadow-xs transition"
                            >
                                Patient List
                            </Link>
                        </div>
                    }
                />

                <div className="bg-white p-6 shadow-xs border border-gray-200 rounded-lg">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Basic Identity Information */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Identity &amp; Demographics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-2">
                                    <FormField label="Patient Full Name" id="name" required error={errors.name}>
                                        <input
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Full name of patient"
                                            required
                                        />
                                    </FormField>
                                </div>

                                <div className="md:col-span-2">
                                    <FormField label="Guardian / Father / Spouse Name" id="guardian_name" error={errors.guardian_name}>
                                        <input
                                            id="guardian_name"
                                            type="text"
                                            value={data.guardian_name}
                                            onChange={(e) => setData('guardian_name', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="e.g. Father's or Spouse's Name"
                                        />
                                    </FormField>
                                </div>

                                <div className="md:col-span-1">
                                    <FormField label="Gender" id="gender" required error={errors.gender}>
                                        <select
                                            id="gender"
                                            value={data.gender}
                                            onChange={(e) => setData('gender', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        >
                                            <option value="male">Male (পুরুষ)</option>
                                            <option value="female">Female (মহিলা)</option>
                                            <option value="other">Other (অন্যান্য)</option>
                                        </select>
                                    </FormField>
                                </div>

                                <div className="md:col-span-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                            Age (বয়স) <span className="text-gray-400 font-normal lowercase">(auto-syncs with Date of Birth)</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <div className="relative rounded-md shadow-sm">
                                                    <input
                                                        id="age_years"
                                                        type="number"
                                                        min="0"
                                                        max="150"
                                                        value={data.age_years}
                                                        onChange={(e) => handleAgePartChange('age_years', e.target.value)}
                                                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-xs text-gray-400">
                                                        Years
                                                    </span>
                                                </div>
                                                {errors.age_years && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_years}</p>
                                                )}
                                            </div>
                                            <div>
                                                <div className="relative rounded-md shadow-sm">
                                                    <input
                                                        id="age_months"
                                                        type="number"
                                                        min="0"
                                                        max="11"
                                                        value={data.age_months}
                                                        onChange={(e) => handleAgePartChange('age_months', e.target.value)}
                                                        className="w-full pr-14 rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-xs text-gray-400">
                                                        Months
                                                    </span>
                                                </div>
                                                {errors.age_months && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_months}</p>
                                                )}
                                            </div>
                                            <div>
                                                <div className="relative rounded-md shadow-sm">
                                                    <input
                                                        id="age_days"
                                                        type="number"
                                                        min="0"
                                                        max="31"
                                                        value={data.age_days}
                                                        onChange={(e) => handleAgePartChange('age_days', e.target.value)}
                                                        className="w-full pr-12 rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                                        placeholder="0"
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-xs text-gray-400">
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

                                <div className="md:col-span-1">
                                    <FormField label="Date of Birth" id="dob" error={errors.dob} helpText="Auto-syncs Age">
                                        <input
                                            id="dob"
                                            type="date"
                                            max={new Date().toISOString().split('T')[0]}
                                            value={data.dob}
                                            onChange={handleDobChange}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Residential Address */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Contact &amp; Residential Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Mobile Phone Number" id="phone" error={errors.phone} helpText="Format: 017XXXXXXXX or +8801XXXXXXXX">
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        placeholder="01XXXXXXXXX"
                                    />
                                </FormField>

                                <FormField label="Referred By" id="referred_by" error={errors.referred_by}>
                                    <input
                                        id="referred_by"
                                        type="text"
                                        value={data.referred_by}
                                        onChange={(e) => setData('referred_by', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        placeholder="Doctor, friend or existing patient"
                                    />
                                </FormField>

                                <div className="md:col-span-2">
                                    <FormField label="Residential Address / Village &amp; Area" id="address" error={errors.address}>
                                        <textarea
                                            id="address"
                                            rows={3}
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="House / Road, Village, Post Office, Upazila / Thana, District..."
                                        />
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* Medical Background */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Medical Background
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField label="Blood Group" id="blood_group" error={errors.blood_group}>
                                    <select
                                        id="blood_group"
                                        value={data.blood_group}
                                        onChange={(e) => setData('blood_group', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                    >
                                        <option value="">Unknown / Not Tested</option>
                                        <option value="A+">A Positive (A+)</option>
                                        <option value="A-">A Negative (A-)</option>
                                        <option value="B+">B Positive (B+)</option>
                                        <option value="B-">B Negative (B-)</option>
                                        <option value="O+">O Positive (O+)</option>
                                        <option value="O-">O Negative (O-)</option>
                                        <option value="AB+">AB Positive (AB+)</option>
                                        <option value="AB-">AB Negative (AB-)</option>
                                    </select>
                                </FormField>

                                <FormField label="Known Allergies / Sensitivities" id="known_allergies" error={errors.known_allergies}>
                                    <input
                                        id="known_allergies"
                                        type="text"
                                        value={data.known_allergies}
                                        onChange={(e) => setData('known_allergies', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        placeholder="Any known drug, food or chemical allergies"
                                    />
                                </FormField>
                            </div>
                        </div>

                        {/* Form Submission */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                            <Link
                                href={route('admin.patients.show', patient.id)}
                                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-xs transition"
                            >
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md text-sm shadow-xs transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                {processing ? 'Saving...' : 'Update Patient'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}