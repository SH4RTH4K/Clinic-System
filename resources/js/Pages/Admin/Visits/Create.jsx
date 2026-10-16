import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Create({ patient, patients, symptoms, medicines, defaultAdvice, defaultFood }) {
    const { data, setData, post, processing } = useForm({
        patient_id: patient ? patient.id : '',
        visit_date: new Date().toISOString().split('T')[0],
        age_at_visit: patient ? patient.age_years : '',
        chief_complaint: '',
        bp_symptoms_notes: '',
        diagnosis_notes: '',
        follow_up_date: '',
        status: 'draft',
        symptoms: [],
        prescription_items: [],
        advice_items: defaultAdvice.map(a => a.id),
        food_restrictions: defaultFood.map(f => f.id),
    });

    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (data.symptoms.length > 0) {
            axios.get(route('admin.visits.suggestions', { symptoms: data.symptoms })).then(res => {
                setSuggestions(res.data);
            });
        } else {
            setSuggestions([]);
        }
    }, [data.symptoms]);

    const addPrescriptionRow = (medicine_id = '') => {
        setData('prescription_items', [...data.prescription_items, { medicine_id, timing: [], before_after: 'after', dose_qty: 1, dose_unit: 'drops', dilution_note: 'with half a cup of water', duration_days: 7 }]);
    };

    const submit = (e, status) => {
        e.preventDefault();
        data.status = status;
        post(route('admin.visits.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">New Visit</h2>}>
            <Head title="New Visit" />
            <div className="py-6 max-w-7xl mx-auto px-4"><div className="bg-white p-6 shadow-sm sm:rounded-lg">
                <form className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block">Patient</label>
                            <select value={data.patient_id} onChange={e => {
                                setData('patient_id', e.target.value);
                                const p = patients.find(x => x.id == e.target.value);
                                if (p) setData('age_at_visit', p.age_years);
                            }} className="w-full rounded" required>
                                <option value="">Select Patient</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.patient_no} {p.patient_series} - {p.name}</option>)}
                            </select>
                        </div>
                        <div><label className="block">Date</label><input type="date" value={data.visit_date} onChange={e => setData('visit_date', e.target.value)} className="w-full rounded" required/></div>
                        <div><label className="block">Age at visit</label><input type="number" value={data.age_at_visit} onChange={e => setData('age_at_visit', e.target.value)} className="w-full rounded" /></div>
                    </div>
                    
                    <div>
                        <label className="block font-bold">Chief Complaint & Notes</label>
                        <textarea value={data.chief_complaint} onChange={e => setData('chief_complaint', e.target.value)} className="w-full rounded mb-2" placeholder="Chief Complaint" required></textarea>
                        <textarea value={data.bp_symptoms_notes} onChange={e => setData('bp_symptoms_notes', e.target.value)} className="w-full rounded" placeholder="B.P / Free text symptoms notes"></textarea>
                    </div>

                    <div>
                        <label className="block font-bold mb-2">Tag Symptoms</label>
                        <div className="grid grid-cols-3 gap-2 border p-4 rounded max-h-48 overflow-y-auto">
                            {symptoms.map(s => (
                                <label key={s.id} className="inline-flex items-center">
                                    <input type="checkbox" value={s.id} checked={data.symptoms.includes(s.id)} onChange={e => {
                                        if (e.target.checked) setData('symptoms', [...data.symptoms, s.id]);
                                        else setData('symptoms', data.symptoms.filter(id => id !== s.id));
                                    }} className="rounded" />
                                    <span className="ml-2 text-sm">{s.name_en} {s.name_bn && `(${s.name_bn})`}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded">
                            <h4 className="font-bold text-blue-800">Suggested Medicines</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {suggestions.map(sugg => (
                                    <button type="button" key={sugg.medicine_id} onClick={() => addPrescriptionRow(sugg.medicine_id)} className="bg-white border border-blue-300 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-100">
                                        + {sugg.medicine_name} (Matches: {sugg.match_score})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block font-bold">Prescription</label>
                            <button type="button" onClick={() => addPrescriptionRow()} className="text-sm bg-gray-200 px-3 py-1 rounded">Add Row</button>
                        </div>
                        <div className="space-y-2">
                            {data.prescription_items.map((item, idx) => (
                                <div key={idx} className="flex space-x-2 items-center border p-2 rounded">
                                    <select value={item.medicine_id} onChange={e => {
                                        let items = [...data.prescription_items];
                                        items[idx].medicine_id = e.target.value;
                                        setData('prescription_items', items);
                                    }} className="w-1/4 rounded text-sm" required>
                                        <option value="">Select Medicine</option>
                                        {medicines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.potency})</option>)}
                                    </select>
                                    
                                    <div className="flex flex-col text-xs space-y-1">
                                        {['morning', 'noon', 'afternoon', 'night'].map(t => (
                                            <label key={t} className="inline-flex items-center"><input type="checkbox" checked={item.timing.includes(t)} onChange={e => {
                                                let items = [...data.prescription_items];
                                                if (e.target.checked) items[idx].timing.push(t);
                                                else items[idx].timing = items[idx].timing.filter(x => x !== t);
                                                setData('prescription_items', items);
                                            }}/> <span className="ml-1 capitalize">{t}</span></label>
                                        ))}
                                    </div>

                                    <select value={item.before_after} onChange={e => { let items = [...data.prescription_items]; items[idx].before_after = e.target.value; setData('prescription_items', items); }} className="w-24 rounded text-sm">
                                        <option value="before">Before</option><option value="after">After</option>
                                    </select>
                                    
                                    <input type="number" value={item.dose_qty} onChange={e => { let items = [...data.prescription_items]; items[idx].dose_qty = e.target.value; setData('prescription_items', items); }} className="w-16 rounded text-sm" />
                                    
                                    <select value={item.dose_unit} onChange={e => { let items = [...data.prescription_items]; items[idx].dose_unit = e.target.value; setData('prescription_items', items); }} className="w-24 rounded text-sm">
                                        <option value="drops">Drops</option><option value="pills">Pills</option>
                                    </select>
                                    
                                    <input type="text" value={item.dilution_note} onChange={e => { let items = [...data.prescription_items]; items[idx].dilution_note = e.target.value; setData('prescription_items', items); }} className="flex-1 rounded text-sm" placeholder="Dilution note" />
                                    
                                    <input type="number" placeholder="Days" value={item.duration_days} onChange={e => { let items = [...data.prescription_items]; items[idx].duration_days = e.target.value; setData('prescription_items', items); }} className="w-20 rounded text-sm" />

                                    <button type="button" onClick={() => setData('prescription_items', data.prescription_items.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2">X</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold mb-2">Advice</label>
                            {defaultAdvice.map(a => (
                                <div key={a.id}><label className="inline-flex items-center">
                                    <input type="checkbox" checked={data.advice_items.includes(a.id)} onChange={e => {
                                        if (e.target.checked) setData('advice_items', [...data.advice_items, a.id]);
                                        else setData('advice_items', data.advice_items.filter(id => id !== a.id));
                                    }} className="rounded"/>
                                    <span className="ml-2 text-sm">{a.text_bn || a.text_en}</span>
                                </label></div>
                            ))}
                        </div>
                        <div>
                            <label className="block font-bold mb-2">Food Restrictions</label>
                            {defaultFood.map(f => (
                                <div key={f.id}><label className="inline-flex items-center">
                                    <input type="checkbox" checked={data.food_restrictions.includes(f.id)} onChange={e => {
                                        if (e.target.checked) setData('food_restrictions', [...data.food_restrictions, f.id]);
                                        else setData('food_restrictions', data.food_restrictions.filter(id => id !== f.id));
                                    }} className="rounded"/>
                                    <span className="ml-2 text-sm">{f.text_bn || f.text_en}</span>
                                </label></div>
                            ))}
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button type="button" onClick={e => submit(e, 'draft')} disabled={processing} className="bg-gray-400 text-white px-4 py-2 rounded">Save Draft</button>
                        <button type="button" onClick={e => submit(e, 'finalized')} disabled={processing} className="bg-blue-600 text-white px-4 py-2 rounded">Finalize & Save</button>
                    </div>
                </form>
            </div></div>
        </AuthenticatedLayout>
    );
}