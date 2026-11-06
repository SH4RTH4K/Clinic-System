import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import StatusBadge from '@/Components/StatusBadge';
import usePermission from '@/Components/usePermission';
import { Head, Link } from '@inertiajs/react';

function Detail({ label, value, multiline = false }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className={`mt-1 text-sm text-gray-900 ${multiline ? 'whitespace-pre-wrap' : ''}`}>
                {value === null || value === undefined || value === '' ? '—' : value}
            </dd>
        </div>
    );
}

export default function Show({ doctor }) {
    const canUpdate = usePermission()('doctors.update');

    return (
        <AuthenticatedLayout>
            <Head title={`Doctor - ${doctor.name}`} />
            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title={doctor.name}
                    subtitle={[doctor.credentials, doctor.specialty].filter(Boolean).join(' • ') || 'Doctor profile details'}
                    action={
                        <div className="flex gap-2">
                            <Link
                                href={route('admin.doctors.index')}
                                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Back to Doctors
                            </Link>
                            {canUpdate ? (
                                <Link
                                    href={route('admin.doctors.edit', doctor.id)}
                                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                                >
                                    Edit Doctor
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white opacity-50"
                                >
                                    Edit Doctor
                                </button>
                            )}
                        </div>
                    }
                />

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            {doctor.photo_path ? (
                                <img src={route('admin.doctors.photo', doctor.id)} alt={doctor.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-400">
                                    {(doctor.name || 'D').charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{doctor.name}</h2>
                                {doctor.name_bn && <p className="text-sm text-gray-600">{doctor.name_bn}</p>}
                            </div>
                            <StatusBadge status={doctor.is_active ? 'active' : 'inactive'} />
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 border-b border-gray-100 pb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Professional details</h2>
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail label="Credentials" value={doctor.credentials} />
                        <Detail label="Credentials (Bangla)" value={doctor.credentials_bn} />
                        <Detail label="Specialty" value={doctor.specialty} />
                        <Detail label="Specialty (Bangla)" value={doctor.specialty_bn} />
                        <Detail label="Government registration number" value={doctor.govt_reg_no} />
                        <Detail label="Display order" value={doctor.sort_order ?? 0} />
                    </dl>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 border-b border-gray-100 pb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Contact and biography</h2>
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail label="Phone" value={doctor.phone} />
                        <Detail label="Appointment phone" value={doctor.appointment_phone} />
                        <Detail label="Email" value={doctor.email} />
                        <Detail label="Biography" value={doctor.bio} multiline />
                        <Detail label="Biography (Bangla)" value={doctor.bio_bn} multiline />
                    </dl>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 border-b border-gray-100 pb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Public profile content</h2>
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Detail label="Hero title 1" value={doctor.hero_title_1} />
                        <Detail label="Hero title 2" value={doctor.hero_title_2} />
                        <Detail label="Hero title 3" value={doctor.hero_title_3} />
                        <Detail label="Hero subtitle" value={doctor.hero_subtitle} />
                        <Detail label="Hero description" value={doctor.hero_description} multiline />
                        <Detail label="Hero title 1 (Bangla)" value={doctor.hero_title_1_bn} />
                        <Detail label="Hero title 2 (Bangla)" value={doctor.hero_title_2_bn} />
                        <Detail label="Hero title 3 (Bangla)" value={doctor.hero_title_3_bn} />
                        <Detail label="Hero subtitle (Bangla)" value={doctor.hero_subtitle_bn} />
                        <Detail label="Hero description (Bangla)" value={doctor.hero_description_bn} multiline />
                    </dl>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 border-b border-gray-100 pb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Social profiles</h2>
                    <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail label="Facebook" value={doctor.social_facebook} />
                        <Detail label="Twitter / X" value={doctor.social_twitter} />
                        <Detail label="YouTube" value={doctor.social_youtube} />
                        <Detail label="Instagram" value={doctor.social_instagram} />
                        <Detail label="LinkedIn" value={doctor.social_linkedin} />
                        <Detail label="WhatsApp" value={doctor.social_whatsapp} />
                        <Detail label="TikTok" value={doctor.social_tiktok} />
                        <Detail label="Telegram" value={doctor.social_telegram} />
                        <Detail label="Website" value={doctor.social_website} />
                    </dl>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
