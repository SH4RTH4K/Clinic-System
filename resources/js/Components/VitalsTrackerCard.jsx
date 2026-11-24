import React, { useEffect } from 'react';

export default function VitalsTrackerCard({ vitals = {}, onChange, errors = {} }) {
    const v = vitals || {};

    const handleFieldChange = (field, val) => {
        const updated = { ...v, [field]: val };

        // Auto-calculate BMI if height and weight are provided
        if (field === 'weight_kg' || field === 'height_cm') {
            const w = parseFloat(field === 'weight_kg' ? val : updated.weight_kg);
            const h = parseFloat(field === 'height_cm' ? val : updated.height_cm);
            if (w > 0 && h > 0) {
                const heightM = h / 100.0;
                updated.bmi = parseFloat((w / (heightM * heightM)).toFixed(1));
            } else if (!val) {
                updated.bmi = '';
            }
        }

        onChange(updated);
    };

    // Calculate BP status
    const getBpBadge = () => {
        const sys = parseInt(v.bp_systolic, 10);
        const dia = parseInt(v.bp_diastolic, 10);
        if (!sys || !dia) return null;

        if (sys > 180 || dia > 120) {
            return { label: 'Crisis (জরুরি)', bg: 'bg-red-700 text-white animate-pulse' };
        }
        if (sys >= 140 || dia >= 90) {
            return { label: 'Stage 2 HTN', bg: 'bg-red-100 text-red-800 border-red-300' };
        }
        if (sys >= 130 || dia >= 80) {
            return { label: 'Stage 1 HTN', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
        }
        if (sys >= 120 && dia < 80) {
            return { label: 'Elevated', bg: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
        }
        return { label: 'Normal (স্বাভাবিক)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    };

    // Calculate BMI status
    const getBmiBadge = () => {
        const bmi = parseFloat(v.bmi);
        if (!bmi || isNaN(bmi)) return null;

        if (bmi < 18.5) {
            return { label: 'Underweight', bg: 'bg-sky-100 text-sky-800 border-sky-300' };
        }
        if (bmi < 25.0) {
            return { label: 'Normal (স্বাভাবিক)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
        }
        if (bmi < 30.0) {
            return { label: 'Overweight', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
        }
        return { label: 'Obese (স্থূলতা)', bg: 'bg-red-100 text-red-800 border-red-300' };
    };

    // SpO2 warning
    const getSpo2Badge = () => {
        const spo2 = parseInt(v.spo2, 10);
        if (!spo2) return null;
        if (spo2 < 94) {
            return { label: 'Low SpO2 (কম)', bg: 'bg-red-100 text-red-800 font-bold' };
        }
        return { label: 'Optimal', bg: 'bg-emerald-100 text-emerald-800' };
    };

    // Temp status
    const getTempBadge = () => {
        const temp = parseFloat(v.temperature_f);
        if (!temp) return null;
        if (temp >= 102) {
            return { label: 'High Fever', bg: 'bg-red-100 text-red-800 font-bold' };
        }
        if (temp >= 99.5) {
            return { label: 'Fever (জ্বর)', bg: 'bg-amber-100 text-amber-800 font-semibold' };
        }
        return null;
    };

    const bpBadge = getBpBadge();
    const bmiBadge = getBmiBadge();
    const spo2Badge = getSpo2Badge();
    const tempBadge = getTempBadge();

    return (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">
                        🩺
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">
                        Universal Clinical Vitals &amp; Biometrics
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">(শারীরিক পরিমাপ ও ভাইটালস)</span>
                </div>
                <div className="flex items-center gap-2">
                    {bpBadge && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${bpBadge.bg}`}>
                            BP: {bpBadge.label}
                        </span>
                    )}
                    {bmiBadge && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${bmiBadge.bg}`}>
                            BMI: {bmiBadge.label}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* Blood Pressure */}
                    <div className="col-span-2 bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Blood Pressure (BP)
                        </label>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                placeholder="Systolic (120)"
                                value={v.bp_systolic || ''}
                                onChange={(e) => handleFieldChange('bp_systolic', e.target.value)}
                                min="40"
                                max="300"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-gray-400 font-bold">/</span>
                            <input
                                type="number"
                                placeholder="Diastolic (80)"
                                value={v.bp_diastolic || ''}
                                onChange={(e) => handleFieldChange('bp_diastolic', e.target.value)}
                                min="30"
                                max="200"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">mmHg</span>
                        </div>
                    </div>

                    {/* Pulse Rate */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Pulse (নাড়ি)
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                placeholder="72"
                                value={v.pulse_rate || ''}
                                onChange={(e) => handleFieldChange('pulse_rate', e.target.value)}
                                min="30"
                                max="250"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">bpm</span>
                        </div>
                    </div>

                    {/* Temperature */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                Temp (তাপমাত্রা)
                            </label>
                            {tempBadge && (
                                <span className={`text-[9px] px-1 rounded ${tempBadge.bg}`}>
                                    {tempBadge.label}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="98.6"
                                value={v.temperature_f || ''}
                                onChange={(e) => handleFieldChange('temperature_f', e.target.value)}
                                min="85"
                                max="112"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">°F</span>
                        </div>
                    </div>

                    {/* Weight */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Weight (ওজন)
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="68.5"
                                value={v.weight_kg || ''}
                                onChange={(e) => handleFieldChange('weight_kg', e.target.value)}
                                min="1"
                                max="350"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">kg</span>
                        </div>
                    </div>

                    {/* Height */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Height (উচ্চতা)
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.5"
                                placeholder="170"
                                value={v.height_cm || ''}
                                onChange={(e) => handleFieldChange('height_cm', e.target.value)}
                                min="30"
                                max="250"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">cm</span>
                        </div>
                    </div>

                    {/* BMI (Calculated) */}
                    <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-200 space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-cyan-950 uppercase tracking-wider">
                                BMI (বডি মাস)
                            </label>
                            {bmiBadge && (
                                <span className={`text-[9px] px-1 rounded ${bmiBadge.bg}`}>
                                    {bmiBadge.label}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Auto"
                                value={v.bmi || ''}
                                onChange={(e) => handleFieldChange('bmi', e.target.value)}
                                className="w-full text-xs font-black py-1.5 px-2 rounded-lg border-cyan-300 text-center bg-white text-cyan-900"
                            />
                            <span className="text-[10px] text-cyan-700 font-semibold whitespace-nowrap">kg/m²</span>
                        </div>
                    </div>

                    {/* Oxygen Saturation SpO2 */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                                SpO2 (অক্সিজেন)
                            </label>
                            {spo2Badge && (
                                <span className={`text-[9px] px-1 rounded ${spo2Badge.bg}`}>
                                    {spo2Badge.label}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                placeholder="98"
                                value={v.spo2 || ''}
                                onChange={(e) => handleFieldChange('spo2', e.target.value)}
                                min="50"
                                max="100"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">%</span>
                        </div>
                    </div>

                    {/* Respiratory Rate */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Resp Rate (শ্বাসগতি)
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                placeholder="18"
                                value={v.respiratory_rate || ''}
                                onChange={(e) => handleFieldChange('respiratory_rate', e.target.value)}
                                min="8"
                                max="60"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">/min</span>
                        </div>
                    </div>

                    {/* Blood Sugar (RBS) */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Sugar RBS (র‌্যান্ডম)
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="6.5"
                                value={v.blood_sugar_rbs || ''}
                                onChange={(e) => handleFieldChange('blood_sugar_rbs', e.target.value)}
                                min="1"
                                max="40"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">mmol/L</span>
                        </div>
                    </div>

                    {/* Blood Sugar (FBS) */}
                    <div className="bg-gray-50/60 p-2.5 rounded-xl border border-gray-200 space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            Sugar FBS (ফাস্টিং)
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="5.2"
                                value={v.blood_sugar_fbs || ''}
                                onChange={(e) => handleFieldChange('blood_sugar_fbs', e.target.value)}
                                min="1"
                                max="40"
                                className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border-gray-300 text-center bg-white"
                            />
                            <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">mmol/L</span>
                        </div>
                    </div>
                </div>

                {/* Additional Clinical Vitals Notes */}
                <div>
                    <input
                        type="text"
                        placeholder="Additional vitals observations (e.g. Irregular rhythm, postural dizziness, pedal edema)..."
                        value={v.notes || ''}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        className="w-full text-xs rounded-lg border-gray-300 py-1.5 px-3 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                </div>
            </div>
        </div>
    );
}
