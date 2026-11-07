import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import FormField from '@/Components/FormField';
import PageHeader from '@/Components/PageHeader';
import StatusBadge from '@/Components/StatusBadge';
import { Head, Link, useForm } from '@inertiajs/react';

const formatDate = (value) => {
    if (!value) return 'Not provided';

    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
};

const formatSlot = (date, time) => {
    if (!date && !time) return 'No confirmed slot';
    return `${date ? formatDate(date) : 'Date not set'}${time ? ` · ${String(time).slice(0, 5)}` : ''}`;
};

const eventLabel = (type) => ({
    created: 'Recorded by staff',
    submitted: 'Submitted from website',
    scheduled: 'Appointment scheduled',
    rescheduled: 'Appointment rescheduled',
    status_changed: 'Request status updated',
}[type] || 'Appointment request updated');

const getLocalDateValue = () => {
    const currentDate = new Date();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');

    return `${currentDate.getFullYear()}-${month}-${day}`;
};

export default function Edit({ appointmentRequest }) {
    const { data, setData, put, processing, errors } = useForm({
        status: appointmentRequest.status,
        scheduled_date: appointmentRequest.scheduled_date || '',
        scheduled_time: appointmentRequest.scheduled_time || '',
        reason: '',
    });

    const isRescheduling = appointmentRequest.status === 'scheduled'
        && (data.scheduled_date !== (appointmentRequest.scheduled_date || '')
            || data.scheduled_time !== (appointmentRequest.scheduled_time || ''));

    const submit = (event) => {
        event.preventDefault();
        put(route('admin.appointment_requests.update', appointmentRequest.id), { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manage Appointment Request" />
            <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <PageHeader
                    title="Manage Appointment Request"
                    subtitle="Keep the patient’s original request unchanged and record any confirmed or replacement slot separately."
                    actions={(
                        <Link
                            href={route('admin.appointment_requests.index')}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                            Back to Requests
                        </Link>
                    )}
                />

                <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="request-details-heading">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 id="request-details-heading" className="text-lg font-semibold text-gray-900">Original request</h2>
                        <StatusBadge status={appointmentRequest.status} />
                    </div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Patient</dt><dd className="mt-1 font-medium text-gray-900">{appointmentRequest.name}</dd></div>
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</dt><dd className="mt-1 font-medium text-gray-900">{appointmentRequest.phone}</dd></div>
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Source</dt><dd className="mt-1 font-medium text-gray-900">{appointmentRequest.source === 'walk_in' ? 'Walk-in' : appointmentRequest.source === 'phone' ? 'Phone call' : 'Website'}</dd></div>
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Requested date and time</dt><dd className="mt-1 font-medium text-gray-900">{formatSlot(appointmentRequest.preferred_date, appointmentRequest.preferred_time)}</dd></div>
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Recorded by</dt><dd className="mt-1 font-medium text-gray-900">{appointmentRequest.creator_name || 'Patient / public website'}</dd></div>
                        <div><dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Last handled by</dt><dd className="mt-1 font-medium text-gray-900">{appointmentRequest.handler_name || 'Not handled yet'}</dd></div>
                        {appointmentRequest.message && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Request notes</dt>
                                <dd className="mt-1 whitespace-pre-wrap text-gray-800">{appointmentRequest.message}</dd>
                            </div>
                        )}
                    </dl>
                </section>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="note">
                    Confirm the new date and time with the patient and check the clinic schedule before setting the status to Scheduled. Doctor availability is not checked automatically.
                </div>

                <form onSubmit={submit} className="space-y-6 rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900">Appointment scheduling</h2>
                    <div className="grid gap-5 sm:grid-cols-3">
                        <FormField id="status" label="Request status" required error={errors.status}>
                            <select
                                id="status"
                                name="status"
                                required
                                value={data.status}
                                onChange={(event) => setData('status', event.target.value)}
                                aria-invalid={Boolean(errors.status)}
                                className="w-full rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="pending">Pending</option>
                                <option value="contacted">Contacted</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </FormField>
                        <FormField id="scheduled_date" label="Confirmed date" required={data.status === 'scheduled'} error={errors.scheduled_date}>
                            <input
                                id="scheduled_date"
                                name="scheduled_date"
                                type="date"
                                min={data.status === 'scheduled' ? getLocalDateValue() : undefined}
                                required={data.status === 'scheduled'}
                                value={data.scheduled_date}
                                onChange={(event) => setData('scheduled_date', event.target.value)}
                                aria-invalid={Boolean(errors.scheduled_date)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </FormField>
                        <FormField id="scheduled_time" label="Confirmed time" required={data.status === 'scheduled'} error={errors.scheduled_time}>
                            <input
                                id="scheduled_time"
                                name="scheduled_time"
                                type="time"
                                required={data.status === 'scheduled'}
                                value={data.scheduled_time}
                                onChange={(event) => setData('scheduled_time', event.target.value)}
                                aria-invalid={Boolean(errors.scheduled_time)}
                                className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </FormField>
                    </div>

                    <FormField
                        id="reason"
                        label={isRescheduling ? 'Reschedule reason' : 'Update note (optional)'}
                        required={isRescheduling}
                        error={errors.reason}
                        helpText={isRescheduling ? 'A reason is required so the schedule change is clear in the history.' : 'This note is saved in the appointment history when the status or slot changes.'}
                    >
                        <textarea
                            id="reason"
                            name="reason"
                            rows={2}
                            maxLength={1000}
                            required={isRescheduling}
                            value={data.reason}
                            onChange={(event) => setData('reason', event.target.value)}
                            aria-invalid={Boolean(errors.reason)}
                            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                    </FormField>

                    <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                        Current confirmed slot: <span className="font-semibold">{formatSlot(appointmentRequest.scheduled_date, appointmentRequest.scheduled_time)}</span>
                    </div>

                    <div className="flex justify-end border-t border-gray-100 pt-5">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing ? 'Saving…' : 'Save appointment update'}
                        </button>
                    </div>
                </form>

                <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-xs sm:p-6" aria-labelledby="appointment-history-heading">
                    <h2 id="appointment-history-heading" className="text-lg font-semibold text-gray-900">Appointment history</h2>
                    {appointmentRequest.events.length === 0 ? (
                        <p className="text-sm text-gray-600">No staff updates have been recorded for this request yet.</p>
                    ) : (
                        <ol className="space-y-3">
                            {appointmentRequest.events.map((event) => (
                                <li key={event.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{eventLabel(event.event_type)}</p>
                                            <p className="mt-1 text-xs text-gray-600">
                                                {event.performed_by_name || 'Website visitor'}
                                                {event.created_at ? ` · ${new Date(event.created_at).toLocaleString()}` : ''}
                                            </p>
                                        </div>
                                        {event.new_status && <StatusBadge status={event.new_status} />}
                                    </div>
                                    {(event.previous_scheduled_date || event.new_scheduled_date) && (
                                        <p className="mt-2 text-sm text-gray-700">
                                            {formatSlot(event.previous_scheduled_date, event.previous_scheduled_time)}
                                            {' → '}
                                            {formatSlot(event.new_scheduled_date, event.new_scheduled_time)}
                                        </p>
                                    )}
                                    {event.reason && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">Reason: {event.reason}</p>}
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
