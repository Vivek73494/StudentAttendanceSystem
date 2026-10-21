// Theme configuration for MCA Student Attendance Management App
// Blue and white academic theme with high contrast and accessibility

export const COLORS = {
  // Primary Blues
  primary: '#1E40AF',       // Royal Indigo Blue - Main header, active tabs, primary buttons
  primaryLight: '#3B82F6',  // Bright Blue - Accents, hover/press states
  primaryDark: '#1E3A8A',   // Deep Blue - Status bars, prominent headings
  primarySubtle: '#EFF6FF', // Soft Ice Blue - Card backgrounds, highlight badges
  primaryBorder: '#BFDBFE', // Light blue border

  // Neutrals (White, Slate & Grays)
  background: '#F8FAFC',    // App background (Slate 50)
  card: '#FFFFFF',          // Card & modal background
  surface: '#F1F5F9',       // Input field background (Slate 100)
  surfaceBorder: '#E2E8F0', // Border lines (Slate 200)
  textPrimary: '#0F172A',   // Main titles, student names (Slate 900)
  textSecondary: '#475569', // Subtitles, roll numbers (Slate 600)
  textMuted: '#94A3B8',     // Placeholders, captions (Slate 400)
  white: '#FFFFFF',

  // Status & Feedback Colors
  success: '#10B981',       // Present (Emerald 500)
  successDark: '#047857',   // Present Dark text (Emerald 700)
  successLight: '#ECFDF5',  // Present badge background (Emerald 50)
  successBorder: '#A7F3D0', // Present border

  danger: '#EF4444',        // Absent (Red 500)
  dangerDark: '#B91C1C',    // Absent Dark text (Red 700)
  dangerLight: '#FEF2F2',   // Absent badge background (Red 50)
  dangerBorder: '#FECACA',  // Absent border

  warning: '#F59E0B',       // Warning / Below 75% (Amber 500)
  warningDark: '#B45309',   // Warning text (Amber 700)
  warningLight: '#FFFBEB',  // Warning badge background (Amber 50)
  warningBorder: '#FDE68A', // Warning border

  info: '#0284C7',          // Info (Sky 600)
  infoLight: '#E0F2FE',     // Info background
};

export const FONTS = {
  regular: 'normal',
  medium: '500',
  semiBold: '600',
  bold: '700',
};

export const SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
};

export const SHADOWS = {
  small: {
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  medium: {
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  large: {
    elevation: 5,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
};
