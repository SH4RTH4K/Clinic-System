import Modal from '@/Components/Modal';
import ConfirmDialog from '@/Components/ConfirmDialog';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import usePermission from '@/Components/usePermission';
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

export default function PrescriptionConfigModal({
    isOpen = false,
    onClose = () => {},
    initialConfig = {},
    onConfigSaved = () => {},
    inline = false,
}) {
    const can = usePermission();
    const canCreate = can('prescription_options.create');
    const canUpdate = can('prescription_options.update');
    const canDelete = can('prescription_options.delete');
    const canSave = canCreate || canUpdate || canDelete;

    const defaultConfig = {
        timing_options: [
            { key: 'morning', label_en: 'Morning', label_bn: 'সকাল' },
            { key: 'noon', label_en: 'Noon', label_bn: 'দুপুর' },
            { key: 'afternoon', label_en: 'Afternoon', label_bn: 'বিকাল' },
            { key: 'night', label_en: 'Night', label_bn: 'রাত' },
            { key: 'bedtime', label_en: 'Bedtime', label_bn: 'ঘুমানোর পূর্বে' },
            { key: 'as_needed', label_en: 'As needed (SOS)', label_bn: 'প্রয়োজনমতো (SOS)' },
        ],
        dose_units: [
            { key: 'drops', label_en: 'Drops', label_bn: 'ফোটা' },
            { key: 'pills', label_en: 'Pills', label_bn: 'বটিকা' },
            { key: 'tablets', label_en: 'Tablets', label_bn: 'ট্যাবলেট' },
            { key: 'capsules', label_en: 'Capsules', label_bn: 'ক্যাপসুল' },
            { key: 'powder', label_en: 'Powder', label_bn: 'পুরিয়া' },
            { key: 'spoon', label_en: 'Spoon / Tsp', label_bn: 'চামচ' },
            { key: 'ml', label_en: 'ml', label_bn: 'মিলি' },
            { key: 'globules', label_en: 'Globules', label_bn: 'গ্লোবিউলস' },
            { key: 'sachets', label_en: 'Sachets', label_bn: 'স্যাচেট' },
            { key: 'puffs', label_en: 'Puffs (Inhaler)', label_bn: 'পাফ (ইনহেলার)' },
        ],
        meal_relations: [
            { key: 'before', label_en: 'Before meal', label_bn: 'খাবার আগে (Before)' },
            { key: 'after', label_en: 'After meal', label_bn: 'খাবার পরে (After)' },
            { key: 'with', label_en: 'With meal', label_bn: 'খাবারের সাথে' },
            { key: 'empty_stomach', label_en: 'Empty stomach', label_bn: 'খালি পেটে' },
            { key: '30_min_before', label_en: '30 min before meal', label_bn: 'খাবারের ৩০ মিনিট পূর্বে' },
            { key: '1_hr_after', label_en: '1 hour after meal', label_bn: 'খাবারের ১ ঘন্টা পরে' },
        ],
        dilution_instructions: [
            '১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন (with half a cup of water, 10 succussions)',
            'খাবার আগে শিশি ১০ বার ঝাঁকিয়ে নিবেন (shake bottle 10 times before taking)',
            'with half a cup of water (আধা কাপ পানির সাথে মিশিয়ে)',
            'directly on tongue (জিহ্বায় সরাসরি ৩-৫ ফোটা)',
            'chew or dissolve in mouth (চুষে খাবেন / বটিকা)',
            'with lukewarm water (কুসুম গরম পানির সাথে)',
            'empty stomach in the morning (সকালে বাসি/খালি পেটে)',
            'চিনির বড়িতে করে সেব্য (on medicated cane sugar globules)',
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
    const [pendingDelete, setPendingDelete] = useState(null);

    // ── Search Parameter Filter Across All Tabs ────────────────────────────────
    const [presetSearch, setPresetSearch] = useState('');
    const query = presetSearch.toLowerCase().trim();

    const clearAllEdits = () => {
        setEditingTimingIndex(null);
        setEditingMealRelationIndex(null);
        setEditingDoseUnitIndex(null);
        setEditingInstructionIndex(null);
        setEditingDurationIndex(null);
        setErrorMsg('');
    };

    // Filtered lists
    const filteredTimings = useMemo(() => {
        if (!query) return config.timing_options;
        return config.timing_options.filter((t) =>
            t.key.toLowerCase().includes(query) ||
            t.label_en.toLowerCase().includes(query) ||
            (t.label_bn && t.label_bn.toLowerCase().includes(query))
        );
    }, [config.timing_options, query]);

    const filteredMealRelations = useMemo(() => {
        if (!query) return config.meal_relations || [];
        return (config.meal_relations || []).filter((m) =>
            m.key.toLowerCase().includes(query) ||
            m.label_en.toLowerCase().includes(query) ||
            (m.label_bn && m.label_bn.toLowerCase().includes(query))
        );
    }, [config.meal_relations, query]);

    const filteredDoseUnits = useMemo(() => {
        if (!query) return config.dose_units;
        return config.dose_units.filter((u) =>
            u.key.toLowerCase().includes(query) ||
            u.label_en.toLowerCase().includes(query) ||
            (u.label_bn && u.label_bn.toLowerCase().includes(query))
        );
    }, [config.dose_units, query]);

    const filteredInstructions = useMemo(() => {
        if (!query) return config.dilution_instructions;
        return config.dilution_instructions.filter((inst) =>
            inst.toLowerCase().includes(query)
        );
    }, [config.dilution_instructions, query]);

    const filteredDurations = useMemo(() => {
        if (!query) return config.duration_presets;
        return config.duration_presets.filter((d) =>
            String(d).includes(query)
        );
    }, [config.duration_presets, query]);

    // ── 1-Click Fast-Track Clinical Preset Packs ──────────────────────────────
    const applyHomeopathyPack = () => {
        if (!canCreate && !canUpdate) return;
        const homeoTimings = [
            { key: 'morning', label_en: 'Morning', label_bn: 'সকাল' },
            { key: 'noon', label_en: 'Noon', label_bn: 'দুপুর' },
            { key: 'afternoon', label_en: 'Afternoon', label_bn: 'বিকাল' },
            { key: 'night', label_en: 'Night', label_bn: 'রাত' },
            { key: 'bedtime', label_en: 'Bedtime', label_bn: 'ঘুমানোর পূর্বে' },
            { key: 'as_needed', label_en: 'As needed (SOS)', label_bn: 'প্রয়োজনমতো' },
        ];
        const homeoUnits = [
            { key: 'drops', label_en: 'Drops', label_bn: 'ফোটা' },
            { key: 'pills', label_en: 'Pills', label_bn: 'বটিকা' },
            { key: 'globules', label_en: 'Globules', label_bn: 'গ্লোবিউলস' },
            { key: 'powder', label_en: 'Powder', label_bn: 'পুরিয়া' },
            { key: 'spoon', label_en: 'Spoon', label_bn: 'চামচ' },
            { key: 'ml', label_en: 'ml', label_bn: 'মিলি' },
            { key: 'tablets', label_en: 'Trituration Tablets', label_bn: 'ট্যাবলেট' },
        ];
        const homeoMeals = [
            { key: 'before', label_en: 'Before meal', label_bn: 'খাবার আগে' },
            { key: 'after', label_en: 'After meal', label_bn: 'খাবার পরে' },
            { key: 'empty_stomach', label_en: 'Empty stomach', label_bn: 'খালি পেটে' },
            { key: '30_min_before', label_en: '30 min before meal', label_bn: 'খাবারের ৩০ মিনিট পূর্বে' },
        ];
        const homeoInstructions = [
            '১০ ঝাঁকিসহ আধা কাপ পানির সাথে খাবেন (with half a cup of water, 10 succussions)',
            'খাবার আগে শিশি ১০ বার ঝাঁকিয়ে নিবেন (shake bottle 10 times before taking)',
            'with half a cup of water (আধা কাপ পানির সাথে মিশিয়ে)',
            'directly on tongue (জিহ্বায় সরাসরি ৩-৫ ফোটা)',
            'chew or dissolve in mouth (চুষে খাবেন / বটিকা)',
            'with lukewarm water (কুসুম গরম পানির সাথে)',
            'empty stomach in the morning (সকালে বাসি/খালি পেটে)',
            'চিনির বড়িতে করে সেব্য (on medicated cane sugar globules)',
        ];

        setConfig((prev) => {
            const mergedTimings = [...prev.timing_options];
            homeoTimings.forEach((ht) => {
                if (!mergedTimings.some((t) => t.key === ht.key)) mergedTimings.push(ht);
            });
            const mergedUnits = [...prev.dose_units];
            homeoUnits.forEach((hu) => {
                if (!mergedUnits.some((u) => u.key === hu.key)) mergedUnits.push(hu);
            });
            const mergedMeals = [...prev.meal_relations];
            homeoMeals.forEach((hm) => {
                if (!mergedMeals.some((m) => m.key === hm.key)) mergedMeals.push(hm);
            });
            const mergedInstructions = Array.from(new Set([...prev.dilution_instructions, ...homeoInstructions]));

            return {
                ...prev,
                timing_options: mergedTimings,
                dose_units: mergedUnits,
                meal_relations: mergedMeals,
                dilution_instructions: mergedInstructions,
                default_dose_unit: 'drops',
            };
        });
        setPresetSearch('');
        setErrorMsg('');
    };

    const applyAllopathyPack = () => {
        if (!canCreate && !canUpdate) return;
        const allopathUnits = [
            { key: 'tablets', label_en: 'Tablets', label_bn: 'ট্যাবলেট' },
            { key: 'capsules', label_en: 'Capsules', label_bn: 'ক্যাপসুল' },
            { key: 'syrup', label_en: 'Syrup / Tsp', label_bn: 'সিরাপ (চামচ)' },
            { key: 'sachets', label_en: 'Sachets', label_bn: 'স্যাচেট' },
            { key: 'puffs', label_en: 'Puffs (Inhaler)', label_bn: 'পাফ' },
            { key: 'drops', label_en: 'Eye/Ear Drops', label_bn: 'ড্রপ্স' },
            { key: 'cream', label_en: 'Ointment / Cream', label_bn: 'মলম / ক্রিম' },
        ];
        const allopathMeals = [
            { key: 'after', label_en: 'After meal', label_bn: 'ভরা পেটে (খাবার পরে)' },
            { key: 'before', label_en: 'Before meal', label_bn: 'খালি পেটে (খাবার আগে)' },
            { key: 'with', label_en: 'With meal', label_bn: 'খাবারের সাথে' },
            { key: 'bedtime', label_en: 'Bedtime', label_bn: 'রাতে শোয়ার সময়' },
            { key: '30_min_before', label_en: '30 min before meal', label_bn: 'খাবারের ৩০ মিনিট পূর্বে' },
        ];

        setConfig((prev) => {
            const mergedUnits = [...prev.dose_units];
            allopathUnits.forEach((au) => {
                if (!mergedUnits.some((u) => u.key === au.key)) mergedUnits.push(au);
            });
            const mergedMeals = [...prev.meal_relations];
            allopathMeals.forEach((am) => {
                if (!mergedMeals.some((m) => m.key === am.key)) mergedMeals.push(am);
            });
            return {
                ...prev,
                dose_units: mergedUnits,
                meal_relations: mergedMeals,
            };
        });
        setPresetSearch('');
        setErrorMsg('');
    };

    const resetToDefaults = () => {
        if (!canCreate && !canUpdate) return;
        setConfig({ ...defaultConfig });
        setPresetSearch('');
        setErrorMsg('');
    };

    // ── 1. Timing Options State & Handlers ─────────────────────────────────────
    const [newTiming, setNewTiming] = useState({ key: '', label_en: '', label_bn: '' });
    const [editingTimingIndex, setEditingTimingIndex] = useState(null);
    const [editingTimingData, setEditingTimingData] = useState({ key: '', label_en: '', label_bn: '' });

    const addTiming = (e) => {
        if (!canCreate) return;
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
        if (!canDelete) return;
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
        if (!canUpdate) return;
        clearAllEdits();
        setEditingTimingIndex(index);
        setEditingTimingData({ ...config.timing_options[index] });
    };

    const saveEditingTiming = () => {
        if (!canUpdate) return;
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
        if (!canCreate) return;
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
        if (!canDelete) return;
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
        if (!canUpdate) return;
        clearAllEdits();
        setEditingMealRelationIndex(index);
        setEditingMealRelationData({ ...config.meal_relations[index] });
    };

    const saveEditingMealRelation = () => {
        if (!canUpdate) return;
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
        if (!canCreate) return;
        if (e && e.preventDefault) e.preventDefault();
        if (!newDoseUnit.key || !newDoseUnit.label_en) return;
        const normalizedKey = newDoseUnit.key.toLowerCase().trim().replace(/\s+/g, '_');
        if (config.dose_units.some((u) => u.key === normalizedKey)) {
            setErrorMsg(`Dose unit key "${normalizedKey}" already exists.`);
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
        if (!canDelete) return;
        if (config.dose_units.length <= 1) {
            setErrorMsg('At least one dose unit must remain.');
            return;
        }
        if (keyToRemove === config.default_dose_unit) {
            setErrorMsg(`Cannot remove "${keyToRemove}" because it is currently selected as the Default Dose Unit. Please change the default under Tab 4 first.`);
            return;
        }
        setConfig((prev) => ({
            ...prev,
            dose_units: prev.dose_units.filter((u) => u.key !== keyToRemove),
        }));
        if (editingDoseUnitIndex !== null) clearAllEdits();
    };

    const startEditingDoseUnit = (index) => {
        if (!canUpdate) return;
        clearAllEdits();
        setEditingDoseUnitIndex(index);
        setEditingDoseUnitData({ ...config.dose_units[index] });
    };

    const saveEditingDoseUnit = () => {
        if (!canUpdate) return;
        if (editingDoseUnitIndex === null) return;
        const { key, label_en, label_bn } = editingDoseUnitData;
        if (!key || !label_en) {
            setErrorMsg('Key and English label are required.');
            return;
        }
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        const existingIndex = config.dose_units.findIndex((u) => u.key === normalizedKey);
        if (existingIndex !== -1 && existingIndex !== editingDoseUnitIndex) {
            setErrorMsg(`Dose unit key "${normalizedKey}" already exists.`);
            return;
        }
        const oldKey = config.dose_units[editingDoseUnitIndex]?.key;
        const updated = [...config.dose_units];
        updated[editingDoseUnitIndex] = {
            key: normalizedKey,
            label_en: label_en.trim(),
            label_bn: (label_bn || '').trim(),
        };

        // If the edited key was the default, update default_dose_unit as well
        let newDefault = config.default_dose_unit;
        if (oldKey === config.default_dose_unit && normalizedKey !== oldKey) {
            newDefault = normalizedKey;
        }

        setConfig((prev) => ({
            ...prev,
            dose_units: updated,
            default_dose_unit: newDefault,
        }));
        setEditingDoseUnitIndex(null);
        setErrorMsg('');
    };

    const cancelEditingDoseUnit = () => {
        setEditingDoseUnitIndex(null);
        setErrorMsg('');
    };

    // ── 3. Dilution Instructions State & Handlers ─────────────────────────────
    const [newInstruction, setNewInstruction] = useState('');
    const [editingInstructionIndex, setEditingInstructionIndex] = useState(null);
    const [editingInstructionText, setEditingInstructionText] = useState('');

    const addInstruction = (e) => {
        if (!canCreate) return;
        if (e && e.preventDefault) e.preventDefault();
        if (!newInstruction.trim()) return;
        if (config.dilution_instructions.includes(newInstruction.trim())) {
            setErrorMsg('Instruction already exists.');
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
        if (!canDelete) return;
        setConfig((prev) => ({
            ...prev,
            dilution_instructions: prev.dilution_instructions.filter((_, i) => i !== indexToRemove),
        }));
        if (editingInstructionIndex !== null) clearAllEdits();
    };

    const startEditingInstruction = (index) => {
        if (!canUpdate) return;
        clearAllEdits();
        setEditingInstructionIndex(index);
        setEditingInstructionText(config.dilution_instructions[index]);
    };

    const saveEditingInstruction = () => {
        if (!canUpdate) return;
        if (editingInstructionIndex === null) return;
        if (!editingInstructionText.trim()) {
            setErrorMsg('Instruction text cannot be empty.');
            return;
        }
        const updated = [...config.dilution_instructions];
        updated[editingInstructionIndex] = editingInstructionText.trim();
        setConfig((prev) => ({ ...prev, dilution_instructions: updated }));
        setEditingInstructionIndex(null);
        setErrorMsg('');
    };

    const cancelEditingInstruction = () => {
        setEditingInstructionIndex(null);
        setErrorMsg('');
    };

    // ── 4. Duration Presets State & Handlers ──────────────────────────────────
    const [newDuration, setNewDuration] = useState('');
    const [editingDurationIndex, setEditingDurationIndex] = useState(null);
    const [editingDurationDays, setEditingDurationDays] = useState('');

    const addDurationPreset = (e) => {
        if (!canCreate) return;
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
        if (!canDelete) return;
        setConfig((prev) => ({
            ...prev,
            duration_presets: prev.duration_presets.filter((d) => d !== daysToRemove),
        }));
        if (editingDurationIndex !== null) clearAllEdits();
    };

    const requestDelete = (type, value, label) => {
        if (!canDelete) return;
        if (type === 'doseUnit' && value === config.default_dose_unit) {
            setErrorMsg(`Cannot delete "${value}" because it is currently selected as the Default Dose Unit in Tab 4. Change default unit first.`);
            return;
        }
        setPendingDelete({ type, value, label });
    };

    const confirmDelete = () => {
        if (!canDelete || !pendingDelete) return;

        const { type, value } = pendingDelete;
        const removeOption = {
            timing: removeTiming,
            mealRelation: removeMealRelation,
            doseUnit: removeDoseUnit,
            instruction: removeInstruction,
            duration: removeDurationPreset,
        }[type];

        removeOption(value);
        setPendingDelete(null);
    };

    const startEditingDuration = (index) => {
        if (!canUpdate) return;
        clearAllEdits();
        setEditingDurationIndex(index);
        setEditingDurationDays(String(config.duration_presets[index]));
    };

    const saveEditingDuration = () => {
        if (!canUpdate) return;
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
        if (!canSave) return;
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
            <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <span>⚙️</span> Prescription Options &amp; Presets Configuration
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Configure available timings, meal relations, dose units, dilution instructions, and duration presets.
                    </p>
                </div>

                {/* 1-Click Fast-Track Preset Packs Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        onClick={applyHomeopathyPack}
                        disabled={!canCreate && !canUpdate}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition inline-flex items-center gap-1 shadow-2xs"
                        title="Load classical homeopathic dilution and succussion presets"
                    >
                        <span>🌿</span> Homeopathy Pack
                    </button>
                    <button
                        type="button"
                        onClick={applyAllopathyPack}
                        disabled={!canCreate && !canUpdate}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition inline-flex items-center gap-1 shadow-2xs"
                        title="Load general practice capsules, syrups, sachets, and meal rules"
                    >
                        <span>💊</span> Allopathy Pack
                    </button>
                    <button
                        type="button"
                        onClick={resetToDefaults}
                        disabled={!canCreate && !canUpdate}
                        className="px-2 py-1 text-xs font-medium rounded-md bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition inline-flex items-center gap-1"
                        title="Reset all settings to initial safe defaults"
                    >
                        <span>🔄</span> Defaults
                    </button>
                </div>
            </div>

            {/* Error or Success notification */}
            {errorMsg && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center justify-between">
                    <span>{errorMsg}</span>
                    <button type="button" onClick={() => setErrorMsg('')} className="font-bold text-red-500 hover:text-red-700">✕</button>
                </div>
            )}
            {savedNotice && (
                <div className="rounded-md bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200 flex items-center gap-2">
                    <span>✓</span> Configuration saved successfully!
                </div>
            )}

            {/* Real-Time Preset Search Filter Bar */}
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search presets by English, Bengali, or key (e.g. ঝাঁকি, drops, সকাল, 30_min)..."
                    className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg text-xs focus:ring-teal-500 focus:border-teal-500 bg-white shadow-2xs"
                />
                {presetSearch && (
                    <button
                        type="button"
                        onClick={() => setPresetSearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 text-xs font-bold"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Navigation Tabs (Responsive grid, no horizontal scrollbar) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-100 p-1.5 rounded-lg text-xs font-semibold">
                <button
                    type="button"
                    onClick={() => { setActiveTab('timing'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'timing'
                            ? 'bg-white text-teal-800 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>1. Timing ({config.timing_options.length})</span>
                    <span className="text-[10px] text-gray-500 font-normal">খাওয়ার সময়</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('dose'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'dose'
                            ? 'bg-white text-teal-800 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>2. Meal &amp; Dose ({(config.meal_relations?.length || 0) + config.dose_units.length})</span>
                    <span className="text-[10px] text-gray-500 font-normal">খাবার সম্পর্ক ও ডোজ</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('instructions'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'instructions'
                            ? 'bg-white text-teal-800 font-bold shadow-xs'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                >
                    <span>3. Instructions ({config.dilution_instructions.length})</span>
                    <span className="text-[10px] text-gray-500 font-normal">সেবনবিধি ও ডিলিউশন</span>
                </button>
                <button
                    type="button"
                    onClick={() => { setActiveTab('duration'); clearAllEdits(); }}
                    className={`py-2 px-2.5 rounded-md text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        activeTab === 'duration'
                            ? 'bg-white text-teal-800 font-bold shadow-xs'
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
                    <div className="flex items-center justify-between text-xs text-gray-600">
                        <p>These options appear as checkboxes for each prescribed medicine row. You can add, edit, or delete items.</p>
                        {query && <span className="font-semibold text-teal-700">Matching {filteredTimings.length} of {config.timing_options.length}</span>}
                    </div>

                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                        {filteredTimings.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">No timing options match &quot;{presetSearch}&quot;.</div>
                        ) : (
                            filteredTimings.map((t, idx) => {
                                const originalIndex = config.timing_options.findIndex((item) => item.key === t.key);
                                return (
                                    <div key={t.key || idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                        {editingTimingIndex === originalIndex ? (
                                            <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                                                        Edit Timing Option #{originalIndex + 1}
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
                                                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                                    >
                                                        <span>✓</span> Update
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Desktop View */}
                                                <div className="hidden sm:flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                            {t.key}
                                                        </span>
                                                        <span className="font-semibold text-gray-900">{t.label_en}</span>
                                                        {t.label_bn && <span className="text-gray-600 font-bengali">({t.label_bn})</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingTiming(originalIndex)}
                                                            disabled={!canUpdate}
                                                            className="text-gray-500 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                        >
                                                            <span>✏️</span> Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDelete('timing', t.key, t.label_en)}
                                                            disabled={!canDelete}
                                                            className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mobile High-Density Touch Card */}
                                                <div className="block sm:hidden space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] text-gray-700 font-medium">
                                                            {t.key}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-900">{t.label_en}</span>
                                                    </div>
                                                    {t.label_bn && (
                                                        <div className="text-xs text-gray-600 font-bengali">
                                                            {t.label_bn}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingTiming(originalIndex)}
                                                            disabled={!canUpdate}
                                                            className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
                                                        >
                                                            Edit Option
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDelete('timing', t.key, t.label_en)}
                                                            disabled={!canDelete}
                                                            className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                        <span className="text-xs font-semibold text-gray-700 block">+ Add New Timing Option:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Key (e.g. bedtime, as_needed)"
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
                                disabled={!canCreate}
                                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
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
                                    Options like Before meal, After meal, With meal, 30 min before, etc.
                                </p>
                            </div>
                            {query && <span className="text-xs font-semibold text-teal-700">Matching {filteredMealRelations.length} of {config.meal_relations?.length || 0}</span>}
                        </div>

                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                            {filteredMealRelations.length === 0 ? (
                                <div className="p-3 text-center text-xs text-gray-400">No meal relations match &quot;{presetSearch}&quot;.</div>
                            ) : (
                                filteredMealRelations.map((m, idx) => {
                                    const originalIndex = (config.meal_relations || []).findIndex((item) => item.key === m.key);
                                    return (
                                        <div key={m.key || idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                            {editingMealRelationIndex === originalIndex ? (
                                                <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                                                            Edit Meal Relation #{originalIndex + 1}
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
                                                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                                        >
                                                            <span>✓</span> Update
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {/* Desktop View */}
                                                    <div className="hidden sm:flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                                {m.key}
                                                            </span>
                                                            <span className="font-semibold text-gray-900">{m.label_en}</span>
                                                            {m.label_bn && <span className="text-gray-600 font-bengali">({m.label_bn})</span>}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditingMealRelation(originalIndex)}
                                                                disabled={!canUpdate}
                                                                className="text-gray-500 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                            >
                                                                <span>✏️</span> Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => requestDelete('mealRelation', m.key, m.label_en)}
                                                                disabled={!canDelete}
                                                                className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Mobile High-Density Touch Card */}
                                                    <div className="block sm:hidden space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] text-gray-700 font-medium">
                                                                {m.key}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-900">{m.label_en}</span>
                                                        </div>
                                                        {m.label_bn && (
                                                            <div className="text-xs text-gray-600 font-bengali">
                                                                {m.label_bn}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditingMealRelation(originalIndex)}
                                                                disabled={!canUpdate}
                                                                className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
                                                            >
                                                                Edit Relation
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => requestDelete('mealRelation', m.key, m.label_en)}
                                                                disabled={!canDelete}
                                                                className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                            <span className="text-[11px] font-semibold text-gray-700 block">+ Add New Meal Relation:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Key (e.g. 30_min_before)"
                                    value={newMealRelation.key}
                                    onChange={(e) => setNewMealRelation({ ...newMealRelation, key: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMealRelation(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="English (e.g. 30 min before meal)"
                                    value={newMealRelation.label_en}
                                    onChange={(e) => setNewMealRelation({ ...newMealRelation, label_en: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMealRelation(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="Bengali (e.g. খাবারের ৩০ মিনিট পূর্বে)"
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
                                    disabled={!canCreate}
                                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
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
                                    Units like Drops, Pills, Tablets, Capsules, Sachets, Spoon, etc.
                                </p>
                            </div>
                            {query && <span className="text-xs font-semibold text-teal-700">Matching {filteredDoseUnits.length} of {config.dose_units.length}</span>}
                        </div>

                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                            {filteredDoseUnits.length === 0 ? (
                                <div className="p-3 text-center text-xs text-gray-400">No dose units match &quot;{presetSearch}&quot;.</div>
                            ) : (
                                filteredDoseUnits.map((u, idx) => {
                                    const originalIndex = config.dose_units.findIndex((item) => item.key === u.key);
                                    const isDefaultUnit = u.key === config.default_dose_unit;
                                    return (
                                        <div key={u.key || idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                            {editingDoseUnitIndex === originalIndex ? (
                                                <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                                                            Edit Dose Unit #{originalIndex + 1}
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
                                                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                                        >
                                                            <span>✓</span> Update
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    {/* Desktop View */}
                                                    <div className="hidden sm:flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">
                                                                {u.key}
                                                            </span>
                                                            <span className="font-semibold text-gray-900">{u.label_en}</span>
                                                            {u.label_bn && <span className="text-gray-600 font-bengali">({u.label_bn})</span>}
                                                            {isDefaultUnit && (
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                                    Default Unit
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditingDoseUnit(originalIndex)}
                                                                disabled={!canUpdate}
                                                                className="text-gray-500 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                            >
                                                                <span>✏️</span> Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => requestDelete('doseUnit', u.key, u.label_en)}
                                                                disabled={!canDelete}
                                                                className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                                title={isDefaultUnit ? 'Cannot delete default unit' : 'Delete unit'}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Mobile High-Density Touch Card */}
                                                    <div className="block sm:hidden space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[11px] text-gray-700 font-medium">
                                                                    {u.key}
                                                                </span>
                                                                {isDefaultUnit && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                                        Default
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-900">{u.label_en}</span>
                                                        </div>
                                                        {u.label_bn && (
                                                            <div className="text-xs text-gray-600 font-bengali">
                                                                {u.label_bn}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditingDoseUnit(originalIndex)}
                                                                disabled={!canUpdate}
                                                                className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
                                                            >
                                                                Edit Unit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => requestDelete('doseUnit', u.key, u.label_en)}
                                                                disabled={!canDelete}
                                                                className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                            <span className="text-[11px] font-semibold text-gray-700 block">+ Add New Dose Unit:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                    type="text"
                                    placeholder="Key (e.g. capsules, sachets, puffs)"
                                    value={newDoseUnit.key}
                                    onChange={(e) => setNewDoseUnit({ ...newDoseUnit, key: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoseUnit(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="English (e.g. Capsules)"
                                    value={newDoseUnit.label_en}
                                    onChange={(e) => setNewDoseUnit({ ...newDoseUnit, label_en: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDoseUnit(); } }}
                                    className="rounded text-xs border-gray-300"
                                />
                                <input
                                    type="text"
                                    placeholder="Bengali (e.g. ক্যাপসুল)"
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
                                    disabled={!canCreate}
                                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
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
                    <div className="flex items-center justify-between text-xs text-gray-600">
                        <p>Predefined dilution and succussion instructions. Doctors click these to quickly auto-fill prescription lines.</p>
                        {query && <span className="font-semibold text-teal-700">Matching {filteredInstructions.length} of {config.dilution_instructions.length}</span>}
                    </div>

                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-md bg-white">
                        {filteredInstructions.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400">No instructions match &quot;{presetSearch}&quot;.</div>
                        ) : (
                            filteredInstructions.map((inst, idx) => {
                                const originalIndex = config.dilution_instructions.findIndex((item) => item === inst);
                                return (
                                    <div key={idx} className="p-2.5 text-xs transition hover:bg-gray-50/50">
                                        {editingInstructionIndex === originalIndex ? (
                                            <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">
                                                        Edit Instruction Template #{originalIndex + 1}
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
                                                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                                    >
                                                        <span>✓</span> Update
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Desktop View */}
                                                <div className="hidden sm:flex items-center justify-between">
                                                    <span className="text-gray-900 font-medium leading-relaxed">{inst}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingInstruction(originalIndex)}
                                                            disabled={!canUpdate}
                                                            className="text-gray-500 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                                                        >
                                                            <span>✏️</span> Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDelete('instruction', originalIndex, inst)}
                                                            disabled={!canDelete}
                                                            className="text-gray-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mobile Touch Card */}
                                                <div className="block sm:hidden space-y-2">
                                                    <div className="text-xs font-medium text-gray-900 leading-relaxed">
                                                        {inst}
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEditingInstruction(originalIndex)}
                                                            disabled={!canUpdate}
                                                            className="flex-1 min-h-[44px] flex items-center justify-center text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition"
                                                        >
                                                            Edit Template
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDelete('instruction', originalIndex, inst)}
                                                            disabled={!canDelete}
                                                            className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Add reusable instruction phrase (e.g. ১০ ঝাঁকিসহ আধা কাপ পানিতে মিশিয়ে)..."
                            value={newInstruction}
                            onChange={(e) => setNewInstruction(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addInstruction(); } }}
                            className="flex-1 rounded text-xs border-gray-300"
                        />
                        <button
                            type="button"
                            onClick={addInstruction}
                            disabled={!canCreate}
                            className="px-3 py-2 sm:py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center"
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
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-gray-700 mb-1">
                                Quick Duration Presets (Days)
                            </label>
                            {query && <span className="text-xs font-semibold text-teal-700">Matching {filteredDurations.length} of {config.duration_presets.length}</span>}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                            Quick-click day chips available on each medicine row. Click pencil to edit days.
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                            {filteredDurations.map((d, idx) => {
                                const originalIndex = config.duration_presets.findIndex((item) => item === d);
                                return (
                                    <div key={idx}>
                                        {editingDurationIndex === originalIndex ? (
                                            <div className="inline-flex items-center gap-1.5 p-1 bg-teal-50 rounded border border-teal-300 text-xs shadow-xs">
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
                                                    className="w-14 rounded text-xs border-gray-300 text-center py-0.5 px-1 bg-white font-mono"
                                                    autoFocus
                                                />
                                                <span className="text-gray-600 font-medium">days</span>
                                                <button
                                                    type="button"
                                                    onClick={saveEditingDuration}
                                                    disabled={!canUpdate}
                                                    className="text-teal-700 hover:text-teal-800 font-bold px-1.5 py-0.5 rounded hover:bg-teal-100 cursor-pointer"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelEditingDuration}
                                                    className="text-gray-500 hover:text-gray-700 font-bold px-1.5 py-0.5 rounded hover:bg-gray-200 cursor-pointer"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-200 hover:border-gray-300 transition">
                                                <span className="font-mono">{d} days</span>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingDuration(originalIndex)}
                                                    disabled={!canUpdate}
                                                    className="text-gray-400 hover:text-teal-600 transition cursor-pointer"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => requestDelete('duration', d, `${d} days`)}
                                                    disabled={!canDelete}
                                                    className="text-gray-400 hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <span className="text-xs font-semibold text-gray-700 shrink-0">+ Add Duration Days:</span>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="e.g. 21"
                            value={newDuration}
                            onChange={(e) => setNewDuration(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDurationPreset(); } }}
                            className="w-full sm:w-28 rounded text-xs border-gray-300 text-center font-mono"
                        />
                        <button
                            type="button"
                            onClick={addDurationPreset}
                            disabled={!canCreate}
                            className="px-3 py-2 sm:py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center"
                        >
                            + Add Preset
                        </button>
                    </div>

                    {/* Baseline Defaults */}
                    <div className="border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Default Duration (Days)</label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={config.default_duration_days}
                                disabled={!canUpdate}
                                onChange={(e) => setConfig({ ...config, default_duration_days: parseInt(e.target.value, 10) || 7 })}
                                className="w-full rounded text-xs border-gray-300 text-center font-mono"
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
                                disabled={!canUpdate}
                                onChange={(e) => setConfig({ ...config, default_dose_qty: parseFloat(e.target.value) || 5 })}
                                className="w-full rounded text-xs border-gray-300 text-center font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Default Dose Unit</label>
                            <select
                                value={config.default_dose_unit}
                                disabled={!canUpdate}
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
                <PrimaryButton onClick={saveConfiguration} disabled={!canSave || saving} className="bg-teal-600 hover:bg-teal-700">
                    {saving ? 'Saving Changes...' : 'Save Configuration'}
                </PrimaryButton>
            </div>
            <ConfirmDialog
                isOpen={Boolean(pendingDelete)}
                title="Delete prescription option?"
                message={`Remove ${pendingDelete?.label ?? 'this option'} from the pending configuration? Save Configuration afterward to apply the change.`}
                confirmLabel="Delete option"
                isDestructive
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="3xl">
            <div className="p-6">{content}</div>
        </Modal>
    );
}
