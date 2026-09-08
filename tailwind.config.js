/**
 * Next_Path Editorial Minimalism Design System tokens.
 *
 * Warm paper canvas, hairline borders, high-trust document aesthetic.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Structural actions & focus (CTAs, active nav)
        primary: '#0075de',
        'primary-container': '#0075de',
        'primary-active': '#005bab',
        'on-primary': '#ffffff',
        'primary-fixed': '#d5e3ff',

        // AI-related features only (deep purple family)
        'ai-accent': '#6f518f',
        'ai-accent-dark': '#391c57',
        'ai-accent-soft': '#efdbff',
        'ai-accent-lavender': '#dcb8fe',
        'ai-tertiary': '#6d518a',

        // Surfaces & Warm Paper Canvas
        canvas: '#f6f5f4',
        'canvas-soft': '#f6f5f4',
        'canvas-container': '#ebe8e5',
        surface: '#ffffff',
        'surface-low': '#f6f5f4',
        'surface-container': '#ebe8e5',
        'surface-high': '#e3dfdb',
        hairline: '#e6e6e6',
        'hairline-subtle': '#f0ece7',

        // Ink hierarchy
        ink: '#000000',
        'ink-secondary': '#31302e',
        'ink-muted': '#615d59',
        'ink-faint': '#a39e98',
        outline: '#717784',
        'outline-variant': '#c1c6d5',

        // Status accents (small dots / micro-indicators only)
        success: '#1aae39',
        'success-soft': '#e8f7ec',
        warning: '#dd5b00',
        'warning-deep': '#793400',
        'warning-soft': '#fdf2e9',
        'accent-sky': '#62aef0',
        'accent-teal': '#2a9d99',

        // Form validation & destructive actions
        error: '#ba1a1a',
        'error-soft': '#ffdad6',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '28px',
        xxl: '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display-1': ['64px', { lineHeight: '1.0', letterSpacing: '-2.125px', fontWeight: '700' }],
        'heading-1': ['40px', { lineHeight: '1.1', letterSpacing: '-1px', fontWeight: '700' }],
        'heading-1-mobile': ['32px', { lineHeight: '1.125', letterSpacing: '-0.5px', fontWeight: '700' }],
        'heading-2': ['26px', { lineHeight: '1.23', letterSpacing: '-0.625px', fontWeight: '700' }],
        'heading-3': ['22px', { lineHeight: '1.27', letterSpacing: '-0.25px', fontWeight: '700' }],
        title: ['20px', { lineHeight: '1.4', letterSpacing: '-0.125px', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'body-sm': ['15px', { lineHeight: '1.33', letterSpacing: '0', fontWeight: '400' }],
        button: ['16px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '500' }],
        caption: ['14px', { lineHeight: '1.43', letterSpacing: '0', fontWeight: '400' }],
        eyebrow: ['12px', { lineHeight: '1.33', letterSpacing: '0.125px', fontWeight: '600' }],
      },
      boxShadow: {
        'level-1': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'level-2': '0 8px 24px rgba(0,0,0,0.08)',
        'ai-fab': '0 8px 24px rgba(111,81,143,0.18)',
        focus: '0 0 0 2px #fdf9f5, 0 0 0 4px #005db2',
      },
      maxWidth: {
        wizard: '720px',
        content: '1100px',
      },
      minHeight: {
        touch: '44px',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'celebrate-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 180ms ease-out',
        'celebrate-pulse': 'celebrate-pulse 600ms ease-in-out',
      },
    },
  },
  plugins: [],
};
