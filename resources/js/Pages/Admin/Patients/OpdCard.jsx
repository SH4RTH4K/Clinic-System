import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function OpdCard({ patient = {}, clinic = {}, barcodeSvg = '', issuedAt = '' }) {
    const handlePrint = () => {
        window.print();
    };

    const patientIdentifier = patient?.patient_identifier || patient?.patient_code || (patient?.id ? `P-${String(patient.id).padStart(5, '0')}` : 'N/A');

    return (
        <AuthenticatedLayout>
            <Head title={`OPD Card - ${patientIdentifier}`} />

            {/* Screen Actions - Hidden during Print */}
            <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 print:hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <Link
                            href={patient?.id ? route('admin.patients.show', patient.id) : route('admin.patients.index')}
                            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Patient
                        </Link>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-semibold text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" />
                                <line x1="2" y1="10" x2="22" y2="10" strokeWidth="2" />
                            </svg>
                            <span>Patient OPD Card Preview</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        {patient?.id && (
                            <a
                                href={route('admin.patients.opd_card', { patient: patient.id, format: 'pdf' })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition"
                            >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download PDF
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg shadow-xs transition"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Print Card
                        </button>
                    </div>
                </div>
            </div>

            {/* Printable OPD Card Area */}
            <div className="max-w-md mx-auto p-4 print:p-0 print:max-w-none">
                <div className="opd-card-wrapper bg-white dark:bg-gray-900 border-2 border-teal-600 rounded-2xl shadow-lg p-6 print:shadow-none print:border-2 print:border-black print:rounded-xl print:m-0 print:w-[380px] print:mx-auto">
                    {/* Header */}
                    <div className="border-b-2 border-teal-600 pb-3 mb-4 text-center">
                        {clinic?.logo_url && (
                            <img
                                src={clinic.logo_url}
                                alt={clinic?.name || 'Clinic Logo'}
                                className="h-9 mx-auto mb-1.5 object-contain"
                            />
                        )}
                        <h2 className="text-lg font-bold text-teal-800 dark:text-teal-300 tracking-wide uppercase">
                            {clinic?.name || 'Clinic Care'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {clinic?.address || ''}
                            {clinic?.phone && ` • Tel: ${clinic.phone}`}
                        </p>
                        <div className="mt-2 inline-block bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                            Patient OPD &amp; Registration Card
                        </div>
                    </div>

                    {/* Patient Core Info + Photo */}
                    <div className="flex gap-4 items-start mb-4">
                        {/* Avatar */}
                        <div className="w-24 h-28 flex-shrink-0 border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            {patient?.photo_url ? (
                                <img
                                    src={patient.photo_url}
                                    alt={patient?.name || 'Patient'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center p-2 text-gray-400">
                                    <svg className="w-8 h-8 mx-auto mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="text-[10px] uppercase font-semibold">No Photo</span>
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="inline-block bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded text-xs font-mono font-bold mb-1">
                                {patientIdentifier}
                            </div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                                {patient?.name || 'Unnamed Patient'}
                            </h3>

                            <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Age / Sex:</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">
                                        {[
                                            patient?.age_years ? `${patient.age_years}Y` : null,
                                            patient?.age_months ? `${patient.age_months}M` : null,
                                        ].filter(Boolean).join(' ') || 'N/A'}{' '}
                                        / <span className="capitalize">{patient?.gender || 'N/A'}</span>
                                    </span>
                                </div>

                                {patient?.blood_group && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 flex items-center">
                                            <svg className="w-3 h-3 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 2a1 1 0 01.8.4l4.5 6a5.5 5.5 0 11-10.6 0l4.5-6A1 1 0 0110 2z" clipRule="evenodd" />
                                            </svg>
                                            Blood Group:
                                        </span>
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            {patient.blood_group}
                                        </span>
                                    </div>
                                )}

                                {patient?.phone && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 flex items-center">
                                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            Phone:
                                        </span>
                                        <span className="font-medium">{patient.phone}</span>
                                    </div>
                                )}

                                {patient?.guardian_name && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500 capitalize">
                                            {patient?.guardian_relationship || 'Guardian'}:
                                        </span>
                                        <span className="font-medium truncate max-w-[130px]">
                                            {patient.guardian_name}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                                    <span className="text-gray-500 flex items-center">
                                        <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Reg. Date:
                                    </span>
                                    <span>{patient?.created_at || issuedAt}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Barcode Section */}
                    <div className="border-t border-dashed border-gray-300 dark:border-gray-700 pt-3 text-center">
                        <div
                            className="w-full flex justify-center items-center py-1 overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: barcodeSvg || '' }}
                        />
                        <div className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300 tracking-widest mt-1">
                            {patientIdentifier}
                        </div>
                    </div>

                    {/* Notice */}
                    <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-center text-[10px] text-gray-400">
                        Please present this card during every visit &amp; consultation.
                        {clinic?.phone && ` Emergency: ${clinic.phone}`}
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    nav, header, aside, .print\\:hidden {
                        display: none !important;
                    }
                    .opd-card-wrapper {
                        page-break-inside: avoid;
                        width: 360px !important;
                        margin: 20px auto !important;
                        border: 2px solid #000000 !important;
                        box-shadow: none !important;
                        border-radius: 12px !important;
                    }
                }
            `}</style>
        </AuthenticatedLayout>
    );
}
