import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PrescriptionConfigModal({
    isOpen = false,
    onClose = () => {},
    initialConfig = {},
    onConfigSaved = () => {},
    inline = false,
}) {
    const defaultConfig = {
        timing_options: [
            { key: 'morning', label_en: 'Morning', label_bn: 'সকাল' },
            { key: 'noon', label_en: 'Noon', label_bn: 'দুপুর' },
            { key: 'afternoon', label_en: 'Afternoon', label_bn: 'বিকাল' },
            { key: 'night', label_en: 'Night', label_bn: 'রাত' },
            { key: 'bedtime', label_en: 'Bedtime', label_bn: 'ঘুমানোর পূর্বে' },
        ],
        dose_units: [
            { key: 'drops', label_en: 'Drops', label_bn: 'ফোটা' },
            { key: 'pills', label_en: 'Pills', label_bn: 'বটিকা' },
            { key: 'tablets', label_en: 'Tablets', label_bn: 'ট্যাবলেট' },
            { key: 'powder', label_en: 'Powder', label_bn: 'পুরিয়া' },
            { key: 'spoon', label_en: 'Spoon / Tsp', label_bn: 'চামচ' },
            { key: 'ml', label_en: 'ml', label_bn: 'মিলি' },
            { key: 'globules', label_en: 'Globules', label_bn: 'গ্লোবিউলস' },
        ],
        meal_relations: [
            { key: 'before', label_en: 'Before meal', label_bn: 'আগে (Before)' },
            { key: 'after', label_en: 'After meal', label_bn: 'পরে (After)' },
            { key: 'with', label_en: 'With meal', label_bn: 'খাবারের সাথে' },
            { key: 'empty_stomach', label_en: 'Empty stomach', label_bn: 'খালি পেটে' },
        ],
        dilution_instructions: [
            'with half a cup of water',
            'আধা কাপ পানির সাথে মিশিয়ে',
            'directly on tongue (জিহ্বায় সরাসরি)',
            'chew or dissolve in mouth (চুষে খাবেন)',
            'with lukewarm water (কুসুম গরম পানির সাথে)',
            'empty stomach in the morning (সকালে খালি পেটে)',
        ],
        duration_presets: [3, 5, 7, 10, 14, 15, 21, 30],
        default_duration_days: 7,
        default_dose_qty: 5,
        default_dose_unit: 'drops',
    };

    const [config, setConfig] = useState({
        ...defaultConfig,
        ...initialConfig,
    });

    useEffect(() => {
        if (initialConfig && Object.keys(initialConfig).length > 0) {
            setConfig({
                timing_options: initialConfig.timing_options || defaultConfig.timing_options,
                dose_units: initialConfig.dose_units || defaultConfig.dose_units,
                meal_relations: initialConfig.meal_relations || defaultConfig.meal_relations,
                dilution_instructions: initialConfig.dilution_instructions || defaultConfig.dilution_instructions,
                duration_presets: initialConfig.duration_presets || defaultConfig.duration_presets,
                default_duration_days: initialConfig.default_duration_days ?? defaultConfig.default_duration_days,
                default_dose_qty: initialConfig.default_dose_qty ?? defaultConfig.default_dose_qty,
                default_dose_unit: initialConfig.default_dose_unit || defaultConfig.default_dose_unit,
            });
        }
    }, [initialConfig, isOpen]);

    const [activeTab, setActiveTab] = useState('timing'); // 'timing' | 'dose' | 'instructions' | 'duration'
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const clearAllEdits = () => {
        setEditingTimingIndex(null);
        setEditingMealRelationIndex(null);
        setEditingDoseUnitIndex(null);
        setEditingInstructionIndex(null);
        setEditingDurationIndex(null);
        setErrorMsg('');
    };

    // ── 1. Timing Options State & Handlers ─────────────────────────────────────
    const [newTiming, setNewTiming] = useState({ key: '', label_en: '', label_bn: '' });
    const [editingTimingIndex, setEditingTimingIndex] = useState(null);
    const [editingTimingData, setEditingTimingData] = useState({ key: '', label_en: '', label_bn: '' });

    const addTiming = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newTiming.key || !newTiming.label_en) return;
        const normalizedKey = newTiming.key.toLowerCase().trim().replace(/\s+/g, '_');
        if (config.timing_options.some((t) => t.key === normalizedKey)) {
            setErrorMsg(`Timing key "${normalizedKey}" already exists.`);
            return;
        }
        setConfig((prev) => ({
            ...prev,
            timing_options: [
                ...prev.timing_options,
                { key: normalizedKey, label_en: newTiming.label_en.trim(), label_bn: newTiming.label_bn.trim() },
            ],
        }));
        setNewTiming({ key: '', label_en: '', label_bn: '' });
        setErrorMsg('');
    };

    const removeTiming = (keyToRemove) => {
        if (config.timing_options.length <= 1) {
            setErrorMsg('At least one timing option must remain.');
            return;
        }
        setConfig((prev) => ({
            ...prev,
            timing_options: prev.timing_options.filter((t) => t.key !== keyToRemove),
        }));
        if (editingTimingIndex !== null) clearAllEdits();
    };

    const startEditingTiming = (index) => {
        clearAllEdits();
        setEditingTimingIndex(index);
        setEditingTimingData({ ...config.timing_options[index] });
    };

    const saveEditingTiming = () => {
        if (editingTimingIndex === null) return;
        const { key, label_en, label_bn } = editingTimingData;
        if (!key || !label_en) {
            setErrorMsg('Key and English label are required.');
            return;
        }
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        const existingIndex = config.timing_options.findIndex((t) => t.key === normalizedKey);
        if (existingIndex !== -1 && existingIndex !== editingTimingIndex) {
            setErrorMsg(`Timing key "${normalizedKey}" already exists.`);
            return;
        }
        const updated = [...config.timing_options];
        updated[editingTimingIndex] = {
            key: normalizedKey,
            label_en: label_en.trim(),
            label_bn: (label_bn || '').trim(),
        };
        setConfig((prev) => ({ ...prev, timing_options: updated }));
        setEditingTimingIndex(null);
        setErrorMsg('');
    };

    const cancelEditingTiming = () => {
        setEditingTimingIndex(null);
        setErrorMsg('');
    };

    // ── 2A. Meal Relations State & Handlers ────────────────────────────────────
    const [newMealRelation, setNewMealRelation] = useState({ key: '', label_en: '', label_bn: '' });
    const [editingMealRelationIndex, setEditingMealRelationIndex] = useState(null);
    const [editingMealRelationData, setEditingMealRelationData] = useState({ key: '', label_en: '', label_bn: '' });

    const addMealRelation = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newMealRelation.key || !newMealRelation.label_en) return;
        const normalizedKey = newMealRelation.key.toLowerCase().trim().replace(/\s+/g, '_');
        if ((config.meal_relations || []).some((m) => m.key === normalizedKey)) {
            setErrorMsg(`Meal relation key "${normalizedKey}" already exists.`);
            return;
        }
        setConfig((prev) => ({
            ...prev,
            meal_relations: [
                ...(prev.meal_relations || []),
                { key: normalizedKey, label_en: newMealRelation.label_en.trim(), label_bn: newMealRelation.label_bn.trim() },
            ],
        }));
        setNewMealRelation({ key: '', label_en: '', label_bn: '' });
        setErrorMsg('');
    };

    const removeMealRelation = (keyToRemove) => {
        if ((config.meal_relations || []).length <= 1) {
            setErrorMsg('At least one meal relation must remain.');
            return;
        }
        setConfig((prev) => ({
            ...prev,
            meal_relations: prev.meal_relations.filter((m) => m.key !== keyToRemove),
        }));
        if (editingMealRelationIndex !== null) clearAllEdits();
    };

    const startEditingMealRelation = (index) => {
        clearAllEdits();
        setEditingMealRelationIndex(index);
        setEditingMealRelationData({ ...config.meal_relations[index] });
    };

    const saveEditingMealRelation = () => {
        if (editingMealRelationIndex === null) return;
        const { key, label_en, label_bn } = editingMealRelationData;
        if (!key || !label_en) {
            setErrorMsg('Key and English label are required.');
            return;
        }
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        const existingIndex = (config.meal_relations || []).findIndex((m) => m.key === normalizedKey);
        if (existingIndex !== -1 && existingIndex !== editingMealRelationIndex) {
            setErrorMsg(`Meal relation key "${normalizedKey}" already exists.`);
            return;
        }
        const updated = [...(config.meal_relations || [])];
        updated[editingMealRelationIndex] = {
            key: normalizedKey,
            label_en: label_en.trim(),
            label_bn: (label_bn || '').trim(),
        };
        setConfig((prev) => ({ ...prev, meal_relations: updated }));
        setEditingMealRelationIndex(null);
        setErrorMsg('');
    };

    const cancelEditingMealRelation = () => {
        setEditingMealRelationIndex(null);
        setErrorMsg('');
    };

    // ── 2B. Dose Units State & Handlers ───────────────────────────────────────
    const [newDoseUnit, setNewDoseUnit] = useState({ key: '', label_en: '', label_bn: '' });
    const [editingDoseUnitIndex, setEditingDoseUnitIndex] = useState(null);
    const [editingDoseUnitData, setEditingDoseUnitData] = useState({ key: '', label_en: '', label_bn: '' });

    const addDoseUnit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newDoseUnit.key || !newDoseUnit.label_en) return;
        const normalizedKey = newDoseUnit.key.toLowerCase().trim().replace(/\s+/g, '_');
        if (config.dose_units.some((u) => u.key === normalizedKey)) {
            setErrorMsg(`Dose unit "${normalizedKey}" already exists.`);
            return;
        }
        setConfig((prev) => ({
            ...prev,
            dose_units: [
                ...prev.dose_units,
                { key: normalizedKey, label_en: newDoseUnit.label_en.trim(), label_bn: newDoseUnit.label_bn.trim() },
            ],
        }));
        setNewDoseUnit({ key: '', label_en: '', label_bn: '' });
        setErrorMsg('');
    };

    const removeDoseUnit = (keyToRemove) => {
        if (config.dose_units.length <= 1) {
            setErrorMsg('At least one dose unit must remain.');
            return;
        }
        setConfig((prev) => ({
            ...prev,
            dose_units: prev.dose_units.filter((u) => u.key !== keyToRemove),
        }));
        if (editingDoseUnitIndex !== null) clearAllEdits();
    };

    const startEditingDoseUnit = (index) => {
        clearAllEdits();
        setEditingDoseUnitIndex(index);
        setEditingDoseUnitData({ ...config.dose_units[index] });
    };

    const saveEditingDoseUnit = () => {
        if (editingDoseUnitIndex === null) return;
        const { key, label_en, label_bn } = editingDoseUnitData;
        if (!key || !label_en) {
            setErrorMsg('Key and English label are required.');
            return;
        }
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        const existingIndex = config.dose_units.findIndex((u) => u.key === normalizedKey);
        if (existingIndex !== -1 && existingIndex !== editingDoseUnitIndex) {
            setErrorMsg(`Dose unit "${normalizedKey}" already exists.`);
            return;
        }
        const oldKey = config.dose_units[editingDoseUnitIndex]?.key;
        const updated = [...config.dose_units];
        updated[editingDoseUnitIndex] = {
            key: normalizedKey,
            label_en: label_en.trim(),
            label_bn: (label_bn || '').trim(),
        };

        let newDefaultUnit = config.default_dose_unit;
        if (config.default_dose_unit === oldKey) {
            newDefaultUnit = normalizedKey;
        }

        setConfig((prev) => ({
            ...prev,
            dose_units: updated,
            default_dose_unit: newDefaultUnit,
        }));
        setEditingDoseUnitIndex(null);
        setErrorMsg('');
    };

    const cancelEditingDoseUnit = () => {
        setEditingDoseUnitIndex(null);
        setErrorMsg('');
    };

    // ── 3. Instructions Handlers ─────────────────────────────────────────────
    const [newInstruction, setNewInstruction] = useState('');
    const [editingInstructionIndex, setEditingInstructionIndex] = useState(null);
    const [editingInstructionText, setEditingInstructionText] = useState('');

    const addInstruction = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!newInstruction.trim()) return;
        if (config.dilution_instructions.includes(newInstruction.trim())) {
            setErrorMsg('This instruction phrase already exists.');
            return;
        }
        setConfig((prev) => ({
            ...prev,
            dilution_instructions: [...prev.dilution_instructions, newInstruction.trim()],
        }));
        setNewInstruction('');
        setErrorMsg('');
    };

    const removeInstruction = (indexToRemove) => {
        setConfig((prev) => ({
            ...prev,
            dilution_instructions: prev.dilution_instructions.filter((_, i) => i !== indexToRemove),
        }));
        if (editingInstructionIndex !== null) clearAllEdits();
    };

    const startEditingInstruction = (index) => {
        clearAllEdits();
        setEditingInstructionIndex(index);
        setEditingInstructionText(config.dilution_instructions[index] || '');
    };

    const saveEditingInstruction = () => {
        if (editingInstructionIndex === null) return;
        const trimmed = editingInstructionText.trim();
        if (!trimmed) {
            setErrorMsg('Instruction text cannot be empty.');
            return;
        }
        const existingIndex = config.dilution_instructions.findIndex((inst) => inst === trimmed);
        if (existingIndex !== -1 && existingIndex !== editingInstructionIndex) {
            setErrorMsg('This instruction phrase already exists.');
            return;
        }
        const updated = [...config.dilution_instructions];
        updated[editingInstructionIndex] = trimmed;
        setConfig((prev) => ({ ...prev, dilution_instructions: updated }));
        setEditingInstructionIndex(null);
        setErrorMsg('');
    };

    const cancelEditingInstruction = () => {
        setEditingInstructionIndex(null);
        setErrorMsg('');
    };

    // ── 4. Duration Handlers ─────────────────────────────────────────────────
    const [newDuration, setNewDuration] = useState('');
    const [editingDurationIndex, setEditingDurationIndex] = useState(null);
    const [editingDurationDays, setEditingDurationDays] = useState('');

    const addDurationPreset = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const days = parseInt(newDuration, 10);
        if (isNaN(days) || days < 1 || days > 365) return;
        if (config.duration_presets.includes(days)) {
            setErrorMsg(`Duration ${days} days is already in presets.`);
            return;
        }
        const updated = [...config.duration_presets, days].sort((a, b) => a - b);
        setConfig((prev) => ({
            ...prev,
            duration_presets: updated,
        }));
        setNewDuration('');
        setErrorMsg('');
    };

    const removeDurationPreset = (daysToRemove) => {
        setConfig((prev) => ({
            ...prev,
            duration_presets: prev.duration_presets.filter((d) => d !== daysToRemove),
        }));
        if (editingDurationIndex !== null) clearAllEdits();
    };

    const startEditingDuration = (index) => {
        clearAllEdits();
        setEditingDurationIndex(index);
        setEditingDurationDays(String(config.duration_presets[index]));
    };

    const saveEditingDuration = () => {
        if (editingDurationIndex === null) return;
        const days = parseInt(editingDurationDays, 10);
        if (isNaN(days) || days < 1 || days > 365) {
            setErrorMsg('Please enter a valid number of days between 1 and 365.');
            return;
        }
        const existingIndex = config.duration_presets.findIndex((d) => d === days);
        if (existingIndex !== -1 && existingIndex !== editingDurationIndex) {
            setErrorMsg(`Duration ${days} days is already in presets.`);
            return;
        }
        const updated = [...config.duration_presets];
        updated[editingDurationIndex] = days;
        updated.sort((a, b) => a - b);
        setConfig((prev) => ({ ...prev, duration_presets: updated }));
        setEditingDurationIndex(null);
        setErrorMsg('');
    };

    const cancelEditingDuration = () => {
        setEditingDurationIndex(null);
        setErrorMsg('');
    };

    // ── Save to Backend ──────────────────────────────────────────────────────
    const saveConfiguration = () => {
        setSaving(true);
        setErrorMsg('');
        setSavedNotice(false);

        const targetRoute = typeof route === 'function' && route().has && route().has('admin.prescription_options.update')
            ? route('admin.prescription_options.update')
            : route('admin.settings.prescription_config');

        axios
            .put(targetRoute, config)
            .then((res) => {
                setSaving(false);
                setSavedNotice(true);
                const updated = res.data?.prescription_config || config;
                onConfigSaved(updated);
                setTimeout(() => {
                    setSavedNotice(false);
                    if (!inline) onClose();
                }, 1200);
            })
            .catch((err) => {
                setSaving(false);
                const message = err.response?.data?.message || 'Failed to save configuration. Please try again.';
                setErrorMsg(message);
            });
    };

    const content = (
        <div className="space-y-5">
            {/* Header info */}
            <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>⚙️</span> Prescription Options &amp; Presets Configuration
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Configure available timings, meal relations, dose units, dilution instructions, and duration presets.
                </p>
            </div>

            {/* Error or Success notification */}
            {errorMsg && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    {errorMsg}
                </div>
            )}
            {savedNotice && (
                <div className="rounded-md bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
                    <span>✓</span> Configuration saved successfully!
                </div>
            )}

            {/* Navigation Tabs (Responsive grid, no horizontal scrollbar) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-100 p-1.5 rounded-lg text-xs font-semibold">
                <button
                    type="button"
                    onClick={() => { setActiveTab('timing'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'timing'
                            ? 'bg-white text-primary-700 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>1. Timing</span>
                    <span className="text-[10px] text-gray-500 font-normal">খাওয়ার সময়</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('dose'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'dose'
                            ? 'bg-white text-primary-700 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>2. Meal &amp; Dose</span>
                    <span className="text-[10px] text-gray-500 font-normal">খাবার সম্পর্ক ও ডোজ</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('instructions'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'instructions'
                            ? 'bg-white text-primary-700 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>3. Instructions</span>
                    <span className="text-[10px] text-gray-500 font-normal">সেবনবিধি ও ডিলিউশন</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('duration'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'duration'
                            ? 'bg-white text-primary-700 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>4. Duration &amp; Defaults</span>
                    <span className="text-[10px] text-gray-500 font-normal">মেয়াদ ও ডিফল্ট সেটিংস</span>
                </button>
            </div>

            {/* ── Tab 1: Timing Options ──────────────────────────────────────── */}
            {activeTab === 'timing' && (
                <div className="space-y-4">
                    <p className="text-xs text-gray-600">
                        These options appear as checkboxes for each prescribed medicine row. You can add, edit, or delete items.
                    </p>

                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                        {config.timing_options.map((t, idx) => (
                            <div key={t.key || idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                {editingTimingIndex === idx ? (
                                    <div className="bg-primary-50/60 p-3 rounded-lg border border-primary-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-primary-800 uppercase tracking-wider">
                                                Edit Timing Option #{idx + 1}
                                            </span>
                                            <span className="text-[10px] text-gray-500">Press Enter to save, Esc to cancel</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Key</label>
                                                <input
                                                    type="text"
                                                    value={editingTimingData.key}
                                                    onChange={(e) => setEditingTimingData({ ...editingTimingData, key: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') { e.preventDefault(); saveEditingTiming(); }
                                                        if (e.key === 'Escape') { e.preventDefault(); cancelEditingTiming(); }
                                                    }}
                                                    className="w-full rounded text-xs border-gray-300 font-mono bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English Label</label>
                                                <input
                                                    type="text"
                                                    value={editingTimingData.label_en}
                                                    onChange={(e) => setEditingTimingData({ ...editingTimingData, label_en: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') { e.preventDefault(); saveEditingTiming(); }
                                                        if (e.key === 'Escape') { e.preventDefault(); cancelEditingTiming(); }
                                                    }}
                                                    className="w-full rounded text-xs border-gray-300 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Bengali Label</label>
                                                <input
                                                    type="text"
                                                    value={editingTimingData.label_bn}
                                                    onChange={(e) => setEditingTimingData({ ...editingTimingData, label_bn: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') { e.preventDefault(); saveEditingTiming(); }
                                                        if (e.key === 'Escape') { e.preventDefault(); cancelEditingTiming(); }
                                                    }}
                                                    className="w-full rounded text-xs border-gray-300 bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={cancelEditingTiming}
                                                className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-medium cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={saveEditingTiming}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                            >
                                                <span>✓</span> Update
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                {t.key}
                                            </span>
                                            <span className="font-semibold text-gray-900">{t.label_en}</span>
                                            {t.label_bn && <span className="text-gray-500">({t.label_bn})</span>}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => startEditingTiming(idx)}
                                                className="text-gray-500 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                title="Edit option"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeTiming(t.key)}
                                                className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                title="Delete option"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                        <span className="text-xs font-semibold text-gray-700 block">+ Add New Timing Option:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Key (e.g. bedtime, hourly)"
                                value={newTiming.key}
                                onChange={(e) => setNewTiming({ ...newTiming, key: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTiming(); } }}
                                className="rounded text-xs border-gray-300"
                            />
                            <input
                                type="text"
                                placeholder="English Label (e.g. Bedtime)"
                                value={newTiming.label_en}
                                onChange={(e) => setNewTiming({ ...newTiming, label_en: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTiming(); } }}
                                className="rounded text-xs border-gray-300"
                            />
                            <input
                                type="text"
                                placeholder="Bengali Label (e.g. ঘুমানোর পূর্বে)"
                                value={newTiming.label_bn}
                                onChange={(e) => setNewTiming({ ...newTiming, label_bn: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTiming(); } }}
                                className="rounded text-xs border-gray-300"
                            />
                        </div>
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={addTiming}
                                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
                            >
                                + Add Timing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab 2: Meal Relation & Dose Units ───────────────────────────── */}
            {activeTab === 'dose' && (
                <div className="space-y-6">
                    {/* Part A: Meal Relations */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Meal Relations (খাবার সম্পর্ক)
                                </h4>
                                <p className="text-[11px] text-gray-500">
                                    Options like Before meal, After meal, With meal, etc.
                                </p>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                            {(config.meal_relations || []).map((m, idx) => (
                                <div key={m.key || idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                    {editingMealRelationIndex === idx ? (
                                        <div className="bg-primary-50/60 p-3 rounded-lg border border-primary-200 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-primary-800 uppercase tracking-wider">
                                                    Edit Meal Relation #{idx + 1}
                                                </span>
                                                <span className="text-[10px] text-gray-500">Press Enter to save, Esc to cancel</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Key</label>
                                                    <input
                                                        type="text"
                                                        value={editingMealRelationData.key}
                                                        onChange={(e) => setEditingMealRelationData({ ...editingMealRelationData, key: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEditingMealRelation(); }
                                                            if (e.key === 'Escape') { e.preventDefault(); cancelEditingMealRelation(); }
                                                        }}
                                                        className="w-full rounded text-xs border-gray-300 font-mono bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English Label</label>
                                                    <input
                                                        type="text"
                                                        value={editingMealRelationData.label_en}
                                                        onChange={(e) => setEditingMealRelationData({ ...editingMealRelationData, label_en: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEditingMealRelation(); }
                                                            if (e.key === 'Escape') { e.preventDefault(); cancelEditingMealRelation(); }
                                                        }}
                                                        className="w-full rounded text-xs border-gray-300 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Bengali Label</label>
                                                    <input
                                                        type="text"
                                                        value={editingMealRelationData.label_bn}
                                                        onChange={(e) => setEditingMealRelationData({ ...editingMealRelationData, label_bn: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEditingMealRelation(); }
                                                            if (e.key === 'Escape') { e.preventDefault(); cancelEditingMealRelation(); }
                                                        }}
                                                        className="w-full rounded text-xs border-gray-300 bg-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={cancelEditingMealRelation}
                                                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-medium cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={saveEditingMealRelation}
                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                                >
                                                    <span>✓</span> Update
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                    {m.key}
                                                </span>
                                                <span className="font-semibold text-gray-900">{m.label_en}</span>
                                                {m.label_bn && <span className="text-gray-500">({m.label_bn})</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingMealRelation(idx)}
                                                    className="text-gray-500 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                    title="Edit relation"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeMealRelation(m.key)}
                                                    className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                    title="Delete relation"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                            <span className="text-[11px] font-semibold text-gray-700 block">+ Add New Meal Relation:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Key (e.g. empty_stomach)"
                                    value={newMealRelation.key}
                                    onChange={(e) => setNewMealRelation({ ...newMealRelation, key: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMealRelation(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="English (e.g. Empty Stomach)"
                                    value={newMealRelation.label_en}
                                    onChange={(e) => setNewMealRelation({ ...newMealRelation, label_en: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMealRelation(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="Bengali (e.g. খালি পেটে)"
                                    value={newMealRelation.label_bn}
                                    onChange={(e) => setNewMealRelation({ ...newMealRelation, label_bn: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMealRelation(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                            </div>
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={addMealRelation}
                                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
                                >
                                    + Add Relation
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Part B: Dose Units */}
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                                    Dose Units (ডোজ ইউনিট)
                                </h4>
                                <p className="text-[11px] text-gray-500">
                                    These units appear in the dose unit dropdown (e.g. Drops, Pills, Tablets, Powder, etc.).
                                </p>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                            {config.dose_units.map((u, idx) => (
                                <div key={u.key || idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                    {editingDoseUnitIndex === idx ? (
                                        <div className="bg-primary-50/60 p-3 rounded-lg border border-primary-200 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-primary-800 uppercase tracking-wider">
                                                    Edit Dose Unit #{idx + 1}
                                                </span>
                                                <span className="text-[10px] text-gray-500">Press Enter to save, Esc to cancel</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Key</label>
                                                    <input
                                                        type="text"
                                                        value={editingDoseUnitData.key}
                                                        onChange={(e) => setEditingDoseUnitData({ ...editingDoseUnitData, key: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEditingDoseUnit(); }
                                                            if (e.key === 'Escape') { e.preventDefault(); cancelEditingDoseUnit(); }
                                                        }}
                                                        className="w-full rounded text-xs border-gray-300 font-mono bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">English Label</label>
                                                    <input
                                                        type="text"
                                                        value={editingDoseUnitData.label_en}
                                                        onChange={(e) => setEditingDoseUnitData({ ...editingDoseUnitData, label_en: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEditingDoseUnit(); }
                                                            if (e.key === 'Escape') { e.preventDefault(); cancelEditingDoseUnit(); }
                                                        }}
                                                        className="w-full rounded text-xs border-gray-300 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Bengali Label</label>
                                                    <input
                                                        type="text"
                                                        value={editingDoseUnitData.label_bn}
                                                        onChange={(e) => setEditingDoseUnitData({ ...editingDoseUnitData, label_bn: e.target.value })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); saveEditingDoseUnit(); }
                                                            if (e.key === 'Escape') { e.preventDefault(); cancelEditingDoseUnit(); }
                                                        }}
                                                        className="w-full rounded text-xs border-gray-300 bg-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={cancelEditingDoseUnit}
                                                    className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-medium cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={saveEditingDoseUnit}
                                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                                >
                                                    <span>✓</span> Update
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                    {u.key}
                                                </span>
                                                <span className="font-semibold text-gray-900">{u.label_en}</span>
                                                {u.label_bn && <span className="text-gray-500">({u.label_bn})</span>}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingDoseUnit(idx)}
                                                    className="text-gray-500 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                    title="Edit unit"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDoseUnit(u.key)}
                                                    className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                    title="Delete unit"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                            <span className="text-[11px] font-semibold text-gray-700 block">+ Add New Dose Unit:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Key (e.g. tablets, spoon, ml)"
                                    value={newDoseUnit.key}
                                    onChange={(e) => setNewDoseUnit({ ...newDoseUnit, key: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoseUnit(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="English (e.g. Tablets)"
                                    value={newDoseUnit.label_en}
                                    onChange={(e) => setNewDoseUnit({ ...newDoseUnit, label_en: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoseUnit(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="Bengali (e.g. ট্যাবলেট)"
                                    value={newDoseUnit.label_bn}
                                    onChange={(e) => setNewDoseUnit({ ...newDoseUnit, label_bn: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoseUnit(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                            </div>
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={addDoseUnit}
                                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
                                >
                                    + Add Unit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab 3: Instructions / Dilution ─────────────────────────────── */}
            {activeTab === 'instructions' && (
                <div className="space-y-4">
                    <p className="text-xs text-gray-600">
                        Predefined dilution and consumption instructions. Doctors can click these presets to quickly auto-fill the instruction field.
                    </p>

                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                        {config.dilution_instructions.map((inst, idx) => (
                            <div key={idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                {editingInstructionIndex === idx ? (
                                    <div className="bg-primary-50/60 p-3 rounded-lg border border-primary-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-primary-800 uppercase tracking-wider">
                                                Edit Instruction Template #{idx + 1}
                                            </span>
                                            <span className="text-[10px] text-gray-500">Press Enter to save, Esc to cancel</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={editingInstructionText}
                                            onChange={(e) => setEditingInstructionText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); saveEditingInstruction(); }
                                                if (e.key === 'Escape') { e.preventDefault(); cancelEditingInstruction(); }
                                            }}
                                            className="w-full rounded text-xs border-gray-300 bg-white"
                                        />
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={cancelEditingInstruction}
                                                className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-medium cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={saveEditingInstruction}
                                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                            >
                                                <span>✓</span> Update
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-900 font-medium">{inst}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => startEditingInstruction(idx)}
                                                className="text-gray-500 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                title="Edit template"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeInstruction(idx)}
                                                className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                title="Delete template"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex gap-2">
                        <input
                            type="text"
                            placeholder="Add reusable instruction phrase (e.g. আধা কাপ পানিতে মিশিয়ে)..."
                            value={newInstruction}
                            onChange={(e) => setNewInstruction(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInstruction(); } }}
                            className="flex-1 rounded text-xs border-gray-300"
                        />
                        <button
                            type="button"
                            onClick={addInstruction}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
                        >
                            + Add Template
                        </button>
                    </div>
                </div>
            )}

            {/* ── Tab 4: Duration & Defaults ─────────────────────────────────── */}
            {activeTab === 'duration' && (
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Quick Duration Presets (Days)
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                            Quick-click day chips available on each medicine row. Click the edit pencil to change days.
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                            {config.duration_presets.map((d, idx) => (
                                <div key={idx}>
                                    {editingDurationIndex === idx ? (
                                        <div className="inline-flex items-center gap-1.5 p-1 bg-primary-50 rounded border border-primary-300 text-xs shadow-xs">
                                            <input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={editingDurationDays}
                                                onChange={(e) => setEditingDurationDays(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') { e.preventDefault(); saveEditingDuration(); }
                                                    if (e.key === 'Escape') { e.preventDefault(); cancelEditingDuration(); }
                                                }}
                                                className="w-14 rounded text-xs border-gray-300 text-center py-0.5 px-1 bg-white"
                                                autoFocus
                                            />
                                            <span className="text-gray-600 font-medium">days</span>
                                            <button
                                                type="button"
                                                onClick={saveEditingDuration}
                                                className="text-emerald-700 hover:text-emerald-800 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-100 cursor-pointer"
                                                title="Save"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEditingDuration}
                                                className="text-gray-500 hover:text-gray-700 font-bold px-1.5 py-0.5 rounded hover:bg-gray-200 cursor-pointer"
                                                title="Cancel"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200 hover:border-gray-300 transition">
                                            <span>{d} days</span>
                                            <button
                                                type="button"
                                                onClick={() => startEditingDuration(idx)}
                                                className="text-gray-400 hover:text-primary-600 transition cursor-pointer"
                                                title="Edit preset"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => removeDurationPreset(d)}
                                                className="text-gray-400 hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                                                title="Remove preset"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex gap-2 items-center">
                        <span className="text-xs font-semibold text-gray-700 shrink-0">+ Add Duration Days:</span>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="e.g. 15"
                            value={newDuration}
                            onChange={(e) => setNewDuration(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDurationPreset(); } }}
                            className="w-24 rounded text-xs border-gray-300 text-center"
                        />
                        <button
                            type="button"
                            onClick={addDurationPreset}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                            + Add Preset
                        </button>
                    </div>

                    {/* Defaults */}
                    <div className="border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Default Duration (Days)</label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={config.default_duration_days}
                                onChange={(e) => setConfig({ ...config, default_duration_days: parseInt(e.target.value, 10) || 7 })}
                                className="w-full rounded text-xs border-gray-300 text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Default Dose Quantity</label>
                            <input
                                type="number"
                                step="0.5"
                                min="0.1"
                                max="100"
                                value={config.default_dose_qty}
                                onChange={(e) => setConfig({ ...config, default_dose_qty: parseFloat(e.target.value) || 5 })}
                                className="w-full rounded text-xs border-gray-300 text-center"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Default Dose Unit</label>
                            <select
                                value={config.default_dose_unit}
                                onChange={(e) => setConfig({ ...config, default_dose_unit: e.target.value })}
                                className="w-full rounded text-xs border-gray-300"
                            >
                                {config.dose_units.map((u) => (
                                    <option key={u.key} value={u.key}>
                                        {u.label_en} {u.label_bn && `(${u.label_bn})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {!inline && (
                    <SecondaryButton onClick={onClose} disabled={saving}>
                        Cancel
                    </SecondaryButton>
                )}
                <PrimaryButton onClick={saveConfiguration} disabled={saving}>
                    {saving ? 'Saving Changes...' : 'Save Configuration'}
                </PrimaryButton>
            </div>
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <div className="p-6">{content}</div>
        </Modal>
    );
}
