import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DoctorForm from '@/Pages/Admin/Doctors/DoctorForm';
import { Head, useForm } from '@inertiajs/react';

export default function Edit({ doctor }) {
    const { data, setData, post, processing, errors, progress } = useForm({
        _method: 'put',
        name: doctor.name || '',
        name_bn: doctor.name_bn || '',
        credentials: doctor.credentials || '',
        credentials_bn: doctor.credentials_bn || '',
        specialty: doctor.specialty || '',
        specialty_bn: doctor.specialty_bn || '',
        bio: doctor.bio || '',
        bio_bn: doctor.bio_bn || '',
        govt_reg_no: doctor.govt_reg_no || '',
        phone: doctor.phone || '',
        appointment_phone: doctor.appointment_phone || '',
        email: doctor.email || '',
        hero_title_1: doctor.hero_title_1 || '',
        hero_title_2: doctor.hero_title_2 || '',
        hero_title_3: doctor.hero_title_3 || '',
        hero_subtitle: doctor.hero_subtitle || '',
        hero_description: doctor.hero_description || '',
        hero_title_1_bn: doctor.hero_title_1_bn || '',
        hero_title_2_bn: doctor.hero_title_2_bn || '',
        hero_title_3_bn: doctor.hero_title_3_bn || '',
        hero_subtitle_bn: doctor.hero_subtitle_bn || '',
        hero_description_bn: doctor.hero_description_bn || '',
        social_facebook: doctor.social_facebook || '',
        social_twitter: doctor.social_twitter || '',
        social_youtube: doctor.social_youtube || '',
        social_instagram: doctor.social_instagram || '',
        social_linkedin: doctor.social_linkedin || '',
        social_whatsapp: doctor.social_whatsapp || '',
        social_tiktok: doctor.social_tiktok || '',
        social_telegram: doctor.social_telegram || '',
        social_website: doctor.social_website || '',
        is_active: Boolean(doctor.is_active),
        sort_order: doctor.sort_order ?? 0,
        photo: null,
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('admin.doctors.update', doctor.id), { forceFormData: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Edit Doctor</h2>}>
            <Head title="Edit Doctor" />
            <div className="py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <DoctorForm
                            data={data}
                            setData={setData}
                            errors={errors}
                            processing={processing}
                            progress={progress}
                            onSubmit={submit}
                            submitLabel="Update Doctor"
                            doctor={doctor}
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
