import { useEffect, useMemo, useState } from 'react';

export default function RepertoryReferenceReview({ suggestion, medicines = [], config = {}, onCancel, onAdd }) {
    const timingOptions = useMemo(() => config?.timing_options?.length ? config.timing_options : [
        { key: 'morning', label_en: 'Morning' },
        { key: 'night', label_en: 'Night' },
    ], [config]);
    const doseUnits = useMemo(() => config?.dose_units?.length ? config.dose_units : [{ key: 'drops', label_en: 'drops' }], [config]);
    const initialTiming = timingOptions.length > 0 ? [timingOptions[0].key] : [];
    const [medicineId, setMedicineId] = useState(String(suggestion.medicine_id));
    const [doseQty, setDoseQty] = useState(config?.default_dose_qty ?? 5);
    const [doseUnit, setDoseUnit] = useState(config?.default_dose_unit || doseUnits[0].key);
    const [timing, setTiming] = useState(initialTiming);
    const [beforeAfter, setBeforeAfter] = useState('after');
    const [dilutionNote, setDilutionNote] = useState(config?.dilution_instructions?.[0] || 'with half a cup of water');
    const [durationDays, setDurationDays] = useState(config?.default_duration_days ?? 7);
    const [reviewed, setReviewed] = useState({ medicine: false, dose: false, timing: false, duration: false, instructions: false });
    const selectedMedicine = medicines.find((medicine) => String(medicine.id) === medicineId);
    const canAdd = selectedMedicine && Number(doseQty) > 0 && timing.length > 0 && Number(durationDays) > 0 && Object.values(reviewed).every(Boolean);

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    const toggleTiming = (key) => {
        setTiming((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
    };

    const acknowledge = (key, checked) => setReviewed((current) => ({ ...current, [key]: checked }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
            <section role="dialog" aria-modal="true" aria-labelledby="repertory-review-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="repertory-review-title" className="text-lg font-bold text-slate-900">Review repertory reference</h2>
                        <p className="mt-1 text-sm text-slate-600">A repertory match is reference information only. It does not establish effectiveness or suitability and is not a substitute for established medical treatment.</p>
                    </div>
                    <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Close review">×</button>
                </div>
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    Independently assess the case. No patient-specific treatment rule is applied. Review every prescription detail; this process will only add an editable row to the unsaved visit draft.
                </div>

                <div className="mt-5 space-y-4">
                    <label className="block text-sm font-semibold text-slate-800">Medicine choice
                        <select value={medicineId} onChange={(event) => { setMedicineId(event.target.value); acknowledge('medicine', false); }} className="mt-1 block w-full rounded-lg border-slate-300 text-sm">
                            {medicines.filter((medicine) => medicine.is_active).map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name}{medicine.potency ? ` (${medicine.potency})` : ''}</option>)}
                        </select>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reviewed.medicine} onChange={(event) => acknowledge('medicine', event.target.checked)} /> I independently reviewed the medicine selection.</label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-slate-800">Dose quantity
                            <div className="mt-1 flex gap-2">
                                <input type="number" min="0.01" step="any" value={doseQty} onChange={(event) => { setDoseQty(event.target.value); acknowledge('dose', false); }} className="w-full rounded-lg border-slate-300 text-sm" />
                                <select value={doseUnit} onChange={(event) => { setDoseUnit(event.target.value); acknowledge('dose', false); }} className="rounded-lg border-slate-300 text-sm">
                                    {doseUnits.map((unit) => <option key={unit.key} value={unit.key}>{unit.label_en || unit.key}</option>)}
                                </select>
                            </div>
                            <span className="mt-1 block text-xs font-normal text-slate-500">Shown from clinic defaults; clinician must verify or change it.</span>
                        </label>
                        <label className="block text-sm font-semibold text-slate-800">Duration (days)
                            <input type="number" min="1" max="3650" value={durationDays} onChange={(event) => { setDurationDays(event.target.value); acknowledge('duration', false); }} className="mt-1 block w-full rounded-lg border-slate-300 text-sm" />
                            <span className="mt-1 block text-xs font-normal text-slate-500">Shown from clinic defaults; clinician must verify or change it.</span>
                        </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reviewed.dose} onChange={(event) => acknowledge('dose', event.target.checked)} /> I reviewed the dose quantity and unit.</label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-slate-800">Meal relation
                            <select value={beforeAfter} onChange={(event) => { setBeforeAfter(event.target.value); acknowledge('timing', false); }} className="mt-1 block w-full rounded-lg border-slate-300 text-sm">
                                <option value="before">Before meals</option>
                                <option value="after">After meals</option>
                            </select>
                        </label>
                        <label className="block text-sm font-semibold text-slate-800">Administration instruction
                            <input value={dilutionNote} onChange={(event) => { setDilutionNote(event.target.value); acknowledge('instructions', false); }} maxLength={1000} className="mt-1 block w-full rounded-lg border-slate-300 text-sm" />
                        </label>
                    </div>
                    <fieldset className="rounded-lg border border-slate-200 p-3">
                        <legend className="px-1 text-sm font-semibold text-slate-800">Timing</legend>
                        <div className="flex flex-wrap gap-4">
                            {timingOptions.map((option) => <label key={option.key} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={timing.includes(option.key)} onChange={() => { toggleTiming(option.key); acknowledge('timing', false); }} />{option.label_en}</label>)}
                        </div>
                    </fieldset>
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reviewed.timing} onChange={(event) => acknowledge('timing', event.target.checked)} /> I reviewed the timing.</label>
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reviewed.duration} onChange={(event) => acknowledge('duration', event.target.checked)} /> I reviewed the duration.</label>
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={reviewed.instructions} onChange={(event) => acknowledge('instructions', event.target.checked)} /> I reviewed the administration instruction.</label>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                    <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                    <button type="button" disabled={!canAdd} onClick={() => onAdd({ medicine_id: medicineId, dose_qty: doseQty, dose_unit: doseUnit, timing, before_after: beforeAfter, dilution_note: dilutionNote, duration_days: durationDays })} className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Add reviewed details to draft</button>
                </div>
            </section>
        </div>
    );
}
