// src/styles/tokens.ts

export const colors = {
  // Background
  bg: {
    base: '#F7F8FA',      // page background
    surface: '#FFFFFF',   // cards, panels
    muted: '#F3F4F6',     // subtle sections, table headers
    hover: '#F9FAFB',     // hover states on rows
  },

  // Borders
  border: {
    default: '#E5E7EB',
    strong: '#D1D5DB',
  },

  // Text
  text: {
    primary: '#111827',   // headings, important values
    secondary: '#6B7280', // labels, descriptions
    muted: '#9CA3AF',     // placeholders, timestamps
    inverse: '#FFFFFF',   // text on dark backgrounds
  },

  // Primary — Blue
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',       // main CTA
    700: '#1D4ED8',
  },

  // Success — Green
  success: {
    50:  '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
    text: '#065F46',
  },

  // Warning — Amber
  warning: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    text: '#92400E',
  },

  // Danger — Red
  danger: {
    50:  '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    text: '#991B1B',
  },

  // Sidebar
  sidebar: {
    bg: '#111827',
    text: '#9CA3AF',
    textActive: '#FFFFFF',
    itemActive: '#1F2937',
    itemHover: '#1F2937',
    border: '#1F2937',
    accent: '#2563EB',
  },
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
} as const;

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
  lg: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
} as const;

export const font = {
  size: {
    xs:   '11px',
    sm:   '13px',
    base: '14px',
    md:   '16px',
    lg:   '18px',
    xl:   '24px',
    '2xl':'32px',
  },
  weight: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
  lineHeight: {
    tight:  '1.25',
    normal: '1.5',
  },
} as const;

// Animation — fast, professional
export const transition = {
  fast:   'all 120ms ease',
  normal: 'all 150ms ease',
  slow:   'all 200ms ease',
} as const;