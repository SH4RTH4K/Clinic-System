import React, { useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';

export default function PrintToken({ token, settings, aheadCount }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const clinicName = settings?.clinic_name_en || settings?.clinic_name || 'RemediQ Clinic';
    const clinicNameBn = settings?.clinic_name_bn || '';
    const phone = settings?.phone || '';

    return (
        <div className="min-h-screen bg-neutral-100 p-4 print:bg-white print:p-0 flex flex-col items-center">
            <Head title={`Token ${token.token_code} - ${clinicName}`} />

            {/* Screen Controls */}
            <div className="w-full max-w-[80mm] mb-4 flex items-center justify-between print:hidden gap-2">
                <Link
                    href={route('admin.queue.index')}
                    className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Queue
                </Link>
                <div className="flex items-center gap-1.5">
                    <Link
                        href={route('admin.queue.tokens.create')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-50 text-neutral-700 rounded-md text-xs font-semibold border border-neutral-300 shadow-sm transition"
                    >
                        + Issue Next
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                    </button>
                </div>
            </div>

            {/* 80mm POS Thermal Slip */}
            <div className="w-full max-w-[80mm] bg-white p-5 border border-neutral-300 rounded-lg shadow-sm print:border-none print:shadow-none print:p-2 text-center text-neutral-900 font-sans">
                {/* Header */}
                <div className="border-b border-dashed border-neutral-400 pb-3 mb-3">
                    <h1 className="text-xl font-bold tracking-tight uppercase">{clinicName}</h1>
                    {clinicNameBn && (
                        <p className="text-sm font-semibold text-neutral-700 mt-0.5">{clinicNameBn}</p>
                    )}
                    {phone && (
                        <p className="text-xs text-neutral-500 mt-0.5">Hotline: {phone}</p>
                    )}
                </div>

                {/* Big Token Number */}
                <div className="my-3 py-2 bg-neutral-50 rounded border border-neutral-200">
                    <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block">Queue Token / টোকেন</span>
                    <span className="text-4xl font-extrabold tracking-wider block text-neutral-900 mt-1">{token.token_code}</span>
                    {token.priority === 'urgent' && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded uppercase">
                            URGENT / জরুরি
                        </span>
                    )}
                </div>

                {/* Details */}
                <div className="text-xs space-y-1.5 text-left border-t border-b border-dashed border-neutral-400 py-3 my-3">
                    <div className="flex justify-between">
                        <span className="text-neutral-500">Patient / রোগী:</span>
                        <span className="font-semibold text-neutral-800">{token.patient_name}</span>
                    </div>
                    {token.patient_phone && (
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Mobile:</span>
                            <span className="font-mono text-neutral-700">{token.patient_phone}</span>
                        </div>
                    )}
                    {token.doctor && (
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Doctor / ডাক্তার:</span>
                            <span className="font-semibold text-neutral-800">{token.doctor.name}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-neutral-500">Room / চেম্বার:</span>
                        <span className="font-bold text-neutral-900">{token.service_room || 'Consultation Room'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-500">Date & Time:</span>
                        <span className="text-neutral-700">
                            {new Date(token.created_at).toLocaleDateString()} {new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Queue position notice */}
                <div className="bg-neutral-50 p-2 rounded text-xs text-neutral-600 mb-3">
                    <p className="font-medium">
                        Ahead of you / অপেক্ষারত: <strong className="text-neutral-900">{aheadCount} patient(s)</strong>
                    </p>
                </div>

                {/* Instructions */}
                <div className="text-[11px] text-neutral-500 leading-tight">
                    <p>Please watch the waiting room TV display board.</p>
                    <p className="mt-1 font-bangla">ডিসপ্লে বোর্ডে আপনার টোকেন ডাকার জন্য অপেক্ষা করুন।</p>
                </div>

                <div className="mt-4 pt-2 border-t border-dashed border-neutral-300 text-[10px] text-neutral-400">
                    Thank you • RemediQ Practice
                </div>
            </div>
        </div>
    );
}
