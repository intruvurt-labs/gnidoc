const Colors = {
  cyan: {
    primary: '#00FFFF',
    secondary: '#00E6E6',
    tertiary: '#00CCCC',
    dark: '#008B8B',
    glow: '#00FFFF80',
    deepCyan: '#00B3FF',
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
    primary: '#FF33CC',
    secondary: '#FF0080',
    glow: '#FF33CC80',
    purple: '#A855F7',
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
    primary: '#A200FF',
    secondary: '#8800CC',
    glow: '#A200FF80',
  },
  black: {
    primary: '#000000',
    ink: '#0A0F12',
    panel: '#0F1720',
    secondary: '#0A0A0A',
    tertiary: '#1A1A1A',
    quaternary: '#2A2A2A',
    surface: '#0F0F0F',
    deepNavy: '#0D1117',
    card: '#161B22',
  },
  white: {
    primary: '#FFFFFF',
  },
  background: {
    primary: '#0A0F12',
    secondary: '#0D1117',
    card: '#161B22',
    modal: '#0F1720',
    overlay: 'rgba(0, 0, 0, 0.9)',
    ink: '#0A0F12',
    panel: '#0F1720',
    gridGlow: '#141a20',
  },
  text: {
    primary: '#00FFFF',
    secondary: '#FFFFFF',
    accent: '#FF4757',
    muted: '#6B7280',
    inverse: '#000000',
    dimmed: '#8B92A0',
  },
  border: {
    primary: '#00FFFF',
    secondary: '#FF4757',
    muted: '#21262D',
    subtle: '#30363D',
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