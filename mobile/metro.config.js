const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native-worklets': path.resolve(__dirname, 'node_modules/react-native-worklets-core'),
};

// lightningcss platform-specific dirs that don't exist on Windows cause Metro to crash
config.watchFolders = (config.watchFolders ?? []);
config.resolver.blockList = [
  /node_modules[/\\]react-native-css-interop[/\\]node_modules[/\\]lightningcss-.*/,
];

module.exports = config;
