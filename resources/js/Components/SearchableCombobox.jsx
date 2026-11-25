import React, { useState, useRef, useEffect } from 'react';

const TYPE_BADGES = {
    allopathic: { label: 'Allopathy', icon: '💊', badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800' },
    homeopathic: { label: 'Homeo', icon: '🌿', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
    surgical: { label: 'Surgical', icon: '🩺', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
    dual: { label: 'Dual', icon: '🏥', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
};

export default function SearchableCombobox({
    value = '',
    onChange,
    options = [],
    placeholder = 'Search manufacturer...',
    id = 'searchable-combobox',
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const containerRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = query.trim() === ''
        ? options
        : options.filter((opt) => {
            const q = query.toLowerCase();
            return (
                (opt.name && opt.name.toLowerCase().includes(q)) ||
                (opt.short_name && opt.short_name.toLowerCase().includes(q)) ||
                (opt.name_bn && opt.name_bn.toLowerCase().includes(q)) ||
                (opt.type && opt.type.toLowerCase().includes(q))
            );
        });

    const handleInputChange = (e) => {
        const text = e.target.value;
        setQuery(text);
        if (onChange) onChange(text);
        setIsOpen(true);
    };

    const handleSelectOption = (opt) => {
        setQuery(opt.name);
        if (onChange) onChange(opt.name);
        setIsOpen(false);
    };

    const handleClear = () => {
        setQuery('');
        if (onChange) onChange('');
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                {/* Search Magnifying Glass Icon */}
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                {/* Search Text Input Field */}
                <input
                    type="text"
                    id={id}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-8 pr-14 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs shadow-xs focus:border-teal-500 focus:ring-teal-500"
                    autoComplete="off"
                />

                {/* Right Action Icons: Clear & Toggle Dropdown */}
                <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-0.5">
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition"
                            title="Clear search text"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition"
                        title="Toggle options list"
                    >
                        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Interactive Dropdown Results Panel */}
            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1 text-xs">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => {
                            const badge = TYPE_BADGES[opt.type] || { label: opt.type, icon: '🏢', badge: 'bg-gray-100 text-gray-700 border-gray-200' };
                            const isSelected = query.toLowerCase() === opt.name.toLowerCase();

                            return (
                                <button
                                    key={opt.id || opt.name}
                                    type="button"
                                    onClick={() => handleSelectOption(opt)}
                                    className={`w-full px-3 py-2 text-left transition flex items-center justify-between gap-2 hover:bg-teal-50 dark:hover:bg-gray-700/60 ${
                                        isSelected ? 'bg-teal-50/80 dark:bg-gray-700 font-semibold text-teal-800 dark:text-teal-300' : 'text-gray-800 dark:text-gray-200'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="truncate">{opt.name}</span>
                                            {opt.short_name && opt.short_name !== opt.name && (
                                                <span className="text-[10px] text-gray-400">({opt.short_name})</span>
                                            )}
                                        </div>
                                        {opt.name_bn && (
                                            <p className="text-[10px] text-gray-400 truncate">{opt.name_bn}</p>
                                        )}
                                    </div>
                                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${badge.badge}`}>
                                        <span>{badge.icon}</span>
                                        <span>{badge.label}</span>
                                    </span>
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-3 py-2 text-gray-500 text-center">
                            <p className="text-[11px] font-medium">No matching company found in catalog.</p>
                            <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">
                                You can keep typed text to save as custom supplier.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
