import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#edf9fc',
                    100: '#d8f1ff',
                    200: '#b3e3f5',
                    300: '#71c3d1',
                    400: '#58c9e9',
                    500: '#147a96',
                    600: '#106882',
                    700: '#0d5570',
                    800: '#0a425e',
                    900: '#073048',
                },
                surface: {
                    DEFAULT: '#f9fafb',
                    card: '#ffffff',
                },
                ink: {
                    DEFAULT: '#111827',
                    muted: '#6b7280',
                },
            },
            fontFamily: {
                sans: ['Figtree', 'Noto Sans Bengali', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms],
};
