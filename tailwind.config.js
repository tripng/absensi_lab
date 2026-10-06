import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{js,jsx}', // include .js so classNames in data.js are scanned
    ],

    theme: {
        extend: {
            colors: {
                // Material You theme from template.html
                // NOTE: Tailwind v3 requires color keys in kebab-case so that
                // utilities like bg-surface-container-lowest / text-on-primary
                // are actually generated. camelCase keys (surfaceContainerLowest)
                // are silently ignored -> no CSS output, leaving bg-surface-*
                // classes unstyled.
                primary: '#2a14b4',
                'primary-container': '#4338ca',
                'on-primary': '#ffffff',
                'primary-fixed': '#e3dfff',
                'primary-fixed-dim': '#c3c0ff',
                'on-primary-fixed': '#100069',
                'on-primary-fixed-variant': '#372abf',
                'inverse-primary': '#c3c0ff',
                secondary: '#006591',
                'on-secondary': '#ffffff',
                'secondary-fixed': '#c9e6ff',
                'secondary-fixed-dim': '#89ceff',
                'on-secondary-fixed': '#001e2f',
                'on-secondary-fixed-variant': '#004c6e',
                'on-secondary-container': '#004666',
                tertiary: '#00442d',
                'tertiary-container': '#005e3f',
                'on-tertiary': '#ffffff',
                'tertiary-fixed': '#6ffbbe',
                'tertiary-fixed-dim': '#4edea3',
                'on-tertiary-fixed': '#002113',
                'on-tertiary-fixed-variant': '#005236',
                error: '#ba1a1a',
                'error-container': '#ffdad6',
                'on-error': '#ffffff',
                'on-error-container': '#93000a',
                background: '#faf8ff',
                'on-background': '#131b2e',
                surface: '#faf8ff',
                'surface-dim': '#d2d9f4',
                'surface-bright': '#faf8ff',
                'surface-container': '#eaedff',
                'surface-container-low': '#f2f3ff',
                'surface-container-lowest': '#ffffff',
                'surface-container-high': '#e2e7ff',
                'surface-container-highest': '#dae2fd',
                'on-surface': '#131b2e',
                'on-surface-variant': '#464554',
                outline: '#777586',
                'outline-variant': '#c7c4d7',
                'inverse-on-surface': '#eef0ff',
                'inverse-surface': '#283044',
                'surface-tint': '#5148d7',
            },
            spacing: {
                // Custom spacing tokens di-import dari template
                'space-xs': '0.5rem',
                'space-sm': '0.75rem',
                'space-md': '1.25rem',
                'space-lg': '2rem',
                'space-xl': '3.25rem',
                gutter: '1.5rem',
            },
            borderRadius: {
                lg: '0.5rem',
                xl: '0.75rem',
                full: '9999px',
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                // Material You font-family utilities mirrored from template.html so
                // `font-headline-lg`, `font-body-md`, `font-label-sm` etc. resolve.
                'headline-lg': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'headline-md': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'headline-sm': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'body-lg': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'body-md': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'body-sm': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'label-lg': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'label-md': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'label-sm': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                'display': ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
            },
            fontSize: {
                // Display / Headline scale
                'display-2xl': ['3.5rem', { lineHeight: '4rem' }],
                'display-xl': ['2.75rem', { lineHeight: '3.25rem' }],
                'display-lg': ['2rem', { lineHeight: '2.75rem' }],
                // Headline scale (from template: font-headline-lg/md/sm)
                'headline-lg': ['1.5rem', { lineHeight: '2rem' }],
                'headline-md': ['1.25rem', { lineHeight: '1.75rem' }],
                'headline-sm': ['1.125rem', { lineHeight: '1.5rem' }],
                // Body scale (from template: font-body-md/sm/lg)
                'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'body-md': ['1rem', { lineHeight: '1.5rem' }],
                'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
                // Label scale (from template: font-label-lg/md/sm)
                'label-lg': ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '0.005em' }],
                'label-md': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
                'label-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.03em' }],
            },
        },
    },

    plugins: [forms],
};
