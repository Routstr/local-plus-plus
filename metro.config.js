/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

/**
 * Metro configuration for standalone example app
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
