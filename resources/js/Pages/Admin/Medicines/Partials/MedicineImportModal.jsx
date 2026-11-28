import Modal from '@/Components/Modal';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function MedicineImportModal({ show, onClose }) {
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState('');
    const [selectedFileSize, setSelectedFileSize] = useState('');

    const { data, setData, post, processing, errors, reset, clearErrors, progress } = useForm({
        file: null,
        duplicate_strategy: 'skip',
    });

    const handleFileChange = (file) => {
        if (!file) return;
        setData('file', file);
        setSelectedFileName(file.name);
        setSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');
        clearErrors('file');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.file) {
            return;
        }

        post(route('admin.medicines.import'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setSelectedFileName('');
                setSelectedFileSize('');
                onClose();
            },
        });
    };

    const handleClose = () => {
        if (processing) return;
        reset();
        setSelectedFileName('');
        setSelectedFileSize('');
        clearErrors();
        onClose();
    };

    return (
        <Modal show={show} onClose={handleClose} maxWidth="xl">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg border border-primary-200 shadow-2xs">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                Import Homeopathic Medicines (রেমেডি ইমপোর্ট)
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Import remedies from CSV or JSON catalog with intelligent duplicate controls
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={processing}
                        className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 transition"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                    {/* Sample Template Download Notice */}
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 text-sky-800">
                            <svg className="w-4 h-4 text-sky-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            <span>
                                <strong>Need the correct format?</strong> Download our official sample template with required headers.
                            </span>
                        </div>
                        <a
                            href={route('admin.medicines.import_template')}
                            className="inline-flex items-center gap-1.5 bg-white hover:bg-sky-100 text-sky-700 font-bold px-3 py-1.5 rounded-lg border border-sky-300 shadow-2xs shrink-0 transition"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Template CSV
                        </a>
                    </div>

                    {/* File Dropzone */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Select File (.csv, .json) <span className="text-rose-500">*</span>
                        </label>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                                dragOver
                                    ? 'border-primary-500 bg-primary-50/50'
                                    : errors.file
                                        ? 'border-rose-300 bg-rose-50/30'
                                        : 'border-gray-300 bg-gray-50/50 hover:bg-gray-100/60'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.json,.txt"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileChange(e.target.files[0]);
                                    }
                                }}
                            />

                            {selectedFileName ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                        📄
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-900">{selectedFileName}</p>
                                        <p className="text-xs text-gray-500">{selectedFileSize} · Click or drop to change</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs font-semibold text-gray-700">
                                        Click to browse or drag & drop CSV / JSON file
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        Supported format: CSV (UTF-8), JSON catalog array (Max: 10MB)
                                    </p>
                                </div>
                            )}
                        </div>
                        {errors.file && (
                            <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.file}</p>
                        )}
                    </div>

                    {/* Duplicate Avoidance Strategy Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Deduplication Strategy (ডুপ্লিকেট নিয়ন্ত্রণ বিকল্প) <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[11px] text-gray-500">Match key: Name + Potency</span>
                        </div>

                        <div className="space-y-2">
                            {/* Strategy 1: Skip */}
                            <label
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                    data.duplicate_strategy === 'skip'
                                        ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="duplicate_strategy"
                                    value="skip"
                                    checked={data.duplicate_strategy === 'skip'}
                                    onChange={(e) => setData('duplicate_strategy', e.target.value)}
                                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="text-xs">
                                    <div className="font-bold text-gray-900 flex items-center gap-1.5">
                                        <span>🛡️ Skip Existing Remedies (ডুপ্লিকেট বাদ দিন - প্রস্তাবিত)</span>
                                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">Safe</span>
                                    </div>
                                    <p className="text-gray-500 mt-0.5">
                                        If the remedy with same Name and Potency already exists in your catalog, keep it untouched. Only insert new remedies.
                                    </p>
                                </div>
                            </label>

                            {/* Strategy 2: Update */}
                            <label
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                    data.duplicate_strategy === 'update'
                                        ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="duplicate_strategy"
                                    value="update"
                                    checked={data.duplicate_strategy === 'update'}
                                    onChange={(e) => setData('duplicate_strategy', e.target.value)}
                                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="text-xs">
                                    <div className="font-bold text-gray-900">
                                        🔄 Update Existing Remedies (বিদ্যমান রেমেডি ডাটা আপডেট করুন)
                                    </div>
                                    <p className="text-gray-500 mt-0.5">
                                        If the remedy already exists, overwrite its formulation, default instructions, and active status with the incoming data.
                                    </p>
                                </div>
                            </label>

                            {/* Strategy 3: Append */}
                            <label
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                    data.duplicate_strategy === 'append'
                                        ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500'
                                        : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="duplicate_strategy"
                                    value="append"
                                    checked={data.duplicate_strategy === 'append'}
                                    onChange={(e) => setData('duplicate_strategy', e.target.value)}
                                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="text-xs">
                                    <div className="font-bold text-gray-900">
                                        ➕ Always Append (সব নতুন হিসেবে সংরক্ষণ করুন)
                                    </div>
                                    <p className="text-gray-500 mt-0.5">
                                        Insert all rows as new entries regardless of existing names or potencies.
                                    </p>
                                </div>
                            </label>
                        </div>
                        {errors.duplicate_strategy && (
                            <p className="mt-1.5 text-xs text-rose-600 font-semibold">{errors.duplicate_strategy}</p>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {progress && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress.percentage}%` }}
                            />
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={processing}
                            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 transition"
                        >
                            Cancel (বাতিল)
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.file}
                            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-primary-600 rounded-lg shadow-2xs hover:bg-primary-700 disabled:opacity-50 transition"
                        >
                            {processing ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    <span>Processing Import...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                    <span>Start Import (ইমপোর্ট শুরু করুন)</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
