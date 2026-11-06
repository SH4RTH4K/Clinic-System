import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const inputClass = 'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700';

const socialIconClasses = {
    facebook: 'bg-blue-50 text-blue-600',
    x: 'bg-gray-100 text-gray-900',
    youtube: 'bg-red-50 text-red-600',
    instagram: 'bg-gradient-to-br from-amber-100 via-pink-100 to-purple-100 text-pink-600',
    linkedin: 'bg-sky-50 text-sky-700',
    whatsapp: 'bg-green-50 text-green-600',
    tiktok: 'bg-gray-100 text-gray-900',
    telegram: 'bg-sky-50 text-sky-600',
    website: 'bg-indigo-50 text-indigo-600',
};

const socialIconPaths = {
    facebook: <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6h1.7V3.1c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2.1h-3v3.2h3V21h3.9Z" fill="currentColor" />,
    x: <path d="M18.9 3h2.8l-6.1 7 7.2 11h-5.6l-4.4-6.8L6.9 21H4.1l6.5-7.5L3.7 3h5.8l4 6.2L18.9 3Zm-1 16.1h1.6L8.6 4.8H6.9l11 14.3Z" fill="currentColor" />,
    youtube: <><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8A26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8Z" fill="currentColor" /><path d="m10 15.2 5.2-3.2L10 8.8v6.4Z" fill="white" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.8" r="1.2" fill="currentColor" /></>,
    linkedin: <><path d="M5 8.5H2.2V21H5V8.5ZM3.6 6.8a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4ZM21.8 13.8c0-3.8-2-5.6-4.7-5.6a4.1 4.1 0 0 0-3.7 2V8.5h-2.8V21h2.8v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.9 2 3.3V21h2.9l1.2-7.2Z" fill="currentColor" /></>,
    whatsapp: <><path d="M20.2 3.8A11.5 11.5 0 0 0 2.1 17.7L.7 23.1l5.5-1.4A11.5 11.5 0 0 0 20.2 3.8ZM12 20.5a9.5 9.5 0 0 1-4.8-1.3l-.4-.2-3.2.8.8-3.1-.2-.5A9.5 9.5 0 1 1 12 20.5Z" fill="currentColor" /><path d="M16.9 13.9c-.3-.2-1.7-.9-2-.9-.2-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.2-1.3-.8-.7-1.3-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.6-.9-2.1-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.1 3c.2.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3s-.3-.3-.6-.5Z" fill="currentColor" /></>,
    tiktok: <path d="M19.6 7.1a6.2 6.2 0 0 1-4-1.8v8.2a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.1.1v3.2a2.5 2.5 0 1 0 1.5 2.4V2h3.3a6.2 6.2 0 0 0 3.8 4.1v1Z" fill="currentColor" />,
    telegram: <path d="m21.7 4.3-3.2 15.2c-.2 1.1-.8 1.4-1.7.9l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-8c.4-.3-.1-.5-.6-.2L6.4 13.5l-4.6-1.4c-1-.3-1-1 .2-1.5L20 4c.8-.3 1.5.2 1.7.3Z" fill="currentColor" />,
    website: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 12h17M12 3c2.2 2.4 3.2 5.4 3.2 9s-1 6.6-3.2 9c-2.2-2.4-3.2-5.4-3.2-9s1-6.6 3.2-9Z" fill="none" stroke="currentColor" strokeWidth="1.6" /></>,
};

function SocialPlatformIcon({ platform }) {
    return (
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${socialIconClasses[platform]}`} aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                {socialIconPaths[platform]}
            </svg>
        </span>
    );
}

function Field({ label, error, icon, children }) {
    return (
        <div>
            <label className={`${labelClass} ${icon ? 'flex items-center gap-2' : ''}`}>
                {icon && <SocialPlatformIcon platform={icon} />}
                {label}
            </label>
            <div className="mt-1">{children}</div>
            <InputError message={error} className="mt-2" />
        </div>
    );
}

export default function DoctorForm({
    data,
    setData,
    errors,
    processing,
    progress,
    onSubmit,
    submitLabel,
    doctor = null,
    doctorAccounts = [],
    canManageDoctorAccounts = false,
}) {
    const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

    useEffect(() => {
        if (!data.photo) {
            setSelectedPhotoUrl(null);

            return undefined;
        }

        const previewUrl = URL.createObjectURL(data.photo);
        setSelectedPhotoUrl(previewUrl);

        return () => URL.revokeObjectURL(previewUrl);
    }, [data.photo]);

    const photoUrl = selectedPhotoUrl || (doctor?.photo_path ? route('admin.doctors.photo', doctor.id) : null);

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Doctor Name" error={errors.name}>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                className={inputClass}
                                required
                            />
                        </Field>

                        <Field label="Doctor Name (Bangla)" error={errors.name_bn}>
                            <input
                                type="text"
                                value={data.name_bn}
                                onChange={(event) => setData('name_bn', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Credentials" error={errors.credentials}>
                            <input
                                type="text"
                                value={data.credentials}
                                onChange={(event) => setData('credentials', event.target.value)}
                                className={inputClass}
                                placeholder="D.H.M.S, B.H.B"
                            />
                        </Field>

                        <Field label="Credentials (Bangla)" error={errors.credentials_bn}>
                            <input
                                type="text"
                                value={data.credentials_bn}
                                onChange={(event) => setData('credentials_bn', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Specialty" error={errors.specialty}>
                            <input
                                type="text"
                                value={data.specialty}
                                onChange={(event) => setData('specialty', event.target.value)}
                                className={inputClass}
                                placeholder="Chronic disease care"
                            />
                        </Field>

                        <Field label="Specialty (Bangla)" error={errors.specialty_bn}>
                            <input
                                type="text"
                                value={data.specialty_bn}
                                onChange={(event) => setData('specialty_bn', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Govt. Reg. No." error={errors.govt_reg_no}>
                            <input
                                type="text"
                                value={data.govt_reg_no}
                                onChange={(event) => setData('govt_reg_no', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        {canManageDoctorAccounts && (
                            <Field label="Linked staff account" error={errors.user_id}>
                                <select
                                    value={data.user_id}
                                    onChange={(event) => setData('user_id', event.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">No linked account</option>
                                    {doctorAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            {account.name} ({account.username})
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Linking identifies the prescriber. The account must also have the visits.finalize permission.
                                </p>
                            </Field>
                        )}

                        <Field label="Sort Order" error={errors.sort_order}>
                            <input
                                type="number"
                                min="0"
                                value={data.sort_order}
                                onChange={(event) => setData('sort_order', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Contact Phone" error={errors.phone}>
                            <input
                                type="tel"
                                value={data.phone}
                                onChange={(event) => setData('phone', event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Appointment Phone" error={errors.appointment_phone}>
                            <input
                                type="tel"
                                value={data.appointment_phone}
                                onChange={(event) => setData('appointment_phone', event.target.value)}
                                className={inputClass}
                                placeholder="Number for appointment button"
                            />
                        </Field>

                        <Field label="Email" error={errors.email}>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field label="Bio" error={errors.bio}>
                        <textarea
                            value={data.bio}
                            onChange={(event) => setData('bio', event.target.value)}
                            rows="4"
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Bio (Bangla)" error={errors.bio_bn}>
                        <textarea
                            value={data.bio_bn}
                            onChange={(event) => setData('bio_bn', event.target.value)}
                            rows="4"
                            className={inputClass}
                        />
                    </Field>

                    <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-base font-semibold text-gray-900">Homepage Hero Section</h3>
                        <p className="mt-1 text-sm text-gray-500">These fields control this doctor's homepage slider text.</p>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <Field label="Hero Title Line 1" error={errors.hero_title_1}>
                                <input
                                    type="text"
                                    value={data.hero_title_1}
                                    onChange={(event) => setData('hero_title_1', event.target.value)}
                                    className={inputClass}
                                    placeholder="Professional"
                                />
                            </Field>

                            <Field label="Hero Title Line 2 (Large)" error={errors.hero_title_2}>
                                <input
                                    type="text"
                                    value={data.hero_title_2}
                                    onChange={(event) => setData('hero_title_2', event.target.value)}
                                    className={inputClass}
                                    placeholder="Doctor"
                                />
                            </Field>

                            <Field label="Hero Title Line 3" error={errors.hero_title_3}>
                                <input
                                    type="text"
                                    value={data.hero_title_3}
                                    onChange={(event) => setData('hero_title_3', event.target.value)}
                                    className={inputClass}
                                    placeholder="Specialist"
                                />
                            </Field>

                            <Field label="Hero Subtitle" error={errors.hero_subtitle}>
                                <input
                                    type="text"
                                    value={data.hero_subtitle}
                                    onChange={(event) => setData('hero_subtitle', event.target.value)}
                                    className={inputClass}
                                    placeholder="We Care about your Health"
                                />
                            </Field>
                        </div>

                        <div className="mt-4">
                            <Field label="Hero Description" error={errors.hero_description}>
                                <textarea
                                    value={data.hero_description}
                                    onChange={(event) => setData('hero_description', event.target.value)}
                                    rows="4"
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        <div className="mt-6 border-t border-gray-100 pt-4">
                            <h4 className="text-sm font-semibold text-gray-700">Bangla Hero Text</h4>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Field label="Hero Title Line 1 (Bangla)" error={errors.hero_title_1_bn}>
                                    <input
                                        type="text"
                                        value={data.hero_title_1_bn}
                                        onChange={(event) => setData('hero_title_1_bn', event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Hero Title Line 2 (Bangla)" error={errors.hero_title_2_bn}>
                                    <input
                                        type="text"
                                        value={data.hero_title_2_bn}
                                        onChange={(event) => setData('hero_title_2_bn', event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Hero Title Line 3 (Bangla)" error={errors.hero_title_3_bn}>
                                    <input
                                        type="text"
                                        value={data.hero_title_3_bn}
                                        onChange={(event) => setData('hero_title_3_bn', event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>

                                <Field label="Hero Subtitle (Bangla)" error={errors.hero_subtitle_bn}>
                                    <input
                                        type="text"
                                        value={data.hero_subtitle_bn}
                                        onChange={(event) => setData('hero_subtitle_bn', event.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                            </div>

                            <div className="mt-4">
                                <Field label="Hero Description (Bangla)" error={errors.hero_description_bn}>
                                    <textarea
                                        value={data.hero_description_bn}
                                        onChange={(event) => setData('hero_description_bn', event.target.value)}
                                        rows="4"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 p-4">
                        <div className="mb-4 h-40 w-40 overflow-hidden rounded-full bg-gray-100">
                            {photoUrl ? (
                                <img src={photoUrl} alt={data.name || doctor?.name || 'Doctor photo'} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                                    No Photo
                                </div>
                            )}
                        </div>

                        <Field label="Doctor Photo" error={errors.photo}>
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => setData('photo', event.target.files[0] || null)}
                                className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-gray-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700"
                            />
                        </Field>

                        {data.photo && (
                            <p className="mt-2 text-sm text-gray-500">Selected: {data.photo.name}</p>
                        )}

                        {progress && (
                            <div className="mt-4">
                                <div className="h-2 overflow-hidden rounded bg-gray-100">
                                    <div className="h-full bg-gray-800" style={{ width: `${progress.percentage}%` }} />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{progress.percentage}% uploaded</p>
                            </div>
                        )}
                    </div>

                    <label className="inline-flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={data.is_active}
                            onChange={(event) => setData('is_active', event.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Show on public website</span>
                    </label>

                    <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-base font-semibold text-gray-900">Social Media Links</h3>
                        <div className="mt-4 space-y-4">
                            <Field label="Facebook URL" icon="facebook" error={errors.social_facebook}>
                                <input
                                    type="url"
                                    value={data.social_facebook}
                                    onChange={(event) => setData('social_facebook', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://facebook.com/..."
                                />
                            </Field>

                            <Field label="Twitter / X URL" icon="x" error={errors.social_twitter}>
                                <input
                                    type="url"
                                    value={data.social_twitter}
                                    onChange={(event) => setData('social_twitter', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://twitter.com/..."
                                />
                            </Field>

                            <Field label="YouTube URL" icon="youtube" error={errors.social_youtube}>
                                <input
                                    type="url"
                                    value={data.social_youtube}
                                    onChange={(event) => setData('social_youtube', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://youtube.com/..."
                                />
                            </Field>

                            <Field label="Instagram URL" icon="instagram" error={errors.social_instagram}>
                                <input
                                    type="url"
                                    value={data.social_instagram}
                                    onChange={(event) => setData('social_instagram', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://instagram.com/..."
                                />
                            </Field>

                            <Field label="LinkedIn URL" icon="linkedin" error={errors.social_linkedin}>
                                <input
                                    type="url"
                                    value={data.social_linkedin}
                                    onChange={(event) => setData('social_linkedin', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </Field>

                            <Field label="WhatsApp Link or Number" icon="whatsapp" error={errors.social_whatsapp}>
                                <input
                                    type="text"
                                    value={data.social_whatsapp}
                                    onChange={(event) => setData('social_whatsapp', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://wa.me/... or phone number"
                                />
                            </Field>

                            <Field label="TikTok URL" icon="tiktok" error={errors.social_tiktok}>
                                <input
                                    type="url"
                                    value={data.social_tiktok}
                                    onChange={(event) => setData('social_tiktok', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://tiktok.com/@..."
                                />
                            </Field>

                            <Field label="Telegram URL" icon="telegram" error={errors.social_telegram}>
                                <input
                                    type="url"
                                    value={data.social_telegram}
                                    onChange={(event) => setData('social_telegram', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://t.me/..."
                                />
                            </Field>

                            <Field label="Website URL" icon="website" error={errors.social_website}>
                                <input
                                    type="url"
                                    value={data.social_website}
                                    onChange={(event) => setData('social_website', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://example.com"
                                />
                            </Field>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <PrimaryButton type="submit" disabled={processing}>
                    {processing ? 'Saving...' : submitLabel}
                </PrimaryButton>
                <Link
                    href={route('admin.doctors.index')}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 shadow-sm transition duration-150 ease-in-out hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    Cancel
                </Link>
            </div>
        </form>
    );
}
