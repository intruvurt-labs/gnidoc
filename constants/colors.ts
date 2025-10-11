// gnidoC Terces - Professional Coding Agent Color Scheme
const Colors = {
  // Primary Colors
  cyan: {
    primary: '#00FFFF',
    secondary: '#00E6E6',
    tertiary: '#00CCCC',
    dark: '#008B8B',
    glow: '#00FFFF80',
  },
  red: {
    primary: '#FF0040',
    secondary: '#E6003A',
    tertiary: '#CC0033',
    dark: '#990026',
    glow: '#FF004080',
  },
  orange: {
    primary: '#BFFF00',
    secondary: '#D4FF33',
    tertiary: '#E6FF66',
    dark: '#99CC00',
    glow: '#BFFF0080',
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
  black: {
    primary: '#000000',
    secondary: '#0A0A0A',
    tertiary: '#1A1A1A',
    quaternary: '#2A2A2A',
    surface: '#0F0F0F',
  },
  // UI Colors
  background: {
    primary: '#000000',
    secondary: '#0A0A0A',
    card: '#1A1A1A',
    modal: '#0F0F0F',
    overlay: 'rgba(0, 0, 0, 0.9)',
  },
  text: {
    primary: '#00FFFF',
    secondary: '#FFFFFF',
    accent: '#FF0040',
    muted: '#808080',
    inverse: '#000000',
  },
  border: {
    primary: '#00FFFF',
    secondary: '#FF0040',
    muted: '#333333',
  },
  // Status Colors
  success: '#00FF88',
  warning: '#FFAA00',
  error: '#FF0040',
  info: '#00FFFF',
  // IDE Specific Colors
  ide: {
    keyword: '#BFFF00',      // Lime for keywords
    string: '#00FFFF',       // Cyan for strings
    comment: '#808080',      // Gray for comments
    function: '#FF0040',     // Red for functions
    variable: '#E6FF66',     // Light lime for variables
    number: '#00E6E6',       // Cyan secondary for numbers
    operator: '#D4FF33',     // Lime-yellow for operators
    type: '#FF4757',         // Red-pink for types
  },
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
};