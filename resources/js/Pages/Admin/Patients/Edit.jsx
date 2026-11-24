import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import FormField from '@/Components/FormField';
import WebcamCaptureModal from '@/Components/WebcamCaptureModal';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { calculateAgeFromDob, calculateDobFromAge } from './ageHelpers';
import { getGuardianRelationshipLabel } from './relationshipHelpers';

export default function Edit({ patient, fieldConfig = {}, relationshipOptions = [], nextOldOrOtherIdPreview = '', oldOrOtherIdConfig = {} }) {
    const rawDob = patient.dob ? patient.dob.split('T')[0] : '';
    const dobAge = rawDob ? calculateAgeFromDob(rawDob) : null;
    const createdAt = patient.created_at ? new Date(patient.created_at) : null;
    const createdDate = createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleDateString()
        : 'Not recorded';

    const initialYears = dobAge ? dobAge.years : (patient.age_years !== null && patient.age_years !== undefined ? String(patient.age_years) : '');
    const initialMonths = dobAge ? dobAge.months : (patient.age_months !== null && patient.age_months !== undefined ? String(patient.age_months) : '');
    const initialDays = dobAge ? dobAge.days : (patient.age_days !== null && patient.age_days !== undefined ? String(patient.age_days) : '');
    const initialDob = rawDob || calculateDobFromAge(initialYears, initialMonths, initialDays);

    const { data, setData, post, errors, processing } = useForm({
        _method: 'put',
        name: patient.name || '',
        old_or_other_id: patient.old_or_other_id || '',
        reference_number: patient.reference_number || '',
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
        photo: null,
        photo_webcam_data: '',
        remove_photo: false,
    });
    const [showWebcam, setShowWebcam] = useState(false);
    const field = (key) => fieldConfig[key] || { label: key, visible: true, required: false };
    const relationshipLabel = getGuardianRelationshipLabel(data.guardian_relationship, patient.guardian_relationship_custom || '', relationshipOptions);
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
        post(route('admin.patients.update', patient.id), { forceFormData: true });
    };

    const photoPreviewUrl = data.remove_photo
        ? null
        : (data.photo
            ? URL.createObjectURL(data.photo)
            : (data.photo_webcam_data || patient.photo_url || null));

    return (
        <AuthenticatedLayout>
            <Head title={`Edit Patient - ${patient.name}`} />
            <div className="py-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title={`Edit Patient: ${patient.name}`}
                    subtitle={`Patient ID: ${patient.patient_identifier || `${patient.patient_no}${patient.patient_series || ''}`} • Created: ${createdDate}`}
                    actions={
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
                        {/* Patient Photo & Webcam Capture */}
                        <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800 mb-1">Patient Photo</h3>
                            <p className="text-xs text-gray-500 mb-4">Update the patient's identification photograph used for OPD cards and clinical verification.</p>

                            <div className="flex flex-col sm:flex-row items-center gap-5">
                                <div className="w-24 h-28 rounded-lg border-2 border-gray-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
                                    {photoPreviewUrl ? (
                                        <img src={photoPreviewUrl} alt="Patient Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-2 text-gray-400">
                                            <svg className="w-8 h-8 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span className="text-[10px] uppercase font-semibold">No Photo</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowWebcam(true)}
                                        className="inline-flex items-center px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                                    >
                                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Take Photo with Webcam
                                    </button>

                                    <label className="cursor-pointer inline-flex items-center px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition">
                                        <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Upload Image File
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setData((prev) => ({
                                                        ...prev,
                                                        photo: file,
                                                        photo_webcam_data: '',
                                                        remove_photo: false,
                                                    }));
                                                }
                                            }}
                                        />
                                    </label>

                                    {photoPreviewUrl && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setData((prev) => ({
                                                    ...prev,
                                                    photo: null,
                                                    photo_webcam_data: '',
                                                    remove_photo: true,
                                                }));
                                            }}
                                            className="inline-flex items-center px-3 py-2 text-xs font-medium text-red-600 hover:text-red-800 transition"
                                        >
                                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Remove Photo
                                        </button>
                                    )}
                                </div>
                            </div>
                            {errors.photo && <p className="mt-2 text-xs text-red-600">{errors.photo}</p>}
                        </section>

                        {/* Basic Identity Information */}
                        {(field('name').visible || field('old_or_other_id').visible || field('reference_number').visible || field('guardian_relationship').visible || field('guardian_name').visible || field('gender').visible || field('age_years').visible || field('age_months').visible || field('age_days').visible || field('dob').visible) && <div>
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

                                {field('old_or_other_id').visible && <div className="md:col-span-2" style={{ order: field('old_or_other_id').order }}>
                                    <FormField label={field('old_or_other_id').label} id="old_or_other_id" required={field('old_or_other_id').required} error={errors.old_or_other_id}>
                                        <div className="space-y-1">
                                            <div className="flex gap-2">
                                                <input
                                                    id="old_or_other_id"
                                                    type="text"
                                                    value={data.old_or_other_id}
                                                    onChange={(e) => setData('old_or_other_id', e.target.value)}
                                                    maxLength={oldOrOtherIdConfig?.max_length || field('old_or_other_id').max_length || 50}
                                                    className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500 font-mono"
                                                    placeholder="Enter Old/Other ID"
                                                    required={field('old_or_other_id').required}
                                                />
                                                {!data.old_or_other_id && nextOldOrOtherIdPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setData('old_or_other_id', nextOldOrOtherIdPreview)}
                                                        className="whitespace-nowrap px-2.5 py-1 text-xs font-medium border border-primary-300 bg-primary-50 text-primary-700 rounded-md hover:bg-primary-100"
                                                    >
                                                        Auto ID
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Manageable length (max {oldOrOtherIdConfig?.max_length || field('old_or_other_id').max_length || 50} chars)</span>
                                                <span>{(data.old_or_other_id || '').length} / {oldOrOtherIdConfig?.max_length || field('old_or_other_id').max_length || 50}</span>
                                            </div>
                                        </div>
                                    </FormField>
                                </div>}

                                {field('reference_number').visible && <div className="md:col-span-2" style={{ order: field('reference_number').order }}>
                                    <FormField label={field('reference_number').label} id="reference_number" required={field('reference_number').required} error={errors.reference_number}>
                                        <input
                                            id="reference_number"
                                            type="text"
                                            value={data.reference_number}
                                            onChange={(e) => setData('reference_number', e.target.value)}
                                            maxLength={field('reference_number').max_length}
                                            className="w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-primary-500 focus:ring-primary-500"
                                            placeholder="Enter reference number"
                                            required={field('reference_number').required}
                                        />
                                    </FormField>
                                </div>}

                                {field('guardian_relationship').visible && <div className="md:col-span-2" style={{ order: field('guardian_relationship').order }}>
                                    <FormField
                                        label={field('guardian_relationship').label}
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
                                        label={field('guardian_name').label}
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

            <WebcamCaptureModal
                isOpen={showWebcam}
                onClose={() => setShowWebcam(false)}
                onCapture={(base64) => {
                    setData((prev) => ({
                        ...prev,
                        photo_webcam_data: base64,
                        photo: null,
                        remove_photo: false,
                    }));
                }}
            />
        </AuthenticatedLayout>
    );
}
