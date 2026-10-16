import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DoctorForm from '@/Pages/Admin/Doctors/DoctorForm';
import { Head, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, errors, progress } = useForm({
        name: '',
        name_bn: '',
        credentials: '',
        credentials_bn: '',
        specialty: '',
        specialty_bn: '',
        bio: '',
        bio_bn: '',
        govt_reg_no: '',
        phone: '',
        appointment_phone: '',
        email: '',
        hero_title_1: '',
        hero_title_2: '',
        hero_title_3: '',
        hero_subtitle: '',
        hero_description: '',
        hero_title_1_bn: '',
        hero_title_2_bn: '',
        hero_title_3_bn: '',
        hero_subtitle_bn: '',
        hero_description_bn: '',
        social_facebook: '',
        social_twitter: '',
        social_youtube: '',
        social_instagram: '',
        social_linkedin: '',
        social_whatsapp: '',
        social_tiktok: '',
        social_telegram: '',
        social_website: '',
        is_active: true,
        sort_order: 0,
        photo: null,
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('admin.doctors.store'), { forceFormData: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Add Doctor</h2>}>
            <Head title="Add Doctor" />
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
                            submitLabel="Save Doctor"
                        />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
