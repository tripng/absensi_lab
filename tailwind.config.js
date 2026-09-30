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
                // Material You theme from template.html
                primary: '#2a14b4',
                primaryContainer: '#4338ca',
                onPrimary: '#ffffff',
                primaryFixed: '#e3dfff',
                primaryFixedDim: '#c3c0ff',
                onPrimaryFixed: '#100069',
                onPrimaryFixedVariant: '#372abf',
                inversePrimary: '#c3c0ff',
                secondary: '#006591',
                onSecondary: '#ffffff',
                secondaryFixed: '#c9e6ff',
                secondaryFixedDim: '#89ceff',
                onSecondaryFixed: '#001e2f',
                onSecondaryFixedVariant: '#004c6e',
                onSecondaryContainer: '#004666',
                tertiary: '#00442d',
                tertiaryContainer: '#005e3f',
                onTertiary: '#ffffff',
                tertiaryFixed: '#6ffbbe',
                tertiaryFixedDim: '#4edea3',
                onTertiaryFixed: '#002113',
                onTertiaryFixedVariant: '#005236',
                error: '#ba1a1a',
                errorContainer: '#ffdad6',
                onError: '#ffffff',
                onErrorContainer: '#93000a',
                background: '#faf8ff',
                onBackground: '#131b2e',
                surface: '#faf8ff',
                surfaceDim: '#d2d9f4',
                surfaceBright: '#faf8ff',
                surfaceContainer: '#eaedff',
                surfaceContainerLow: '#f2f3ff',
                surfaceContainerLowest: '#ffffff',
                surfaceContainerHigh: '#e2e7ff',
                surfaceContainerHighest: '#dae2fd',
                onSurface: '#131b2e',
                onSurfaceVariant: '#464554',
                outline: '#777586',
                outlineVariant: '#c7c4d7',
                inverseOnSurface: '#eef0ff',
                inverseSurface: '#283044',
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
