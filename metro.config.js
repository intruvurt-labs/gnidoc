// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep RN defaults; ensure TS/TSX and assetExts set correctly
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
