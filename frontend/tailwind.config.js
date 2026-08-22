/**
 * Design System v6 tokens, mapped 1:1 from
 * docs/AI_Career_Guidance_Design_System-6.md.
 *
 * Components must use these token names, never raw hex — that rule is what keeps two
 * screens built by two people from drifting apart (coding-standards.md §2.3).
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // `colors` replaces rather than extends the palette: leaving Tailwind's defaults in
    // place is what allows a stray `bg-blue-500` to slip through review.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      // Structural — the only fills allowed on interactive/structural elements.
      primary: '#0075de',
      'primary-active': '#005bab',
      'on-primary': '#ffffff',

      // Decorative AI marker. Never a CTA or a card fill.
      'ai-accent': '#391c57',
      'ai-accent-soft': '#d6b6f6',

      // Surface & text
      canvas: '#ffffff',
      'canvas-soft': '#f6f5f4',
      surface: '#ffffff',
      hairline: '#e6e6e6',
      ink: '#000000',
      'ink-secondary': '#31302e',
      'ink-muted': '#615d59',
      'ink-faint': '#a39e98',

      // Decorative status. Warning is for skill gaps and attention dots only —
      // never for errors, destructive actions, or crisis states (UX invariant 8).
      success: '#1aae39',
      warning: '#dd5b00',
      'warning-deep': '#793400',
      'accent-sky': '#62aef0',
      'accent-teal': '#2a9d99',

      // Reserved for validation failures and account deletion (UX invariant 7).
      error: '#d32f2f',
      'error-soft': '#fdf2f2',
    },
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '5px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    spacing: {
      0: '0',
      xxs: '4px',
      xs: '8px',
      sm: '12px',
      md: '16px',
      lg: '24px',
      xl: '28px',
      xxl: '32px',
      '3xl': '48px',
      '4xl': '64px',
      px: '1px',
      full: '100%',
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'system-ui', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
    },
    fontSize: {
      'display-1': ['64px', { lineHeight: '1.0', letterSpacing: '-2.125px', fontWeight: '700' }],
      'heading-1': ['40px', { lineHeight: '1.1', letterSpacing: '-1px', fontWeight: '700' }],
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
      // Hairline-first depth (UX invariant 4). No heavy drop shadows anywhere.
      none: 'none',
      'level-1': '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)',
      'level-2': '0 2px 4px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08)',
      focus: '0 0 0 3px rgba(0,117,222,0.28)',
    },
    extend: {
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
      },
      animation: {
        'slide-in-right': 'slide-in-right 220ms ease-out',
        'fade-in': 'fade-in 160ms ease-out',
      },
    },
  },
  plugins: [],
};
