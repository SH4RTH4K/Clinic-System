import React, { useState } from 'react';

const CRAVING_PRESETS = [
    { key: 'sweets', label: 'মিষ্টি (Sweets)' },
    { key: 'salt', label: 'লবণ (Salt)' },
    { key: 'sour', label: 'টক (Sour)' },
    { key: 'spicy', label: 'ঝাল (Spicy)' },
    { key: 'fat', label: 'চর্বি (Fat)' },
    { key: 'meat', label: 'মাংস (Meat)' },
    { key: 'milk', label: 'দুধ (Milk)' },
    { key: 'eggs', label: 'ডিম (Eggs)' },
    { key: 'warm_food', label: 'গরম খাবার (Warm Food)' },
    { key: 'cold_drinks', label: 'ঠান্ডা পানীয় (Cold Drinks)' },
];

const AVERSION_PRESETS = [
    { key: 'meat', label: 'মাংস (Meat)' },
    { key: 'milk', label: 'দুধ (Milk)' },
    { key: 'fat', label: 'চর্বি (Fat)' },
    { key: 'fish', label: 'মাছ (Fish)' },
    { key: 'sweets', label: 'মিষ্টি (Sweets)' },
    { key: 'bread', label: 'রুটি (Bread)' },
    { key: 'spicy', label: 'ঝাল (Spicy)' },
    { key: 'onions', label: 'পেঁয়াজ (Onions)' },
];

const TONGUE_OPTIONS = [
    'Clean & Pink (স্বাভাবিক)',
    'White Coated (সাদা লেপযুক্ত)',
    'Yellow Coated (হলুদ লেপযুক্ত)',
    'Thick Coating (পুরু লেপ)',
    'Mapped Tongue (মানচিত্রবৎ)',
    'Flabby & Indented (দাঁতের দাগযুক্ত)',
    'Red Triangular Tip (লাল অগ্রভাগ)',
];

const SWEAT_OPTIONS = [
    'Profuse (প্রচুর ঘাম)',
    'Scanty / Absent (ঘাম কম/নেই)',
    'Offensive / Sour (দুর্গন্ধযুক্ত)',
    'Staining Yellow (হলদে দাগ ফেলে)',
    'Head Sweat in Sleep (মাথায় ঘাম)',
    'Palms & Soles (হাত-পায়ের তালু)',
    'Night Sweats (রাতে ঘাম)',
];

export default function PhysicalGeneralsCard({ physicalGenerals = {}, onChange }) {
    const [isOpen, setIsOpen] = useState(true);
    const pg = physicalGenerals || {};

    const handleFieldChange = (field, val) => {
        onChange({ ...pg, [field]: val });
    };

    const toggleArrayItem = (field, item) => {
        const currentList = Array.isArray(pg[field]) ? pg[field] : [];
        const exists = currentList.includes(item);
        const updated = exists ? currentList.filter((i) => i !== item) : [...currentList, item];
        onChange({ ...pg, [field]: updated });
    };

    const cravings = Array.isArray(pg.food_cravings) ? pg.food_cravings : [];
    const aversions = Array.isArray(pg.food_aversions) ? pg.food_aversions : [];

    return (
        <div className="bg-white rounded-xl shadow-xs border border-purple-200 overflow-hidden">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="bg-purple-50/80 px-5 py-3 border-b border-purple-200 flex items-center justify-between cursor-pointer hover:bg-purple-100/70 transition select-none"
            >
                <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center font-bold text-xs">
                        🌿
                    </span>
                    <h3 className="text-sm font-bold text-purple-950">
                        Homeopathic Physical Generals &amp; Modalities
                    </h3>
                    <span className="text-xs text-purple-700 font-medium">(ধাতুগত লক্ষণ, কাতরতা ও হ্রাস-বৃদ্ধি)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-700 font-semibold">
                    {pg.thermal_state && (
                        <span className="bg-white px-2 py-0.5 rounded-full border border-purple-300 font-bold uppercase text-[10px]">
                            {pg.thermal_state === 'chilly' && '❄️ Chilly'}
                            {pg.thermal_state === 'hot' && '🔥 Hot'}
                            {pg.thermal_state === 'ambithermal' && '⚖️ Ambithermal'}
                        </span>
                    )}
                    <span>{isOpen ? '▲ Hide' : '▼ Show Case Taking'}</span>
                </div>
            </div>

            {isOpen && (
                <div className="p-5 space-y-4">
                    {/* Row 1: Thermal State & Thirst */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Thermal State */}
                        <div className="bg-purple-50/30 p-3 rounded-xl border border-purple-100 space-y-2">
                            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                                Thermal State (শীত-উষ্ণ কাতরতা)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'chilly', label: '❄️ Chilly (শীতকাতর)', desc: 'Cannot tolerate cold' },
                                    { key: 'hot', label: '🔥 Hot (উষ্ণকাতর)', desc: 'Cannot tolerate heat' },
                                    { key: 'ambithermal', label: '⚖️ Ambithermal (উভয়কাতর)', desc: 'Sensitive to both' },
                                ].map((t) => {
                                    const isSelected = pg.thermal_state === t.key;
                                    return (
                                        <button
                                            type="button"
                                            key={t.key}
                                            onClick={() => handleFieldChange('thermal_state', isSelected ? null : t.key)}
                                            className={`p-2 rounded-lg text-xs text-center border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                                isSelected
                                                    ? 'bg-purple-700 text-white font-bold border-purple-700 shadow-xs'
                                                    : 'bg-white text-gray-700 hover:bg-purple-50 border-gray-200'
                                            }`}
                                        >
                                            <span className="font-bold">{t.label}</span>
                                            <span className={`text-[10px] ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                                                {t.desc}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Thirst */}
                        <div className="bg-purple-50/30 p-3 rounded-xl border border-purple-100 space-y-2">
                            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                                Thirst (পিপাসা)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    'Thirsty (প্রচণ্ড পিপাসা)',
                                    'Thirstless (পিপাসাহীন)',
                                    'Small quantity frequently (অল্প পানি বারবার)',
                                    'Large quantity infrequently (বেশি পানি দেরিতে)',
                                    'Desires Cold Drinks (ঠান্ডা পানি চায়)',
                                    'Desires Warm Drinks (গরম পানি চায়)',
                                ].map((th) => {
                                    const isSelected = pg.thirst === th;
                                    return (
                                        <button
                                            type="button"
                                            key={th}
                                            onClick={() => handleFieldChange('thirst', isSelected ? '' : th)}
                                            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                                                isSelected
                                                    ? 'bg-purple-700 text-white font-bold border-purple-700'
                                                    : 'bg-white text-gray-700 hover:bg-purple-50 border-gray-200'
                                            }`}
                                        >
                                            {isSelected ? '✓ ' : '+ '}
                                            {th}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Food Cravings & Aversions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Food Cravings */}
                        <div className="bg-purple-50/30 p-3 rounded-xl border border-purple-100 space-y-2">
                            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                                Food Cravings / Desires (খাবারে তীব্র রুচি / আকাঙ্ক্ষা)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {CRAVING_PRESETS.map((cr) => {
                                    const isSelected = cravings.includes(cr.label);
                                    return (
                                        <button
                                            type="button"
                                            key={cr.key}
                                            onClick={() => toggleArrayItem('food_cravings', cr.label)}
                                            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                                                isSelected
                                                    ? 'bg-purple-700 text-white font-bold border-purple-700'
                                                    : 'bg-white text-gray-700 hover:bg-purple-50 border-gray-200'
                                            }`}
                                        >
                                            {isSelected ? '✓ ' : '+ '}
                                            {cr.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Food Aversions */}
                        <div className="bg-purple-50/30 p-3 rounded-xl border border-purple-100 space-y-2">
                            <label className="block text-xs font-bold text-purple-950 uppercase tracking-wider">
                                Food Aversions (অরুচি / বিতৃষ্ণা)
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {AVERSION_PRESETS.map((av) => {
                                    const isSelected = aversions.includes(av.label);
                                    return (
                                        <button
                                            type="button"
                                            key={av.key}
                                            onClick={() => toggleArrayItem('food_aversions', av.label)}
                                            className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer border ${
                                                isSelected
                                                    ? 'bg-rose-700 text-white font-bold border-rose-700'
                                                    : 'bg-white text-gray-700 hover:bg-rose-50 border-gray-200'
                                            }`}
                                        >
                                            {isSelected ? '✕ ' : '+ '}
                                            {av.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Tongue, Sweat, Sleep & Dreams */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tongue */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Tongue (জিহ্বা)
                            </label>
                            <select
                                value={pg.tongue || ''}
                                onChange={(e) => handleFieldChange('tongue', e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 py-1.5 focus:border-purple-500 focus:ring-purple-500 bg-white"
                            >
                                <option value="">-- Select Tongue Observation --</option>
                                {TONGUE_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sweat */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Perspiration / Sweat (ঘাম)
                            </label>
                            <select
                                value={pg.sweat || ''}
                                onChange={(e) => handleFieldChange('sweat', e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 py-1.5 focus:border-purple-500 focus:ring-purple-500 bg-white"
                            >
                                <option value="">-- Select Perspiration Type --</option>
                                {SWEAT_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Mind & Disposition */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Mind &amp; Disposition (মানসিক লক্ষণ)
                            </label>
                            <input
                                type="text"
                                placeholder="Mild, irritable, anxious, weeping, restless..."
                                value={pg.mind_disposition || ''}
                                onChange={(e) => handleFieldChange('mind_disposition', e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 py-1.5 px-2.5 focus:border-purple-500 focus:ring-purple-500 bg-white"
                            />
                        </div>
                    </div>

                    {/* Row 4: Modalities (< Aggravation & > Amelioration) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Aggravation */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                                <span>&lt;</span> Modalities: Aggravation (কিসে রোগ বাড়ে)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Worse from cold, rainy weather, motion, rest, evening, lying down, morning..."
                                value={pg.modalities_aggravation || ''}
                                onChange={(e) => handleFieldChange('modalities_aggravation', e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 py-1.5 px-2.5 focus:border-purple-500 focus:ring-purple-500 bg-white"
                            />
                        </div>

                        {/* Amelioration */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                                <span>&gt;</span> Modalities: Amelioration (কিসে আরাম বোধ হয়)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Better from warmth, open air, continuous motion, pressure, eating, sleep..."
                                value={pg.modalities_amelioration || ''}
                                onChange={(e) => handleFieldChange('modalities_amelioration', e.target.value)}
                                className="w-full text-xs rounded-lg border-gray-300 py-1.5 px-2.5 focus:border-purple-500 focus:ring-purple-500 bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
