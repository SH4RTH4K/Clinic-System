import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('Unhandled React render error:', error, errorInfo);
        }
        try {
            fetch('/api/browser-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    level: 'error',
                    message: `React Render Error: ${error?.message || String(error)}`,
                    stack: error?.stack,
                    componentStack: errorInfo?.componentStack,
                    url: typeof window !== 'undefined' ? window.location.href : '',
                }),
            }).catch(() => {});
        } catch {}
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-rose-200 p-6 space-y-4">
                        <div className="flex items-center gap-3 text-rose-600">
                            <span className="text-3xl">⚠️</span>
                            <div>
                                <h1 className="text-base font-bold text-gray-900">Application Interface Error</h1>
                                <p className="text-xs text-gray-500">The application encountered an unexpected display issue.</p>
                            </div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs font-mono text-rose-800 break-words max-h-40 overflow-y-auto">
                            {this.state.error?.message || 'Unknown render exception'}
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                            >
                                🔄 Reload Page
                            </button>
                            <a
                                href="/dashboard"
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition"
                            >
                                🏠 Return to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export const resolveClinicName = (title) => {
    let pageProps = router?.page?.props;
    if (!pageProps && typeof document !== 'undefined') {
        try {
            const el = document.getElementById('app');
            const dataPage = el?.dataset?.page;
            if (dataPage) {
                pageProps = JSON.parse(dataPage)?.props;
            }
        } catch {
            pageProps = null;
        }
    }

    const clinic = pageProps?.clinic || {};
    const locale = pageProps?.locale || (typeof document !== 'undefined' ? document.documentElement?.lang : 'en');
    const hasBengaliCharacters = typeof title === 'string' && /[\u0980-\u09FF]/.test(title);
    const isBengali = locale === 'bn' || locale === 'bengali' || hasBengaliCharacters;

    if (isBengali && clinic.name_bn && clinic.name_bn.trim() !== '') {
        return clinic.name_bn.trim();
    }

    if (clinic.name_en && clinic.name_en.trim() !== '') {
        return clinic.name_en.trim();
    }

    if (clinic.name && clinic.name.trim() !== '') {
        return clinic.name.trim();
    }

    return import.meta.env.VITE_APP_NAME || 'RemediQ Clinic';
};

createInertiaApp({
    title: (title) => {
        const clinicName = resolveClinicName(title);
        return title ? `${title} - ${clinicName}` : clinicName;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ErrorBoundary>
                <App {...props} />
            </ErrorBoundary>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
