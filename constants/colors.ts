const Colors = {
  cyan: {
    primary: '#00D9FF',
    secondary: '#00B8E6',
    tertiary: '#0099CC',
    dark: '#007799',
    glow: '#00D9FF80',
    deepCyan: '#0099FF',
  },
  red: {
    primary: '#FF4757',
    secondary: '#FF6B6B',
    tertiary: '#CC0033',
    dark: '#990026',
    glow: '#FF475780',
    redPrimary: '#FF004C',
    coral: '#FF6B6B',
  },
  lime: {
    primary: '#B3FF00',
    secondary: '#BFFF00',
    tertiary: '#D4FF33',
    light: '#E6FF66',
    dark: '#99CC00',
    glow: '#B3FF0080',
  },
  yellow: {
    primary: '#FFD93B',
    secondary: '#FFAA00',
    glow: '#FFD93B80',
  },
  orange: {
    primary: '#FF8800',
    secondary: '#FF9933',
    tertiary: '#FFAA66',
    glow: '#FF880080',
  },
  magenta: {
    primary: '#E933FF',
    secondary: '#D400FF',
    glow: '#E933FF80',
    purple: '#9D4EDD',
  },
  cyanRed: {
    primary: '#FF0080',
    secondary: '#E60073',
    tertiary: '#CC0066',
    dark: '#990050',
    glow: '#FF008080',
  },
  cyanOrange: {
    primary: '#CCFF00',
    secondary: '#D9FF33',
    tertiary: '#E6FF66',
    dark: '#A3CC00',
    glow: '#CCFF0080',
  },
  purple: {
    primary: '#9D4EDD',
    secondary: '#7B2CBF',
    tertiary: '#5A189A',
    glow: '#9D4EDD80',
  },
  black: {
    primary: '#000000',
    ink: '#0A0614',
    panel: '#120A1F',
    secondary: '#0D0816',
    tertiary: '#1A0F2E',
    quaternary: '#2A1A3D',
    surface: '#0F0820',
    deepNavy: '#0D0A1A',
    card: '#1A1229',
  },
  white: {
    primary: '#FFFFFF',
  },
  background: {
    primary: '#0A0614',
    secondary: '#0D0A1A',
    card: '#1A1229',
    modal: '#120A1F',
    overlay: 'rgba(10, 6, 20, 0.95)',
    ink: '#0A0614',
    panel: '#120A1F',
    gridGlow: '#1A0F2E',
  },
  text: {
    primary: '#00D9FF',
    secondary: '#FFFFFF',
    accent: '#E933FF',
    muted: '#8B7FA8',
    inverse: '#000000',
    dimmed: '#A599C0',
  },
  border: {
    primary: '#00D9FF',
    secondary: '#E933FF',
    muted: '#2A1A3D',
    subtle: '#3D2A52',
  },
  success: '#00FF88',
  warning: '#FFAA00',
  error: '#FF4757',
  info: '#00FFFF',
  blue: {
    primary: '#4169E1',
    secondary: '#5B7FFF',
    glow: '#4169E180',
  },
  ide: {
    keyword: '#BFFF00',
    string: '#00FFFF',
    comment: '#808080',
    function: '#FF0040',
    variable: '#E6FF66',
    number: '#00E6E6',
    operator: '#D4FF33',
    type: '#FF4757',
  },
};

export const Deep = {
  cyan: {
    base: '#0D6E78',
    dim: '#0A5158',
    line: '#0E8794',
  },
  red: {
    base: '#8A1424',
    accent: '#B61F33',
  },
  lime: {
    base: '#A8F10A',
    soft: '#C7FF5E',
  },
  ink: '#0A0C0F',
  text: {
    primary: '#E8F2F2',
    muted: '#A5B8B8',
    inverse: '#0A0C0F',
  },
};

export const Shadows = {
  glowCyan: {
    shadowColor: Deep.cyan.base,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  glowLime: {
    shadowColor: Deep.lime.soft,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  glowMagenta: {
    shadowColor: '#FF33CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  shadowBlack: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
};

export const Typography = {
  headline: {
    fontFamily: 'System',
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  body: {
    fontFamily: 'System',
    fontWeight: '400' as const,
    fontSize: 14,
  },
  minBodySizePt: 13.5,
};

export default {
  light: {
    text: Colors.text.primary,
    background: Colors.background.primary,
    tint: Colors.cyan.primary,
    tabIconDefault: Colors.text.muted,
    tabIconSelected: Colors.cyan.primary,
  },
  dark: {
    text: Colors.text.primary,
    background: Colors.background.primary,
    tint: Colors.cyan.primary,
    tabIconDefault: Colors.text.muted,
    tabIconSelected: Colors.cyan.primary,
  },
  Colors,
  Deep,
};