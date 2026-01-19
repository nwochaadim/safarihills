const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-reanimated': path.resolve(__dirname, 'stubs/react-native-reanimated.js'),
};

module.exports = withNativeWind(config, { input: './global.css' });
