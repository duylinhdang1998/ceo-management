import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── Verdana Health Color Tokens ──────────────────────────────────
      colors: {
        // Core brand
        navy: '#0F172A',       // Primary: actions, strong headers
        slate: '#64748B',      // Secondary: text, borders
        sage: '#059669',       // Tertiary: links, CTAs, highlights

        // Backgrounds
        bg: '#F8FAFC',         // Page background
        surface: '#FFFFFF',    // Card backgrounds

        // Semantic
        success: '#22C55E',    // Confirmed, healthy range
        warning: '#EAB308',    // Pending results, caution
        error: '#EF4444',      // Critical, out of range
        info: '#0EA5E9',       // Informational, new feature

        // Extended palette (for alpha variants, hover states, chips)
        'navy-hover': '#020617',        // Button primary hover
        'secondary-hover': '#0F172A0A', // Button secondary hover (1% opacity)
        'ghost-hover': '#F1F5F9',       // Button ghost hover
        'error-hover': '#DC2626',       // Button destructive hover
        'success-muted': '#22C55E15',   // Chip success background
        'warning-muted': '#EAB30815',   // Chip warning background
        'error-muted': '#EF444415',     // Chip error background
        'focus-ring': '#0F172A18',      // Input focus ring
        'error-ring': '#EF444418',      // Input error ring
        'list-hover': '#F8FAFC',        // List row hover
        'list-active': '#0F172A06',     // List row active
        'nav-border': '#E2E8F0',        // Borders, dividers
        'success-text': '#16A34A',      // Chip success text
        'warning-text': '#CA8A04',      // Chip warning text
        'error-text': '#DC2626',        // Chip error text
        'helper-text': '#475569',       // Input helper/placeholder text
        'label-text': '#0F172A',        // Input label text
      },

      // ── Verdana Health Typography ─────────────────────────────────────
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],          // Body
        heading: ['"Plus Jakarta Sans"', 'sans-serif'], // Headlines
        mono: ['"Fira Code"', 'monospace'],          // Code / numerics
      },

      fontSize: {
        // Display: 40px bold, 1.15 lh
        'display': ['40px', { lineHeight: '1.15', fontWeight: '700' }],
        // H1: 32px bold, 1.2 lh
        'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        // H2: 24px semibold, 1.25 lh
        'h2': ['24px', { lineHeight: '1.25', fontWeight: '600' }],
        // H3: 20px semibold, 1.3 lh
        'h3': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        // H4: 16px medium, 1.35 lh
        'h4': ['16px', { lineHeight: '1.35', fontWeight: '500' }],
        // Body LG: 18px regular, 1.6 lh
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        // Body: 16px regular, 1.6 lh
        'body': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        // Body SM: 14px regular, 1.5 lh
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        // Caption: 12px medium, 1.4 lh
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        // Code: 14px regular, 1.6 lh
        'code': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
      },

      // ── Verdana Health Spacing (8px base) ────────────────────────────
      spacing: {
        'xs': '4px',   // Inline icon gaps
        'sm': '8px',   // Tight component padding
        'md': '16px',  // Default padding
        'lg': '24px',  // Card padding
        'xl': '32px',  // Section gaps
        '2xl': '48px', // Layout sections
        '3xl': '64px', // Page-level spacing
      },

      // ── Verdana Health Border Radius ──────────────────────────────────
      borderRadius: {
        sm: '4px',       // Badges, small tags
        DEFAULT: '8px',  // Buttons, cards, inputs
        md: '12px',      // Modals, dropdown panels
        lg: '16px',      // Large containers, hero sections
        full: '9999px',  // Avatars, status indicators
      },

      // ── Verdana Health Shadows (diffused, clinical) ───────────────────
      boxShadow: {
        // sm: 1px offset, 3px blur, #0F172A at 3% — Buttons, chips
        sm: '0 1px 3px 0 rgba(15, 23, 42, 0.03)',
        // DEFAULT: 2px offset, 6px blur, #0F172A at 5% — Cards, dropdowns
        DEFAULT: '0 2px 6px 0 rgba(15, 23, 42, 0.05)',
        // md: 4px offset, 16px blur, #0F172A at 7% — Elevated cards
        md: '0 4px 16px 0 rgba(15, 23, 42, 0.07)',
        // lg: 8px offset, 32px blur, #0F172A at 10% — Modals, panels
        lg: '0 8px 32px 0 rgba(15, 23, 42, 0.10)',
        // Focus ring: 3px ring #0F172A18
        focus: '0 0 0 3px rgba(15, 23, 42, 0.094)',
        'focus-error': '0 0 0 3px rgba(239, 68, 68, 0.094)',
        none: 'none',
      },

      // ── Letter Spacing (for Chip uppercase tracking) ──────────────────
      letterSpacing: {
        chip: '0.5px',
      },

      // ── Keyframes + animations (drawer/overlay slide & fade) ──────────
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(100%)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
      },
      animation: {
        'slide-in-right': 'slide-in-right 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-out-right': 'slide-out-right 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 220ms ease-out',
        'fade-out': 'fade-out 180ms ease-in',
      },
    },
  },
  plugins: [],
};

export default config;
