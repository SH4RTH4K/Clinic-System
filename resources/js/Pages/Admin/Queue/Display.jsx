import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';

export default function Display({ state: initialState, settings, selectedDoctorId }) {
    const [state, setState] = useState(initialState);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [audioEnabled, setAudioEnabled] = useState(true);
    const lastCalledTokenRef = useRef(initialState?.recently_called?.token_code || null);

    // Audio chime using Web Audio API (Offline, zero asset dependency)
    const playHospitalChime = () => {
        if (!audioEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            // Tone 1: D5 (587.33 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain1.gain.setValueAtTime(0.3, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.6);

            // Tone 2: A5 (880 Hz) after 0.25s
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.25);
            gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.25);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.25);
            osc2.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.warn('Web Audio error:', e);
        }
    };

    // Text to speech announcement
    const announceToken = (token) => {
        if (!audioEnabled || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const text = `Token ${token.token_code.replace('-', ' ')}. Please proceed to ${token.service_room || 'Doctor chamber'}.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('Speech synthesis error:', e);
        }
    };

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Polling live queue state every 5 seconds
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const params = new URLSearchParams();
                if (selectedDoctorId) params.set('doctor_id', selectedDoctorId);
                const res = await fetch(`/queue/live-state?${params.toString()}`, {
                    headers: { 'Accept': 'application/json' },
                });
                if (res.ok) {
                    const data = await res.json();
                    setState(data);

                    // Check if there is a new call
                    const currentTopCalling = data.now_calling?.[0];
                    if (currentTopCalling && currentTopCalling.token_code !== lastCalledTokenRef.current) {
                        lastCalledTokenRef.current = currentTopCalling.token_code;
                        playHospitalChime();
                        setTimeout(() => announceToken(currentTopCalling), 600);
                    }
                }
            } catch (err) {
                console.error('Queue poll error:', err);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [selectedDoctorId, audioEnabled]);

    const clinicName = settings?.clinic_name_en || settings?.clinic_name || 'RemediQ Clinic';
    const clinicNameBn = settings?.clinic_name_bn || '';
    const nowCalling = state?.now_calling || [];
    const inConsultation = state?.in_consultation || [];
    const nextInLine = state?.next_in_line || [];
    const topCalling = nowCalling[0] || null;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white overflow-hidden">
            <Head title={`Live Waiting Room Display - ${clinicName}`} />

            {/* Top Navigation Bar / Digital Header */}
            <header className="px-8 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-emerald-900/40">
                        {clinicName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-wide text-white flex items-center gap-2">
                            {clinicName}
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </h1>
                        {clinicNameBn && (
                            <p className="text-sm font-semibold text-emerald-400 tracking-wider">{clinicNameBn}</p>
                        )}
                    </div>
                </div>

                {/* Clock & Sound Control */}
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => {
                            setAudioEnabled(!audioEnabled);
                            if (!audioEnabled) playHospitalChime();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                            audioEnabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                        title="Toggle chime and announcement"
                    >
                        {audioEnabled ? (
                            <>
                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                                <span>Sound ON</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                                <span>Muted</span>
                            </>
                        )}
                    </button>

                    <div className="text-right">
                        <div className="text-3xl font-mono font-bold tracking-wider text-emerald-400">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest font-medium">
                            {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Stage Grid */}
            <main className="flex-1 p-8 grid grid-cols-12 gap-8 items-stretch">
                {/* Left/Center Column: Hero "Now Calling" (7 cols) */}
                <div className="col-span-12 lg:col-span-7 flex flex-col justify-between">
                    <div className="h-full bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-sm">
                        {/* Glow ambient background */}
                        <div className="absolute -right-24 -top-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Banner Tag */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="flex h-4 w-4 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                                </span>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                                    Now Calling / চলতি ডাক
                                </h2>
                            </div>
                            <span className="px-4 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full text-xs font-bold uppercase tracking-widest">
                                Live Room Call
                            </span>
                        </div>

                        {/* Calling Details */}
                        {topCalling ? (
                            <div className="my-auto py-8 text-center space-y-6">
                                <div className="inline-block bg-slate-950/80 px-12 py-6 rounded-3xl border-2 border-emerald-400 shadow-2xl shadow-emerald-500/20">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                        Token Number / টোকেন নম্বর
                                    </span>
                                    <span className="text-7xl md:text-8xl font-black text-emerald-400 tracking-wider block font-mono">
                                        {topCalling.token_code}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                                        Patient / রোগী (Privacy Protected)
                                    </span>
                                    <div className="text-3xl md:text-4xl font-extrabold text-white tracking-wide">
                                        {topCalling.masked_patient_name}
                                    </div>
                                </div>

                                <div className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <div className="text-left">
                                        <span className="text-[10px] font-bold uppercase tracking-widest block text-emerald-100">Proceed to</span>
                                        <span className="text-2xl font-black tracking-wide">{topCalling.service_room || 'Consultation Chamber'}</span>
                                    </div>
                                </div>

                                {topCalling.doctor && (
                                    <div className="pt-2 text-slate-300">
                                        <p className="text-lg font-bold text-slate-100">{topCalling.doctor.name}</p>
                                        <p className="text-xs text-slate-400">{topCalling.doctor.credentials} • {topCalling.doctor.specialty}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="my-auto py-16 text-center text-slate-500 space-y-3">
                                <svg className="w-16 h-16 mx-auto text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-2xl font-bold text-slate-400">All Chambers Available</p>
                                <p className="text-sm">Please wait, the next patient will be called shortly.</p>
                            </div>
                        )}

                        {/* Secondary Calling (if multiple doctors are calling simultaneously) */}
                        {nowCalling.length > 1 && (
                            <div className="border-t border-slate-800 pt-4 mt-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                    Also Calling in Other Chambers:
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    {nowCalling.slice(1, 3).map((item) => (
                                        <div key={item.id} className="p-2.5 bg-slate-950/70 border border-slate-700 rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="text-lg font-black text-emerald-400 font-mono">{item.token_code}</span>
                                                <span className="text-xs text-slate-300 block truncate max-w-[120px]">{item.masked_patient_name}</span>
                                            </div>
                                            <span className="px-2 py-1 bg-slate-800 text-xs font-bold rounded text-slate-200">
                                                {item.service_room}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Next in Line & In Consultation (5 cols) */}
                <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
                    {/* Waiting List / Next in Line */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
                        <div>
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                                        Next In Line / অপেক্ষমাণ
                                    </h3>
                                </div>
                                <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full text-xs font-bold font-mono">
                                    {nextInLine.length} Waiting
                                </span>
                            </div>

                            {nextInLine.length > 0 ? (
                                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                                    {nextInLine.slice(0, 6).map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`p-3 rounded-2xl flex items-center justify-between border transition ${
                                                item.priority === 'urgent'
                                                    ? 'bg-red-950/40 border-red-800/80 text-red-200'
                                                    : 'bg-slate-950/60 border-slate-800 text-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-400">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <div className="font-mono text-xl font-bold tracking-wide text-white">
                                                        {item.token_code}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {item.masked_patient_name}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {item.priority === 'urgent' && (
                                                    <span className="px-2 py-0.5 bg-red-900/80 text-red-300 text-[10px] font-bold rounded uppercase block mb-0.5">
                                                        Urgent
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 block font-medium">
                                                    {item.service_room || 'Room'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-slate-500">
                                    <p className="text-sm">No patients waiting in queue</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                            <span>Total Served Today: <strong className="text-white">{state?.counters?.completed || 0}</strong></span>
                            <span>Tokens Issued: <strong className="text-white">{state?.counters?.total || 0}</strong></span>
                        </div>
                    </div>

                    {/* In Consultation Summary */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
                            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <h3 className="text-base font-extrabold uppercase tracking-wide text-white">
                                In Consultation / চিকিৎসাধীন
                            </h3>
                        </div>

                        {inConsultation.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2.5">
                                {inConsultation.slice(0, 4).map((item) => (
                                    <div key={item.id} className="p-2.5 bg-slate-950/80 border border-teal-800/40 rounded-xl">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-base font-bold text-teal-300">{item.token_code}</span>
                                            <span className="text-[10px] uppercase font-bold text-teal-400">{item.service_room}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 truncate">{item.masked_patient_name}</p>
                                        {item.doctor && (
                                            <p className="text-[10px] text-slate-400 truncate">{item.doctor.name}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 py-3 text-center">No consultations currently active</p>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Announcement Ticker */}
            <footer className="px-8 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded text-[11px] font-bold uppercase tracking-wider">
                        Notice
                    </span>
                    <p className="text-slate-300">
                        Please keep your token receipt ready. Silence mobile phones inside consultation chambers.
                        <span className="mx-2 text-slate-600">|</span>
                        <span className="font-bangla">অনুগ্রহ করে চেম্বারের ভেতর মোবাইল ফোন সাইলেন্ট রাখুন।</span>
                    </p>
                </div>
                <div className="font-mono text-slate-500">
                    RemediQ Display Engine v3.0
                </div>
            </footer>
        </div>
    );
}
