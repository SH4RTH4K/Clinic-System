import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import { Link } from '@inertiajs/react';

const inputClass = 'w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500';
const labelClass = 'block text-sm font-medium text-gray-700';

function Field({ label, error, children }) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="mt-1">{children}</div>
            <InputError message={error} className="mt-2" />
        </div>
    );
}

export default function DoctorForm({ data, setData, errors, processing, progress, onSubmit, submitLabel, doctor = null }) {
    const photoUrl = doctor?.photo_path ? `/storage/${doctor.photo_path}` : null;

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
                                <img src={photoUrl} alt={doctor.name} className="h-full w-full object-cover" />
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
                            <Field label="Facebook URL" error={errors.social_facebook}>
                                <input
                                    type="url"
                                    value={data.social_facebook}
                                    onChange={(event) => setData('social_facebook', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://facebook.com/..."
                                />
                            </Field>

                            <Field label="Twitter / X URL" error={errors.social_twitter}>
                                <input
                                    type="url"
                                    value={data.social_twitter}
                                    onChange={(event) => setData('social_twitter', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://twitter.com/..."
                                />
                            </Field>

                            <Field label="YouTube URL" error={errors.social_youtube}>
                                <input
                                    type="url"
                                    value={data.social_youtube}
                                    onChange={(event) => setData('social_youtube', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://youtube.com/..."
                                />
                            </Field>

                            <Field label="Instagram URL" error={errors.social_instagram}>
                                <input
                                    type="url"
                                    value={data.social_instagram}
                                    onChange={(event) => setData('social_instagram', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://instagram.com/..."
                                />
                            </Field>

                            <Field label="LinkedIn URL" error={errors.social_linkedin}>
                                <input
                                    type="url"
                                    value={data.social_linkedin}
                                    onChange={(event) => setData('social_linkedin', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </Field>

                            <Field label="WhatsApp Link or Number" error={errors.social_whatsapp}>
                                <input
                                    type="text"
                                    value={data.social_whatsapp}
                                    onChange={(event) => setData('social_whatsapp', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://wa.me/... or phone number"
                                />
                            </Field>

                            <Field label="TikTok URL" error={errors.social_tiktok}>
                                <input
                                    type="url"
                                    value={data.social_tiktok}
                                    onChange={(event) => setData('social_tiktok', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://tiktok.com/@..."
                                />
                            </Field>

                            <Field label="Telegram URL" error={errors.social_telegram}>
                                <input
                                    type="url"
                                    value={data.social_telegram}
                                    onChange={(event) => setData('social_telegram', event.target.value)}
                                    className={inputClass}
                                    placeholder="https://t.me/..."
                                />
                            </Field>

                            <Field label="Website URL" error={errors.social_website}>
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
