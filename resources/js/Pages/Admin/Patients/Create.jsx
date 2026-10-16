import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

export default function Create({ defaults }) {
    const { data, setData, post, errors, processing } = useForm({
        name: defaults?.name || '', guardian_name: '', gender: 'male', age_years: '', dob: '', phone: defaults?.phone || '', address: '', blood_group: '', known_allergies: '', referred_by: ''
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.patients.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Create Patient</h2>}>
            <Head title="Create Patient" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm">Name</label>
                                <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="w-full rounded border-gray-300" required />
                            </div>
                            <div>
                                <label className="block text-sm">Gender</label>
                                <select value={data.gender} onChange={e => setData('gender', e.target.value)} className="w-full rounded border-gray-300">
                                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm">Age (Years)</label>
                                <input type="number" value={data.age_years} onChange={e => setData('age_years', e.target.value)} className="w-full rounded border-gray-300" />
                            </div>
                            <div>
                                <label className="block text-sm">Phone</label>
                                <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="w-full rounded border-gray-300" />
                            </div>
                            <div className="col-span-2">
                                <button type="submit" disabled={processing} className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}