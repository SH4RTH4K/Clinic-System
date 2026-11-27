import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PageHeader from '@/Components/PageHeader';
import PrescriptionConfigModal from '@/Components/PrescriptionConfigModal';
import { Head, Link } from '@inertiajs/react';
import { useState, useMemo } from 'react';

export default function Edit({ config = {}, kpis = {} }) {
    const [currentConfig, setCurrentConfig] = useState(config);

    // Compute live KPI stats from currentConfig
    const stats = useMemo(() => {
        return {
            total_timings: currentConfig.timing_options?.length ?? kpis.total_timings ?? 0,
            total_dose_units: currentConfig.dose_units?.length ?? kpis.total_dose_units ?? 0,
            total_meal_relations: currentConfig.meal_relations?.length ?? kpis.total_meal_relations ?? 0,
            total_instructions: currentConfig.dilution_instructions?.length ?? kpis.total_instructions ?? 0,
            total_duration_presets: currentConfig.duration_presets?.length ?? kpis.total_duration_presets ?? 0,
            default_duration_days: currentConfig.default_duration_days ?? kpis.default_duration_days ?? 7,
            default_dose_unit: currentConfig.default_dose_unit ?? kpis.default_dose_unit ?? 'drops',
        };
    }, [currentConfig, kpis]);

    // Live WYSIWYG Prescription Simulator State
    const [simMedicine, setSimMedicine] = useState('Arnica Montana 200CH');
    const [simDoseQty, setSimDoseQty] = useState(currentConfig.default_dose_qty || 5);
    const [simDoseUnit, setSimDoseUnit] = useState(currentConfig.default_dose_unit || 'drops');
    const [simTiming, setSimTiming] = useState(currentConfig.timing_options?.[0]?.key || 'morning');
    const [simMeal, setSimMeal] = useState(currentConfig.meal_relations?.[0]?.key || 'before');
    const [simDilution, setSimDilution] = useState(currentConfig.dilution_instructions?.[0] || '১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন');
    const [simDuration, setSimDuration] = useState(currentConfig.default_duration_days || 7);

    // Find active objects for simulator
    const activeUnitObj = currentConfig.dose_units?.find((u) => u.key === simDoseUnit) || { label_en: 'Drops', label_bn: 'ফোটা' };
    const activeTimingObj = currentConfig.timing_options?.find((t) => t.key === simTiming) || { label_en: 'Morning', label_bn: 'সকাল' };
    const activeMealObj = currentConfig.meal_relations?.find((m) => m.key === simMeal) || { label_en: 'Before meal', label_bn: 'খাবার আগে' };

    return (
        <AuthenticatedLayout>
            <Head title="Prescription Options & Presets" />

            <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <PageHeader
                    title="Prescription Options &amp; Presets (প্রেসক্রিপশন অপশন ও প্রিসেট)"
                    subtitle="Configure timing intervals, meal relations, dosage units, classical succussion formulas, and duration presets for consultation visits"
                    actions={
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('admin.visits.index')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>📋</span> Consultations
                            </Link>
                            <Link
                                href={route('admin.settings.edit')}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition inline-flex items-center gap-1.5"
                            >
                                <span>⚙️</span> Clinic Settings
                            </Link>
                        </div>
                    }
                />

                {/* Executive KPI Ribbon (5 Tiles) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Timing Options</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total_timings}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">খাওয়ার সময়সূচি</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-teal-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">Dose Units</div>
                        <div className="text-2xl font-bold text-teal-800 mt-1">{stats.total_dose_units}</div>
                        <div className="text-[11px] text-teal-600 mt-0.5">ডোজের পরিমাপক একক</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Meal Relations</div>
                        <div className="text-2xl font-bold text-blue-800 mt-1">{stats.total_meal_relations}</div>
                        <div className="text-[11px] text-blue-600 mt-0.5">খাবারের সাথে সম্পর্ক</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs flex flex-col justify-between">
                        <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">Dilution Templates</div>
                        <div className="text-2xl font-bold text-purple-800 mt-1">{stats.total_instructions}</div>
                        <div className="text-[11px] text-purple-600 mt-0.5">সেবনবিধি ও ঝাঁকি নিয়ম</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                        <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Baseline Defaults</div>
                        <div className="text-lg font-bold text-amber-900 mt-1">
                            {stats.default_duration_days} Days • {stats.default_dose_unit}
                        </div>
                        <div className="text-[11px] text-amber-600 mt-0.5">ডিফল্ট পরামর্শ ও মাত্রা</div>
                    </div>
                </div>

                {/* Live WYSIWYG Clinical Prescription Line Simulator */}
                <div className="bg-gradient-to-r from-teal-50/70 via-white to-blue-50/50 rounded-xl border border-teal-200 p-4 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100 pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔬</span>
                            <div>
                                <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                                    Live Clinical Prescription Simulator (ব্যবস্থাপত্র লাইন সিমুলেটর)
                                </h3>
                                <p className="text-[11px] text-teal-700">
                                    Simulate how configured timings, dose units, and dilution phrases assemble into real clinical prescriptions.
                                </p>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-100 text-teal-800 border border-teal-200">
                            WYSIWYG Preview
                        </span>
                    </div>

                    {/* Interactive Controls Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                        <div className="col-span-2 sm:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Test Remedy / Drug</label>
                            <input
                                type="text"
                                value={simMedicine}
                                onChange={(e) => setSimMedicine(e.target.value)}
                                className="w-full text-xs rounded-md border-gray-300 py-1 px-2 bg-white"
                                placeholder="Medicine name..."
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Dose Qty</label>
                            <input
                                type="number"
                                value={simDoseQty}
                                onChange={(e) => setSimDoseQty(e.target.value)}
                                className="w-full text-xs rounded-md border-gray-300 py-1 px-2 bg-white text-center font-mono"
                                min="0.5"
                                step="0.5"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Unit</label>
                            <select
                                value={simDoseUnit}
                                onChange={(e) => setSimDoseUnit(e.target.value)}
                                className="w-full text-xs rounded-md border-gray-300 py-1 px-2 bg-white"
                            >
                                {(currentConfig.dose_units || []).map((u) => (
                                    <option key={u.key} value={u.key}>
                                        {u.label_en} ({u.label_bn || u.key})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Timing</label>
                            <select
                                value={simTiming}
                                onChange={(e) => setSimTiming(e.target.value)}
                                className="w-full text-xs rounded-md border-gray-300 py-1 px-2 bg-white"
                            >
                                {(currentConfig.timing_options || []).map((t) => (
                                    <option key={t.key} value={t.key}>
                                        {t.label_en} ({t.label_bn || t.key})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Meal Relation</label>
                            <select
                                value={simMeal}
                                onChange={(e) => setSimMeal(e.target.value)}
                                className="w-full text-xs rounded-md border-gray-300 py-1 px-2 bg-white"
                            >
                                {(currentConfig.meal_relations || []).map((m) => (
                                    <option key={m.key} value={m.key}>
                                        {m.label_en} ({m.label_bn || m.key})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dilution Selector & Duration Chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Dilution / Succussion Instruction</label>
                            <select
                                value={simDilution}
                                onChange={(e) => setSimDilution(e.target.value)}
                                className="w-full text-xs rounded-md border-gray-300 py-1 px-2 bg-white"
                            >
                                {(currentConfig.dilution_instructions || []).map((inst, i) => (
                                    <option key={i} value={inst}>
                                        {inst}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Duration</label>
                            <div className="flex items-center gap-1">
                                {(currentConfig.duration_presets || [3, 7, 14, 30]).slice(0, 4).map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setSimDuration(d)}
                                        className={`flex-1 py-1 rounded text-[11px] font-semibold border transition ${
                                            simDuration === d
                                                ? 'bg-teal-600 text-white border-teal-600'
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {d}d
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Rendered Prescription Lines Box */}
                    <div className="bg-white rounded-lg border border-teal-200 p-3 shadow-2xs space-y-2">
                        <div className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center justify-between">
                            <span>📄 Rendered Prescription Line Output (ব্যবস্থাপত্রের দৃশ্যমান লাইন):</span>
                            <span className="text-[10px] font-normal text-gray-400">Printed on Patient Rx &amp; PDF</span>
                        </div>

                        {/* Bengali Line (Clinical Classical Homeopathy Standard) */}
                        <div className="bg-emerald-50/60 p-2.5 rounded border border-emerald-200 font-bengali text-sm text-emerald-950 flex items-start gap-2">
                            <span className="font-bold text-emerald-700 select-none">১নং</span>
                            <div className="flex-1 font-medium leading-relaxed">
                                <span className="font-bold text-emerald-900">{simMedicine}</span>
                                {' — '}
                                <span>{simDoseQty} {activeUnitObj.label_bn || activeUnitObj.label_en}</span>
                                {', '}
                                <span className="text-teal-800 font-semibold">{activeTimingObj.label_bn || activeTimingObj.label_en}</span>
                                {' '}
                                <span>{activeMealObj.label_bn || activeMealObj.label_en}</span>
                                {', '}
                                <span className="text-gray-900">{simDilution}</span>
                                {' '}
                                <span className="text-emerald-800 font-semibold">({simDuration} দিন)</span>
                            </div>
                        </div>

                        {/* English Line */}
                        <div className="bg-gray-50 p-2 rounded border border-gray-200 font-mono text-xs text-gray-800 flex items-start gap-2">
                            <span className="font-bold text-teal-700 select-none">Rx 1:</span>
                            <div className="flex-1">
                                <span className="font-bold text-gray-900">{simMedicine}</span>
                                {' — '}
                                <span>{simDoseQty} {activeUnitObj.label_en}</span>
                                {', '}
                                <span>{activeTimingObj.label_en}</span>
                                {' '}
                                <span>{activeMealObj.label_en}</span>
                                {', '}
                                <span>{simDilution}</span>
                                {' '}
                                <span className="font-bold text-teal-800">({simDuration} Days)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configuration Workstation Card */}
                <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
                    <PrescriptionConfigModal
                        inline={true}
                        initialConfig={currentConfig}
                        onConfigSaved={(updated) => setCurrentConfig(updated)}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
