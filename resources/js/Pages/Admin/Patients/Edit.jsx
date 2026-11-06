import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import FormField from '@/Components/FormField';
import { Head, Link, useForm } from '@inertiajs/react';
import { calculateAgeFromDob, calculateDobFromAge } from './ageHelpers';
import { getGuardianRelationshipLabel } from './relationshipHelpers';

export default function Edit({ patient, fieldConfig = {}, relationshipOptions = [] }) {
    const rawDob = patient.dob ? patient.dob.split('T')[0] : '';
    const dobAge = rawDob ? calculateAgeFromDob(rawDob) : null;

    const initialYears = dobAge ? dobAge.years : (patient.age_years !== null && patient.age_years !== undefined ? String(patient.age_years) : '');
    const initialMonths = dobAge ? dobAge.months : (patient.age_months !== null && patient.age_months !== undefined ? String(patient.age_months) : '');
    const initialDays = dobAge ? dobAge.days : (patient.age_days !== null && patient.age_days !== undefined ? String(patient.age_days) : '');
    const initialDob = rawDob || calculateDobFromAge(initialYears, initialMonths, initialDays);

    const { data, setData, put, errors, processing } = useForm({
        name: patient.name || '',
        guardian_name: patient.guardian_name || '',
        guardian_relationship: patient.guardian_relationship || '',
        gender: patient.gender || '',
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
    const field = (key) => fieldConfig[key] || { label: key, visible: true, required: false };
    const relationshipLabel = getGuardianRelationshipLabel(data.guardian_relationship, patient.guardian_relationship_custom || '', relationshipOptions);
    const contactNameLabel = field('guardian_name').label === 'Contact Name' && relationshipLabel
        ? `${relationshipLabel} Name`
        : field('guardian_name').label;
    const availableRelationshipOptions = [...relationshipOptions];
    if (data.guardian_relationship && !availableRelationshipOptions.some((option) => option.value === data.guardian_relationship)) {
        availableRelationshipOptions.push({
            value: data.guardian_relationship,
            label: `${relationshipLabel || 'Previous relationship'} (existing record)`,
        });
    }

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
                    subtitle={`Patient ID: ${patient.patient_identifier || `${patient.patient_no}${patient.patient_series || ''}`} • Created: ${new Date(patient.created_at).toLocaleDateString()}`}
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
                        {(field('name').visible || field('guardian_relationship').visible || field('guardian_name').visible || field('gender').visible || field('age_years').visible || field('age_months').visible || field('age_days').visible || field('dob').visible) && <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Identity &amp; Demographics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {field('name').visible && <div className="md:col-span-2" style={{ order: field('name').order }}>
                                    <FormField label={field('name').label} id="name" required={field('name').required} error={errors.name}>
                                        <input
                                            id="name"
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Full name of patient"
                                            required={field('name').required}
                                        />
                                    </FormField>
                                </div>}

                                {field('guardian_relationship').visible && <div className="md:col-span-2" style={{ order: field('guardian_relationship').order }}>
                                    <FormField
                                        label={`${field('guardian_relationship').label}${field('guardian_relationship').required ? '' : ' (Optional)'}`}
                                        id="guardian_relationship"
                                        required={field('guardian_relationship').required}
                                        error={errors.guardian_relationship}
                                    >
                                        <select
                                            id="guardian_relationship"
                                            value={data.guardian_relationship}
                                            onChange={(e) => setData('guardian_relationship', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            required={field('guardian_relationship').required}
                                        >
                                            <option value="" disabled={field('guardian_relationship').required}>
                                                {field('guardian_relationship').required ? 'Select relationship' : 'Select relationship (optional)'}
                                            </option>
                                            {availableRelationshipOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>}

                                {field('guardian_name').visible && <div className="md:col-span-2" style={{ order: field('guardian_name').order }}>
                                    <FormField
                                        label={contactNameLabel}
                                        id="guardian_name"
                                        required={field('guardian_name').required}
                                        error={errors.guardian_name}
                                    >
                                        <input
                                            id="guardian_name"
                                            type="text"
                                            value={data.guardian_name}
                                            onChange={(e) => setData('guardian_name', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Enter the person's full name"
                                            required={field('guardian_name').required}
                                        />
                                    </FormField>
                                </div>}

                                {field('gender').visible && <div className="md:col-span-2" style={{ order: field('gender').order }}>
                                    <FormField label={field('gender').label} id="gender" required={field('gender').required} error={errors.gender}>
                                        <select
                                            id="gender"
                                            value={data.gender}
                                            onChange={(e) => setData('gender', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            required={field('gender').required}
                                        >
                                            <option value="" disabled>Select gender</option>
                                            <option value="male">Male (পুরুষ)</option>
                                            <option value="female">Female (মহিলা)</option>
                                            <option value="other">Other (অন্যান্য)</option>
                                        </select>
                                    </FormField>
                                </div>}

                                {(field('age_years').visible || field('age_months').visible || field('age_days').visible) && <div className="md:col-span-3" style={{ order: field('age_years').order }}>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                                            Age (বয়স) <span className="text-gray-400 font-normal lowercase">(auto-syncs with Date of Birth)</span>
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {field('age_years').visible && <div>
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
                                                        required={field('age_years').required}
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-xs text-gray-400">
                                                        {field('age_years').label}
                                                    </span>
                                                </div>
                                                {errors.age_years && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_years}</p>
                                                )}
                                            </div>}
                                            {field('age_months').visible && <div>
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
                                                        required={field('age_months').required}
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-xs text-gray-400">
                                                        {field('age_months').label}
                                                    </span>
                                                </div>
                                                {errors.age_months && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_months}</p>
                                                )}
                                            </div>}
                                            {field('age_days').visible && <div>
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
                                                        required={field('age_days').required}
                                                    />
                                                    <span className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-xs text-gray-400">
                                                        {field('age_days').label}
                                                    </span>
                                                </div>
                                                {errors.age_days && (
                                                    <p className="text-xs text-red-600 mt-1">{errors.age_days}</p>
                                                )}
                                            </div>}
                                        </div>
                                    </div>
                                </div>}

                                {field('dob').visible && <div className="md:col-span-1" style={{ order: field('dob').order }}>
                                    <FormField label={field('dob').label} id="dob" required={field('dob').required} error={errors.dob} helpText="Auto-syncs Age">
                                        <input
                                            id="dob"
                                            type="date"
                                            max={new Date().toISOString().split('T')[0]}
                                            value={data.dob}
                                            onChange={handleDobChange}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            required={field('dob').required}
                                        />
                                    </FormField>
                                </div>}
                            </div>
                        </div>}

                        {/* Contact & Residential Address */}
                        {(field('phone').visible || field('referred_by').visible || field('address').visible) && <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Contact &amp; Residential Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {field('phone').visible && <FormField style={{ order: field('phone').order }} label={field('phone').label} id="phone" required={field('phone').required} error={errors.phone} helpText="Format: 017XXXXXXXX or +8801XXXXXXXX">
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        placeholder="01XXXXXXXXX"
                                        required={field('phone').required}
                                    />
                                </FormField>}

                                {field('referred_by').visible && <FormField style={{ order: field('referred_by').order }} label={field('referred_by').label} id="referred_by" required={field('referred_by').required} error={errors.referred_by}>
                                    <input
                                        id="referred_by"
                                        type="text"
                                        value={data.referred_by}
                                        onChange={(e) => setData('referred_by', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        placeholder="Doctor, friend or existing patient"
                                        required={field('referred_by').required}
                                    />
                                </FormField>}

                                {field('address').visible && <div className="md:col-span-2" style={{ order: field('address').order }}>
                                    <FormField label={field('address').label} id="address" required={field('address').required} error={errors.address}>
                                        <textarea
                                            id="address"
                                            rows={3}
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="House / Road, Village, Post Office, Upazila / Thana, District..."
                                            required={field('address').required}
                                        />
                                    </FormField>
                                </div>}
                            </div>
                        </div>}

                        {/* Medical Background */}
                        {(field('blood_group').visible || field('known_allergies').visible) && <div>
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                Medical Background
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {field('blood_group').visible && <FormField style={{ order: field('blood_group').order }} label={field('blood_group').label} id="blood_group" required={field('blood_group').required} error={errors.blood_group}>
                                    <select
                                        id="blood_group"
                                        value={data.blood_group}
                                        onChange={(e) => setData('blood_group', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        required={field('blood_group').required}
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
                                </FormField>}

                                {field('known_allergies').visible && <FormField style={{ order: field('known_allergies').order }} label={field('known_allergies').label} id="known_allergies" required={field('known_allergies').required} error={errors.known_allergies}>
                                    <input
                                        id="known_allergies"
                                        type="text"
                                        value={data.known_allergies}
                                        onChange={(e) => setData('known_allergies', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                        placeholder="Any known drug, food or chemical allergies"
                                        required={field('known_allergies').required}
                                    />
                                </FormField>}
                            </div>
                        </div>}

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
