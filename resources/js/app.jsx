import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

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

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
