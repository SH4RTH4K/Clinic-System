import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormField from '@/Components/FormField';
import PageHeader from '@/Components/PageHeader';
import { Head, Link, useForm } from '@inertiajs/react';

const getLocalDateValue = () => {
    const currentDate = new Date();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    return `${currentDate.getFullYear()}-${month}-${day}`;
};

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        phone: '',
        preferred_date: '',
        preferred_time: '',
        message: '',
        source: 'phone',
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('admin.appointment_requests.store'));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Record Appointment Request" />
            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title="Record Appointment Request"
                    subtitle="Enter the details provided by the patient. This records the requested slot, not a confirmed booking."
                    actions={(
                        <Link
                            href={route('admin.appointment_requests.index')}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            Back to Requests
                        </Link>
                    )}
                />

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="note">
                    Confirm the patient’s preferred slot against the clinic schedule before marking the request as scheduled. Doctor availability is not checked automatically.
                </div>

                <form onSubmit={submit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <FormField id="name" label="Patient name" required error={errors.name}>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                maxLength={255}
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                aria-invalid={Boolean(errors.name)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </FormField>

                        <FormField id="phone" label="Phone number" required error={errors.phone} helpText="Use a Bangladesh mobile number, for example 01XXXXXXXXX or +8801XXXXXXXXX.">
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                autoComplete="tel"
                                required
                                maxLength={20}
                                value={data.phone}
                                onChange={(event) => setData('phone', event.target.value)}
                                aria-invalid={Boolean(errors.phone)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </FormField>

                        <FormField id="source" label="Request source" required error={errors.source}>
                            <select
                                id="source"
                                name="source"
                                required
                                value={data.source}
                                onChange={(event) => setData('source', event.target.value)}
                                aria-invalid={Boolean(errors.source)}
                                className="w-full rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="phone">Phone call</option>
                                <option value="walk_in">Walk-in</option>
                            </select>
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField id="preferred_date" label="Requested date" error={errors.preferred_date}>
                                <input
                                    id="preferred_date"
                                    name="preferred_date"
                                    type="date"
                                    min={getLocalDateValue()}
                                    value={data.preferred_date}
                                    onChange={(event) => setData('preferred_date', event.target.value)}
                                    aria-invalid={Boolean(errors.preferred_date)}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                />
                            </FormField>
                            <FormField id="preferred_time" label="Requested time" error={errors.preferred_time}>
                                <input
                                    id="preferred_time"
                                    name="preferred_time"
                                    type="time"
                                    value={data.preferred_time}
                                    onChange={(event) => setData('preferred_time', event.target.value)}
                                    aria-invalid={Boolean(errors.preferred_time)}
                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                />
                            </FormField>
                        </div>
                    </div>

                    <FormField id="message" label="Request notes" error={errors.message} helpText="Keep notes limited to appointment logistics; do not enter clinical notes here.">
                        <textarea
                            id="message"
                            name="message"
                            rows={3}
                            maxLength={1000}
                            value={data.message}
                            onChange={(event) => setData('message', event.target.value)}
                            aria-invalid={Boolean(errors.message)}
                            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                    </FormField>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                        <Link
                            href={route('admin.appointment_requests.index')}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? 'Saving…' : 'Record Request'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
