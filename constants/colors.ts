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
    keyword: '#FF6B35',      // Orange for keywords
    string: '#00FFFF',       // Cyan for strings
    comment: '#808080',      // Gray for comments
    function: '#FF0040',     // Red for functions
    variable: '#FFB84D',     // Light orange for variables
    number: '#00E6E6',       // Cyan secondary for numbers
    operator: '#FF8C66',     // Coral for operators
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